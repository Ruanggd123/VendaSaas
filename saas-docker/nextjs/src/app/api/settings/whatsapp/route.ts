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
        "openai_api_key","groq_api_key","gemini_api_key","deepseek_api_key",
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

    if (!Array.isArray(settings.products)) settings.products = [];

    // Mascarar chaves secretas antes de enviar ao frontend
    const SECRET_KEYS = [
      "openai_api_key", "groq_api_key", "gemini_api_key", "deepseek_api_key",
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
      "openai_api_key","groq_api_key","gemini_api_key","deepseek_api_key",
      "asaas_api_key","asaas_test_api_key","asaas_webhook_secret",
      "mercadopago_access_token","mercadopago_test_access_token","mercadopago_token","openai_key","asaasApiKey"
    ];

    // Whitelist de chaves permitidas para evitar mass assignment
    const ALLOWED_KEYS = new Set([
      "ai_name","ai_prompt","ia_prompt","prompt","bot_type",
      "ai_personality","ia_model",
      "business_hours_start","business_hours_end","business_days",
      "schedule_per_day","appointment_gap_min","blocked_dates",
      "off_hours_message","enable_off_hours_message","welcome_message","hide_auto_catalog","welcome_menu_auto_append","interactive_poll_enabled","enableScheduling",
      "manager_phone","ignored_numbers","products",
      "enable_groups","whitelisted_groups",
      "custom_rules_nodes",
      // Módulos ativos (scheduling, payments, debt, reminders, hybrid, google_calendar)
      "module_scheduling","module_payments","module_debt_collection","module_reminders","module_hybrid_mode","module_google_calendar",
      // Configuração de pagamento (Asaas/MercadoPago)
      "payment_provider","asaas_mode","mercadopago_mode",
      "asaas_environment_key",
      "plan_solo_price","plan_pro_price","plan_enterprise_price",
      "auto_charge_enabled","late_fee_percent",
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

    // Preserva ignored_numbers se não enviado no body para evitar zerar a lista negra
    if (!("ignored_numbers" in body) && (currentSettings as any).ignored_numbers) {
      body.ignored_numbers = (currentSettings as any).ignored_numbers;
    }

    const newSettings = { ...currentSettings, ...body };

    await prisma.tenant.update({
      where: { id: session.tenant_id },
      data: { settings: JSON.stringify(newSettings) },
    });

    const apiKeyToSetup = newSettings.asaasApiKey || newSettings.asaas_api_key || newSettings.asaas_test_api_key;
    const environment = newSettings.asaasEnvironment || newSettings.asaas_mode || "sandbox";
    if (apiKeyToSetup) {
      const { autoConfigureAsaasWebhook } = await import("@/lib/asaas");
      void autoConfigureAsaasWebhook(String(apiKeyToSetup), String(environment), session.email);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/settings/whatsapp:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
