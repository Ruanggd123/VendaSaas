import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const partner = await prisma.partner.findFirst({
    where: { email: "afiliado@demo.com" },
  });

  if (!partner) {
    console.log("Partner nao encontrado.");
    await prisma.$disconnect();
    return;
  }

  const name = "Carlos Eduardo Silva";
  const email = "carlos.silva@email.com";
  const rawPassword = "carlos123";
  const password_hash = await bcrypt.hash(rawPassword, 10);

  await prisma.partner.update({
    where: { id: partner.id },
    data: {
      name,
      email,
      password_hash,
      referralCode: "CARLOS01",
    },
  });

  console.log(`=== DADOS ATUALIZADOS ===`);
  console.log(`Nome: ${name}`);
  console.log(`Email: ${email}`);
  console.log(`Senha: ${rawPassword}`);
  console.log(`Codigo: CARLOS01`);
  console.log(`Link: ?ref=CARLOS01`);
  console.log(`Comissao: ${partner.commissionRate}%`);
  console.log(`\nPainel: /painel-parceiro`);

  await prisma.$disconnect();
}

main().catch(console.error);
