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

    const instances = await prisma.whatsappInstance.findMany({
      where: { tenant_id: session.tenant_id },
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
              webhookByEvents: false,
              events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "SEND_MESSAGE"],
            },
          }),
        });

        results.push({ instance: inst.name, ok: res.ok, status: res.status });
      } catch (err: any) {
        results.push({ instance: inst.name, ok: false, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      webhookTargetUrl,
      results,
    });
  } catch (err: any) {
    console.error("POST /api/whatsapp/sync-webhook:", err);
    return NextResponse.json({ error: err.message || "Erro ao sincronizar webhook" }, { status: 500 });
  }
}
