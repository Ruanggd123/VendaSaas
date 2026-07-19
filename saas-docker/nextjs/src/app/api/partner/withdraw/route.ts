import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'partner') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { amount, pixKey, pixKeyType } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    }
    if (!pixKey || !pixKeyType) {
      return NextResponse.json({ error: 'Chave PIX é obrigatória' }, { status: 400 });
    }

    if (amount < 20) {
      return NextResponse.json({ error: 'Valor mínimo para saque é R$ 20,00' }, { status: 400 });
    }

    const validTypes = ['cpf', 'cnpj', 'email', 'phone', 'random'];
    if (!validTypes.includes(pixKeyType)) {
      return NextResponse.json({ error: 'Tipo de chave PIX inválido' }, { status: 400 });
    }

    const partner = await prisma.partner.findUnique({
      where: { id: session.userId },
    });
    if (!partner) {
      return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
    }

    // Calculate available balance
    const pending = await prisma.partnerCommission.aggregate({
      where: { partner_id: partner.id, status: 'pending' },
      _sum: { amount: true },
    });

    const pendingWithdrawals = await prisma.partnerWithdrawal.aggregate({
      where: { partner_id: partner.id, status: 'pending' },
      _sum: { amount: true },
    });

    const available = (pending._sum.amount || 0) - (pendingWithdrawals._sum.amount || 0);

    if (amount > available) {
      return NextResponse.json({ error: `Saldo insuficiente. Disponível: R$ ${available.toFixed(2)}` }, { status: 400 });
    }

    const withdrawal = await prisma.partnerWithdrawal.create({
      data: {
        partner_id: partner.id,
        amount,
        pixKey,
        pixKeyType,
        status: 'pending',
      },
    });

    return NextResponse.json({ success: true, withdrawal });
  } catch (error: any) {
    console.error('[Withdraw]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
