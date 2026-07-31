import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSession } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { apiKey, tenantId, environment = "sandbox" } = body;

    if (!apiKey) {
      return NextResponse.json({ error: "Chave de API do Asaas não fornecida." }, { status: 400 });
    }

    const targetTenantId = tenantId || session.tenant_id;
    if (!targetTenantId) {
      return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
    }

    // Apenas superadmin pode configurar Asaas para outro tenant
    if (tenantId && tenantId !== session.tenant_id && session.role !== 'superadmin') {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
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

    const { autoConfigureAsaasWebhook } = await import("@/lib/asaas");
    await autoConfigureAsaasWebhook(apiKey, environment, session.email);

    // 3. Salvar no Banco de Dados (Supabase via Prisma)
    const tenant = await prisma.tenant.findUnique({ where: { id: targetTenantId } });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });
    }
    let settings = {};
    try { settings = JSON.parse(tenant.settings || "{}"); } catch(e) {}
    settings = {
      ...settings,
      asaasApiKey: apiKey,
      asaas_environment_key: apiKey,
      asaasApiKeyMode: environment,
      asaasEnvironment: environment,
      asaasWebhookConfigured: true,
      asaasConnectedAt: new Date().toISOString(),
      ...(environment === 'production'
        ? { asaas_api_key: apiKey }
        : { asaas_test_api_key: apiKey }),
    };
    await prisma.tenant.update({
      where: { id: targetTenantId },
      data: { settings: JSON.stringify(settings) }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Integração com Asaas (${environment === "production" ? "Produção" : "Sandbox"}) configurada com Webhook ativado!`,
      balance: balanceData.balance ?? null
    });

  } catch (error: any) {
    console.error("[Asaas Setup] Erro interno:", error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
