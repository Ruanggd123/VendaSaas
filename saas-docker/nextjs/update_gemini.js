const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tenants = await prisma.tenant.findMany();
  for (const tenant of tenants) {
    let settings = {};
    try {
        settings = JSON.parse(tenant.settings || "{}");
    } catch(e) {}
    settings.ia_model = "gemini-1.5-flash";
    await prisma.tenant.update({ where: { id: tenant.id }, data: { settings: JSON.stringify(settings) } });
  }
}
main().finally(() => prisma.$disconnect());
