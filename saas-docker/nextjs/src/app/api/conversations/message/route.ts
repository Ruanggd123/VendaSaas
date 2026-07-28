import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { sendConversationMessage, type SendConversationPayload } from "@/lib/conversations/send";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { unlink } from "fs/promises";
import { basename, join } from "path";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { conversationId, content, mediaUrl, mediaType, fileName, mimeType } = await req.json();

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
      select: { id: true },
    });
    if (!conversation) return NextResponse.json({ error: "Sem acesso a esta mensagem" }, { status: 403 });

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

    return NextResponse.json({ success: true, deletedIds: uniqueMessages.map((item) => item.id) });
  } catch (error) {
    console.error("DELETE /api/conversations/message:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
