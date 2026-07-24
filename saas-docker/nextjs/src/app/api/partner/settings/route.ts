import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'partner') {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const partner = await prisma.partner.findUnique({
      where: { id: session.id },
      select: { settings: true },
    });

    if (!partner) return NextResponse.json({ error: "Parceiro não encontrado" }, { status: 404 });

    let settings: Record<string, unknown> = {};
    try { settings = JSON.parse(partner.settings as string); } catch {}

    const SECRET_KEYS = [
      "openai_api_key","groq_api_key","gemini_api_key","openai_key",
      "asaas_api_key","asaas_test_api_key","asaas_webhook_secret",
      "mercadopago_access_token","mercadopago_test_access_token","mercadopago_token","asaasApiKey"
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

    return NextResponse.json({ settings: safeSettings });
  } catch (err) {
    console.error("GET /api/partner/settings:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'partner') {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();

    const partner = await prisma.partner.findUnique({
      where: { id: session.id },
      select: { settings: true },
    });

    let currentSettings: Record<string, unknown> = {};
    try { currentSettings = JSON.parse(partner?.settings as string ?? "{}"); } catch {}

    const SECRET_KEYS = [
      "openai_api_key","groq_api_key","gemini_api_key","openai_key",
      "asaas_api_key","asaas_test_api_key","asaas_webhook_secret",
      "mercadopago_access_token","mercadopago_test_access_token","mercadopago_token","asaasApiKey"
    ];

    // Restaura chaves mascaradas recebidas do frontend
    for (const key of SECRET_KEYS) {
      if (key in body && /^.{0,4}•+.{0,4}$/.test(String(body[key]))) {
        body[key] = currentSettings[key] ?? "";
      }
    }

    const newSettings = { ...currentSettings, ...body };

    await prisma.partner.update({
      where: { id: session.id },
      data: { settings: JSON.stringify(newSettings) },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/partner/settings:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
