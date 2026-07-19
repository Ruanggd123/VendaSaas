import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

// Chaves de pagamento que estamos gerenciando
const PAYMENT_KEYS = [
  "payment_provider",        // "asaas" | "mercadopago" | "stripe"
  "asaas_api_key",
  "asaas_webhook_secret",
  "mercadopago_access_token",
  "stripe_secret_key",
  "stripe_webhook_secret",
  "plan_solo_price",
  "plan_pro_price",
  "plan_business_price",
  "auto_charge_enabled",
  "auto_charge_days",
  "late_fee_percent",
];

// GET — retorna configurações de pagamento (somente super_admin)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    // Verifica se é super_admin
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (user?.role !== "super_admin") {
      return NextResponse.json({ error: "Acesso restrito ao Super Admin" }, { status: 403 });
    }

    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: PAYMENT_KEYS } },
    });

    const result: Record<string, string> = {};
    for (const config of configs) {
      // Mascarar chaves sensíveis na exibição
      if (config.key.includes("key") || config.key.includes("token") || config.key.includes("secret")) {
        const val = config.value;
        result[config.key] = val.length > 8 ? `${val.substring(0, 4)}${"•".repeat(val.length - 8)}${val.substring(val.length - 4)}` : "••••••••";
      } else {
        result[config.key] = config.value;
      }
    }

    return NextResponse.json({ configs: result });
  } catch (err) {
    console.error("GET /api/settings/payment:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PUT — salva configurações de pagamento (somente super_admin)
export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (user?.role !== "super_admin") {
      return NextResponse.json({ error: "Acesso restrito ao Super Admin" }, { status: 403 });
    }

    const body = await req.json();

    // Salva cada chave individualmente usando upsert
    const updates = Object.entries(body).filter(([key]) => PAYMENT_KEYS.includes(key));
    
    await Promise.all(
      updates.map(([key, value]) =>
        prisma.systemConfig.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/settings/payment:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST — testa a conexão com a API de pagamento
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (user?.role !== "super_admin") {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    const { provider } = await req.json();

    if (provider === "asaas") {
      const config = await prisma.systemConfig.findUnique({ where: { key: "asaas_api_key" } });
      if (!config?.value) return NextResponse.json({ error: "API Key não configurada" }, { status: 400 });

      const res = await fetch("https://api.asaas.com/v3/customers?limit=1", {
        headers: { access_token: config.value },
      });
      if (res.ok) return NextResponse.json({ success: true, message: "Conexão com Asaas OK!" });
      return NextResponse.json({ error: "Chave inválida ou erro na API Asaas" }, { status: 400 });
    }

    if (provider === "mercadopago") {
      const config = await prisma.systemConfig.findUnique({ where: { key: "mercadopago_access_token" } });
      if (!config?.value) return NextResponse.json({ error: "Access Token não configurado" }, { status: 400 });

      const res = await fetch("https://api.mercadopago.com/v1/payment_methods", {
        headers: { Authorization: `Bearer ${config.value}` },
      });
      if (res.ok) return NextResponse.json({ success: true, message: "Conexão com Mercado Pago OK!" });
      return NextResponse.json({ error: "Token inválido ou erro na API Mercado Pago" }, { status: 400 });
    }

    return NextResponse.json({ error: "Provedor não suportado" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/settings/payment:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
