import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function configureClientStoreWorkflow() {
  const tenantId = "4e6e7007-f749-4fa5-bb65-1feff07e0d5e"; // Empresa Ruan (Growth)

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    console.error("Tenant não encontrado!");
    process.exit(1);
  }

  const marmorariaWorkflowSettings = {
    bot_type: "hibrido",
    ai_name: "Atendente Imperial",
    ai_personality: "profissional",
    ai_prompt: "Você é um consultor especialista da Marmoraria Imperial. Responda com cordialidade e auxilie com orçamentos de mármores e agendamentos de medição.",
    business_hours_start: "08:00",
    business_hours_end: "18:00",
    welcome_message: "Olá! Seja bem-vindo(a) à Marmoraria & Granitos Imperial! 🏛️✨\n\nSomos especialistas em bancadas de cozinha, lavatórios, ilhas e pedras nobres (Mármores, Granitos e Quartzos).\n\nComo podemos te ajudar hoje?",
    welcome_menu_auto_append: true,
    enableScheduling: true,
    products: [
      { id: "prod_1", name: "Bancada Cozinha Quartzo Branco", price: 1200, description: "Quartzo de alta resistência e brilho intenso por m²." },
      { id: "prod_2", name: "Lavatório Mármore Bege Prime", price: 850, description: "Lavatório esculpido sob medida com cuba oculta." },
      { id: "prod_3", name: "Soleira Granito São Gabriel", price: 180, description: "Granito preto absoluto resistente a impactos por metro." },
      { id: "prod_4", name: "Ilha Gourmet em Porcelanato", price: 2400, description: "Bancada de ilha central para área gourmet de alto padrão." }
    ],
    custom_rules_nodes: [
      {
        id: "node_cat_marmoraria",
        parentId: null,
        keyword: "1",
        title: "💎 Catálogo de Pedras & Bancadas",
        actionType: "catalog",
        textContent: "💎 *Confira nossas principais pedras e modelos em destaque:*\n\nEscolha uma das opções abaixo para ver os detalhes:",
        showInPoll: true,
      },
      {
        id: "node_item_1",
        parentId: "node_cat_marmoraria",
        keyword: "1",
        title: "Bancada Quartzo Branco (R$ 1.200/m²)",
        actionType: "product",
        productId: "prod_1",
        productName: "Bancada Quartzo Branco",
        productPrice: "1200",
        productDescription: "📌 Quartzo de altíssima resistência a manchas e riscos, perfeito para cozinhas modernas.",
        textContent: "Você selecionou a *Bancada em Quartzo Branco High Gloss*:\n\n• Valor estimado: R$ 1.200 por m²\n• Garantia de 5 anos e acabamento impecável.\n\nDeseja agendar uma medição técnica no local?",
        showInPoll: true,
      },
      {
        id: "node_item_2",
        parentId: "node_cat_marmoraria",
        keyword: "2",
        title: "Lavatório Mármore Bege (R$ 850)",
        actionType: "product",
        productId: "prod_2",
        productName: "Lavatório Mármore Bege",
        productPrice: "850",
        productDescription: "📌 Lavatório esculpido com válvula oculta em mármore Bege Prime.",
        textContent: "Você selecionou o *Lavatório Esculpido em Mármore Bege*:\n\n• Valor fixo a partir de R$ 850,00\n• Acompanha rodabanca e saia inferior.",
        showInPoll: true,
      },
      {
        id: "node_orcamento",
        parentId: null,
        keyword: "2",
        title: "📐 Solicitar Orçamento Grátis",
        actionType: "collect_data",
        variableName: "medidas_ambiente",
        textContent: "Por favor, digite o seu nome completo e as medidas aproximadas do seu projeto (ex: Bancada em L de 2,40m x 0,60m):",
        showInPoll: true,
      },
      {
        id: "node_orcamento_confirm",
        parentId: "node_orcamento",
        keyword: "1",
        title: "Confirmar Dados do Orçamento",
        actionType: "text",
        textContent: "✅ Perfeito! Recebemos a solicitação das suas medidas: \"{medidas_ambiente}\". Nossos orçamentistas vão calcular e enviar o orçamento detalhado em instantes no seu WhatsApp!",
        showInPoll: true,
      },
      {
        id: "node_agendar_medicao",
        parentId: null,
        keyword: "3",
        title: "📅 Agendar Medição Técnica Gratuita",
        actionType: "scheduling",
        textContent: "Escolha uma data e horário disponível abaixo para o nosso técnico ir até a sua obra/imóvel realizar a medição exata:",
        showInPoll: true,
      },
      {
        id: "node_atendente_marmore",
        parentId: null,
        keyword: "4",
        title: "👤 Falar com Consultor de Vendas",
        actionType: "human",
        textContent: "Transferindo seu atendimento para o nosso projetista principal. Por favor, aguarde um instante! 🏛️",
        showInPoll: true,
      }
    ]
  };

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: JSON.stringify(marmorariaWorkflowSettings),
    }
  });

  console.log("=========================================================================");
  console.log("✅ WORKFLOW DA LOJA DO CLIENTE (Marmoraria & Granitos Imperial) CONFIGURADO!");
  console.log("=========================================================================");
  console.log("Tenant:", tenant.name);
  console.log("Plano:", tenant.plan);
  console.log("Nós do Workflow:", marmorariaWorkflowSettings.custom_rules_nodes.length, "nós criados com sucesso!");
  console.log("Produtos no Catálogo:", marmorariaWorkflowSettings.products.length, "itens cadastrados!");
  console.log("=========================================================================");

  process.exit(0);
}

configureClientStoreWorkflow().catch((err) => {
  console.error("Erro ao configurar workflow:", err);
  process.exit(1);
});
