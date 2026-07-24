import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function verifyInstanceOwnership(tenantId: string, instanceName: string): Promise<boolean> {
  if (!instanceName) return false;
  const count = await prisma.whatsappInstance.count({
    where: { name: instanceName, tenant_id: tenantId }
  });
  return count > 0;
}