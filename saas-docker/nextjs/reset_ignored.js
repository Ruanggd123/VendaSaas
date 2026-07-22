const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tenants = await prisma.tenant.findMany();
  for (const t of tenants) {
    if (t.settings) {
       try {
         const settings = typeof t.settings === 'string' ? JSON.parse(t.settings) : t.settings;
         if (settings.ignored_numbers) {
            settings.ignored_numbers = "";
            await prisma.tenant.update({
              where: { id: t.id },
              data: { settings: JSON.stringify(settings) }
            });
            console.log(`Cleared ignored_numbers for tenant ${t.id}`);
         }
       } catch (e) {
         console.error(e);
       }
    }
  }
}
main().finally(() => prisma.$disconnect());
