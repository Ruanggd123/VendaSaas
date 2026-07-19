import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { apiKey, tenantId, environment = "sandbox" } = body;

    if (!apiKey) {
      return NextResponse.json({ error: "Chave de API do Asaas não fornecida." }, { status: 400 });
    }

    // 1. Validar a Chave de API batendo no Asaas
    const asaasUrl = environment === "production"
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/api/v3";

    console.log(`[Asaas Setup] Tentando conectar ao ambiente: ${environment} (${asaasUrl})`);

    const balanceRes = await fetch(`${asaasUrl}/finance/balance`, {
      headers: {
        "access_token": apiKey,
        "Content-Type": "application/json",
        "User-Agent": "NexusSaaS/1.0"
      }
    });

    if (!balanceRes.ok) {
      const errorBody = await balanceRes.text();
      console.error(`[Asaas Setup] Erro de validação (${balanceRes.status}):`, errorBody);
      return NextResponse.json({ 
        error: `Chave de API inválida ou sem permissão. (Código: ${balanceRes.status}). Verifique se você selecionou o ambiente correto.` 
      }, { status: 401 });
    }

    const balanceData = await balanceRes.json();
    console.log("[Asaas Setup] Saldo atual:", balanceData.balance);

    // 2. Configurar o Webhook Automaticamente
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nexus-six-olive.vercel.app";
    const webhookUrl = `${baseUrl}/api/asaas/webhook`;

    const webhookRes = await fetch(`${asaasUrl}/webhooks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": apiKey,
        "User-Agent": "NexusSaaS/1.0"
      },
      body: JSON.stringify({
        name: "Nexus Integracao",
        url: webhookUrl,
        email: "financeiro@nexussaas.com",
        enabled: true,
        interrupted: false,
        apiVersion: 3,
        sendType: "SEQUENTIALLY",
        events: ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_OVERDUE"]
      })
    });

    let webhookOk = webhookRes.ok;
    let webhookMsg = "";
    if (!webhookRes.ok) {
      const wErr = await webhookRes.text();
      console.warn("[Asaas Setup] Aviso ao criar webhook (pode já existir):", wErr);
      webhookMsg = " (Webhook já configurado ou ignorado — verifique no painel Asaas se necessário)";
    } else {
      console.log("[Asaas Setup] Webhook criado com sucesso!");
    }

    // 3. Salvar no Banco de Dados (Supabase via Prisma)
    const targetTenantId = tenantId;
    if (targetTenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: targetTenantId } });
      if (tenant) {
        let settings = {};
        try { settings = JSON.parse(tenant.settings || "{}"); } catch(e) {}
        settings = { 
          ...settings, 
          asaasApiKey: apiKey, 
          asaasEnvironment: environment,
          asaasWebhookConfigured: true,
          asaasWebhookUrl: webhookUrl,
          asaasConnectedAt: new Date().toISOString()
        };
        await prisma.tenant.update({
          where: { id: targetTenantId },
          data: { settings: JSON.stringify(settings) }
        });
      }
    } else {
      // Fallback: atualizar o primeiro tenant (para demo)
      const firstTenant = await prisma.tenant.findFirst();
      if (firstTenant) {
        let settings = {};
        try { settings = JSON.parse(firstTenant.settings || "{}"); } catch(e) {}
        settings = { 
          ...settings, 
          asaasApiKey: apiKey, 
          asaasEnvironment: environment,
          asaasWebhookConfigured: true,
          asaasWebhookUrl: webhookUrl,
          asaasConnectedAt: new Date().toISOString()
        };
        await prisma.tenant.update({
          where: { id: firstTenant.id },
          data: { settings: JSON.stringify(settings) }
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Integração com Asaas (${environment === "production" ? "Produção" : "Sandbox"}) configurada! Webhook ativado em ${webhookUrl}.${webhookMsg}`,
      balance: balanceData.balance ?? null
    });

  } catch (error: any) {
    console.error("[Asaas Setup] Erro interno:", error);
    return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
