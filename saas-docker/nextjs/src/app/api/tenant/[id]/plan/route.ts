import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PLANS } from '@/lib/plans';
import { getSession } from "@/lib/auth";

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { planId } = body;

    if (!planId || !PLANS[planId]) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    const plan = PLANS[planId];

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        plan: planId,
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      select: {
        id: true, name: true, plan: true, phone: true, status: true,
        subscription_expires_at: true, created_at: true
      }
    });

    const sale = await prisma.sale.create({
      data: {
        tenant_id: id,
        product_name: `Assinatura Plano ${plan.name}`,
        amount: plan.price,
        status: 'paid',
        is_recurring: true,
        paid_at: new Date(),
        due_date: new Date(),
        notes: 'Assinatura via gestão interna (Mock Gateway)'
      }
    });

    return NextResponse.json({
      success: true,
      message: `Plano atualizado para ${plan.name}`,
      tenant,
      sale
    });

  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar plano' }, { status: 500 });
  }
}
