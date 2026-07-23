import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'partner') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const partnerId = session.id || session.userId || session.partnerId;
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
    });
    if (!partner) {
      return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
    }

    // Available = sum of all pending commissions
    const pending = await prisma.partnerCommission.aggregate({
      where: { partner_id: partner.id, status: 'pending' },
      _sum: { amount: true },
    });

    // Already paid = sum of all paid commissions
    const paid = await prisma.partnerCommission.aggregate({
      where: { partner_id: partner.id, status: 'paid' },
      _sum: { amount: true },
    });

    // Pending withdrawals (requested but not yet approved)
    const pendingWithdrawals = await prisma.partnerWithdrawal.aggregate({
      where: { partner_id: partner.id, status: 'pending' },
      _sum: { amount: true },
    });

    const available = (pending._sum.amount || 0) - (pendingWithdrawals._sum.amount || 0);

    return NextResponse.json({
      available: Math.max(0, available),
      pending: pending._sum.amount || 0,
      paid: paid._sum.amount || 0,
      pendingWithdrawal: pendingWithdrawals._sum.amount || 0,
    });
  } catch (error: any) {
    console.error('[Balance]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
