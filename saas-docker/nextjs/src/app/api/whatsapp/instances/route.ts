import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.tenant_id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const rawUrl = (process.env.EVOLUTION_URL || "").trim();
    const evolutionUrl = (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) ? rawUrl.replace(/\/$/, "") : "https://evolution-api-03xi.onrender.com";
    const evolutionKey = process.env.EVOLUTION_API_KEY || process.env.NEXT_PUBLIC_EVOLUTION_API_KEY || "ba1add1dc7fbe706bfcb9afb78154402bd1e30813abe36d8c22c62532a50b3df";

    // Buscar instâncias no banco (parceiro vê só as próprias)
    const isPartner = session.role === 'partner';
    const dbInstances = await prisma.whatsappInstance.findMany({
      where: {
        tenant_id: session.tenant_id,
        ...(isPartner ? { partner_id: session.id } : {}),
      },
      orderBy: { created_at: "desc" }
    });

    if (dbInstances.length === 0) {
      return NextResponse.json({ instances: [] });
    }

    // Buscar status em tempo real na Evolution API
    let evolutionInstances: any[] = [];
    try {
      const res = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
        headers: { 
          'apikey': evolutionKey || '',
          'ngrok-skip-browser-warning': 'true'
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const rawJson = await res.json().catch(() => null);
        evolutionInstances = Array.isArray(rawJson)
          ? rawJson
          : Array.isArray(rawJson?.instances)
          ? rawJson.instances
          : [];
      }
    } catch (e) {
      console.warn("⚠️ Não foi possível consultar instâncias na Evolution API:", e);
    }

    // Mesclar os dados
    const instances = await Promise.all(dbInstances.map(async (dbInst) => {
      const evoInst = evolutionInstances.find((ei: any) => 
        ei?.instance?.instanceName === dbInst.name || 
        ei?.name === dbInst.name ||
        ei?.instanceName === dbInst.name
      );
      const realStatus = evoInst?.connectionStatus || evoInst?.instance?.state || evoInst?.state || dbInst.status || "disconnected";
      const realPhoneNumber = String(evoInst?.ownerJid || evoInst?.instance?.ownerJid || "").replace(/\D/g, "") || null;
      
      let mappedStatus = dbInst.status || "disconnected";
      if (realStatus === "open") {
        mappedStatus = "open";
      } else if (realStatus === "connecting" || (realStatus === "close" && dbInst.status === "connecting")) {
        mappedStatus = "connecting";
      }

      // Atualiza banco se estiver diferente
      if (dbInst.status !== mappedStatus || (realPhoneNumber && dbInst.phone_number !== realPhoneNumber)) {
        await prisma.whatsappInstance.update({
          where: { id: dbInst.id },
          data: {
            status: mappedStatus,
            ...(realPhoneNumber ? { phone_number: realPhoneNumber } : {}),
          }
        }).catch(() => {});
      }

      return {
        ...dbInst,
        status: mappedStatus,
        profilePic: evoInst?.profilePicUrl || null,
        phone_number: realPhoneNumber || dbInst.phone_number
      };
    }));

    return NextResponse.json({ instances });

  } catch (error: any) {
    console.error("Erro na rota /api/whatsapp/instances:", error);
    return NextResponse.json({ error: error?.message || "Erro interno no servidor" }, { status: 500 });
  }
}
