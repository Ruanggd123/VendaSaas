import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createCustomer, createPayment, createSubscription, getSubscriptionPayments } from '@/lib/asaas';
import { createPreference } from '@/lib/mercadopago';

const prisma = new PrismaClient();

function getBaseUrl(req: Request) {
  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

function generateCPF(): string {
  const n = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const n9 = Array.from({ length: 9 }, () => n(0, 9));
  const d1 = n9.reduce((s, v, i) => s + v * (10 - i), 0) % 11;
  const d1v = d1 < 2 ? 0 : 11 - d1;
  const d2 = [...n9, d1v].reduce((s, v, i) => s + v * (11 - i), 0) % 11;
  const d2v = d2 < 2 ? 0 : 11 - d2;
  return [...n9, d1v, d2v].join('');
}

function cleanDescription(str: string): string {
  if (!str) return "Pagamento";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "Pagamento";
}

export async function GET(req: Request, { params }: { params: { tenantId: string } }) {
  try {
    const { tenantId } = params;
    let tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, settings: true }
    });

    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        select: { id: true, name: true, settings: true }
      });
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 });
    }
    let settings: any = {};
    try { settings = JSON.parse(tenant.settings as string); } catch {}

    const appointments = await prisma.appointment.findMany({
      where: {
        tenant_id: tenant.id,
        scheduled_at: { gte: new Date(Date.now() - 86400000) },
        status: { notIn: ['canceled', 'refused'] }
      },
      select: { scheduled_at: true }
    });

    const bookedSlots = appointments.map(a => a.scheduled_at.toISOString());

    return NextResponse.json({
      tenantName: tenant.name,
      products: settings.products || [],
      bookedSlots,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { tenantId: string } }) {
  try {
    const { tenantId } = params;
    const { name, phone, email, referralCode, productName, amount, isSubscription, billingType, cart, scheduled_at } = await req.json();

    if (!name || !phone || !productName || !amount) {
      return NextResponse.json({ error: 'Nome, telefone, produto e valor são obrigatórios' }, { status: 400 });
    }

    let tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 });
    }
    const realTenantId = tenant.id;

    let settings: any = {};
    try { settings = JSON.parse(tenant.settings as string); } catch {}

    let partnerId: string | undefined;
    if (referralCode) {
      const partner = await prisma.partner.findFirst({
        where: { referralCode: referralCode.toUpperCase(), tenant_id: realTenantId }
      });
      if (partner) partnerId = partner.id;
    }

    const lead = await prisma.lead.create({
      data: {
        tenant_id: realTenantId,
        name,
        phone,
        email,
        status: 'NEW',
        interested_product: productName,
        value: parseFloat(amount),
        source: 'checkout',
        partner_id: partnerId,
        notes: cart ? JSON.stringify(cart) : null,
      }
    });

    const notesData: any = {};
    if (cart) notesData.cart = cart;
    if (scheduled_at) notesData.scheduled_at = scheduled_at;

    const sale = await prisma.sale.create({
      data: {
        tenant_id: realTenantId,
        lead_id: lead.id,
        product_name: productName,
        amount: parseFloat(amount),
        notes: Object.keys(notesData).length > 0 ? JSON.stringify(notesData) : null,
        status: 'pending',
        due_date: new Date(Date.now() + (isSubscription ? 30 : 7) * 86400000),
      }
    });

    // Calculate monthly-only amount from cart
    const monthlyAmount = Array.isArray(cart)
      ? cart.filter((i: any) => i.type === 'subscription' && !i.isBonus).reduce((s: number, i: any) => s + (parseFloat(i.price) || 0), 0)
      : 0;
    const totalAmount = parseFloat(amount) || 0;

    // Try Mercado Pago first (one-time only - MP checkout doesn't support recurring)
    const mpToken = settings.mercadopago_access_token;
    const mpMode = settings.mercadopago_mode || 'production';

    if (mpToken && !isSubscription) {
      const baseUrl = getBaseUrl(req);
      const items = (cart || [{ name: productName, price: totalAmount, qty: 1 }]).map((i: any) => ({
        title: cleanDescription(i.name),
        quantity: i.qty || 1,
        unit_price: i.isBonus ? 0 : (parseFloat(i.price) || totalAmount),
        currency_id: 'BRL',
      }));

      const pref = await createPreference(
        mpToken,
        items,
        `checkout_${realTenantId}_${sale.id}`,
        `${baseUrl}/api/webhooks/mercadopago`,
        {
          success: `${baseUrl}/checkout/${realTenantId}?success=1`,
          failure: `${baseUrl}/checkout/${realTenantId}?failure=1`,
          pending: `${baseUrl}/checkout/${realTenantId}?pending=1`,
        }
      );

      const paymentLink = mpMode === 'production' ? pref.init_point : pref.sandbox_init_point;

      await prisma.sale.update({
        where: { id: sale.id },
        data: { payment_link: paymentLink, payment_id: pref.id },
      });

      return NextResponse.json({
        success: true,
        saleId: sale.id,
        leadId: lead.id,
        paymentLink,
        paymentId: pref.id,
      });
    }

    // Asaas gateway resolution
    let asaasKey = settings.asaas_api_key || settings.asaas_test_api_key;
    if (!asaasKey) {
      const sysConfig = await prisma.systemConfig.findUnique({ where: { key: "asaas_api_key" } });
      if (sysConfig?.value) asaasKey = sysConfig.value;
    }

    const isProdKey = asaasKey ? (asaasKey.startsWith("$") || asaasKey.startsWith("ak_") || settings.asaas_mode === 'production') : false;
    const asaasUrl = isProdKey ? 'https://asaas.com/api/v3' : 'https://sandbox.asaas.com/api/v3';

    if (!asaasKey && !mpToken) {
      return NextResponse.json({ 
        error: 'As portas de pagamento estão em manutenção. Entre em contato com o suporte para concluir a contratação.' 
      }, { status: 400 });
    }

    const cleanDigits = (phone || "").replace(/\D/g, "");
    const customerData = {
      name,
      email: email && email.includes("@") ? email : `cliente${cleanDigits}@gmail.com`,
      phone,
      cpfCnpj: generateCPF(),
    };
    const customer = await createCustomer(customerData, asaasKey, asaasUrl);

    if (!customer.id) {
      const errMsg = customer.errors ? customer.errors.map((e: any) => e.description).join(', ') : 'Erro ao criar cliente no gateway de pagamento';
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    let paymentLink = '';
    let paymentId = '';
    let paymentMethod = billingType || 'PIX';

    const safeDescription = cleanDescription(productName);

    if (isSubscription) {
      const subAmount = monthlyAmount > 0 ? monthlyAmount : totalAmount;
      const setupAmount = totalAmount - monthlyAmount;

      // If there's a setup fee, charge total upfront + create subscription for month 2+
      if (setupAmount > 0.01) {
        // Charge setup + first month as a single upfront payment
        const firstPay = await createPayment({
          customer: customer.id,
          billingType: paymentMethod,
          value: totalAmount,
          dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          description: cleanDescription(`Primeira mensalidade taxa - ${productName}`),
          externalReference: `${realTenantId}_${sale.id}`,
        }, asaasKey, asaasUrl);
        if (firstPay.id) {
          paymentLink = firstPay.invoiceUrl || firstPay.bankSlipUrl || firstPay.pixQrCodeUrl || '';
          paymentId = firstPay.id;
        }

        // Create subscription for month 2 onwards (nextDueDate = 30 days from first payment)
        const sub = await createSubscription(
          customer.id,
          {
            name: safeDescription,
            price: subAmount,
            billingType: paymentMethod,
            period: 'MONTHLY',
            description: safeDescription,
          },
          `${realTenantId}_${sale.id}`,
          asaasKey,
          asaasUrl
        );
        if (sub.id) {
          await prisma.sale.update({
            where: { id: sale.id },
            data: { is_recurring: true, subscription_id: sub.id },
          });
        } else {
          const errMsg = sub.errors ? sub.errors.map((e: any) => e.description).join(', ') : 'Erro ao criar assinatura no gateway';
          return NextResponse.json({ error: errMsg }, { status: 400 });
        }
      } else {
        // No setup fee — just create subscription and get first payment link
        const sub = await createSubscription(
          customer.id,
          {
            name: safeDescription,
            price: subAmount,
            billingType: paymentMethod,
            period: 'MONTHLY',
            description: safeDescription,
          },
          `${realTenantId}_${sale.id}`,
          asaasKey,
          asaasUrl
        );

        if (sub.id) {
          const paymentsRes = await getSubscriptionPayments(sub.id, asaasKey, asaasUrl);
          if (paymentsRes?.data?.length > 0) {
            const fp = paymentsRes.data[0];
            paymentLink = fp.invoiceUrl || fp.bankSlipUrl || fp.pixQrCodeUrl || '';
            paymentId = fp.id;
          }
          await prisma.sale.update({
            where: { id: sale.id },
            data: { is_recurring: true, subscription_id: sub.id, payment_link: paymentLink, payment_id: paymentId },
          });
        } else {
          const errMsg = sub.errors ? sub.errors.map((e: any) => e.description).join(', ') : 'Erro ao criar assinatura no gateway';
          return NextResponse.json({ error: errMsg }, { status: 400 });
        }
      }
    } else {
      const pay = await createPayment({
        customer: customer.id,
        billingType: paymentMethod,
        value: totalAmount,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        description: safeDescription,
        externalReference: `${realTenantId}_${sale.id}`,
      }, asaasKey, asaasUrl);

      if (pay.id) {
        paymentLink = pay.invoiceUrl || pay.bankSlipUrl || pay.pixQrCodeUrl || '';
        paymentId = pay.id;
      } else {
        const errMsg = pay.errors ? pay.errors.map((e: any) => e.description).join(', ') : 'Erro ao gerar pagamento no gateway';
        return NextResponse.json({ error: errMsg }, { status: 400 });
      }
    }

    await prisma.sale.update({
      where: { id: sale.id },
      data: { payment_link: paymentLink, payment_id: paymentId },
    });

    return NextResponse.json({
      success: true,
      saleId: sale.id,
      leadId: lead.id,
      paymentLink,
      paymentId,
    });
  } catch (error: any) {
    console.error('[Checkout API Error]', error);
    return NextResponse.json({ error: 'Erro ao processar checkout' }, { status: 400 });
  }
}
