import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export type DiagnosticCategory = "grouped" | "ignored" | "failure" | "latency" | "no_response" | "blocked";

export async function recordDiagnostic(input: {
  tenantId: string;
  instanceName?: string | null;
  providerEventId?: string | null;
  category: DiagnosticCategory;
  reasonCode: string;
  durationMs?: number;
}) {
  await prisma.diagnosticEvent.create({
    data: {
      tenant_id: input.tenantId,
      instance_name: input.instanceName || null,
      provider_event_id: input.providerEventId || null,
      category: input.category,
      reason_code: input.reasonCode,
      duration_ms: input.durationMs,
    },
  }).catch((error) => console.warn("[Diagnostics] Falha ao registrar evento:", error));
}

export async function getDiagnosticSummary(tenantId: string, from: Date) {
  const events = await prisma.diagnosticEvent.findMany({
    where: { tenant_id: tenantId, created_at: { gte: from } },
    orderBy: { created_at: "desc" },
    take: 5000,
  });
  const totals: Record<string, number> = {};
  const grouped = new Map<string, { category: string; reason: string; count: number }>();
  const latencies: number[] = [];
  for (const event of events) {
    totals[event.category] = (totals[event.category] || 0) + 1;
    const key = `${event.category}:${event.reason_code}`;
    const item = grouped.get(key) || { category: event.category, reason: event.reason_code, count: 0 };
    item.count += 1;
    grouped.set(key, item);
    if (event.duration_ms !== null) latencies.push(event.duration_ms);
  }
  latencies.sort((a, b) => a - b);
  return {
    totals,
    latency: {
      count: latencies.length,
      average_ms: latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : 0,
      p95_ms: latencies.length ? latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * 0.95) - 1)] : 0,
    },
    reasons: [...grouped.values()].sort((a, b) => b.count - a.count),
    recent_failures: events.filter((event) => event.category === "failure" || event.category === "no_response").slice(0, 20),
  };
}

export async function cleanupOperationalData(now = new Date()) {
  const cutoff = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000);
  const results = await Promise.all([
    prisma.systemConfig.deleteMany({ where: { key: { startsWith: "inbound_debounce_" }, updated_at: { lt: cutoff(10) } } }),
    prisma.systemConfig.deleteMany({ where: { key: { startsWith: "inbound_processing_" }, updated_at: { lt: cutoff(5) } } }),
    prisma.systemConfig.deleteMany({ where: { key: { startsWith: "outbound_media_echo_" }, updated_at: { lt: cutoff(10) } } }),
    prisma.systemConfig.deleteMany({ where: { key: { startsWith: "evolution_message_" }, updated_at: { lt: cutoff(7 * 24 * 60) } } }),
    prisma.systemConfig.deleteMany({ where: { key: { startsWith: "rulesbot_state_" }, updated_at: { lt: cutoff(30 * 24 * 60) } } }),
    prisma.systemConfig.deleteMany({ where: { key: { startsWith: "usage_attendance_" }, updated_at: { lt: cutoff(400 * 24 * 60) } } }),
    prisma.diagnosticEvent.deleteMany({ where: { created_at: { lt: cutoff(90 * 24 * 60) } } }),
  ]);
  return results.reduce((sum, result) => sum + result.count, 0);
}
