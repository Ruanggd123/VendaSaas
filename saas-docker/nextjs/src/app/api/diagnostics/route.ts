import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDiagnosticSummary } from "@/lib/diagnostics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const rawDays = Number(new URL(req.url).searchParams.get("days") || 1);
  const days = Math.min(30, Math.max(1, Number.isFinite(rawDays) ? rawDays : 1));
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return NextResponse.json({ period: { from, to: new Date() }, ...await getDiagnosticSummary(session.tenant_id, from) });
}
