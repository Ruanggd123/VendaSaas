import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

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

    const { instanceId, connectionName } = await req.json();

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

    let instanceName: string;
    let dbInstance: any;

    if (instanceId) {
      // Reconectar instância existente
      dbInstance = await prisma.whatsappInstance.findUnique({
        where: { id: instanceId },
      });

      if (!dbInstance || dbInstance.tenant_id !== session.tenant_id) {
        return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 });
      }

      instanceName = dbInstance.name;

      let connectRes = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        method: "GET",
        headers,
      });

      if (connectRes.status === 404) {
        connectRes = await fetch(`${evolutionUrl}/instance/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            instanceName,
            integration: "WHATSAPP-BAILEYS",
            qrcode: true,
          }),
        });

        // Garantir que o webhook seja configurado
        try {
          await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
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
        } catch (e) {
          console.error("Erro ao configurar webhook na recriação", e);
        }
      }

      if (!connectRes.ok) {
        return NextResponse.json({ error: "Erro ao gerar novo QR Code na Evolution API" }, { status: 500 });
      }

      const connectData = await connectRes.json();

      await prisma.whatsappInstance.update({
        where: { id: dbInstance.id },
        data: { status: "connecting" },
      });

      return NextResponse.json({
        status: "connecting",
        qrcode: connectData?.base64 || connectData?.qrcode?.base64 || null,
        instanceName,
        dbInstance,
      });
    } else {
      // Criando uma nova instância
      const tenant = await prisma.tenant.findUnique({ where: { id: session.tenant_id } });
      if (!tenant) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

      const isPartner = session.role === "partner";
      const instanceFilter = {
        tenant_id: session.tenant_id,
        ...(isPartner ? { partner_id: session.id } : {}),
      };

      const planLimit = tenant.plan === "solo" ? 1 : tenant.plan === "pro" ? 3 : 999;
      const partnerLimit = 1;
      const limit = isPartner ? partnerLimit : planLimit;
      const currentInstancesCount = await prisma.whatsappInstance.count({
        where: instanceFilter,
      });

      if (currentInstancesCount >= limit) {
        return NextResponse.json({ error: `Limite de ${limit} conexão(ões) atingido.` }, { status: 403 });
      }

      instanceName = `${session.tenant_id}_${crypto.randomUUID().substring(0, 8)}`;
      dbInstance = await prisma.whatsappInstance.create({
        data: {
          tenant_id: session.tenant_id,
          ...(isPartner ? { partner_id: session.id } : {}),
          name: instanceName,
          connectionName: connectionName || "WhatsApp Bot",
          status: "connecting",
        },
      });

      const createRes = await fetch(`${evolutionUrl}/instance/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          instanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
        }),
      });

      if (!createRes.ok) {
        return NextResponse.json({ error: "Erro ao criar instância no Evolution API" }, { status: 500 });
      }

      const createData = await createRes.json();

      // Configurar webhook automaticamente
      try {
        const webhookRes = await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
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
        if (!webhookRes.ok) {
          console.error("Falha ao registrar webhook da Evolution:", await webhookRes.text());
        } else {
          console.log(`✅ Webhook auto-configurado com URL ${webhookTargetUrl} para ${instanceName}`);
        }
      } catch (e) {
        console.error("Erro ao configurar webhook", e);
      }

      return NextResponse.json({
        status: "connecting",
        qrcode: createData?.base64 || createData?.qrcode?.base64 || null,
        instanceName,
        dbInstance,
      });
    }
  } catch (err: any) {
    console.error("POST /api/whatsapp/connect:", err);
    return NextResponse.json({ error: err.message || "Erro ao conectar WhatsApp" }, { status: 500 });
  }
}
