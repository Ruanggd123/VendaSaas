import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("🔔 [Webhook SaaS Assinaturas] Recebido evento:", body.event);

    // O Asaas envia um evento PAYMENT_RECEIVED ou PAYMENT_CONFIRMED para as mensalidades da sua empresa SaaS
    if (body.event === "PAYMENT_RECEIVED" || body.event === "PAYMENT_CONFIRMED") {
      const externalRef = body.payment?.externalReference; // Esperado: "tenantId_saas_plan"

      if (externalRef && externalRef.includes("_saas_plan")) {
        const tenantId = externalRef.split("_")[0];

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        
        if (tenant) {
          // Calcula a nova data de validade (+30 dias)
          const currentExpiry = tenant.subscription_expires_at > new Date() ? tenant.subscription_expires_at : new Date();
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
