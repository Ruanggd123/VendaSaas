import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getSession();
    const userRole = session?.role?.toLowerCase();
    if (!session || !['admin', 'superadmin', 'manager'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const tenantId = session.tenantId || session.tenant_id;

    const withdrawals = await prisma.partnerWithdrawal.findMany({
      where: { partner: { tenant_id: tenantId } },
      orderBy: { created_at: 'desc' },
      include: {
        partner: { select: { name: true, email: true, whatsappNumber: true } },
      },
    });

    return NextResponse.json({ withdrawals });
  } catch (error: any) {
    console.error('[Admin Withdrawals]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
