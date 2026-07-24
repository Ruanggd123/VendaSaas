import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { instanceName, settings } = await req.json();
    if (!instanceName || !settings) {
      return NextResponse.json({ error: "instanceName e settings obrigatórios" }, { status: 400 });
    }

    const instance = await prisma.whatsappInstance.findUnique({
      where: { name: instanceName },
    });

    if (!instance || instance.tenant_id !== session.tenant_id) {
      return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 });
    }

    if (session.role === 'partner' && instance.partner_id !== session.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    let currentSettings: any = {};
    try { currentSettings = JSON.parse(instance.settings || "{}"); } catch {}

    const merged = { ...currentSettings, ...settings };

    await prisma.whatsappInstance.update({
      where: { id: instance.id },
      data: { settings: JSON.stringify(merged) },
    });

    return NextResponse.json({ success: true, settings: merged });
  } catch (err: any) {
    console.error("Erro ao salvar settings da instância:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const url = new URL(req.url);
    const instanceName = url.searchParams.get("instanceName");
    if (!instanceName) {
      return NextResponse.json({ error: "instanceName obrigatório" }, { status: 400 });
    }

    const instance = await prisma.whatsappInstance.findUnique({
      where: { name: instanceName },
    });

    if (!instance || instance.tenant_id !== session.tenant_id) {
      return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 });
    }

    let settings: any = {};
    try { settings = JSON.parse(instance.settings || "{}"); } catch {}

    return NextResponse.json({ settings });
  } catch (err: any) {
    console.error("Erro ao buscar settings da instância:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}