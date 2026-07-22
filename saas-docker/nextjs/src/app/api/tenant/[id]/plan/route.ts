import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PLANS } from '@/lib/plans';

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { planId } = body;

    if (!planId || !PLANS[planId]) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    const plan = PLANS[planId];

    // Atualiza o plano do Tenant
    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        plan: planId,
        // Mock de expiração para 30 dias a partir de agora
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    // Como o Mercado Pago está desativado, vamos simular uma venda "paga" 
    // para gerar os dados de métricas e comissões se houver parceiro.
    const sale = await prisma.sale.create({
      data: {
        tenant_id: id,
        product_name: `Assinatura Plano ${plan.name}`,
        amount: plan.price,
        status: 'paid', // Simula como pago
        is_recurring: true,
        paid_at: new Date(),
        due_date: new Date(),
        notes: 'Assinatura via gestão interna (Mock Gateway)'
      }
    });

    // Aqui seria a lógica de procurar se esse tenant foi indicado por um parceiro
    // (Por exemplo, através de um campo referred_by_partner_id no Tenant,
    // que não existe no schema atual, mas a Sale foi registrada para métricas).

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
