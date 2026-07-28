import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

const SERVICE_QUEUES = ["geral", "vendas", "suporte", "financeiro", "pos_venda"] as const;
const SERVICE_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const SERVICE_STATUSES = ["active", "pending", "resolved"] as const;

type ServiceQueue = (typeof SERVICE_QUEUES)[number];
type ServicePriority = (typeof SERVICE_PRIORITIES)[number];

function isServiceQueue(value: unknown): value is ServiceQueue {
  return typeof value === "string" && SERVICE_QUEUES.includes(value as ServiceQueue);
}

function isServicePriority(value: unknown): value is ServicePriority {
  return typeof value === "string" && SERVICE_PRIORITIES.includes(value as ServicePriority);
}

function isServiceStatus(value: unknown): value is (typeof SERVICE_STATUSES)[number] {
  return typeof value === "string" && SERVICE_STATUSES.includes(value as (typeof SERVICE_STATUSES)[number]);
}

function parseServiceCategory(category: string | null | undefined) {
  const parts = category?.split("|") || [];
  const [queue, priority] = parts;
  if (parts.length === 2 && isServiceQueue(queue) && isServicePriority(priority)) {
    return { queue, priority };
  }
  return { queue: "geral" as ServiceQueue, priority: "normal" as ServicePriority };
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id"); // busca uma conversa específica com mensagens
    const instance_name = searchParams.get("instance_name");

    if (id) {
      const rawAfter = searchParams.get("after");
      const rawBefore = searchParams.get("before");
      const beforeId = searchParams.get("before_id");
      if (rawAfter && rawBefore) {
        return NextResponse.json({ error: "Use apenas um cursor de mensagens" }, { status: 400 });
      }

      const after = rawAfter ? new Date(rawAfter) : null;
      const before = rawBefore ? new Date(rawBefore) : null;
      if ((after && Number.isNaN(after.getTime())) || (before && Number.isNaN(before.getTime()))) {
        return NextResponse.json({ error: "Cursor de mensagens inválido" }, { status: 400 });
      }

      const conversationWhere: Prisma.ConversationWhereInput = {
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
          leads: { select: { id: true, name: true, status: true, value: true, category: true, notes: true } },
        },
      });

      if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

      const cursorWhere = after
        ? { created_at: { gte: after } }
        : before
          ? beforeId
            ? { OR: [{ created_at: { lt: before } }, { created_at: before, id: { lt: beforeId } }] }
            : { created_at: { lt: before } }
          : {};
      const messageWhere = {
        tenant_id: session.tenant_id,
        conversation_id: conversation.id,
        ...cursorWhere,
      };
      const [messagePage, team] = await Promise.all([
        prisma.message.findMany({
          where: messageWhere,
          orderBy: after
            ? [{ created_at: "asc" }, { id: "asc" }]
            : [{ created_at: "desc" }, { id: "desc" }],
          take: after ? 500 : 101,
        }),
        !after && !before && session.role !== "partner"
          ? prisma.user.findMany({
              where: { tenant_id: session.tenant_id, role: "agent" },
              select: { id: true, name: true },
              orderBy: [{ name: "asc" }, { id: "asc" }],
            })
          : Promise.resolve(undefined),
      ]);
      const hasMore = !after && messagePage.length > 100;
      const messages = after
        ? messagePage
        : messagePage.slice(0, 100).reverse();

      return NextResponse.json({
        conversation: { ...conversation, messages },
        messages,
        leads: conversation.leads || [],
        hasMore,
        ...(team ? { team } : {}),
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
    const rawQueue = searchParams.get("queue");
    const rawPriority = searchParams.get("priority");
    const rawServiceStatus = searchParams.get("service_status");
    const queue = isServiceQueue(rawQueue) ? rawQueue : undefined;
    const priority = isServicePriority(rawPriority) ? rawPriority : undefined;
    const serviceStatus = isServiceStatus(rawServiceStatus) ? rawServiceStatus : undefined;

    const whereConditions: Prisma.ConversationWhereInput[] = [{ tenant_id: session.tenant_id }];

    if (serviceStatus) {
      whereConditions.push({ status: serviceStatus });
    }

    if (queue || priority) {
      const encodedCategory = queue && priority
        ? { equals: `${queue}|${priority}` }
        : queue
          ? { startsWith: `${queue}|` }
          : { endsWith: `|${priority}` };
      const includesLegacyDefault = (!queue || queue === "geral") && (!priority || priority === "normal");
      const categoryConditions: Prisma.ConversationWhereInput[] = [
        { leads: { some: { category: encodedCategory } } },
      ];

      if (includesLegacyDefault) {
        categoryConditions.push(
          { leads: { none: {} } },
          {
            leads: {
              some: {
                OR: [
                  { category: null },
                  { category: { not: { contains: "|" } } },
                ],
              },
            },
          },
        );
      }

      whereConditions.push({ OR: categoryConditions });
    }

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
      const convIds = partnerLeadConversationIds
        .map((lead) => lead.conversation_id)
        .filter((conversationId): conversationId is string => Boolean(conversationId));
      whereConditions.push({ id: { in: convIds } });
    }

    const whereClause = { AND: whereConditions };

    // Retorna lista de todas as conversas do tenant filtradas pela instância
    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      orderBy: { last_message_at: "desc" },
      include: {
        leads: { select: { id: true, name: true, status: true, value: true, category: true, notes: true } },
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
    const { id, ai_paused, assigned_to, queue, priority, service_status, notes } = body;
    const hasRoutingUpdate = queue !== undefined || priority !== undefined || notes !== undefined;
    const hasUpdate = typeof ai_paused === "boolean"
      || assigned_to !== undefined
      || hasRoutingUpdate
      || service_status !== undefined;

    if (typeof id !== "string" || !id || !hasUpdate) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    if (queue !== undefined && !isServiceQueue(queue)) {
      return NextResponse.json({ error: "Fila de atendimento inválida" }, { status: 400 });
    }

    if (priority !== undefined && !isServicePriority(priority)) {
      return NextResponse.json({ error: "Prioridade de atendimento inválida" }, { status: 400 });
    }

    if (service_status !== undefined && !isServiceStatus(service_status)) {
      return NextResponse.json({ error: "Status de atendimento inválido" }, { status: 400 });
    }

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      return NextResponse.json({ error: "Observações inválidas" }, { status: 400 });
    }

    if (typeof notes === "string" && notes.length > 4000) {
      return NextResponse.json({ error: "Observações devem ter no máximo 4000 caracteres" }, { status: 400 });
    }

    if (session.role === "agent" && assigned_to !== undefined && assigned_to !== null && assigned_to !== session.id) {
      return NextResponse.json({ error: "Agentes só podem assumir conversas para si" }, { status: 403 });
    }

    if (session.role === "partner" && assigned_to !== undefined) {
      return NextResponse.json({ error: "Parceiros não podem atribuir conversas" }, { status: 403 });
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
      include: {
        leads: {
          select: { id: true, category: true, partner_id: true, created_at: true },
          orderBy: [{ created_at: "asc" }, { id: "asc" }],
        },
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

    const dataToUpdate: Prisma.ConversationUncheckedUpdateInput = {};
    if (typeof ai_paused === "boolean") dataToUpdate.ai_paused = ai_paused;
    if (service_status !== undefined) dataToUpdate.status = service_status;
    if (assigned_to !== undefined) {
      dataToUpdate.assigned_to = assigned_to;
    }

    const responseInclude = {
      assignee: { select: { id: true, name: true } },
      leads: { select: { id: true, name: true, status: true, value: true, category: true, notes: true } },
    };
    let updated;

    if (hasRoutingUpdate) {
      const lead = session.role === "partner"
        ? conversation.leads.find((item) => item.partner_id === session.id)
        : conversation.leads[0];
      const currentCategory = parseServiceCategory(lead?.category);
      const category = `${queue ?? currentCategory.queue}|${priority ?? currentCategory.priority}`;

      updated = await prisma.$transaction(async (tx) => {
        if (Object.keys(dataToUpdate).length > 0) {
          await tx.conversation.update({ where: { id }, data: dataToUpdate });
        }

        if (lead) {
          await tx.lead.update({
            where: { id: lead.id },
            data: {
              ...(queue !== undefined || priority !== undefined ? { category } : {}),
              ...(notes !== undefined ? { notes } : {}),
            },
          });
        } else {
          await tx.lead.create({
            data: {
              tenant_id: session.tenant_id,
              conversation_id: conversation.id,
              name: conversation.contact_name || conversation.contact_number,
              phone: conversation.contact_number,
              status: "novo",
              category,
              ...(notes !== undefined ? { notes } : {}),
              ...(session.role === "partner" ? { partner_id: session.id } : {}),
            },
          });
        }

        return tx.conversation.findUnique({ where: { id }, include: responseInclude });
      });
    } else {
      updated = await prisma.conversation.update({
        where: { id },
        data: dataToUpdate,
        include: responseInclude,
      });
    }

    return NextResponse.json({ conversation: updated });
  } catch (err) {
    console.error("PATCH /api/conversations:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
