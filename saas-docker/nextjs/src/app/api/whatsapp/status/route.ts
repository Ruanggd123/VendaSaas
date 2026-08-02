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

    const evolutionUrl = process.env.EVOLUTION_URL || "https://evolution-api-03xi.onrender.com";
    const evolutionKey = process.env.EVOLUTION_API_KEY || process.env.NEXT_PUBLIC_EVOLUTION_API_KEY || "ba1add1dc7fbe706bfcb9afb78154402bd1e30813abe36d8c22c62532a50b3df";

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
    let evolutionInstances: any[] = [];
    try {
      const res = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
        headers: { 
          'apikey': evolutionKey,
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
      console.warn("⚠️ Não foi possível consultar status na Evolution API:", e);
    }

    // Verificar cada instância
    for (const dbInst of dbInstances) {
      const evoInst = evolutionInstances.find(
        (ei: any) => ei?.instance?.instanceName === dbInst.name || ei?.name === dbInst.name || ei?.instanceName === dbInst.name
      );
      const realStatus = evoInst?.connectionStatus || evoInst?.instance?.state || evoInst?.state || dbInst.status || "disconnected";

      if (realStatus === "open") {
        // Atualiza banco se necessário
        if (dbInst.status !== "open") {
          await prisma.whatsappInstance.update({
            where: { id: dbInst.id },
            data: { status: "open" }
          }).catch(() => {});
        }
        return NextResponse.json({ status: "open", instanceName: dbInst.name });
      }
    }

    return NextResponse.json({ status: "disconnected" });

  } catch (error: any) {
    console.error("Erro na rota /api/whatsapp/status:", error);
    return NextResponse.json({ error: error?.message || "Erro interno no servidor" }, { status: 500 });
  }
}
