import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.tenant_id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const instanceName = body.instanceName;

    if (!instanceName) {
      return NextResponse.json({ error: "Nome da instância não fornecido" }, { status: 400 });
    }

    const evolutionUrl = process.env.EVOLUTION_URL || "http://evolution:8080";
    const evolutionKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionKey) {
      throw new Error("EVOLUTION_API_KEY não configurada no servidor");
    }

    // Verificar se pertence ao tenant (parceiro só na própria)
    const dbInstance = await prisma.whatsappInstance.findUnique({
      where: { name: instanceName }
    });

    if (!dbInstance || dbInstance.tenant_id !== session.tenant_id) {
      return NextResponse.json({ error: "Instância não encontrada ou acesso negado" }, { status: 404 });
    }

    if (session.role === 'partner' && dbInstance.partner_id !== session.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Exclui do banco de dados PRIMEIRO para garantir que a UI atualize rápido
    // e o usuário não fique preso se a Evolution API estiver lenta.
    await prisma.whatsappInstance.delete({
      where: { name: instanceName }
    });

    // Chama DELETE na Evolution API em background (fire and forget)
    // Não damos await para não prender a resposta.
    fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
      method: "DELETE",
      headers: {
        'apikey': evolutionKey,
      }
    }).catch(err => console.error("Erro ao deletar na Evolution API:", err));

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erro na rota /api/whatsapp/disconnect:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
