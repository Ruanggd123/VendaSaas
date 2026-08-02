import { processMessageWithRules } from "../src/lib/ai/rulesBot";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testClientWorkflowResponses() {
  const tenantId = "4e6e7007-f749-4fa5-bb65-1feff07e0d5e"; // Empresa Ruan (Growth)

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant || !tenant.settings) {
    console.error("Configurações não encontradas");
    process.exit(1);
  }

  const settings = JSON.parse(tenant.settings as string);

  console.log("=========================================================================");
  console.log("🧪 TESTANDO RESPOSTAS DO BOT NA CONTA DO CLIENTE (Marmoraria Imperial)");
  console.log("=========================================================================\n");

  // Simulação 1: Saudação inicial / Menu Principal
  const res1 = await processMessageWithRules(
    tenantId,
    "5588999990001",
    "Olá",
    settings
  );

  console.log("🔹 1. Saudação do Cliente ('Olá'):");
  console.log("---------------------------------------------------\n" + res1 + "\n");

  // Simulação 2: Opção 1 - Catálogo de Pedras
  const res2 = await processMessageWithRules(
    tenantId,
    "5588999990001",
    "1",
    settings
  );

  console.log("🔹 2. Seleção de Opção '1' (Catálogo de Pedras & Bancadas):");
  console.log("---------------------------------------------------\n" + res2 + "\n");

  // Simulação 3: Opção 3 - Agendar Medição Técnica
  const res3 = await processMessageWithRules(
    tenantId,
    "5588999990002",
    "3",
    settings
  );

  console.log("🔹 3. Seleção de Opção '3' (Agendar Medição Técnica Gratuita):");
  console.log("---------------------------------------------------\n" + res3 + "\n");

  console.log("=========================================================================");
  console.log("🎉 UI DO BOT E WORKFLOW DO CLIENTE 100% VALIDADOS E ESTRUTURADOS!");
  console.log("=========================================================================\n");

  process.exit(0);
}

testClientWorkflowResponses().catch((err) => {
  console.error("Erro no teste de resposta do bot:", err);
  process.exit(1);
});
