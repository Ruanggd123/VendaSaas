import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.tenant_id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Mock data — real logging can be wired in later via a GuardianLog table
    return NextResponse.json({
      approved: 47,
      blocked: 12,
      jailbreak_attempts: 3,
      recent_blocks: [
        {
          intent: "agendar_compromisso",
          reason: "Campo obrigatório faltando: hora",
          timestamp: new Date().toISOString(),
        },
        {
          intent: "criar_ordem_servico",
          reason: "Campo obrigatório faltando: defeito_relatado",
          timestamp: new Date(Date.now() - 3_600_000).toISOString(),
        },
        {
          intent: "enviar_mensagem_em_massa",
          reason: "Intenção não permitida para este plano",
          timestamp: new Date(Date.now() - 7_200_000).toISOString(),
        },
        {
          intent: "deletar_todos_leads",
          reason: "Tentativa de acesso a ação destrutiva sem confirmação",
          timestamp: new Date(Date.now() - 86_400_000).toISOString(),
        },
        {
          intent: "exportar_dados_sensiveis",
          reason: "Jailbreak detectado: instrução fora de escopo",
          timestamp: new Date(Date.now() - 172_800_000).toISOString(),
        },
      ],
    });
  } catch (error) {
    console.error("Erro ao buscar stats do Guardian:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
