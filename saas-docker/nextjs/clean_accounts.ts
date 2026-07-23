import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "fraruann159@gmail.com";
  console.log("=== INICIANDO LIMPEZA DE CONTAS ===");

  // 1. Listar usuários atuais
  const allUsers = await prisma.user.findMany();
  console.log(`Usuários encontrados (${allUsers.length}):`);
  for (const u of allUsers) {
    console.log(` - [${u.id}] Email: ${u.email} | Nome: ${u.name} | Role: ${u.role} | Tenant: ${u.tenant_id}`);
  }

  // 2. Verificar se o Admin principal existe, se não, criar
  let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!adminUser) {
    console.log(`\nCriando conta do Superadmin (${adminEmail})...`);
    // Criar um tenant exclusivo para o admin
    const adminTenant = await prisma.tenant.create({
      data: {
        name: "Nexus Admin",
        phone: "00000000000",
        plan: "enterprise"
      }
    });

    const password_hash = await bcrypt.hash("admin", 10);
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Ruan Gomes",
        password_hash,
        role: "superadmin",
        tenant_id: adminTenant.id
      }
    });
    console.log("Superadmin criado com sucesso!");
  } else {
    // Garantir que o admin seja superadmin e tenha o nome correto
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        role: "superadmin",
        name: adminUser.name || "Ruan Gomes"
      }
    });
    console.log(`\nConta do Admin confirmada: ${adminUser.email} (Tenant ID: ${adminUser.tenant_id})`);
  }

  const adminTenantId = adminUser.tenant_id;

  // 3. Desconectar WhatsApp de tenants secundários que serão removidos
  const { disconnectWhatsappInstances } = await import("./src/lib/whatsapp");
  const secondaryTenants = await prisma.tenant.findMany({
    where: { id: { not: adminTenantId } }
  });
  for (const st of secondaryTenants) {
    await disconnectWhatsappInstances({ tenant_id: st.id });
  }

  // 4. Excluir todos os outros usuários
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      id: { not: adminUser.id }
    }
  });
  console.log(`\nUsuários removidos: ${deletedUsers.count}`);

  // 5. Excluir todos os parceiros ( partners )
  const deletedPartners = await prisma.partner.deleteMany({});
  console.log(`Parceiros (partners) removidos: ${deletedPartners.count}`);

  // 6. Excluir todos os outros Tenants (que não sejam o do admin)
  const deletedTenants = await prisma.tenant.deleteMany({
    where: {
      id: { not: adminTenantId }
    }
  });
  console.log(`Tenants secundários removidos: ${deletedTenants.count}`);

  // 6. Resumo final
  const remainingUsers = await prisma.user.findMany();
  const remainingTenants = await prisma.tenant.findMany();
  console.log("\n=== STATUS FINAL DO BANCO DE DADOS ===");
  console.log(`Total de Usuários no sistema: ${remainingUsers.length}`);
  for (const u of remainingUsers) {
    console.log(` - Email: ${u.email} | Nome: ${u.name} | Role: ${u.role}`);
  }
  console.log(`Total de Tenants no sistema: ${remainingTenants.length}`);
  for (const t of remainingTenants) {
    console.log(` - Tenant ID: ${t.id} | Nome: ${t.name} | Plano: ${t.plan}`);
  }

  console.log("\nConcluído com sucesso!");
}

main()
  .catch((err) => {
    console.error("Erro durante limpeza de contas:", err);
  })
  .finally(() => prisma.$disconnect());
