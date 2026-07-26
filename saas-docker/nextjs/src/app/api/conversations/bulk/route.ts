import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { sendConversationMessage, type SendConversationPayload } from "@/lib/conversations/send";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

type BulkMode = "selected" | "current" | "incoming";

const MAX_BULK_SIZE = 180;
const MAX_PARALLEL = 4;

type BulkRequestBody = {
  mode?: BulkMode;
  conversationIds?: string[];
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  confirm?: boolean;
};

function normalizeConversationIds(rawIds: unknown): string[] {
  if (!Array.isArray(rawIds)) return [];
  return rawIds
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item, index, array) => item && array.indexOf(item) === index);
}

async function sendWithConcurrency<T>(items: T[], workerCount: number, worker: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(workerCount, items.length) }).map(async () => {
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) return;
      await worker(current);
    }
  });
  await Promise.all(workers);
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = (await req.json().catch(() => null)) as BulkRequestBody | null;
    const mode = body?.mode;
    const confirm = body?.confirm === true;
    const content = typeof body?.content === "string" ? body.content : "";
    const mediaUrl = typeof body?.mediaUrl === "string" ? body.mediaUrl : undefined;
    const mediaType = typeof body?.mediaType === "string" ? body.mediaType : undefined;
    const incomingIds = normalizeConversationIds(body?.conversationIds);

    if (!mode || !["selected", "current", "incoming"].includes(mode)) {
      return NextResponse.json({ error: "Modo de envio inválido" }, { status: 400 });
    }

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
    }

    if (incomingIds.length === 0) {
      return NextResponse.json({ error: "Nenhuma conversa selecionada" }, { status: 400 });
    }

    if (incomingIds.length > MAX_BULK_SIZE) {
      return NextResponse.json({ error: `Máximo de ${MAX_BULK_SIZE} contatos por operação` }, { status: 400 });
    }

    if (!confirm) {
      return NextResponse.json({
        ok: false,
        pending: true,
        mode,
        total: incomingIds.length,
        message: `Confirme o envio de ${incomingIds.length} mensagem(ns)`,
      });
    }

    const outcomes: { conversationId: string; ok: boolean; error?: string }[] = [];
    const sessionData = {
      id: session.id,
      tenant_id: session.tenant_id,
      role: session.role,
    };

    await sendWithConcurrency(
      incomingIds,
      MAX_PARALLEL,
      async (conversationId) => {
        try {
          const result = await sendConversationMessage(
            prisma,
            sessionData,
            {
              conversationId,
              content,
              mediaUrl,
              mediaType,
              publicBaseUrl: process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin,
            } satisfies SendConversationPayload,
          );

          outcomes.push({
            conversationId,
            ok: result.ok,
            ...(result.ok ? {} : { error: result.error }),
          });

          return;
        } catch (error) {
          outcomes.push({
            conversationId,
            ok: false,
            error: error instanceof Error ? error.message : "Erro inesperado",
          });
        }
      },
    );

    const success = outcomes.filter((item) => item.ok).length;
    const failed = outcomes.filter((item) => !item.ok).length;

    return NextResponse.json({
      ok: true,
      mode,
      total: incomingIds.length,
      success,
      failed,
      outcomes,
    });
  } catch (error) {
    console.error("POST /api/conversations/bulk:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
