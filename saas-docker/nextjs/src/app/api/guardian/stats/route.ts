import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDiagnosticSummary } from "@/lib/diagnostics";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.tenant_id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const summary = await getDiagnosticSummary(session.tenant_id, new Date(Date.now() - 24 * 60 * 60 * 1000));
    return NextResponse.json({
      approved: summary.totals.latency || 0,
      blocked: (summary.totals.blocked || 0) + (summary.totals.ignored || 0),
      jailbreak_attempts: summary.reasons.find((item) => item.reason === "jailbreak")?.count || 0,
      recent_blocks: summary.recent_failures.map((event) => ({
        intent: event.category,
        reason: event.reason_code.replace(/_/g, " "),
        timestamp: event.created_at.toISOString(),
      })),
      latency: summary.latency,
      reasons: summary.reasons,
    });
  } catch (error) {
    console.error("Erro ao buscar stats do Guardian:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
