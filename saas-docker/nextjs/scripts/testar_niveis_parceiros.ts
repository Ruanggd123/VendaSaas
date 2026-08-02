import { calculatePartnerTier, calculateCommissionForSale, PARTNER_TIERS } from '../src/lib/partners';

console.log("=========================================================================");
console.log("🧪 BATERIA DE TESTES AUTOMATIZADOS: SISTEMA GAMIFICADO DE NÍVEIS");
console.log("=========================================================================\n");

let errorsCount = 0;

// Teste 1: Validação das faixas de clientes
const testCases = [
  { clients: 0, expectedTier: 'Bronze', expectedRate: 20 },
  { clients: 5, expectedTier: 'Bronze', expectedRate: 20 },
  { clients: 10, expectedTier: 'Bronze', expectedRate: 20 },
  { clients: 11, expectedTier: 'Prata', expectedRate: 30 },
  { clients: 25, expectedTier: 'Prata', expectedRate: 30 },
  { clients: 30, expectedTier: 'Prata', expectedRate: 30 },
  { clients: 31, expectedTier: 'Ouro', expectedRate: 40 },
  { clients: 50, expectedTier: 'Ouro', expectedRate: 40 },
  { clients: 70, expectedTier: 'Ouro', expectedRate: 40 },
  { clients: 71, expectedTier: 'Diamante', expectedRate: 50 },
  { clients: 150, expectedTier: 'Diamante', expectedRate: 50 },
];

console.log("📌 TESTE 1: Validação de Níveis e Porcentagens por Faixa de Clientes:");
for (const tc of testCases) {
  const info = calculatePartnerTier(tc.clients);
  const pass = info.name === tc.expectedTier && info.recurringRate === tc.expectedRate;
  if (pass) {
    console.log(`  ✅ Clientes: ${tc.clients.toString().padStart(3)} | Nível: ${info.icon} ${info.name.padEnd(8)} | Recorrente: ${info.recurringRate}% | PASS!`);
  } else {
    console.log(`  ❌ FALHA para ${tc.clients} clientes: Obtido ${info.name} (${info.recurringRate}%), Esperado: ${tc.expectedTier} (${tc.expectedRate}%)`);
    errorsCount++;
  }
}

// Teste 2: Bônus de Ativação do 1º Mês (50%)
console.log("\n📌 TESTE 2: Validação da Regra de Bônus do 1º Mês (50% fixo):");
const saleAmount = 147.00; // Plano Growth
for (const tc of [5, 20, 45, 80]) {
  const commFirstMonth = calculateCommissionForSale(saleAmount, true, tc);
  const commRecurrent = calculateCommissionForSale(saleAmount, false, tc);

  const pass1 = commFirstMonth.rate === 50 && commFirstMonth.commissionAmount === 73.50;
  const pass2 = commRecurrent.rate === PARTNER_TIERS[commRecurrent.tierName].recurringRate;

  if (pass1 && pass2) {
    console.log(`  ✅ ${tc.toString().padStart(2)} Clientes | 1º Mês: R$ ${commFirstMonth.commissionAmount.toFixed(2)} (50%) | Recorrência: R$ ${commRecurrent.commissionAmount.toFixed(2)} (${commRecurrent.rate}%) | PASS!`);
  } else {
    console.log(`  ❌ FALHA de Bônus 1º mês para ${tc} clientes.`);
    errorsCount++;
  }
}

// Teste 3: Progresso para o próximo nível
console.log("\n📌 TESTE 3: Cálculo da Barra de Progresso de Graduação:");
const progressCases = [
  { clients: 0, next: 'Prata', needed: 11 },
  { clients: 5, next: 'Prata', needed: 6 },
  { clients: 11, next: 'Ouro', needed: 20 },
  { clients: 31, next: 'Diamante', needed: 40 },
  { clients: 71, next: null, needed: 0 },
];

for (const pc of progressCases) {
  const info = calculatePartnerTier(pc.clients);
  const pass = info.nextTierName === pc.next && info.clientsNeededForNext === pc.needed;
  if (pass) {
    console.log(`  ✅ Clientes: ${pc.clients.toString().padStart(2)} | Próximo Nível: ${(pc.next || 'Nenhum (Topo)').padEnd(14)} | Faltam: ${pc.needed.toString().padStart(2)} | Progresso: ${info.progressPercent}% | PASS!`);
  } else {
    console.log(`  ❌ FALHA no cálculo de progresso para ${pc.clients} clientes.`);
    errorsCount++;
  }
}

console.log("\n=========================================================================");
if (errorsCount === 0) {
  console.log("🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! O SISTEMA ESTÁ PRONTO!");
} else {
  console.log(`❌ ENCONTRADOS ${errorsCount} ERROS DURANTE OS TESTES.`);
}
console.log("=========================================================================\n");
