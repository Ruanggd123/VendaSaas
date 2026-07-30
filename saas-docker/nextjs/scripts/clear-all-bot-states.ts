import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Limpando todos os estados antigos do Bot de Regras no banco de dados...");
  
  const deleted = await prisma.systemConfig.deleteMany({
    where: {
      key: {
        startsWith: 'rulesbot_state_'
      }
    }
  });

  console.log(`✅ ${deleted.count} estados antigos do bot foram limpos! Todos os testes começarão 100% do zero.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
