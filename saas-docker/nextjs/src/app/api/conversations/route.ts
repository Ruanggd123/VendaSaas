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
      const conversationWhere: any = { id, tenant_id: session.tenant_id };

      // Parceiro só vê conversa se tiver lead vinculado
      if (session.role === 'partner') {
        const lead = await prisma.lead.findFirst({
          where: { conversation_id: id, partner_id: session.id },
        });
        if (!lead) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
      }

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

    const whereClause: any = { tenant_id: session.tenant_id };
    if (activeInstanceName) {
      whereClause.instance_name = activeInstanceName;
    }

    if (session.role === 'agent') {
      whereClause.OR = [
        { assigned_to: session.id },
        { assigned_to: null }
      ];
    } else if (assigned_to && assigned_to !== "all") {
      whereClause.assigned_to = assigned_to === "unassigned" ? null : assigned_to;
    }

    // Parceiro vê só conversas dos próprios leads
    if (session.role === 'partner') {
      const partnerLeadConversationIds = await prisma.lead.findMany({
        where: { partner_id: session.id, conversation_id: { not: null } },
        select: { conversation_id: true },
      });
      const convIds = partnerLeadConversationIds.map(l => l.conversation_id).filter(Boolean);
      whereClause.id = { in: convIds };
    }

    // Retorna lista de todas as conversas do tenant filtradas pela instância
    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      orderBy: { last_message_at: "desc" },
      include: {
        leads: { select: { id: true, name: true, status: true } },
        assignee: { select: { id: true, name: true, email: true } },
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

    const conversation = await prisma.conversation.findFirst({
      where: { id, tenant_id: session.tenant_id }
    });

    if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

    // Parceiro só pode pausar IA em conversas dos próprios leads
    if (session.role === 'partner') {
      const lead = await prisma.lead.findFirst({
        where: { conversation_id: id, partner_id: session.id },
      });
      if (!lead) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (typeof ai_paused === "boolean") dataToUpdate.ai_paused = ai_paused;
    if (assigned_to !== undefined) dataToUpdate.assigned_to = assigned_to;

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
