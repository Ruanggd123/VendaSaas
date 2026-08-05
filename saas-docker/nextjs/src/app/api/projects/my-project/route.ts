import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { assertModule, MODULES } from "@/lib/permissions";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const denied = await assertModule(MODULES.site);
    if (denied) return denied;

    // Buscar projeto vinculado ao tenant_id do cliente ou telefone
    let project = null;
    if (session.tenant_id) {
      project = await prisma.project.findFirst({
        where: { tenant_id: session.tenant_id },
        orderBy: { created_at: "desc" },
        include: { timelines: { orderBy: { created_at: "asc" } } },
      });
    }

    if (!project && session.userEmail) {
      project = await prisma.project.findFirst({
        where: {
          OR: [
            { client_name: { contains: session.userName || "", mode: "insensitive" } },
            { client_phone: { contains: (session.tenantPhone || "").replace(/\D/g, "") } },
          ],
        },
        orderBy: { created_at: "desc" },
        include: { timelines: { orderBy: { created_at: "asc" } } },
      });
    }

    return NextResponse.json({ project });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao buscar projeto do cliente" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const denied = await assertModule(MODULES.site);
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const { title, client_phone } = body;

    // Verificar se já existe projeto
    const existing = await prisma.project.findFirst({
      where: { tenant_id: session.tenant_id },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const newProject = await prisma.project.create({
      data: {
        tenant_id: session.tenant_id,
        client_name: session.userName || "Cliente Nexus",
        client_phone: client_phone || session.tenantPhone || "5588981885499",
        title: title || "Desenvolvimento de Site Institucional",
        description: "Solicitação de criação de site iniciada pelo cliente no painel.",
        status: "OPEN",
        price: 0,
      },
      include: { timelines: { orderBy: { created_at: "asc" } } },
    });

    await prisma.projectTimeline.create({
      data: {
        project_id: newProject.id,
        status_change: "OPEN",
        message: "🚀 Solicitação de site criada com sucesso pelo cliente! Aguardando envio do briefing.",
        author: "CLIENT",
      },
    });

    return NextResponse.json(newProject, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao solicitar criação de site" }, { status: 500 });
  }
}
