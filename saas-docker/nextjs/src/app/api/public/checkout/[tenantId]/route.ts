import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createCustomer, createPayment, createSubscription, getSubscriptionPayments } from '@/lib/asaas';
import { createPreference } from '@/lib/mercadopago';
import { getProductPrice } from '@/lib/currency';
import { getPlanDetails } from '@/lib/plans';

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

export async function GET(req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const { tenantId } = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, settings: true, plan: true }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 });
    }

    // Plano Start não inclui loja/e-commerce/agenda: loja indisponível
    if (!getPlanDetails(tenant.plan).hasEcommerce && !getPlanDetails(tenant.plan).hasSite) {
      return NextResponse.json(
        { error: 'Este comércio ainda não está disponível para o seu plano. Faça upgrade para liberar a loja.' },
        { status: 403 }
      );
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

export async function POST(req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  let operationId: string | null = null;
  try {
    const { tenantId } = await params;
    const { name, phone, email, referralCode, productName, amount, isSubscription, billingType, cart, scheduled_at, retailOrderId } = await req.json();

    if (!name || !phone || !productName || !amount) {
      return NextResponse.json({ error: 'Nome, telefone, produto e valor são obrigatórios' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 });
    }

    // Plano Start não tem loja/agenda: bloqueia criação de pedidos
    const plan = getPlanDetails(tenant.plan);
    if (!plan.hasEcommerce && !plan.hasSite) {
      return NextResponse.json(
        { error: 'Este comércio ainda não está disponível para o seu plano. Faça upgrade para liberar a loja.' },
        { status: 403 }
      );
    }

    const realTenantId = tenant.id;

    const normalizedPhone = phone.replace(/\D/g, '');

    let settings: any = {};
    try { settings = JSON.parse(tenant.settings as string); } catch {}

    const configuredProducts: any[] = Array.isArray(settings.products) ? settings.products : [];
    const authoritativeAmount = Array.isArray(cart) && cart.length > 0
      ? cart.reduce((sum: number, item: any) => {
          const baseName = String(item.name || "").replace(/\s+-\s+(Mensal|Setup)$/i, "");
          const product = configuredProducts.find((candidate: any) => String(candidate.name || "") === baseName);
          if (!product) return Number.NaN;
          const value = getProductPrice(product);
          return sum + value * Number(item.qty || 1);
        }, 0)
      : (() => {
          const product = configuredProducts.find((candidate: any) => productName.startsWith(String(candidate.name || "")));
          return product ? getProductPrice(product) : Number.NaN;
        })();
    if (!Number.isFinite(authoritativeAmount) || Math.abs(authoritativeAmount - parsedAmount) > 0.01) {
      return NextResponse.json({ error: "O valor do produto mudou. Atualize a página e tente novamente." }, { status: 409 });
    }

    const requestIdempotencyKey = req.headers.get("idempotency-key") || (retailOrderId ? `retail_${retailOrderId}` : "");
    if (!requestIdempotencyKey) return NextResponse.json({ error: "Chave de idempotência obrigatória" }, { status: 400 });
    const idempotencyKey = `checkout_${realTenantId}_${requestIdempotencyKey}`;
    const previousOperation = await prisma.paymentOperation.findUnique({ where: { idempotency_key: idempotencyKey } });
    if (previousOperation?.status === "completed" && previousOperation.result) return NextResponse.json(JSON.parse(previousOperation.result));
    if (previousOperation?.status === "processing" && previousOperation.updated_at > new Date(Date.now() - 5 * 60 * 1000)) {
      return NextResponse.json({ error: "Checkout já está sendo processado" }, { status: 409 });
    }
    const operation = previousOperation
      ? await prisma.paymentOperation.update({ where: { id: previousOperation.id }, data: { status: "processing" } })
      : await prisma.paymentOperation.create({ data: { tenant_id: realTenantId, idempotency_key: idempotencyKey, kind: "public_checkout" } });
    operationId = operation.id;
    const completeCheckout = async (payload: Record<string, unknown>) => {
      await prisma.paymentOperation.update({
        where: { id: operation.id },
        data: { status: "completed", result: JSON.stringify(payload), provider_id: String(payload.paymentId || "") || null },
      });
      return NextResponse.json(payload);
    };
    const failCheckout = async (error: string, status = 400) => {
      await prisma.paymentOperation.update({
        where: { id: operation.id },
        data: { status: "failed", result: JSON.stringify({ error }) },
      });
      return NextResponse.json({ error }, { status });
    };

    let partnerId: string | undefined;
    if (referralCode) {
      const partner = await prisma.partner.findFirst({
        where: { referralCode: referralCode.toUpperCase(), tenant_id: realTenantId }
      });
      if (partner) partnerId = partner.id;
    }

    const existingSale = operation.sale_id
      ? await prisma.sale.findUnique({ where: { id: operation.sale_id } })
      : null;
    const existingLead = existingSale?.lead_id
      ? await prisma.lead.findUnique({ where: { id: existingSale.lead_id } })
      : null;
    const lead = existingLead || await prisma.lead.create({
      data: {
        tenant_id: realTenantId,
        name,
        phone,
        email,
        status: 'NEW',
        interested_product: productName,
        value: parsedAmount,
        source: 'checkout',
        partner_id: partnerId,
        notes: cart ? JSON.stringify(cart) : null,
      }
    });

    let shippingAddress = '';
    if (retailOrderId) {
      const retailOrder = await prisma.retailOrder.findUnique({ where: { id: retailOrderId } });
      if (retailOrder) {
        shippingAddress = retailOrder.shipping_address || '';
        // Link lead to the retail order
        await prisma.retailOrder.update({
          where: { id: retailOrderId },
          data: { lead_id: lead.id }
        });
      }
    }

    const notesData: any = {
      customer_phone: normalizedPhone,
    };
    if (cart) notesData.cart = cart;
    if (scheduled_at) notesData.scheduled_at = scheduled_at;
    if (shippingAddress) notesData.shipping_address = shippingAddress;

    const sale = existingSale || await prisma.sale.create({
      data: {
        tenant_id: realTenantId,
        lead_id: lead.id,
        product_name: productName,
        amount: parsedAmount,
        notes: Object.keys(notesData).length > 0 ? JSON.stringify(notesData) : null,
        status: 'pending',
        retail_order_id: retailOrderId || null,
        due_date: new Date(Date.now() + (isSubscription ? 30 : 7) * 86400000),
      }
    });
    if (!operation.sale_id) {
      await prisma.paymentOperation.update({ where: { id: operation.id }, data: { sale_id: sale.id } });
    }

    // Calculate monthly-only amount from cart
    const monthlyAmount = Array.isArray(cart)
      ? cart.filter((i: any) => i.type === 'subscription' && !i.isBonus).reduce((s: number, i: any) => s + (parseFloat(i.price) || 0), 0)
      : 0;
    const totalAmount = parsedAmount;

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

      return completeCheckout({
        success: true,
        saleId: sale.id,
        leadId: lead.id,
        paymentLink,
        paymentId: pref.id,
        paymentMethod: 'MP',
        pixQrCodeUrl: '',
        pixCopiaECola: '',
        bankSlipUrl: '',
        invoiceUrl: '',
      });
    }

    // Asaas gateway resolution
    let asaasKey = settings.asaas_api_key
      || settings.asaasApiKey
      || settings.asaas_test_api_key
      || settings.asaasTestApiKey
      || settings.asaas_environment_key;

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
      return failCheckout(errMsg);
    }

    let paymentLink = '';
    let paymentId = '';
    const paymentMethod = billingType || 'PIX';
    let pixQrCodeUrl = '';
    let pixCopiaECola = '';
    let bankSlipUrl = '';
    let invoiceUrl = '';

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
        }, asaasKey, asaasUrl, `${idempotencyKey}_first`);
        if (firstPay.id) {
          paymentLink = firstPay.invoiceUrl || firstPay.bankSlipUrl || firstPay.pixQrCodeUrl || '';
          paymentId = firstPay.id;
          pixQrCodeUrl = firstPay.pixQrCodeUrl || '';
          pixCopiaECola = firstPay.pixCopiaECola || '';
          bankSlipUrl = firstPay.bankSlipUrl || '';
          invoiceUrl = firstPay.invoiceUrl || '';
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
          return failCheckout(errMsg);
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
            pixQrCodeUrl = fp.pixQrCodeUrl || '';
            pixCopiaECola = fp.pixCopiaECola || '';
            bankSlipUrl = fp.bankSlipUrl || '';
            invoiceUrl = fp.invoiceUrl || '';
          }
          await prisma.sale.update({
            where: { id: sale.id },
            data: { is_recurring: true, subscription_id: sub.id, payment_link: paymentLink, payment_id: paymentId },
          });
        } else {
          const errMsg = sub.errors ? sub.errors.map((e: any) => e.description).join(', ') : 'Erro ao criar assinatura no gateway';
          return failCheckout(errMsg);
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
      }, asaasKey, asaasUrl, `${idempotencyKey}_payment`);

      if (pay.id) {
        paymentLink = pay.invoiceUrl || pay.bankSlipUrl || pay.pixQrCodeUrl || '';
        paymentId = pay.id;
        pixQrCodeUrl = pay.pixQrCodeUrl || '';
        pixCopiaECola = pay.pixCopiaECola || '';
        bankSlipUrl = pay.bankSlipUrl || '';
        invoiceUrl = pay.invoiceUrl || '';
      } else {
        const errMsg = pay.errors ? pay.errors.map((e: any) => e.description).join(', ') : 'Erro ao gerar pagamento no gateway';
        return failCheckout(errMsg);
      }
    }

    await prisma.sale.update({
      where: { id: sale.id },
      data: { payment_link: paymentLink, payment_id: paymentId },
    });

    return completeCheckout({
      success: true,
      saleId: sale.id,
      leadId: lead.id,
      paymentLink,
      paymentId,
      paymentMethod,
      pixQrCodeUrl,
      pixCopiaECola,
      bankSlipUrl,
      invoiceUrl,
    });
  } catch (error: any) {
    console.error('[Checkout API Error]', error);
    if (operationId) {
      await prisma.paymentOperation.update({
        where: { id: operationId },
        data: { status: "failed", result: JSON.stringify({ error: error?.message || "Erro ao processar checkout" }) },
      }).catch((updateError) => console.error('[Checkout operation update error]', updateError));
    }
    return NextResponse.json({ error: 'Erro ao processar checkout' }, { status: 400 });
  }
}
