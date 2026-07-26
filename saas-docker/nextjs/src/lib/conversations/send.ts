import { Prisma, PrismaClient } from "@prisma/client";
import { sendWhatsAppMessage, sendWhatsAppMedia } from "@/lib/evolution";

const SERVICE_ROLE_TYPES = ["agent", "partner", "manager", "admin", "superadmin"] as const;

type SentMessageResult = Awaited<ReturnType<PrismaClient["message"]["create"]>>;

export type SendConversationSession = {
  id: string;
  tenant_id: string;
  role: string;
};

export type SendConversationPayload = {
  conversationId: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  publicBaseUrl?: string;
};

type EvolutionInstancePayload = {
  connectionStatus?: unknown;
  instanceName?: unknown;
  name?: unknown;
  state?: unknown;
  instance?: { instanceName?: unknown; state?: unknown };
};

export type SendConversationSuccess = {
  ok: true;
  message: SentMessageResult;
  conversation: Prisma.ConversationGetPayload<{
    include: { assignee: { select: { id: true; name: true; email: true } } };
  }>;
  resolvedInstanceName: string;
};

export type SendConversationFailure = {
  ok: false;
  status: number;
  error: string;
};

export type SendConversationResult = SendConversationSuccess | SendConversationFailure;

export function buildConversationAccessWhere(session: SendConversationSession): Prisma.ConversationWhereInput {
  const role = session.role;
  const allowedRole = (SERVICE_ROLE_TYPES as readonly string[]).includes(role);
  if (!allowedRole) {
    return { id: "invalid" };
  }

  return {
    tenant_id: session.tenant_id,
    ...(role === "agent"
      ? { OR: [{ assigned_to: session.id }, { assigned_to: null }] }
      : {}),
    ...(role === "partner"
      ? { leads: { some: { partner_id: session.id } } }
      : {}),
  };
}

function evolutionInstanceName(instance: EvolutionInstancePayload): string | null {
  const name = instance?.instance?.instanceName || instance?.instanceName || instance?.name;
  return typeof name === "string" && name ? name : null;
}

function evolutionInstanceIsOpen(instance: EvolutionInstancePayload) {
  const status = instance?.connectionStatus || instance?.instance?.state || instance?.state;
  return typeof status === "string" && status.toLowerCase() === "open";
}

