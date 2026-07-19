const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.conversation.findMany({
    where: { tenant_id: 'aeeadf53-8f3d-4694-81bc-d171a8e33f1d', instance_name: 'aeeadf53-8f3d-4694-81bc-d171a8e33f1d_f434b75f' }
  });
  console.log('COUNT:', result.length);
}
main();
