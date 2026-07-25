import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id"); // busca uma conversa específica com mensagens
    const instance_name = searchParams.get("instance_name");

    if (id) {
      // Retorna mensagens de uma conversa específica
      const conversationWhere: any = {
        id,
        tenant_id: session.tenant_id,
        ...(session.role === "agent"
          ? { OR: [{ assigned_to: session.id }, { assigned_to: null }] }
          : {}),
        ...(session.role === "partner"
          ? { leads: { some: { partner_id: session.id } } }
          : {}),
      };

      const conversation = await prisma.conversation.findFirst({
        where: conversationWhere,
        include: {
          messages: { orderBy: { created_at: "asc" } },
          leads: { select: { id: true, name: true, status: true, value: true } },
        },
      });

      if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

      return NextResponse.json({
        conversation,
        messages: conversation.messages || [],
        leads: conversation.leads || [],
      });
    }

    // Busca instâncias do Tenant (filtradas por partner se for parceiro)
    const instances = await prisma.whatsappInstance.findMany({
      where: {
        tenant_id: session.tenant_id,
        ...(session.role === 'partner' ? { partner_id: session.id } : {}),
      },
      select: { name: true, connectionName: true, status: true }
    });

    // Determina a instância ativa (não força a primeira se vier vazio, para permitir "Todas as instâncias")
    const activeInstanceName = instance_name && instance_name !== "all" ? instance_name : undefined;
    const assigned_to = searchParams.get("assigned_to");

    const whereConditions: any[] = [{ tenant_id: session.tenant_id }];

    if (activeInstanceName) {
      const matched = instances.find((i) => i.name === activeInstanceName || i.connectionName === activeInstanceName);
      if (matched) {
        whereConditions.push({
          OR: [
            { instance_name: matched.name },
            { instance_name: matched.connectionName },
            { instance_name: activeInstanceName },
          ],
        });
      } else {
        whereConditions.push({ instance_name: activeInstanceName });
      }
    }

    if (session.role === "agent") {
      whereConditions.push({
        OR: [{ assigned_to: session.id }, { assigned_to: null }],
      });
    } else if (assigned_to && assigned_to !== "all") {
      whereConditions.push({
        assigned_to: assigned_to === "unassigned" ? null : assigned_to,
      });
    }

    if (session.role === "partner") {
      const partnerLeadConversationIds = await prisma.lead.findMany({
        where: { partner_id: session.id, conversation_id: { not: null } },
        select: { conversation_id: true },
      });
      const convIds = partnerLeadConversationIds.map((l) => l.conversation_id).filter(Boolean);
      whereConditions.push({ id: { in: convIds } });
    }

    const whereClause = { AND: whereConditions };

    // Retorna lista de todas as conversas do tenant filtradas pela instância
    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      orderBy: { last_message_at: "desc" },
      include: {
        leads: { select: { id: true, name: true, status: true, value: true } },
        assignee: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { created_at: "desc" }, take: 1 },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({ conversations, instances, activeInstanceName });
  } catch (err) {
    console.error("GET /api/conversations:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { id, ai_paused, assigned_to } = body;

    if (!id || (typeof ai_paused !== "boolean" && assigned_to === undefined)) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    if (session.role === "partner" && assigned_to !== undefined) {
      return NextResponse.json({ error: "Parceiros não podem atribuir conversas" }, { status: 403 });
    }

    if (session.role === "agent" && assigned_to !== undefined && assigned_to !== null && assigned_to !== session.id) {
      return NextResponse.json({ error: "Agentes só podem assumir conversas para si" }, { status: 403 });
    }

    if (assigned_to !== undefined && assigned_to !== null && typeof assigned_to !== "string") {
      return NextResponse.json({ error: "Responsável inválido" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        tenant_id: session.tenant_id,
        ...(session.role === "agent"
          ? { OR: [{ assigned_to: session.id }, { assigned_to: null }] }
          : {}),
        ...(session.role === "partner"
          ? { leads: { some: { partner_id: session.id } } }
          : {}),
      },
    });

    if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

    if (assigned_to) {
      const assignee = await prisma.user.findFirst({
        where: { id: assigned_to, tenant_id: session.tenant_id },
        select: { id: true },
      });
      if (!assignee) {
        return NextResponse.json({ error: "Responsável não pertence a esta empresa" }, { status: 400 });
      }
    }

    const dataToUpdate: any = {};
    if (typeof ai_paused === "boolean") dataToUpdate.ai_paused = ai_paused;
    if (assigned_to !== undefined) {
      dataToUpdate.assigned_to = assigned_to;
      if (assigned_to) dataToUpdate.ai_paused = true;
    }

    // Atualiza a conversa
    const updated = await prisma.conversation.update({
      where: { id },
      data: dataToUpdate,
      include: { assignee: { select: { id: true, name: true } } }
    });

    return NextResponse.json({ conversation: updated });
  } catch (err) {
    console.error("PATCH /api/conversations:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
