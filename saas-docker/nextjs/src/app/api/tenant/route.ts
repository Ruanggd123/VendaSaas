import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const phone = searchParams.get('phone')
  const instance = searchParams.get('instance')

  try {
    let tenant

    if (phone) {
      tenant = await prisma.tenant.findUnique({
        where: { phone }
      })
    } else if (instance) {
      tenant = await prisma.tenant.findFirst({
        where: { whatsapp_instance: instance }
      })
    } else {
      // Fallback para sessão logada (onboarding/settings)
      const session = await getSession();
      if (session?.tenantId) {
        tenant = await prisma.tenant.findUnique({
          where: { id: session.tenantId }
        });
      }
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })
    }

    // Verifica a Trava de Segurança Financeira
    if (tenant.status !== "active") {
      return NextResponse.json({
        error: "Bloqueio financeiro.",
        message: "O plano deste cliente está inativo. A IA não deve responder.",
        status: tenant.status
      }, { status: 403 });
    }

    // Converte a string JSON de volta para objeto (específico para nossa arquitetura SQLite atual)
    let parsedSettings = {};
    try {
      parsedSettings = JSON.parse(tenant.settings as string);
    } catch (e) {
      console.warn("Falha ao ler o JSON de configurações do tenant", tenant.id);
    }

    // Remove chaves secretas quando não há sessão (ex: n8n webhook)
    const SECRET_KEYS = [
      "openai_api_key","groq_api_key","gemini_api_key",
      "asaas_api_key","asaas_test_api_key","asaas_webhook_secret",
      "mercadopago_access_token","mercadopago_test_access_token","mercadopago_token","openai_key","asaasApiKey"
    ];
    const safeSettings = { ...parsedSettings as Record<string, unknown> };
    for (const key of SECRET_KEYS) {
      delete safeSettings[key];
    }

    // Retorna tudo mastigado para o n8n
    return NextResponse.json({
      tenant_id: tenant.id,
      name: tenant.name,
      plan: tenant.plan,
      settings: safeSettings,
    })
  } catch (error) {
    console.error("Erro na API do Tenant:", error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Mantendo o suporte a POST caso o webhook envie no body
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceName, phone } = body;
    
    let tenant;
    if (instanceName) {
      tenant = await prisma.tenant.findFirst({ where: { whatsapp_instance: instanceName } });
    } else if (phone) {
      tenant = await prisma.tenant.findUnique({ where: { phone: phone } });
    }

    if (!tenant) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    if (tenant.status !== "active") return NextResponse.json({ error: "Bloqueio financeiro." }, { status: 403 });

    let parsedSettings = {};
    try { parsedSettings = JSON.parse(tenant.settings as string); } catch (e) {}

    const safeSettings = { ...parsedSettings as Record<string, unknown> };
    for (const key of ["openai_api_key","groq_api_key","gemini_api_key","asaas_api_key","asaas_test_api_key","asaas_webhook_secret","mercadopago_access_token","mercadopago_test_access_token","mercadopago_token","openai_key","asaasApiKey"]) {
      delete safeSettings[key];
    }
    return NextResponse.json({ tenant_id: tenant.id, name: tenant.name, plan: tenant.plan, settings: safeSettings });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}



export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (session.role === 'partner') {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { settings, name } = body;

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;
    if (settings) dataToUpdate.settings = JSON.stringify(settings);

    const updated = await prisma.tenant.update({
      where: { id: session.tenantId },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no PATCH /api/tenant:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
