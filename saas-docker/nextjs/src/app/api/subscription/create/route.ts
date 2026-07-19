import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createCustomer, createSubscription } from '@/lib/asaas';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const { tenantId, planType, customerData } = await request.json();

  try {
    // 1. Criar cliente no Asaas
    const asaasCustomer = await createCustomer(customerData);

    // 2. Definir valor do plano
    const planPrices = {
      solo: 197,
      equipe: 397,
      corporativo: 997
    };

    // 3. Criar assinatura no Asaas
    const subscription = await createSubscription(asaasCustomer.id, {
      name: `Plano ${planType}`,
      price: planPrices[planType as keyof typeof planPrices] || 197,
      billingType: customerData.billingType || 'CREDIT_CARD',
      period: 'MONTHLY',
      description: `Plano ${planType} - Automação WhatsApp`
    });

    // 4. Atualizar tenant no banco (colocar em "pending" até primeiro pagamento)
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan: planType,
        status: 'pending',
        subscription_expires_at: new Date(Date.now() + 30 * 86400000)
      }
    });

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      paymentLink: subscription.invoiceUrl || subscription.pixQrCode
    });
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    return NextResponse.json({ error: 'Erro ao criar assinatura' }, { status: 500 });
  }
}
