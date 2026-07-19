import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.tenant_id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const evolutionUrl = process.env.EVOLUTION_URL || "http://evolution:8080";
    const evolutionKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionKey) {
      throw new Error("EVOLUTION_API_KEY não configurada no servidor");
    }

    // Buscar instâncias (parceiro vê só as próprias)
    const isPartner = session.role === 'partner';
    const dbInstances = await prisma.whatsappInstance.findMany({
      where: {
        tenant_id: session.tenant_id,
        ...(isPartner ? { partner_id: session.id } : {}),
      },
    });

    if (dbInstances.length === 0) {
      return NextResponse.json({ status: "not_created" });
    }

    // Buscar status em tempo real na Evolution API
    const res = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
      headers: { 'apikey': evolutionKey },
      cache: 'no-store'
    });

    let evolutionInstances: any[] = [];
    if (res.ok) {
      evolutionInstances = await res.json();
    }

    // Verificar cada instância
    for (const dbInst of dbInstances) {
      const evoInst = evolutionInstances.find(
        (ei: any) => ei?.instance?.instanceName === dbInst.name || ei?.name === dbInst.name
      );
      const realStatus = evoInst?.connectionStatus || evoInst?.instance?.state || evoInst?.state || "disconnected";

      if (realStatus === "open") {
        // Atualiza banco se necessário
        if (dbInst.status !== "open") {
          await prisma.whatsappInstance.update({
            where: { id: dbInst.id },
            data: { status: "open" }
          });
        }
        return NextResponse.json({ status: "open", instanceName: dbInst.name });
      }
    }

    return NextResponse.json({ status: "disconnected" });

  } catch (error: any) {
    console.error("Erro na rota /api/whatsapp/status:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
