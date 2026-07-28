import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

function getValidAppBaseUrl(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");

  let envUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/[\r\n\t]/g, "").trim();
  if (envUrl.includes("Sensitive") || envUrl.includes("NEXT_PUBLIC") || !envUrl.startsWith("http")) {
    envUrl = "";
  }

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (host) {
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const evolutionUrl = process.env.EVOLUTION_URL || "http://evolution:8080";
    const evolutionKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionKey) {
      return NextResponse.json({ error: "EVOLUTION_API_KEY não configurada no servidor." }, { status: 500 });
    }

    const headers = {
      apikey: evolutionKey,
      "Content-Type": "application/json",
    };

    const appBaseUrl = getValidAppBaseUrl(req);
    const webhookTargetUrl = `${appBaseUrl}/api/webhooks/evolution`;
    const expectedEvents = ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "SEND_MESSAGE"];

    const instances = await prisma.whatsappInstance.findMany({
      where: {
        tenant_id: session.tenant_id,
        ...(session.role === "partner" ? { partner_id: session.id } : {}),
      },
    });

    const results = [];

    for (const inst of instances) {
      try {
        const res = await fetch(`${evolutionUrl}/webhook/set/${inst.name}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: webhookTargetUrl,
              byEvents: false,
              base64: true,
              events: expectedEvents,
            },
          }),
        });

        if (!res.ok) {
          results.push({
            instance: inst.name,
            ok: false,
            status: res.status,
            error: "Falha ao configurar webhook na Evolution API",
            webhookAtual: null,
            webhookEsperado: webhookTargetUrl,
          });
          continue;
        }

        const findRes = await fetch(`${evolutionUrl}/webhook/find/${inst.name}`, {
          method: "GET",
          headers,
        });

        if (!findRes.ok) {
          results.push({
            instance: inst.name,
            ok: false,
            status: findRes.status,
            error: "Webhook configurado, mas não foi possível verificar o estado atual",
            webhookAtual: null,
            webhookEsperado: webhookTargetUrl,
          });
          continue;
        }

        const webhookInfo: any = await findRes.json().catch(() => null);
        const webhook = webhookInfo?.webhook || webhookInfo;
        const webhookAtual = webhook?.url || null;
        const configuredEvents = Array.isArray(webhook?.events) ? webhook.events : [];
        const configurationMatches =
          webhookAtual === webhookTargetUrl &&
          webhook?.enabled === true &&
          webhook?.webhookByEvents === false &&
          expectedEvents.every((event) => configuredEvents.includes(event));
        results.push({
          instance: inst.name,
          ok: configurationMatches,
          status: findRes.status,
          webhookAtual,
          webhookEsperado: webhookTargetUrl,
        });
      } catch (err: any) {
        results.push({
          instance: inst.name,
          ok: false,
          error: err.message,
          webhookAtual: null,
          webhookEsperado: webhookTargetUrl,
        });
      }
    }

    return NextResponse.json({
      success: results.every((result) => result.ok),
      webhookTargetUrl,
      results,
    });
  } catch (err: any) {
    console.error("POST /api/whatsapp/sync-webhook:", err);
    return NextResponse.json({ error: err.message || "Erro ao sincronizar webhook" }, { status: 500 });
  }
}
