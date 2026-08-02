import { processMessageWithRules } from "../src/lib/ai/rulesBot";
import { processMessageWithAI } from "../src/lib/ai/engine";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testarSimulacaoCompleta() {
  console.log("=================================================");
  console.log("🧪 INICIANDO TESTE DE SIMULAÇÃO COMPLETA (100% FIEL)");
  console.log("=================================================\n");

  const tenant = await prisma.tenant.findFirst();

  if (!tenant) {
    console.error("❌ Nenhum tenant encontrado no banco para os testes!");
    process.exit(1);
  }

  console.log(`📌 Tenant de Teste: ${tenant.name} (ID: ${tenant.id})\n`);

  let settings: any = {};
  try {
    settings = JSON.parse(tenant.settings || '{}');
  } catch(e) {}

  const testNumber = "5511999998888";

  // --- TESTE 1: Menu Principal e Regras (Modo Regras / Híbrido) ---
  console.log("--- 🔹 TESTE 1: Simulação do Menu de Regras (Entrada 'ola') ---");
  const resp1 = await processMessageWithRules(tenant.id, testNumber, "ola", settings, false);
  console.log("🤖 Resposta do Bot:\n", resp1, "\n-------------------------------------------------\n");

  console.log("--- 🔹 TESTE 2: Escolha da Opção 1 (Plano Start) ---");
  const resp2 = await processMessageWithRules(tenant.id, testNumber, "1", settings, false);
  console.log("🤖 Resposta do Bot:\n", resp2, "\n-------------------------------------------------\n");

  console.log("--- 🔹 TESTE 3: Retornar ao Menu ('0') ---");
  const resp3 = await processMessageWithRules(tenant.id, testNumber, "0", settings, false);
  console.log("🤖 Resposta do Bot:\n", resp3, "\n-------------------------------------------------\n");

  console.log("--- 🔹 TESTE 4: Exibir Catálogo Completo ---");
  const resp4 = await processMessageWithRules(tenant.id, testNumber, "catálogo", settings, false);
  console.log("🤖 Resposta do Bot:\n", resp4, "\n-------------------------------------------------\n");

  // --- TESTE 5: Chamada da IA (Modo IA / Híbrido com Pergunta Livre) ---
  console.log("--- 🔹 TESTE 5: Pergunta Livre para a IA ---");
  const msgLivre = "Qual é o plano mais vendido de vocês e o que vem incluso nele?";
  console.log(`👤 Usuário: "${msgLivre}"`);
  
  const aiSettings = { ...settings, bot_type: "ia" };
  const resp5 = await processMessageWithAI(tenant.id, testNumber, msgLivre, false, aiSettings);
  console.log("🤖 Resposta da IA:\n", resp5, "\n-------------------------------------------------\n");

  // --- TESTE 6: Pergunta sobre Preços e Formas de Pagamento ---
  console.log("--- 🔹 TESTE 6: Pergunta de Vendas sobre Pagamento PIX ---");
  const msgPix = "Vocês aceitam PIX? Como funciona a cobrança dos planos?";
  console.log(`👤 Usuário: "${msgPix}"`);
  const resp6 = await processMessageWithAI(tenant.id, testNumber, msgPix, false, aiSettings);
  console.log("🤖 Resposta da IA:\n", resp6, "\n-------------------------------------------------\n");

  console.log("=================================================");
  console.log("✅ TESTE DE SIMULAÇÃO CONCLUÍDO COM SUCESSO!");
  console.log("=================================================");
  process.exit(0);
}

testarSimulacaoCompleta().catch(err => {
  console.error("❌ Erro durante o teste de simulação:", err);
  process.exit(1);
});
