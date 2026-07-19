const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { id: 'aeeadf53-8f3d-4694-81bc-d171a8e33f1d' } });
  const settings = JSON.parse(tenant.settings);
  settings.ia_model = 'llama3.1';
  await prisma.tenant.update({ where: { id: 'aeeadf53-8f3d-4694-81bc-d171a8e33f1d' }, data: { settings: JSON.stringify(settings) } });
}
main().finally(() => prisma.$disconnect());
