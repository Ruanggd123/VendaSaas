import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { sendWhatsAppMessage, sendWhatsAppMedia } from "@/lib/evolution";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

type EvolutionInstancePayload = {
  connectionStatus?: unknown;
  instanceName?: unknown;
  name?: unknown;
  state?: unknown;
  instance?: { instanceName?: unknown; state?: unknown };
};

function evolutionInstanceName(instance: EvolutionInstancePayload): string | null {
  const name = instance?.instance?.instanceName || instance?.instanceName || instance?.name;
  return typeof name === "string" && name ? name : null;
}

function evolutionInstanceIsOpen(instance: EvolutionInstancePayload) {
  const status = instance?.connectionStatus || instance?.instance?.state || instance?.state;
  return typeof status === "string" && status.toLowerCase() === "open";
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { conversationId, content, mediaUrl, mediaType } = await req.json();

    if (!conversationId || (!content && !mediaUrl) || (mediaUrl && typeof mediaUrl !== "string")) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const explicitMediaType = typeof mediaType === "string" ? mediaType.split("/")[0].toLowerCase() : undefined;
    if (explicitMediaType && !["image", "video", "audio", "document"].includes(explicitMediaType)) {
      return NextResponse.json({ error: "Tipo de mídia inválido" }, { status: 400 });
    }

    // Busca a conversa
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenant_id: session.tenant_id,
        ...(session.role === "agent"
          ? { OR: [{ assigned_to: session.id }, { assigned_to: null }] }
          : {}),
        ...(session.role === "partner"
          ? { leads: { some: { partner_id: session.id } } }
          : {}),
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

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
      return NextResponse.json(
        { error: "Nenhuma instância do WhatsApp autorizada para este atendimento" },
        { status: 409 },
      );
    }

    const evolutionUrl = process.env.EVOLUTION_URL?.replace(/\/$/, "");
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    if (!evolutionUrl || !evolutionKey) {
      console.error("[Conversation Send] Evolution não configurada", {
        tenantId: session.tenant_id,
        conversationId: conversation.id,
        hasUrl: Boolean(evolutionUrl),
        hasKey: Boolean(evolutionKey),
      });
      return NextResponse.json(
        { error: "Serviço do WhatsApp temporariamente indisponível" },
        { status: 503 },
      );
    }

    const rankedInstances = [...ownedInstances].sort((left, right) => {
      const statusDifference = Number(right.status.toLowerCase() === "open") - Number(left.status.toLowerCase() === "open");
      if (statusDifference !== 0) return statusDifference;
      const dateDifference = right.created_at.getTime() - left.created_at.getTime();
      return dateDifference || right.id.localeCompare(left.id);
    });
    const matchesOwnedInstance = (dbInstance: (typeof ownedInstances)[number], name: string | null) =>
      Boolean(name && (dbInstance.name === name || dbInstance.connectionName === name));
    let resolvedInstanceName: string | null = null;
    let evolutionStatusUnavailable = false;

    try {
      const response = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
        headers: { apikey: evolutionKey },
        cache: "no-store",
      });
      if (!response.ok) {
        evolutionStatusUnavailable = true;
        console.error("[Conversation Send] Evolution status lookup failed", {
          tenantId: session.tenant_id,
          conversationId: conversation.id,
          status: response.status,
          statusText: response.statusText,
        });
      } else {
        const evolutionInstances: EvolutionInstancePayload[] = await response.json();
        if (!Array.isArray(evolutionInstances)) {
          throw new Error("Evolution retornou formato inválido em fetchInstances");
        }

        const exactOwnedInstance = rankedInstances.find((instance) =>
          matchesOwnedInstance(instance, conversation.instance_name),
        );
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
    } catch (error) {
      evolutionStatusUnavailable = true;
      console.error("[Conversation Send] Evolution status lookup unavailable", {
        tenantId: session.tenant_id,
        conversationId: conversation.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (evolutionStatusUnavailable) {
      resolvedInstanceName = rankedInstances.find((instance) => instance.status.toLowerCase() === "open")?.name || null;
    }

    if (!resolvedInstanceName) {
      return NextResponse.json(
        {
          error: evolutionStatusUnavailable
            ? "Não foi possível confirmar uma conexão ativa do WhatsApp. Tente novamente em instantes"
            : "Nenhuma instância do WhatsApp está conectada para este atendimento",
        },
        { status: evolutionStatusUnavailable ? 503 : 409 },
      );
    }

    // Preparar o prefixo
    // Preparamos o conteúdo sem prefixo para ficar igual ao WhatsApp
    const finalContent = content || "";
    const absoluteMediaUrl = mediaUrl && mediaUrl.startsWith("/")
      ? `${(process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/$/, "")}${mediaUrl}`
      : mediaUrl;

    let success = false;

    if (absoluteMediaUrl) {
      // Se tiver mídia, envia mídia com a legenda
      success = await sendWhatsAppMedia(
        resolvedInstanceName,
        conversation.contact_number,
        absoluteMediaUrl,
        finalContent,
        explicitMediaType,
      );
    } else {
      // Apenas texto
      success = await sendWhatsAppMessage(resolvedInstanceName, conversation.contact_number, finalContent);
    }

    if (!success) {
      console.error("[Conversation Send] Evolution send failed", {
        tenantId: session.tenant_id,
        conversationId: conversation.id,
        requestedInstance: conversation.instance_name,
        resolvedInstance: resolvedInstanceName,
        media: Boolean(absoluteMediaUrl),
      });
      return NextResponse.json(
        { error: "Não foi possível enviar pelo WhatsApp. Verifique a conexão e tente novamente" },
        { status: 503 },
      );
    }

    // Salvar no banco de dados local
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
        }
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

    return NextResponse.json({ success: true, message: newMessage, conversation: updatedConversation });

  } catch (error) {
    console.error("POST /api/conversations/message:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
