import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("Users before update:");
  for (const u of users) {
      console.log(`ID: ${u.id} | Email: ${u.email} | Name: ${u.name} | Role: ${u.role}`);
  }
  
  for (const user of users) {
    if (user.role === 'superadmin' || user.email === 'fraruann159@gmail.com') {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: 'Ruan Gomes' }
      });
      console.log(`Updated user ${user.email} name to Ruan Gomes`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
