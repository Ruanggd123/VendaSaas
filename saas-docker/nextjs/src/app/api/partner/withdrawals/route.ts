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

    const withdrawals = await prisma.partnerWithdrawal.findMany({
      where: { partner_id: session.userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return NextResponse.json({ withdrawals });
  } catch (error: any) {
    console.error('[Withdrawals]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
