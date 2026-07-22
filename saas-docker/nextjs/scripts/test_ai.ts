import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = "8806e428-9205-481f-933e-0fb52e32d02c";
const TEST_NUMBER = "5511999999999";

interface TestCase {
  name: string;
  message: string;
}

const testCases: TestCase[] = [
  // ── SAUDAÇÕES ──
  { name: "Saudação simples 'Oi'", message: "Oi" },
  { name: "Saudação 'Bom dia'", message: "Bom dia" },
  { name: "Saudação 'oiee'", message: "oiee" },

  // ── ERROS ORTOGRÁFICOS / INFORMAL ──
  { name: "Erro 'quero um site'", message: "quero um site" },
  { name: "Erro 'qual preso do bot'", message: "qual preso do bot" },
  { name: "Erro 'qro comprar'", message: "qro comprar" },
  { name: "Erro 'gostaria de saber os preços dos produtos de vcs'", message: "gostaria de saber os preços dos produtos de vcs" },
  { name: "Gíria 'me vê um site aí'", message: "me vê um site aí" },

  // ── COMPRAS / INTENÇÃO ──
  { name: "Compra 'gostaria de contratar o plano growth'", message: "gostaria de contratar o plano growth" },
  { name: "Compra 'quero o ecommerce'", message: "quero o ecommerce" },
  { name: "Compra 'quero assinar o plano start'", message: "quero assinar o plano start" },
  { name: "Compra 'to interessado no site avulso'", message: "to interessado no site avulso" },

  // ── INFORMAÇÕES ──
  { name: "Info 'quanto custa o plano scale'", message: "quanto custa o plano scale" },
  { name: "Info 'tem desconto'", message: "tem desconto pra quem assina mais de um produto" },
  { name: "Info 'quais os planos que vocês tem'", message: "quais os planos que vocês tem" },

  // ── AGENDAMENTO ──
  { name: "Agenda 'quero agendar um horário'", message: "quero agendar um horário" },

  // ── CONFUSAS ──
  { name: "Confuso 'n sei o q quero me ajuda'", message: "n sei o q quero me ajuda" },
  { name: "Gaguejo 'eu to eu to precisando de um site'", message: "eu to eu to precisando de um site" },

  // ── FORA DO CATÁLOGO ──
  { name: "Fora catálogo 'quero comprar um carro'", message: "quero comprar um carro" },
  { name: "Fora catálogo 'você vende geladeira'", message: "você vende geladeira" },
];

const MENU_PATTERNS = [
  /digite\s*[1-9]\s*(para|\.|,)/i,
  /[1-9]️?\s*[-–—]\s*(para|confirmar|cancelar)/i,
  /(para\s+confirmar|para\s+cancelar).*(digite|envie|mande)\s*[1-9]/i,
];

async function runTests() {
  console.log("=".repeat(70));
  console.log("🧪 TESTE DO ENGINE.TS - processMessageWithAI");
  console.log(`📋 Tenant: Nexus AI | Cenários: ${testCases.length}`);
  console.log("=".repeat(70));

  const { processMessageWithAI } = await import("../src/lib/ai/engine");

  let passed = 0;
  let failed = 0;
  const details: string[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    process.stdout.write(`\n[${i + 1}/${testCases.length}] ${tc.name}... `);

    try {
      const response = await processMessageWithAI(TENANT_ID, TEST_NUMBER, tc.message, true);
      const cleanResp = (response || "(null)").replace(/\n/g, " ").substring(0, 150);
      
      // Validações
      let hasMenu = false;
      let hasDigite = /digite\s+[1-9]/i.test(response || "");
      for (const pat of MENU_PATTERNS) {
        if (pat.test(response || "")) { hasMenu = true; break; }
      }

      const isNull = response === null;
      const isRegras = /digite\s*o\s*número|escolha\s*a\s*opção/i.test(response || "");
      const wordCount = (response || "").split(/\s+/).filter(Boolean).length;

      if (hasMenu || hasDigite || isNull || isRegras) {
        console.log(`❌ FALHOU`);
        failed++;
        const reasons: string[] = [];
        if (hasMenu) reasons.push("menu numérico");
        if (hasDigite) reasons.push("contém 'Digite N'");
        if (isNull) reasons.push("resposta nula (erro API)");
        if (isRegras) reasons.push("parece modo regras");
        details.push(`  ❌ ${tc.name}: ${reasons.join(", ")} | "${cleanResp}"`);
      } else {
        console.log(`✅ OK (${wordCount} palavras)`);
        passed++;
      }

      // Mostra a resposta completa
      console.log(`     → ${cleanResp}`);
    } catch (err: any) {
      console.log(`❌ ERRO`);
      failed++;
      details.push(`  💥 ${tc.name}: Exception - ${err.message}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("📊 RESULTADO FINAL");
  console.log(`✅ Passaram: ${passed}/${testCases.length}`);
  console.log(`❌ Falharam: ${failed}/${testCases.length}`);

  if (details.length > 0) {
    console.log("\n📋 Detalhes das falhas:");
    details.forEach(d => console.log(d));
  }

  await prisma.$disconnect();
}

runTests().catch(console.error);
