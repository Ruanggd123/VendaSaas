import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...\n");

  // 1. Criar Tenant principal (empresa do dono)
  const tenant = await prisma.tenant.create({
    data: {
      name: "Nexus AI",
      phone: "5588981885499",
      plan: "enterprise",
      status: "active",
      subscription_expires_at: new Date("2030-12-31"),
    },
  });
  console.log(`✅ Tenant criado: ${tenant.name} (${tenant.id})`);

  // 2. Criar Superadmin
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const superadmin = await prisma.user.create({
    data: {
      tenant_id: tenant.id,
      name: "Ruan Gomes",
      email: "admin@nexusai.com.br",
      password_hash: hashedPassword,
      role: "superadmin",
    },
  });
  console.log(`✅ Superadmin criado: ${superadmin.email} (senha: admin123)`);

  // 3. Criar Tenant de exemplo (demo para clientes)
  const demoTenant = await prisma.tenant.create({
    data: {
      name: "Empresa Demo",
      phone: "5511999999999",
      plan: "solo",
      status: "active",
      subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✅ Tenant demo criado: ${demoTenant.name}`);

  const demoUser = await prisma.user.create({
    data: {
      tenant_id: demoTenant.id,
      name: "Cliente Demo",
      email: "demo@nexusai.com.br",
      password_hash: hashedPassword,
      role: "admin",
    },
  });
  console.log(`✅ Usuário demo criado: ${demoUser.email} (senha: admin123)`);

  // 4. Configurações padrão do sistema
  const configs = [
    { key: "payment_provider", value: "none" },
    { key: "plan_solo_price", value: "197" },
    { key: "plan_pro_price", value: "397" },
    { key: "plan_business_price", value: "997" },
    { key: "auto_charge_enabled", value: "false" },
    { key: "auto_charge_days", value: "5" },
    { key: "late_fee_percent", value: "2" },
  ];

  for (const config of configs) {
    await prisma.systemConfig.create({ data: config });
  }
  console.log(`✅ ${configs.length} configs do sistema criadas`);

  console.log("\n🎉 Seed concluído!");
  console.log("\n📋 Credenciais de acesso:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Superadmin: admin@nexusai.com.br");
  console.log("  Senha:      admin123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Demo:       demo@nexusai.com.br");
  console.log("  Senha:      admin123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n⚠️  ALTERE A SENHA APÓS O PRIMEIRO LOGIN!");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
