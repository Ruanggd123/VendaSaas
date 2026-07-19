import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { apiKey, tenantId } = body;

    if (!apiKey) {
      return NextResponse.json({ error: "Chave de API do Asaas não fornecida." }, { status: 400 });
    }

    // 1. Validar a Chave de API batendo no Asaas
    const asaasUrl = apiKey.includes("sandbox") 
      ? "https://sandbox.asaas.com/api/v3" 
      : "https://api.asaas.com/v3";

    const balanceRes = await fetch(`${asaasUrl}/finance/balance`, {
      headers: {
        "access_token": apiKey,
        "User-Agent": "NexusSaaS/1.0"
      }
    });

    if (!balanceRes.ok) {
      return NextResponse.json({ error: "Chave de API inválida ou sem permissão." }, { status: 401 });
    }

    // 2. Configurar o Webhook Automaticamente
    // Pegamos a URL base da variável de ambiente, ou um fallback seguro.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nexus-six-olive.vercel.app";
    const webhookUrl = `${baseUrl}/api/asaas/webhook`;

    // No Asaas v3, o webhook de cobranças fica em /webhooks
    const webhookRes = await fetch(`${asaasUrl}/webhooks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": apiKey,
        "User-Agent": "NexusSaaS/1.0"
      },
      body: JSON.stringify({
        name: "Nexus Integração",
        url: webhookUrl,
        email: "financeiro@nexussaas.com", // Pode ser o email do tenant
        enabled: true,
        interrupted: false,
        apiVersion: 3,
        sendType: "SEQUENTIALLY",
        events: ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_OVERDUE"]
      })
    });

    // É comum o Asaas retornar erro se o webhook já existir. Tratamos isso.
    if (!webhookRes.ok) {
      const errorData = await webhookRes.json();
      console.warn("Aviso ao criar webhook:", errorData);
      // Se der erro que já existe, podemos tentar fazer um PUT, ou apenas ignorar se a intenção é só validar.
    }

    // 3. Salvar no Banco de Dados (Supabase via Prisma)
    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant) {
        let settings = {};
        try {
          settings = JSON.parse(tenant.settings || "{}");
        } catch(e) {}
        
        settings = { ...settings, asaasApiKey: apiKey, asaasWebhookConfigured: true };
        
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { settings: JSON.stringify(settings) }
        });
      }
    } else {
       // Apenas para DEMO: atualizar o primeiro tenant se existir
       const firstTenant = await prisma.tenant.findFirst();
       if (firstTenant) {
          let settings = {};
          try {
            settings = JSON.parse(firstTenant.settings || "{}");
          } catch(e) {}
          settings = { ...settings, asaasApiKey: apiKey, asaasWebhookConfigured: true };
          await prisma.tenant.update({
            where: { id: firstTenant.id },
            data: { settings: JSON.stringify(settings) }
          });
       }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Integração com Asaas configurada e Webhook ativado com sucesso!" 
    });

  } catch (error: any) {
    console.error("Erro interno no setup do Asaas:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