export async function sendConversationMessage(
  prisma: PrismaClient,
  session: SendConversationSession,
  payload: SendConversationPayload,
): Promise<SendConversationResult> {
  const { conversationId, content, mediaUrl, mediaType, publicBaseUrl } = payload;
  if (!conversationId || (!content && !mediaUrl)) {
    return { ok: false, status: 400, error: "Parâmetros inválidos" };
  }

  const explicitMediaType = typeof mediaType === "string"
    ? mediaType.split("/")[0].toLowerCase()
    : undefined;
  if (explicitMediaType && !["image", "video", "audio", "document"].includes(explicitMediaType)) {
    return { ok: false, status: 400, error: "Tipo de mídia inválido" };
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      ...buildConversationAccessWhere(session),
    },
  });

  if (!conversation) return { ok: false, status: 404, error: "Conversa não encontrada" };

  const ownedInstances = await prisma.whatsappInstance.findMany({
    where: {
      tenant_id: session.tenant_id,
      ...(session.role === "partner" ? { partner_id: session.id } : {}),
    },
    select: {
      id: true,
      name: true,
      connectionName: true,
      status: true,
      created_at: true,
    },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
  });

  if (ownedInstances.length === 0) {
    return {
      ok: false,
      status: 409,
      error: "Nenhuma instância do WhatsApp autorizada para este atendimento",
    };
  }

  const evolutionUrl = process.env.EVOLUTION_URL?.replace(/\/$/, "");
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  if (!evolutionUrl || !evolutionKey) {
    return {
      ok: false,
      status: 503,
      error: "Serviço do WhatsApp temporariamente indisponível",
    };
  }

  const rankedInstances = [...ownedInstances].sort((left, right) => {
    const statusDifference = Number(right.status.toLowerCase() === "open") - Number(left.status.toLowerCase() === "open");
    if (statusDifference !== 0) return statusDifference;
    const dateDifference = right.created_at.getTime() - left.created_at.getTime();
    return dateDifference || right.id.localeCompare(left.id);
  });

  const matchesOwnedInstance = (dbInstance: (typeof ownedInstances)[number], name: string | null) =>
    Boolean(name && (dbInstance.name === name || dbInstance.connectionName === name));

  const roleAwareConversationName = conversation.instance_name;
  let resolvedInstanceName: string | null = null;
  let evolutionStatusUnavailable = false;

  try {
    const response = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
      headers: { apikey: evolutionKey },
      cache: "no-store",
    });

    if (!response.ok) {
      evolutionStatusUnavailable = true;
    } else {
      const evolutionInstances: EvolutionInstancePayload[] = await response.json();
      if (!Array.isArray(evolutionInstances)) {
        evolutionStatusUnavailable = true;
      } else {
        const exactOwnedInstance = rankedInstances.find((instance) => matchesOwnedInstance(instance, roleAwareConversationName));
        const exactEvolutionInstance = exactOwnedInstance
          ? evolutionInstances.find((instance) => {
              const name = evolutionInstanceName(instance);
              return matchesOwnedInstance(exactOwnedInstance, name) && evolutionInstanceIsOpen(instance);
            })
          : undefined;

        if (exactEvolutionInstance) {
          resolvedInstanceName = evolutionInstanceName(exactEvolutionInstance);
        } else {
          for (const dbInstance of rankedInstances) {
            const openEvolutionInstance = evolutionInstances.find((instance) => {
              const name = evolutionInstanceName(instance);
              return matchesOwnedInstance(dbInstance, name) && evolutionInstanceIsOpen(instance);
            });
            if (openEvolutionInstance) {
              resolvedInstanceName = evolutionInstanceName(openEvolutionInstance);
              break;
            }
          }
        }
      }
    }
  } catch {
    evolutionStatusUnavailable = true;
  }

  if (evolutionStatusUnavailable) {
    resolvedInstanceName = rankedInstances.find((instance) => instance.status.toLowerCase() === "open")?.name || null;
  }

  if (!resolvedInstanceName) {
    return {
      ok: false,
      status: evolutionStatusUnavailable ? 503 : 409,
      error: evolutionStatusUnavailable
        ? "Não foi possível confirmar uma conexão ativa do WhatsApp. Tente novamente em instantes"
        : "Nenhuma instância do WhatsApp está conectada para este atendimento",
    };
  }

  const finalContent = content || "";
  const baseUrl = publicBaseUrl ? publicBaseUrl.replace(/\/$/, "") : "";
  const absoluteMediaUrl = mediaUrl && mediaUrl.startsWith("/")
    ? `${baseUrl || ""}${mediaUrl}`
    : mediaUrl;

  let success = false;
  if (absoluteMediaUrl) {
    success = await sendWhatsAppMedia(
      resolvedInstanceName,
      conversation.contact_number,
      absoluteMediaUrl,
      finalContent,
      explicitMediaType,
    );
  } else {
    success = await sendWhatsAppMessage(resolvedInstanceName, conversation.contact_number, finalContent);
  }

  if (!success) {
    return {
      ok: false,
      status: 503,
      error: "Não foi possível enviar pelo WhatsApp. Verifique a conexão e tente novamente",
    };
  }

  let metadata = null;
  if (absoluteMediaUrl) {
    let type = explicitMediaType || "document";
    const lowerUrl = absoluteMediaUrl.toLowerCase();
    if (!explicitMediaType) {
      if (lowerUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i)) type = "image";
      else if (lowerUrl.match(/\.(mp4|mov|avi)$/i)) type = "video";
      else if (lowerUrl.match(/\.(mp3|ogg|wav|webm)$/i)) type = "audio";
    }
    metadata = JSON.stringify({ type, url: absoluteMediaUrl });
  }

  const sentAt = new Date();

  const [newMessage, updatedConversation] = await prisma.$transaction([
    prisma.message.create({
      data: {
        tenant_id: session.tenant_id,
        conversation_id: conversation.id,
        direction: "outbound",
        content: finalContent || "[Mídia Enviada]",
        ai_generated: false,
        metadata,
        created_at: sentAt,
      },
    }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        instance_name: resolvedInstanceName,
        ai_paused: true,
        last_message_at: sentAt,
        ...(!conversation.assigned_to && session.role !== "partner" ? { assigned_to: session.id } : {}),
      },
      include: { assignee: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  return {
    ok: true,
    message: newMessage,
    conversation: updatedConversation,
    resolvedInstanceName,
  };
}
