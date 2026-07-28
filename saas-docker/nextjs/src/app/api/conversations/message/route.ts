import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { sendConversationMessage, type SendConversationPayload } from "@/lib/conversations/send";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { unlink } from "fs/promises";
import { basename, join } from "path";
import { deleteWhatsAppMessage, updateWhatsAppMessage, type WhatsAppMessageKey } from "@/lib/evolution";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

function parseMessageMetadata(metadata: string | null): Record<string, any> {
  try { return JSON.parse(metadata || "{}"); } catch { return {}; }
}

function providerKeyFor(message: { metadata: string | null; direction: string }, contactNumber: string): WhatsAppMessageKey | null {
  const metadata = parseMessageMetadata(message.metadata);
  const id = String(metadata.providerMessageId || "").trim();
  if (!id) return null;
  return {
    id,
    remoteJid: String(metadata.providerRemoteJid || `${contactNumber.replace(/\D/g, "")}@s.whatsapp.net`),
    fromMe: metadata.providerFromMe === true || ["outbound", "outgoing"].includes(message.direction),
    ...(metadata.providerParticipant ? { participant: String(metadata.providerParticipant) } : {}),
  };
}

async function resolveOwnedInstance(session: { id: string; tenant_id: string; role: string }, instanceName: string | null) {
  if (!instanceName) return null;
  return prisma.whatsappInstance.findFirst({
    where: {
      tenant_id: session.tenant_id,
      ...(session.role === "partner" ? { partner_id: session.id } : {}),
      OR: [{ name: instanceName }, { connectionName: instanceName }],
    },
    select: { name: true },
  });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { conversationId, content, mediaUrl, mediaType, fileName, mimeType, replyToMessageId, mentioned } = await req.json();

    const result = await sendConversationMessage(
      prisma,
      {
        id: session.id,
        tenant_id: session.tenant_id,
        role: session.role,
      },
      {
        conversationId,
        content,
        mediaUrl,
        mediaType,
        fileName,
        mimeType,
        replyToMessageId,
        mentioned,
        publicBaseUrl: process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin,
      } satisfies SendConversationPayload,
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      conversation: result.conversation,
      resolvedInstanceName: result.resolvedInstanceName,
    });
  } catch (error) {
    console.error("POST /api/conversations/message:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const messageId = typeof body.messageId === "string" ? body.messageId : "";
    const scope = body.scope === "everyone" ? "everyone" : "site";
    if (!messageId) return NextResponse.json({ error: "Mensagem inválida" }, { status: 400 });

    const message = await prisma.message.findFirst({
      where: { id: messageId, tenant_id: session.tenant_id },
    });
    if (!message) return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 });

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: message.conversation_id,
        tenant_id: session.tenant_id,
        ...(session.role === "agent"
          ? { OR: [{ assigned_to: session.id }, { assigned_to: null }] }
          : {}),
        ...(session.role === "partner"
          ? { leads: { some: { partner_id: session.id } } }
          : {}),
      },
      select: { id: true, instance_name: true, contact_number: true },
    });
    if (!conversation) return NextResponse.json({ error: "Sem acesso a esta mensagem" }, { status: 403 });

    if (scope === "everyone") {
      if (!["outbound", "outgoing"].includes(message.direction)) {
        return NextResponse.json({ error: "Somente mensagens enviadas podem ser excluídas para todos" }, { status: 400 });
      }
      const key = providerKeyFor(message, conversation.contact_number);
      if (!key) return NextResponse.json({ error: "Esta mensagem antiga não possui a identificação necessária do WhatsApp" }, { status: 409 });
      const instance = await resolveOwnedInstance(session, conversation.instance_name);
      if (!instance) return NextResponse.json({ error: "Instância do WhatsApp não encontrada" }, { status: 409 });
      const deleted = await deleteWhatsAppMessage(instance.name, key);
      if (!deleted) return NextResponse.json({ error: "O WhatsApp recusou a exclusão. O prazo para excluir pode ter expirado" }, { status: 502 });
    }

    const parseMediaMetadata = (metadata: string | null) => {
      try {
        const parsed = JSON.parse(metadata || "{}");
        return {
          type: typeof parsed.type === "string" ? parsed.type : typeof parsed.kind === "string" ? parsed.kind : "",
          url: typeof parsed.url === "string" ? parsed.url : "",
        };
      } catch {
        return { type: "", url: "" };
      }
    };
    const messageMedia = parseMediaMetadata(message.metadata);
    const isSiteMediaRecord = message.content === "[Mídia Enviada]" || message.content === "[Arquivo Enviado]";
    const isProviderMediaEcho = /^\[Mídia:\s*(image|audio|video|document)]$/i.test(message.content);
    const messagesToDelete = [message];

    if (messageMedia.type && (isSiteMediaRecord || isProviderMediaEcho)) {
      const counterpartContents = isSiteMediaRecord
        ? [`[Mídia: ${messageMedia.type}]`]
        : ["[Mídia Enviada]", "[Arquivo Enviado]"];
      const candidates = await prisma.message.findMany({
        where: {
          conversation_id: conversation.id,
          direction: { in: ["outbound", "outgoing"] },
          content: { in: counterpartContents },
          created_at: {
            gte: new Date(message.created_at.getTime() - 120_000),
            lte: new Date(message.created_at.getTime() + 120_000),
          },
        },
      });
      messagesToDelete.push(...candidates.filter((candidate) =>
        parseMediaMetadata(candidate.metadata).type === messageMedia.type
      ));
    }

    const uniqueMessages = Array.from(new Map(messagesToDelete.map((item) => [item.id, item])).values());
    await prisma.message.deleteMany({ where: { id: { in: uniqueMessages.map((item) => item.id) } } });

    const latestMessage = await prisma.message.findFirst({
      where: { conversation_id: conversation.id },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      select: { created_at: true },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { last_message_at: latestMessage?.created_at || null },
    });

    const mediaUrls = Array.from(new Set(uniqueMessages
      .map((item) => parseMediaMetadata(item.metadata).url)
      .filter(Boolean)));
    for (const mediaUrl of mediaUrls) {
      const remainingReference = await prisma.message.findFirst({
        where: {
          tenant_id: session.tenant_id,
          metadata: { contains: JSON.stringify(mediaUrl).slice(1, -1) },
        },
        select: { id: true },
      });

      if (!remainingReference) {
        try {
          if (mediaUrl.startsWith("/uploads/")) {
            await unlink(join(process.cwd(), "public", "uploads", basename(mediaUrl)));
          } else {
            const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
            const accountId = process.env.R2_ACCOUNT_ID;
            const accessKeyId = process.env.R2_ACCESS_KEY_ID;
            const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
            const bucketName = process.env.R2_BUCKET_NAME;
            if (publicUrl && mediaUrl.startsWith(`${publicUrl}/`) && accountId && accessKeyId && secretAccessKey && bucketName) {
              const key = decodeURIComponent(mediaUrl.slice(publicUrl.length + 1));
              const client = new S3Client({
                region: "auto",
                endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
                credentials: { accessKeyId, secretAccessKey },
              });
              await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
            }
          }
        } catch (error) {
          console.warn(`Mensagem ${message.id} excluída, mas a mídia não pôde ser removida do armazenamento`, error);
        }
      }
    }

    return NextResponse.json({ success: true, scope, deletedIds: uniqueMessages.map((item) => item.id) });
  } catch (error) {
    console.error("DELETE /api/conversations/message:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const messageId = typeof body.messageId === "string" ? body.messageId : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!messageId || !content) return NextResponse.json({ error: "Mensagem e conteúdo são obrigatórios" }, { status: 400 });

    const message = await prisma.message.findFirst({ where: { id: messageId, tenant_id: session.tenant_id } });
    if (!message) return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 });
    if (!["outbound", "outgoing"].includes(message.direction)) {
      return NextResponse.json({ error: "Somente mensagens enviadas podem ser editadas" }, { status: 400 });
    }
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: message.conversation_id,
        tenant_id: session.tenant_id,
        ...(session.role === "agent" ? { OR: [{ assigned_to: session.id }, { assigned_to: null }] } : {}),
        ...(session.role === "partner" ? { leads: { some: { partner_id: session.id } } } : {}),
      },
      select: { id: true, instance_name: true, contact_number: true },
    });
    if (!conversation) return NextResponse.json({ error: "Sem acesso a esta mensagem" }, { status: 403 });
    const key = providerKeyFor(message, conversation.contact_number);
    if (!key) return NextResponse.json({ error: "Esta mensagem antiga não possui a identificação necessária do WhatsApp" }, { status: 409 });
    const instance = await resolveOwnedInstance(session, conversation.instance_name);
    if (!instance) return NextResponse.json({ error: "Instância do WhatsApp não encontrada" }, { status: 409 });
    const updated = await updateWhatsAppMessage(instance.name, conversation.contact_number, key, content);
    if (!updated) return NextResponse.json({ error: "O WhatsApp recusou a edição desta mensagem" }, { status: 502 });

    const metadata = { ...parseMessageMetadata(message.metadata), editedAt: new Date().toISOString() };
    const saved = await prisma.message.update({
      where: { id: message.id },
      data: { content, metadata: JSON.stringify(metadata) },
    });
    return NextResponse.json({ success: true, message: saved });
  } catch (error) {
    console.error("PATCH /api/conversations/message:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
