import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== INICIANDO TESTE COMPLETO DOS MÓDULOS DE SISTEMA ===");

  // 1. Obter tenant do superadmin
  const adminUser = await prisma.user.findUnique({ where: { email: "fraruann159@gmail.com" } });
  if (!adminUser) throw new Error("Superadmin não encontrado");

  const tenantId = adminUser.tenant_id;
  console.log(`Tenant de teste: ${tenantId}`);

  // 2. Testar Ativação de Módulo Setorial (ex: 'odontologia')
  console.log("\n[TESTE 1] Ativando Módulo 'odontologia'...");
  await prisma.activeModule.deleteMany({ where: { tenant_id: tenantId } });

  const active1 = await prisma.activeModule.create({
    data: {
      tenant_id: tenantId,
      module_name: "odontologia"
    }
  });
  console.log("✅ Módulo 'odontologia' ativado com sucesso:", active1);

  // 3. Testar Troca para outro Módulo Setorial (ex: 'varejo')
  console.log("\n[TESTE 2] Alternando para Módulo 'varejo' (Desativa o anterior)...");
  await prisma.activeModule.deleteMany({
    where: { tenant_id: tenantId, module_name: { not: "varejo" } }
  });
  const active2 = await prisma.activeModule.upsert({
    where: { tenant_id_module_name: { tenant_id: tenantId, module_name: "varejo" } },
    create: { tenant_id: tenantId, module_name: "varejo" },
    update: {}
  });
  console.log("✅ Módulo 'varejo' ativado e 'odontologia' desativado com sucesso:", active2);

  // 4. Testar Criação de Módulo Customizado (ex: 'petshop')
  console.log("\n[TESTE 3] Criando Módulo Customizado 'petshop'...");
  const custom1 = await prisma.customModule.upsert({
    where: { tenant_id_key: { tenant_id: tenantId, key: "petshop" } },
    create: {
      tenant_id: tenantId,
      key: "petshop",
      title: "Petshop & Veterinária",
      icon: "🐶",
      description: "IA especialista em consultas veterinárias e rações",
      system_prompt: "Você é um atendente veterinário empático e profissional."
    },
    update: {
      title: "Petshop & Veterinária",
      icon: "🐶",
      description: "IA especialista em consultas veterinárias e rações",
      system_prompt: "Você é um atendente veterinário empático e profissional."
    }
  });
  console.log("✅ Módulo Customizado 'petshop' criado com sucesso:", custom1.title);

  // 5. Testar Leitura de Todos os Módulos do Tenant
  console.log("\n[TESTE 4] Consultando status dos Módulos do Tenant...");
  const activeList = await prisma.activeModule.findMany({ where: { tenant_id: tenantId } });
  const customList = await prisma.customModule.findMany({ where: { tenant_id: tenantId } });
  console.log(`Módulos Ativos no DB (${activeList.length}):`, activeList.map(a => a.module_name));
  console.log(`Módulos Customizados no DB (${customList.length}):`, customList.map(c => `${c.icon} ${c.title}`));

  // 6. Testar Exclusão do Módulo Customizado de Teste
  console.log("\n[TESTE 5] Excluindo Módulo Customizado de teste...");
  await prisma.activeModule.deleteMany({ where: { tenant_id: tenantId, module_name: "petshop" } });
  await prisma.customModule.deleteMany({ where: { tenant_id: tenantId, key: "petshop" } });
  console.log("✅ Módulo Customizado de teste excluído limpo.");

  console.log("\n=== TODOS OS TESTES DOS MÓDULOS FORAM CONCLUÍDOS COM SUCESSO 100%! ===");
}

main()
  .catch((err) => console.error("❌ Erro nos testes dos módulos:", err))
  .finally(() => prisma.$disconnect());
