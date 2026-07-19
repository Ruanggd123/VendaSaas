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

      let partnerSettings = {};
      try { partnerSettings = JSON.parse(partner?.settings as string); } catch {}

      return NextResponse.json({ settings: partnerSettings, tenantId: session.tenant_id, isPartner: true });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenant_id },
      select: { settings: true },
    });

    if (!tenant) return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });

    let settings = {};
    try {
      settings = JSON.parse(tenant.settings as string);
    } catch {}

    return NextResponse.json({ settings, tenantId: session.tenant_id });
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

    // Parceiro: salva nos settings próprios, não no tenant
    if (session.role === 'partner') {
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

      return NextResponse.json({ success: true, settings: newSettings, isPartner: true });
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

    const newSettings = { ...currentSettings, ...body };

    await prisma.tenant.update({
      where: { id: session.tenant_id },
      data: { settings: JSON.stringify(newSettings) },
    });

    return NextResponse.json({ success: true, settings: newSettings });
  } catch (err) {
    console.error("PUT /api/settings/whatsapp:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
