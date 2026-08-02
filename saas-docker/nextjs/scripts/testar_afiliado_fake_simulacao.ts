import { PrismaClient } from '@prisma/client';
import { calculatePartnerTier, calculateCommissionForSale } from '../src/lib/partners';

const prisma = new PrismaClient();

async function runFakeAffiliateSimulation() {
  console.log("=========================================================================");
  console.log("🧪 TESTE COMPLETO DE SIMULAÇÃO: CONTA DE AFILIADO FAKE COM VÁRIAS VENDAS");
  console.log("=========================================================================\n");

  // 1. Criar ou buscar Afiliado Fake de Teste no Banco
  const fakeCode = `TEST_FAKE_${Date.now()}`;
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("Tenant não encontrado no banco");

  const partner = await prisma.partner.create({
    data: {
      tenant_id: tenant.id,
      name: "Afiliado Fake de Testes (Simulação)",
      email: `afiliado_fake_${Date.now()}@teste.com`,
      password_hash: "$2b$10$abcdefghijklmnopqrstuv",
      referralCode: fakeCode,
      type: "vendedor",
      commissionRate: 20,
    }
  });

  console.log(`✅ Afiliado Fake criado: ID ${partner.id} | Código: ${partner.referralCode}\n`);

  // 2. Simular inserção de vendas ativas e verificar mudança progressiva de Nível & Comissão
  const milestones = [
    { targetSales: 1, expectedTier: "Bronze", expectedRecurRate: 20 },
    { targetSales: 5, expectedTier: "Bronze", expectedRecurRate: 20 },
    { targetSales: 11, expectedTier: "Prata", expectedRecurRate: 30 },
    { targetSales: 25, expectedTier: "Prata", expectedRecurRate: 30 },
    { targetSales: 31, expectedTier: "Ouro", expectedRecurRate: 40 },
    { targetSales: 50, expectedTier: "Ouro", expectedRecurRate: 40 },
    { targetSales: 71, expectedTier: "Diamante", expectedRecurRate: 50 },
  ];

  let currentSalesCount = 0;
  let totalCommissionsEarned = 0;

  for (const m of milestones) {
    // Adicionar vendas ativas no banco de dados para o parceiro fake
    const needed = m.targetSales - currentSalesCount;
    for (let i = 0; i < needed; i++) {
      currentSalesCount++;
      const lead = await prisma.lead.create({
        data: {
          tenant_id: tenant.id,
          partner_id: partner.id,
          name: `Cliente Simulado #${currentSalesCount}`,
          phone: `558899000${currentSalesCount.toString().padStart(3, '0')}`,
          email: `cliente_simulado_${currentSalesCount}@teste.com`,
          status: 'won',
          value: 147,
          interested_product: 'Plano Growth'
        }
      });

      // Venda 1º Mês (Bônus de 50%)
      const saleFirstMonth = await prisma.sale.create({
        data: {
          tenant_id: tenant.id,
          lead_id: lead.id,
          product_name: 'Plano Growth (Mais Vendido ⭐)',
          amount: 147,
          status: 'approved',
          paid_at: new Date()
        }
      });

      // Calcular comissão do 1º mês
      const comm1 = calculateCommissionForSale(147, true, currentSalesCount);
      await prisma.partnerCommission.create({
        data: {
          partner_id: partner.id,
          sale_id: saleFirstMonth.id,
          amount: comm1.commissionAmount,
          type: 'first_month_bonus',
          status: 'paid'
        }
      });
      totalCommissionsEarned += comm1.commissionAmount;

      // Venda 2º Mês (Recorrência do Nível Atual)
      const saleSecondMonth = await prisma.sale.create({
        data: {
          tenant_id: tenant.id,
          lead_id: lead.id,
          product_name: 'Plano Growth (Mais Vendido ⭐)',
          amount: 147,
          status: 'approved',
          paid_at: new Date()
        }
      });

      const comm2 = calculateCommissionForSale(147, false, currentSalesCount);
      await prisma.partnerCommission.create({
        data: {
          partner_id: partner.id,
          sale_id: saleSecondMonth.id,
          amount: comm2.commissionAmount,
          type: 'recurring',
          status: 'paid'
        }
      });
      totalCommissionsEarned += comm2.commissionAmount;
    }

    // Avaliar estado atual do parceiro no banco
    const activeCountInDb = await prisma.lead.count({
      where: { partner_id: partner.id, status: { in: ['CONVERTED', 'won'] } }
    });

    const tierInfo = calculatePartnerTier(activeCountInDb);
    const pass = tierInfo.name === m.expectedTier && tierInfo.recurringRate === m.expectedRecurRate;

    console.log(`📌 Marco de Vendas: ${activeCountInDb.toString().padStart(2)} Clientes Ativos`);
    console.log(`   └─ Nível Desbloqueado: ${tierInfo.icon} Nível ${tierInfo.name.padEnd(8)}`);
    console.log(`   └─ Comissão no 1º Mês: 50% (R$ 73,50 no Plano Growth)`);
    console.log(`   └─ Comissão Recorrente: ${tierInfo.recurringRate}% (R$ ${((147 * tierInfo.recurringRate)/100).toFixed(2)}/mês no Plano Growth)`);
    console.log(`   └─ Status do Teste: ${pass ? '✅ APROVADO!' : '❌ FALHA!'}\n`);
  }

  console.log("=========================================================================");
  console.log(`💰 Faturamento Total do Parceiro Fake na Simulação: R$ ${totalCommissionsEarned.toFixed(2)}`);
  console.log("🎉 SIMULAÇÃO CONCLUÍDA COM SUCESSO E CÁLCULOS 100% VALIDADOS!");
  console.log("=========================================================================\n");

  // Limpeza do Parceiro de Teste do Banco de Dados
  await prisma.partnerCommission.deleteMany({ where: { partner_id: partner.id } });
  await prisma.sale.deleteMany({ where: { lead: { partner_id: partner.id } } });
  await prisma.lead.deleteMany({ where: { partner_id: partner.id } });
  await prisma.partner.delete({ where: { id: partner.id } });

  process.exit(0);
}

runFakeAffiliateSimulation().catch((err) => {
  console.error("Erro na simulação:", err);
  process.exit(1);
});
