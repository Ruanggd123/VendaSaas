import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";
import { formatBusinessDateKey } from "./dateTime";
import { getPlanDetails } from "./plans";

const prisma = new PrismaClient();

export function attendanceUsagePrefix(tenantId: string, period: string) {
  return `usage_attendance_${tenantId}_${period}_`;
}

export function attendanceUsageKey(tenantId: string, instanceName: string, contactNumber: string, period: string) {
  const digest = createHash("sha256").update(`${instanceName}:${contactNumber}`).digest("hex");
  return `${attendanceUsagePrefix(tenantId, period)}${digest}`;
}

export async function reserveMonthlyAttendance(input: {
  tenantId: string;
  tenantPlan: string;
  instanceName: string;
  contactNumber: string;
  configuredLimit?: unknown;
}) {
  const configured = Number(input.configuredLimit);
  const planLimit = getPlanDetails(input.tenantPlan).maxConversations;
  const limit = Number.isFinite(configured) && configured >= 0 ? configured : planLimit;
  if (limit === null) return { allowed: true, used: null, limit: null, counted: false };

  const period = formatBusinessDateKey(new Date()).slice(0, 7);
  const prefix = attendanceUsagePrefix(input.tenantId, period);
  const key = attendanceUsageKey(input.tenantId, input.instanceName, input.contactNumber, period);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${prefix}))`;
    const existing = await tx.systemConfig.findUnique({ where: { key }, select: { key: true } });
    const used = await tx.systemConfig.count({ where: { key: { startsWith: prefix } } });
    if (existing) return { allowed: true, used, limit, counted: false };
    if (used >= limit) return { allowed: false, used, limit, counted: false };

    await tx.systemConfig.create({ data: { key, value: new Date().toISOString() } });
    return { allowed: true, used: used + 1, limit, counted: true };
  });
}
