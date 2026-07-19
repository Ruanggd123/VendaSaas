import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const t = await prisma.tenant.findFirst();
  console.log("Tenant:", t);
  console.log("Settings Type:", typeof t.settings);
  if (typeof t.settings === 'string') {
    console.log("Settings Value:", t.settings);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
