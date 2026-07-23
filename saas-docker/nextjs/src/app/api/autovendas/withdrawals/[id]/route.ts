import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    const userRole = session?.role?.toLowerCase();
    if (!session || !['admin', 'superadmin', 'manager'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const tenantId = session.tenantId || session.tenant_id;

    const { action } = await req.json();
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Ação inválida. Use "approve" ou "reject"' }, { status: 400 });
    }

    const withdrawal = await prisma.partnerWithdrawal.findUnique({
      where: { id: params.id },
      include: { partner: true },
    });

    if (!withdrawal) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    if (withdrawal.partner.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    if (withdrawal.status !== 'pending') {
      return NextResponse.json({ error: 'Solicitação já foi processada' }, { status: 400 });
    }

    if (action === 'approve') {
      // Mark withdrawal as approved
      await prisma.partnerWithdrawal.update({
        where: { id: params.id },
        data: { status: 'approved', approved_at: new Date(), admin_id: session.id },
      });

      // Mark enough pending commissions as paid (oldest first)
      const commissions = await prisma.partnerCommission.findMany({
        where: { partner_id: withdrawal.partner_id, status: 'pending' },
        orderBy: { created_at: 'asc' },
      });

      let remaining = withdrawal.amount;
      const toUpdate: string[] = [];

      for (const c of commissions) {
        if (remaining <= 0) break;
        toUpdate.push(c.id);
        remaining -= c.amount;
      }

      if (toUpdate.length > 0) {
        await prisma.partnerCommission.updateMany({
          where: { id: { in: toUpdate } },
          data: { status: 'paid', withdrawal_id: withdrawal.id },
        });
      }
    } else {
      // Reject
      await prisma.partnerWithdrawal.update({
        where: { id: params.id },
        data: { status: 'rejected', rejected_at: new Date(), admin_id: user.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Withdrawal action]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
