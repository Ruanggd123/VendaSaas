const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  if (tenants.length > 0) {
    const settings = JSON.parse(tenants[0].settings || '{}');
    console.log('Products:', JSON.stringify(settings.products, null, 2));
  } else {
    console.log('No tenants found.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
