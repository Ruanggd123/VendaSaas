import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function testLoginRoute() {
  const email = "fraruann159@gmail.com";
  const password = "admin";

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    console.log("❌ Usuário não encontrado");
    return;
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    console.log("❌ Senha incorreta");
    return;
  }

  console.log("✅ LOGIN COM SUCESSO!");
  console.log("Role:", user.role);
  console.log("Tenant ID:", user.tenant_id);
}

testLoginRoute().finally(() => prisma.$disconnect());
