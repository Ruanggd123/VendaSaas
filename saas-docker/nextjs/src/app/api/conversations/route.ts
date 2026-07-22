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

    const whereClause: any = { tenant_id: session.tenant_id };
    if (activeInstanceName) {
      whereClause.instance_name = activeInstanceName;
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
    const { id, ai_paused } = body;

    if (!id || typeof ai_paused !== "boolean") {
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

    const updated = await prisma.conversation.update({
      where: { id },
      data: { ai_paused }
    });

    // Atualiza a lista negra (blacklist) no Tenant
    const tenant = await prisma.tenant.findUnique({ where: { id: session.tenant_id } });
    if (tenant) {
      let settings: any = {};
      try { settings = JSON.parse((tenant.settings as string) || "{}"); } catch {}
      const currentIgnored = settings.ignored_numbers || "";
      let list = currentIgnored ? currentIgnored.split(",").map((n: string) => n.trim()).filter(Boolean) : [];
      const cleanNumber = conversation.contact_number.replace(/\D/g, "");

      if (ai_paused) {
        if (!list.includes(cleanNumber)) {
          list.push(cleanNumber);
          settings.ignored_numbers = list.join(",");
          await prisma.tenant.update({
            where: { id: session.tenant_id },
            data: { settings: JSON.stringify(settings) },
          });
          console.log(`[Blacklist] Contato ${conversation.contact_number} adicionado à blacklist (IA pausada).`);
        }
      } else {
        if (list.includes(cleanNumber)) {
          list = list.filter((n: string) => n !== cleanNumber);
          settings.ignored_numbers = list.join(",");
          await prisma.tenant.update({
            where: { id: session.tenant_id },
            data: { settings: JSON.stringify(settings) },
          });
          console.log(`[Blacklist] Contato ${conversation.contact_number} removido da blacklist (IA reativada).`);
        }
      }
    }

    return NextResponse.json({ conversation: updated });
  } catch (err) {
    console.error("PATCH /api/conversations:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
