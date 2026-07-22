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

    const { conversationId, content, mediaUrl } = await req.json();

    if (!conversationId || (!content && !mediaUrl)) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    // Busca a conversa
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, tenant_id: session.tenant_id },
      include: { tenant: true }
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    if (!conversation.instance_name) {
       return NextResponse.json({ error: "Conversa não possui instância vinculada" }, { status: 400 });
    }

    // Pausa a IA automaticamente se for o primeiro contato humano
    if (!conversation.ai_paused) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { ai_paused: true, assigned_to: conversation.assigned_to || session.id }
      });
      // Poderiamos adicionar na lista negra aqui também se desejado
    }

    // Preparar o prefixo
    const userName = session.name || "Equipe";
    const finalContent = content ? `*[${userName}]:* ${content}` : "";

    let success = false;

    if (mediaUrl) {
       // Se tiver mídia, envia mídia com a legenda
       success = await sendWhatsAppMedia(conversation.instance_name, conversation.contact_number, mediaUrl, finalContent);
    } else {
       // Apenas texto
       success = await sendWhatsAppMessage(conversation.instance_name, conversation.contact_number, finalContent);
    }

    if (!success) {
       return NextResponse.json({ error: "Falha ao enviar via Evolution API" }, { status: 500 });
    }

    // Salvar no banco de dados local
    let metadata = null;
    if (mediaUrl) {
      let type = "document";
      const lowerUrl = mediaUrl.toLowerCase();
      if (lowerUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i)) type = "image";
      else if (lowerUrl.match(/\.(mp4|mov|avi)$/i)) type = "video";
      else if (lowerUrl.match(/\.(mp3|ogg|wav)$/i)) type = "audio";
      
      metadata = JSON.stringify({ type, url: mediaUrl });
    }

    const newMessage = await prisma.message.create({
      data: {
        tenant_id: session.tenant_id,
        conversation_id: conversation.id,
        direction: "outbound",
        content: finalContent || "[Mídia Enviada]",
        ai_generated: false,
        metadata,
      }
    });

    return NextResponse.json({ success: true, message: newMessage });

  } catch (error) {
    console.error("POST /api/conversations/message:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
