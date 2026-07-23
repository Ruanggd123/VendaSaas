import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function testPass() {
  const user = await prisma.user.findUnique({
    where: { email: "fraruann159@gmail.com" }
  });

  if (!user) {
    console.log("Usuário não encontrado");
    return;
  }

  console.log("Usuário encontrado:", user.email);
  console.log("Hash no banco:", user.password_hash);

  const isPasswordAdmin = await bcrypt.compare("admin", user.password_hash);
  console.log("Testando senha 'admin':", isPasswordAdmin);
}

testPass().finally(() => prisma.$disconnect());
