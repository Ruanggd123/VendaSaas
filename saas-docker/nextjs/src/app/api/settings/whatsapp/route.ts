import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

// GET — busca as configurações de IA do tenant logado
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    // Parceiro: retorna APENAS settings próprios (sem merge com tenant)
    if (session.role === 'partner') {
      const partner = await prisma.partner.findUnique({
        where: { id: session.id },
        select: { settings: true },
      });

      let partnerSettings: Record<string, unknown> = {};
      try { partnerSettings = JSON.parse(partner?.settings as string); } catch {}

      // Mascarar chaves secretas também para parceiros
      const SECRET_KEYS = [
        "openai_api_key","groq_api_key","gemini_api_key",
        "asaas_api_key","asaas_test_api_key","asaas_webhook_secret",
        "mercadopago_access_token","mercadopago_test_access_token","mercadopago_token","openai_key","asaasApiKey"
      ];
      const safePartner = { ...partnerSettings };
      for (const key of SECRET_KEYS) {
        if (safePartner[key]) {
          const val = String(safePartner[key]);
          safePartner[key] = val.length > 8
            ? `${val.substring(0, 4)}${"•".repeat(val.length - 8)}${val.substring(val.length - 4)}`
            : "••••••••";
        }
      }

      return NextResponse.json({ settings: safePartner, tenantId: session.tenant_id, isPartner: true });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenant_id },
      select: { settings: true },
    });

    if (!tenant) return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });

    let settings: any = {};
    try {
      settings = JSON.parse(tenant.settings as string);
    } catch {}

    if (!settings.products || settings.products.length === 0) {
      settings.products = [
        {
          name: "Plano Solo (1 Conexão WhatsApp)",
          price: "147.00",
          description: "Atendimento inteligente automatizado para 1 número de WhatsApp com IA Vendedora e Agendamentos.",
          duration_min: 30,
          requires_payment: true,
          delivery_type: "virtual_instant",
          digital_content: "Acesso liberado no painel Nexus SaaS para 1 instância."
        },
        {
          name: "Plano Pro (3 Conexões WhatsApp)",
          price: "297.00",
          description: "Automação completa para até 3 números de WhatsApp, disparo em massa e suporte prioritário.",
          duration_min: 30,
          requires_payment: true,
          delivery_type: "virtual_instant",
          digital_content: "Acesso liberado para 3 instâncias com suporte VIP."
        },
        {
          name: "Plano Enterprise (Conexões Ilimitadas)",
          price: "497.00",
          description: "Solução completa para grandes empresas com instâncias ilimitadas, API dedicada e gerente de conta.",
          duration_min: 60,
          requires_payment: true,
          delivery_type: "virtual_instant",
          digital_content: "Acesso Enterprise com onboarding individualizado."
        },
        {
          name: "Módulo IA Vendedora Avançada",
          price: "97.00",
          description: "IA conversacional persuasiva com catálogo dinâmico e integração direta com fechamento de vendas.",
          duration_min: 15,
          requires_payment: true,
          delivery_type: "virtual_instant",
          digital_content: "Módulo ativado nas configurações da sua empresa."
        },
        {
          name: "Instância Adicional WhatsApp",
          price: "49.90",
          description: "Adicione mais 1 número de WhatsApp à sua automação conversacional.",
          duration_min: 15,
          requires_payment: true,
          delivery_type: "virtual_instant",
          digital_content: "Nova instância liberada na aba Conexões WhatsApp."
        }
      ];
    }

    // Mascarar chaves secretas antes de enviar ao frontend
    const SECRET_KEYS = [
      "openai_api_key", "groq_api_key", "gemini_api_key",
      "asaas_api_key", "asaas_test_api_key", "asaas_webhook_secret",
      "mercadopago_access_token", "mercadopago_test_access_token", "mercadopago_token",
      "openai_key", "asaasApiKey"
    ];
    const safeSettings = { ...settings };
    for (const key of SECRET_KEYS) {
      if (safeSettings[key]) {
        const val = String(safeSettings[key]);
        safeSettings[key] = val.length > 8
          ? `${val.substring(0, 4)}${"•".repeat(val.length - 8)}${val.substring(val.length - 4)}`
          : "••••••••";
      }
    }

    return NextResponse.json({ settings: safeSettings, tenantId: session.tenant_id });
  } catch (err) {
    console.error("GET /api/settings/whatsapp:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PUT — salva as configurações de IA do tenant logado
export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();

    const SECRET_KEYS = [
      "openai_api_key","groq_api_key","gemini_api_key",
      "asaas_api_key","asaas_test_api_key","asaas_webhook_secret",
      "mercadopago_access_token","mercadopago_test_access_token","mercadopago_token","openai_key","asaasApiKey"
    ];

    // Whitelist de chaves permitidas para evitar mass assignment
    const ALLOWED_KEYS = new Set([
      "ai_name","ai_prompt","ia_prompt","prompt","bot_type",
      "business_hours_start","business_hours_end","off_hours_message",
      "manager_phone","ignored_numbers","products",
      ...SECRET_KEYS,
    ]);
    for (const key of Object.keys(body)) {
      if (!ALLOWED_KEYS.has(key)) {
        delete body[key];
      }
    }

    // Parceiro: salva nos settings próprios, não no tenant
    if (session.role === 'partner') {
      const partner = await prisma.partner.findUnique({
        where: { id: session.id },
        select: { settings: true },
      });

      let currentSettings = {};
      try { currentSettings = JSON.parse(partner?.settings as string ?? "{}"); } catch {}

      // Restaura chaves mascaradas — se o frontend enviou "••••••••", mantém o valor atual
      for (const key of SECRET_KEYS) {
        if (key in body && /^.{0,4}•+.{0,4}$/.test(String(body[key]))) {
          body[key] = currentSettings[key as keyof typeof currentSettings] ?? "";
        }
      }

      const newSettings = { ...currentSettings, ...body };

      await prisma.partner.update({
        where: { id: session.id },
        data: { settings: JSON.stringify(newSettings) },
      });

      return NextResponse.json({ success: true, isPartner: true });
    }

    // Busca as configurações atuais para fazer merge
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenant_id },
      select: { settings: true },
    });

    let currentSettings = {};
    try {
      currentSettings = JSON.parse(tenant?.settings as string ?? "{}");
    } catch {}

    // Restaura chaves mascaradas
    for (const key of SECRET_KEYS) {
      if (key in body && /^.{0,4}•+.{0,4}$/.test(String(body[key]))) {
        body[key] = currentSettings[key as keyof typeof currentSettings] ?? "";
      }
    }

    const newSettings = { ...currentSettings, ...body };

    await prisma.tenant.update({
      where: { id: session.tenant_id },
      data: { settings: JSON.stringify(newSettings) },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/settings/whatsapp:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
