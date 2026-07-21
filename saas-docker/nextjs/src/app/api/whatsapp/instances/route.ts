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

    const evolutionUrl = process.env.EVOLUTION_URL || "http://evolution:8080";
    const evolutionKey = process.env.EVOLUTION_API_KEY;

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
    const res = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
      headers: { 
        'apikey': evolutionKey || '',
        'ngrok-skip-browser-warning': 'true'
      },
      cache: 'no-store'
    });

    let evolutionInstances = [];
    if (res.ok) {
      evolutionInstances = await res.json();
    }

    // Mesclar os dados
    const instances = await Promise.all(dbInstances.map(async (dbInst) => {
      const evoInst = evolutionInstances.find((ei: any) => ei?.instance?.instanceName === dbInst.name || ei?.name === dbInst.name);
      const realStatus = evoInst?.connectionStatus || evoInst?.instance?.state || evoInst?.state || "disconnected";
      
      let mappedStatus = "disconnected";
      if (realStatus === "open") {
        mappedStatus = "open";
      } else if (realStatus === "connecting" || (realStatus === "close" && dbInst.status === "connecting")) {
        // A Evolution API pode retornar 'close' para instâncias recém-criadas aguardando QR Code.
        // Se localmente está connecting, mantemos connecting para o UI mostrar o QR.
        mappedStatus = "connecting";
      }

      // Atualiza banco se estiver diferente
      if (dbInst.status !== mappedStatus) {
        await prisma.whatsappInstance.update({
          where: { id: dbInst.id },
          data: { status: mappedStatus }
        });
      }

      return {
        ...dbInst,
        status: mappedStatus,
        profilePic: evoInst?.profilePicUrl || null,
        phone_number: evoInst?.ownerJid?.split('@')[0] || dbInst.phone_number
      };
    }));

    return NextResponse.json({ instances });

  } catch (error: any) {
    console.error("Erro na rota /api/whatsapp/instances:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}
