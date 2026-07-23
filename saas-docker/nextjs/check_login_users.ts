import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  console.log("=== VERIFICANDO USUÁRIOS NO BANCO ===");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenant_id: true,
      created_at: true,
    }
  });

  console.log("Usuários encontrados:", users);

  const partners = await prisma.partner.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
    }
  });

  console.log("Parceiros encontrados:", partners);
}

checkUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
