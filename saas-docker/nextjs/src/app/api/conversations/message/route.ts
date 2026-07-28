import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { sendConversationMessage, type SendConversationPayload } from "@/lib/conversations/send";

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
