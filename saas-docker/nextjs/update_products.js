const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://admin:MudeEstaSenhaAgora@2026@localhost:5432/saas'
    }
  }
});

async function main() {
  const tenantId = 'c4c13619-a56f-4ff2-82c7-3c4503a10d13';
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  
  if (!tenant) {
    console.error("Tenant not found");
    process.exit(1);
  }

  const currentSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});

  const newProducts = [
    {
      name: "Site Avulso",
      price: 497,
      type: "standalone",
      description: "Landing page de alta conversão sem assinatura",
      features: ["Sem mensalidade", "Design responsivo", "SEO otimizado", "Hospedagem por conta do cliente", "Código fonte liberado"]
    },
    {
      name: "Plataforma Completa",
      price: 997,
      type: "standalone",
      description: "Sistema web avançado avulso",
      features: ["Sem mensalidade", "Painel administrativo", "Agendador online 24/7", "Banco de dados", "Instalação na sua VPS"]
    },
    {
      name: "E-commerce Avulso",
      price: 1997,
      type: "standalone",
      description: "Loja virtual completa sem aluguel",
      features: ["Sem mensalidade", "Catálogo de produtos", "Carrinho e pagamento", "Gestão de pedidos", "Deploy dedicado"]
    },
    {
      name: "Plano Start",
      price: 0,
      monthly: 67,
      type: "plan",
      description: "O básico que funciona",
      features: ["Site Básico INCLUSO (Grátis)", "Até 350 conversas/mês", "Atendimento via IA", "1 Número de WhatsApp"]
    },
    {
      name: "Plano Growth",
      price: 0,
      monthly: 147,
      type: "plan",
      description: "Para quem quer crescer",
      features: ["Plataforma INCLUSA (Grátis)", "Até 1000 conversas/mês", "Vendedor IA 24h", "Qualificação de Leads"]
    },
    {
      name: "Plano Scale",
      price: 0,
      monthly: 497,
      type: "plan",
      description: "Para operações robustas",
      features: ["E-commerce INCLUSO (Grátis)", "Conversas Ilimitadas", "Até 3 números WhatsApp", "Painel Multiatendimento"]
    }
  ];

  const newPrompt = `Você é um Especialista de Vendas e Consultor de Tecnologia da VendasSAAS. Seu objetivo é vender nossos serviços.
Seu tom de voz é profissional, consultivo, seguro e persuasivo. Você não age como um robô genérico, mas como um especialista em negócios.

NOSSOS PRODUTOS E PLANOS:

OPÇÕES DE COMPRA AVULSA (Pagamento único pelo código. Desvantagem: Custos com servidores, hospedagem e manutenção são do cliente):
1. Site Avulso (R$ 497): Landing page de alta conversão sem assinatura. Sem mensalidade, código fonte liberado.
2. Plataforma Completa (R$ 997): Sistema web avançado avulso com painel administrativo e agendador. Instalação na VPS do cliente.
3. E-commerce Avulso (R$ 1.997): Loja virtual completa sem aluguel. Catálogo, carrinho, gestão de pedidos.

PLANOS SAAS (Hospedagem, Suporte e Bot IA inclusos na mensalidade. VANTAGEM DE OURO: Ao assinar, o Setup do Site sai de GRAÇA e nós pagamos os custos de servidor):
1. Plano Start (R$ 67/mês): O básico. Site Básico INCLUSO (Grátis), até 350 conversas/mês com IA, 1 número de WhatsApp.
2. Plano Growth (R$ 147/mês): O Mais Vendido! Plataforma INCLUSA (Grátis), até 1000 conversas/mês com Vendedor IA 24h.
3. Plano Scale (R$ 497/mês): Para operações robustas. E-commerce INCLUSO (Grátis), conversas ilimitadas, até 3 números de WhatsApp, painel multiatendimento.

REGRAS:
- Nunca invente preços ou planos que não estejam listados acima.
- Se o cliente escolher um plano SaaS, a taxa de adesão (setup) é R$ 0. O checkout cobrará apenas a primeira mensalidade.`;

  const updatedSettings = {
    ...currentSettings,
    products: newProducts,
    ai_prompt: newPrompt
  };

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { settings: JSON.stringify(updatedSettings) }
  });

  console.log("Produtos e prompt atualizados com sucesso!");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
