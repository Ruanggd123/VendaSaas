import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, phone: true },
    take: 10,
  });
  console.log("=== TENANTS DISPONIVEIS ===");
  tenants.forEach((t, i) => {
    console.log(`${i + 1}. ID: ${t.id} | Nome: ${t.name} | Phone: ${t.phone}`);
  });

  if (tenants.length === 0) {
    console.log("Nenhum tenant encontrado.");
    await prisma.$disconnect();
    return;
  }

  const tenantId = tenants[0].id;

  const name = "Afiliado Demonstração";
  const email = "afiliado@demo.com";
  const referralCode = "DEMO01";
  const rawPassword = "afiliado123";
  const password_hash = await bcrypt.hash(rawPassword, 10);

  const existing = await prisma.partner.findFirst({
    where: { tenant_id: tenantId, email },
  });

  if (existing) {
    console.log(`\nPartner ja existe: ${existing.name} | Email: ${existing.email}`);
    console.log(`Login: ${email} / Senha: ${rawPassword}`);
    console.log(`Link de referral: ?ref=${existing.referralCode}`);
    await prisma.$disconnect();
    return;
  }

  const partner = await prisma.partner.create({
    data: {
      tenant_id: tenantId,
      name,
      email,
      password_hash,
      referralCode,
      type: "vendedor",
      commissionRate: 30,
    },
  });

  console.log(`\n=== AFILIADO CRIADO COM SUCESSO ===`);
  console.log(`Nome: ${partner.name}`);
  console.log(`Email: ${email}`);
  console.log(`Senha: ${rawPassword}`);
  console.log(`Codigo de Referencia: ${partner.referralCode}`);
  console.log(`Link de afiliado: ?ref=${partner.referralCode}`);
  console.log(`Comissao: ${partner.commissionRate}%`);
  console.log(`\nPainel do parceiro: /painel-parceiro`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erro:", e);
  process.exit(1);
});
