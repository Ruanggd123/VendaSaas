import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSession } from "@/lib/auth";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (id) {
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          timelines: { orderBy: { created_at: "asc" } },
          partner: { select: { name: true, whatsappNumber: true } },
        },
      });
      if (!project) {
        return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
      }

      // Sem sessão (página pública de tracking): retorna APENAS uma visão
      // sanitizada — sem briefing, sem telefones, sem dados do Tenant.
      if (!session) {
        return NextResponse.json({
          id: project.id,
          title: project.title,
          status: project.status,
          client_name: project.client_name,
          price: project.price,
          timelines: project.timelines,
          partner: { name: project.partner?.name || null },
        });
      }

      // Autenticado: apenas quem tem relação com o projeto
      const isAdmin = session.role === "superadmin" || session.role === "manager" || session.role === "admin";
      const isPartnerOwner = session.role === "partner" && project.partner_id === session.id;
      const isOpen = session.role === "partner" && project.status === "OPEN";
      const isClientOwner = !!project.tenant_id && project.tenant_id === session.tenant_id;
      if (!isAdmin && !isPartnerOwner && !isOpen && !isClientOwner) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }

      return NextResponse.json(project);
    }

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const isPartner = session.role === "partner";
    const isAdmin = session.role === "superadmin" || session.role === "manager";

    if (!isPartner && !isAdmin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
    }

    if (type === "all" && isAdmin) {
      const projects = await prisma.project.findMany({
        orderBy: { created_at: "desc" },
        include: { timelines: { orderBy: { created_at: "desc" } } },
      });
      return NextResponse.json(projects);
    } else if (type === "open") {
      const projects = await prisma.project.findMany({
        where: { status: "OPEN", partner_id: null },
        orderBy: { created_at: "desc" },
        include: { timelines: { orderBy: { created_at: "desc" } } },
      });
      return NextResponse.json(projects);
    } else {
      const projects = await prisma.project.findMany({
        where: { partner_id: session.id },
        orderBy: { created_at: "desc" },
        include: { timelines: { orderBy: { created_at: "desc" } } },
      });
      return NextResponse.json(projects);
    }
  } catch (error: any) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();
    const { client_name, client_phone, title, description, briefing, price } = body;

    if (!client_name || !client_phone || !title) {
      return NextResponse.json({ error: "Nome, telefone e título são obrigatórios" }, { status: 400 });
    }

    // partner_id NUNCA vem do corpo público (checkout). Só superadmin/manager
    // podem atribuir um parceiro ao criar. O fluxo de aceite (/api/projects/accept)
    // é quem vincula o dev parceiro.
    let partner_id: string | null = null;
    if (session && (session.role === "superadmin" || session.role === "manager")) {
      partner_id = typeof body.partner_id === "string" ? body.partner_id : null;
    }

    const parsedPrice = Math.max(0, Math.min(parseFloat(price || "0") || 0, 100000000));

    const project = await prisma.project.create({
      data: {
        client_name,
        client_phone,
        title,
        description,
        briefing: typeof briefing === "object" ? JSON.stringify(briefing) : briefing,
        price: parsedPrice,
        partner_id,
        status: partner_id ? "IN_PROGRESS" : "OPEN",
      },
    });

    await prisma.projectTimeline.create({
      data: {
        project_id: project.id,
        status_change: project.status,
        message: "Projeto registrado com sucesso. Aguardando desenvolvimento.",
        author: "SYSTEM",
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao criar projeto" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, message, prazo_entrega, briefing } = body;

    if (!id) {
      return NextResponse.json({ error: "ID do projeto não informado" }, { status: 400 });
    }

    // Ownership: apenas quem tem relação com o projeto pode alterá-lo
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }
    const isAdmin = session.role === "superadmin" || session.role === "manager" || session.role === "admin";
    const isPartnerOwner = session.role === "partner" && project.partner_id === session.id;
    const isClientOwner = !!project.tenant_id && project.tenant_id === session.tenant_id;
    if (!isAdmin && !isPartnerOwner && !isClientOwner) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (prazo_entrega) updateData.prazo_entrega = new Date(prazo_entrega);
    if (briefing !== undefined) updateData.briefing = typeof briefing === 'object' ? JSON.stringify(briefing) : briefing;

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
      include: { timelines: { orderBy: { created_at: "desc" } } },
    });

    if (status || message) {
      const statusLabels: Record<string, string> = {
        OPEN: "Aguardando Dev",
        IN_PROGRESS: "Em Desenvolvimento",
        REVIEW: "Em Análise / Homologação",
        COMPLETED: "Projeto Concluído & Entregue 🚀",
        CANCELLED: "Projeto Cancelado",
      };

      const defaultMsg = message || `Status alterado para ${statusLabels[status] || status}`;

      await prisma.projectTimeline.create({
        data: {
          project_id: id,
          status_change: status || updatedProject.status,
          message: defaultMsg,
          author: session.role === "superadmin" || session.role === "manager" ? "DEV" : "SYSTEM",
        },
      });
    }

    return NextResponse.json(updatedProject);
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao atualizar projeto" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, briefing } = body;

    if (!id || !briefing) {
      return NextResponse.json({ error: "ID do projeto e briefing são obrigatórios" }, { status: 400 });
    }

    const briefingStr = typeof briefing === 'object' ? JSON.stringify(briefing) : briefing;

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        briefing: briefingStr,
        status: 'IN_PROGRESS',
      },
    });

    await prisma.projectTimeline.create({
      data: {
        project_id: id,
        status_change: 'IN_PROGRESS',
        message: '📋 Briefing enviado com sucesso pelo cliente! Projeto em desenvolvimento.',
        author: 'CLIENT',
      },
    });

    return NextResponse.json({ success: true, project: updatedProject });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao salvar briefing do cliente" }, { status: 500 });
  }
}

