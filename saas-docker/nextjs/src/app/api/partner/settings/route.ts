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

    let settings = {};
    try { settings = JSON.parse(partner.settings as string); } catch {}

    return NextResponse.json({ settings });
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

    let currentSettings = {};
    try { currentSettings = JSON.parse(partner?.settings as string ?? "{}"); } catch {}

    const newSettings = { ...currentSettings, ...body };

    await prisma.partner.update({
      where: { id: session.id },
      data: { settings: JSON.stringify(newSettings) },
    });

    return NextResponse.json({ success: true, settings: newSettings });
  } catch (err) {
    console.error("PUT /api/partner/settings:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
