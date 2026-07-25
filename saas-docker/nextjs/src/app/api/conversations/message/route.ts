import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { sendWhatsAppMessage, sendWhatsAppMedia } from "@/lib/evolution";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

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
      include: { tenant: true }
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    if (!conversation.instance_name) {
       return NextResponse.json({ error: "Conversa não possui instância vinculada" }, { status: 400 });
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
         conversation.instance_name,
         conversation.contact_number,
         absoluteMediaUrl,
         finalContent,
         explicitMediaType,
       );
    } else {
       // Apenas texto
       success = await sendWhatsAppMessage(conversation.instance_name, conversation.contact_number, finalContent);
    }

    if (!success) {
       return NextResponse.json({ error: "Falha ao enviar via Evolution API" }, { status: 500 });
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
