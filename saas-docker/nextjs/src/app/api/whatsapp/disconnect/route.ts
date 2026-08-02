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

    const evolutionUrl = process.env.EVOLUTION_URL || "https://evolution-api-03xi.onrender.com";
    const evolutionKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionKey) {
      throw new Error("EVOLUTION_API_KEY não configurada no servidor");
    }

    // Verificar se pertence ao tenant (parceiro só na própria)
    const dbInstance = await prisma.whatsappInstance.findUnique({
      where: { name: instanceName }
    });

    if (!dbInstance) {
      return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 });
    }

    // Super admin pode excluir qualquer instância
    if (session.role !== 'superadmin') {
      if (dbInstance.tenant_id !== session.tenant_id) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }
      if (session.role === 'partner' && dbInstance.partner_id !== session.id) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }
    }

    // Exclui do banco de dados
    await prisma.whatsappInstance.delete({
      where: { name: instanceName }
    });

    // Tenta excluir da Evolution API (await real, com fallback)
    try {
      await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
        method: "DELETE",
        headers: {
          'apikey': evolutionKey,
          'ngrok-skip-browser-warning': 'true'
        }
      });
    } catch (err) {
      console.warn("Evolution API indisponivel ao deletar instancia, removida apenas do banco:", err);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erro na rota /api/whatsapp/disconnect:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
