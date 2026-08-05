import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isAuthorized(req: Request): boolean {
  // Se SAAS_WEBHOOK_SECRET estiver configurado, exige o header — o integrador
  // externo (n8n/Asaas) deve enviar x-saas-webhook-secret.
  const secret = process.env.SAAS_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers.get("x-saas-webhook-secret");
    return !!provided && provided === secret;
  }
  // Sem segredo configurado: aceita por compatibilidade, mas alerta.
  console.warn("⚠️ [Webhook SaaS] SAAS_WEBHOOK_SECRET não configurado — chamadas sem autenticação serão aceitas. Configure o segredo em produção.");
  return true;
}

export async function POST(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    console.log("🔔 [Webhook SaaS Assinaturas] Recebido evento:", body.event);

    // O Asaas envia um evento PAYMENT_RECEIVED ou PAYMENT_CONFIRMED para as mensalidades da sua empresa SaaS
    if (body.event === "PAYMENT_RECEIVED" || body.event === "PAYMENT_CONFIRMED") {
      const externalRef = body.payment?.externalReference; // Esperado: "tenantId_saas_plan"

      if (externalRef && /^[0-9a-f-]{36}_saas_plan/i.test(String(externalRef))) {
        const tenantId = String(externalRef).split("_")[0];

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        
        if (tenant) {
          // Calcula a nova data de validade (+30 dias)
          const currentExpiry = tenant.subscription_expires_at && tenant.subscription_expires_at > new Date()
            ? tenant.subscription_expires_at
            : new Date();
          const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);

          await prisma.tenant.update({
            where: { id: tenantId },
            data: { subscription_expires_at: newExpiry }
          });

          console.log(`✅ [Webhook SaaS] Assinatura do cliente ${tenant.name} renovada até ${newExpiry.toLocaleDateString('pt-BR')}!`);
        }
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (err) {
    console.error("❌ [Webhook SaaS] Erro:", err);
    return NextResponse.json({ error: "Erro interno no webhook" }, { status: 500 });
  }
}
