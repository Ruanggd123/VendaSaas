import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Atualizando TODOS os tenants do banco de dados com a estrutura oficial de planos e regras...");

  const tenants = await prisma.tenant.findMany({});

  const officialProducts = [
    {
      name: "Plano Start",
      price: 150.00,
      monthly: 67.00,
      type: "plan",
      delivery_type: "virtual_instant",
      description: "Apenas Bot Fixo de Regras no WhatsApp (Sem criação de site).",
      features: [
        "Bot Fixo de Regras e Botões",
        "Conversas Ilimitadas via Regras",
        "Atendimento 24h no WhatsApp",
        "Hospedagem & Manutenção Inclusos"
      ],
      limitations: [
        "NÃO inclui criação de site",
        "NÃO inclui Inteligência Artificial (DeepSeek/ChatGPT)",
        "NÃO inclui CRM de Vendas"
      ]
    },
    {
      name: "Plano 97",
      price: 150.00,
      monthly: 97.00,
      type: "plan",
      delivery_type: "virtual_instant",
      description: "Site Institucional Grátis + Ambos os Bots Inclusos (Regras + IA).",
      features: [
        "Site Institucional 100% Grátis",
        "AMBOS OS BOTS INCLUSOS (Bot de Regras + Bot de IA)",
        "Inteligência Artificial (DeepSeek / ChatGPT)",
        "Limite de 5.000 mensagens IA/mês",
        "Agendamento de Horários + Atendimento 24h"
      ],
      limitations: [
        "NÃO inclui CRM Multiatendimento",
        "NÃO inclui Disparos em Massa"
      ]
    },
    {
      name: "Plano Growth (Mais Vendido ⭐)",
      price: 150.00,
      monthly: 147.00,
      type: "plan",
      delivery_type: "virtual_instant",
      description: "Solução Completa: Site até 5 páginas + Ambos os Bots (Regras + IA) + CRM + Agendamento.",
      features: [
        "Site Institucional de até 5 páginas",
        "AMBOS OS BOTS INCLUSOS (Bot de Regras + Bot de IA)",
        "CRM de Gestão de Clientes e Vendas",
        "Limite de 5.000 mensagens IA/mês",
        "Agendamento de Horários Automático",
        "Suporte Prioritário VIP"
      ],
      limitations: [
        "Limite de até 2 atendentes humanos no CRM",
        "NÃO inclui Loja Virtual / E-commerce completo"
      ]
    },
    {
      name: "Plano Scale",
      price: 150.00,
      monthly: 497.00,
      type: "plan",
      delivery_type: "virtual_instant",
      description: "Loja Virtual E-Commerce Completa + Ambos os Bots + Multiatendimento Enterprise.",
      features: [
        "Loja Virtual Completa (E-Commerce sem comissões)",
        "AMBOS OS BOTS INCLUSOS (Bot de Regras + Bot de IA Enterprise)",
        "Limite de 20.000 mensagens IA/mês",
        "Multiatendimento Ilimitado para Equipes",
        "Disparador em Massa + Funis de Vendas",
        "Gestor de Conta Dedicado"
      ],
      limitations: []
    },
    {
      name: "Site Avulso / Personalizado",
      price: 497.00,
      monthly: 0.00,
      type: "service",
      delivery_type: "virtual_deadline",
      delivery_deadline: "3 a 5 dias úteis",
      description: "Desenvolvimento de Site Personalizado Sob Medida (Clínicas, Advogados, Imobiliárias, Restaurantes, etc.). Sem mensalidade obrigatória.",
      features: [
        "Design 100% Personalizado e Exclusivo",
        "Domínio Próprio e SSL Grátis",
        "Otimizado para Celular e Google (SEO)",
        "Botão WhatsApp Flutuante Direct-to-Chat",
        "Entregue em 3 a 5 dias úteis"
      ],
      limitations: []
    }
  ];

  const officialRulesNodes = [
    {
      id: "node_plano_start",
      parentId: null,
      keyword: "1",
      title: "Plano Start (R$ 67/mês)",
      actionType: "checkout",
      productId: "Plano Start",
      productName: "Plano Start (R$ 67/mês)",
      productPrice: "67",
      productDescription: "📌 Plano Start (R$ 67/mês + R$ 150 adesão)\n• Bot Fixo de Regras e Botões no WhatsApp\n• Atendimento Automático 24 horas\n• Respostas Ilimitadas via Menu\n(NÃO inclui criação de site nem IA)",
      textContent: "Você selecionou o *Plano Start (R$ 67/mês + R$ 150 adesão)*:\n\n✨ *O que está incluso:*\n• Bot Fixo de Regras/Botões no WhatsApp\n• Atendimento 24h automático\n• Hospedagem e suporte inclusos\n\nEscolha a forma de pagamento:",
      paymentMode: "both",
      showInPoll: true,
    },
    {
      id: "node_plano_97",
      parentId: null,
      keyword: "2",
      title: "Plano 97 (R$ 97/mês)",
      actionType: "checkout",
      productId: "Plano 97",
      productName: "Plano 97 (R$ 97/mês)",
      productPrice: "97",
      productDescription: "📌 Plano 97 (R$ 97/mês + R$ 150 adesão)\n• Site Institucional 100% GRÁTIS Incluso\n• Ambos os Bots (Bot de Regras + Bot com IA 5k msgs/mês)\n• Agendamento Automático de Atendimentos",
      textContent: "Você selecionou o *Plano 97 (R$ 97/mês + R$ 150 adesão)*:\n\n✨ *O que está incluso:*\n• Site Institucional 100% GRÁTIS\n• AMBOS OS BOTS INCLUSOS (Bot de Regras + Bot Inteligente com IA 5k msgs/mês)\n• Agendamento de Horários\n\nEscolha a forma de pagamento:",
      paymentMode: "both",
      showInPoll: true,
    },
    {
      id: "node_plano_growth",
      parentId: null,
      keyword: "3",
      title: "Plano Growth (R$ 147/mês ⭐)",
      actionType: "checkout",
      productId: "Plano Growth (Mais Vendido ⭐)",
      productName: "Plano Growth (Mais Vendido ⭐)",
      productPrice: "147",
      productDescription: "📌 Plano Growth (R$ 147/mês ⭐) — O Mais Vendido!\n• Site Institucional de até 5 Páginas\n• Ambos os Bots (Regras + IA 5k msgs/mês)\n• CRM de Vendas e Atendimento\n• Agendamento Automático + Suporte VIP",
      textContent: "Você selecionou o *Plano Growth (R$ 147/mês ⭐)*:\n\n✨ *O que está incluso:*\n• Site Institucional Completo (até 5 páginas)\n• AMBOS OS BOTS INCLUSOS (Regras + IA 5k msgs/mês)\n• CRM de Atendimento e Vendas\n• Agendamento Automático de Horários\n\nEscolha a forma de pagamento:",
      paymentMode: "both",
      showInPoll: true,
    },
    {
      id: "node_plano_scale",
      parentId: null,
      keyword: "4",
      title: "Plano Scale (R$ 497/mês)",
      actionType: "checkout",
      productId: "Plano Scale",
      productName: "Plano Scale (R$ 497/mês)",
      productPrice: "497",
      productDescription: "📌 Plano Scale (R$ 497/mês + R$ 150 adesão)\n• Loja Virtual E-Commerce Completa\n• Ambos os Bots (Regras + IA 20k msgs/mês)\n• Multiatendimento Ilimitado para Equipes\n• Disparos em Massa + Gestor Dedicado",
      textContent: "Você selecionou o *Plano Scale (R$ 497/mês)*:\n\n✨ *O que está incluso:*\n• Loja Virtual E-Commerce Completa (sem taxas por venda)\n• AMBOS OS BOTS (Regras + IA Enterprise 20k msgs/mês)\n• Multiatendimento Ilimitado para Atendentes\n• Disparos em Massa + Funis de Vendas\n\nEscolha a forma de pagamento:",
      paymentMode: "both",
      showInPoll: true,
    },
    {
      id: "node_site_avulso",
      parentId: null,
      keyword: "5",
      title: "Site Avulso / Sob Medida (R$ 497)",
      actionType: "checkout",
      productId: "Site Avulso / Personalizado",
      productName: "Site Avulso / Sob Medida",
      productPrice: "497",
      productDescription: "📌 Site Avulso Personalizado (R$ 497 taxa única)\n• Desenvolvimento de Site Exclusivo para seu Nicho\n• Sem mensalidade obrigatória\n• Entregue em 3 a 5 dias úteis com domínio e SSL inclusos",
      textContent: "Você selecionou *Site Avulso / Sob Medida (R$ 497 taxa única)*:\n\n✨ *O que está incluso:*\n• Design exclusivo e sob medida para a sua empresa\n• Domínio próprio, SSL e Hospedagem\n• Otimizado para Celulares e Google (SEO)\n• Botão de WhatsApp Direct-to-Chat\n\nEscolha a forma de pagamento:",
      paymentMode: "both",
      showInPoll: true,
    },
    {
      id: "node_agendamento",
      parentId: null,
      keyword: "6",
      title: "📅 Agendar Horário / Reunião",
      actionType: "scheduling",
      textContent: "Escolha uma data e horário disponível abaixo para realizarmos a sua reunião ou atendimento:",
      showInPoll: true,
    },
    {
      id: "node_atendente_humano",
      parentId: null,
      keyword: "7",
      title: "👤 Falar com Atendente Humano",
      actionType: "human",
      textContent: "Transferindo o seu atendimento para um especialista humano da nossa equipe! Por favor, aguarde um instante que já vamos te responder. 💙",
      showInPoll: true,
    },
    {
      id: "node_catalogo",
      parentId: null,
      keyword: "8",
      title: "📋 Catálogo Completo de Serviços",
      actionType: "catalog",
      textContent: "📋 *Confira nosso Catálogo Completo de Produtos & Planos:*\n\nEscolha uma das opções abaixo para ver os detalhes e contratar:",
      showInPoll: true,
    },
    { id: "node_cat_1", parentId: "node_catalogo", keyword: "1", title: "Plano Start (R$ 67/mês)", actionType: "product", productId: "Plano Start", productName: "Plano Start (R$ 67/mês)", productPrice: "67", productDescription: "📌 Bot Fixo de Regras e Botões no WhatsApp sem criação de site.", textContent: "Você selecionou o Plano Start no catálogo:", paymentMode: "both", showInPoll: true },
    { id: "node_cat_2", parentId: "node_catalogo", keyword: "2", title: "Plano 97 (R$ 97/mês)", actionType: "product", productId: "Plano 97", productName: "Plano 97 (R$ 97/mês)", productPrice: "97", productDescription: "📌 Site Institucional Grátis + Ambos os Bots Inclusos (Regras + IA 5k msgs).", textContent: "Você selecionou o Plano 97 no catálogo:", paymentMode: "both", showInPoll: true },
    { id: "node_cat_3", parentId: "node_catalogo", keyword: "3", title: "Plano Growth (R$ 147/mês ⭐)", actionType: "product", productId: "Plano Growth (Mais Vendido ⭐)", productName: "Plano Growth (Mais Vendido ⭐)", productPrice: "147", productDescription: "📌 Site 5 Páginas + Ambos os Bots (Regras + IA) + CRM + Agendamento VIP.", textContent: "Você selecionou o Plano Growth no catálogo:", paymentMode: "both", showInPoll: true },
    { id: "node_cat_4", parentId: "node_catalogo", keyword: "4", title: "Plano Scale (R$ 497/mês)", actionType: "product", productId: "Plano Scale", productName: "Plano Scale (R$ 497/mês)", productPrice: "497", productDescription: "📌 Loja Virtual E-Commerce Completa + Multiatendimento + Disparos em Massa.", textContent: "Você selecionou o Plano Scale no catálogo:", paymentMode: "both", showInPoll: true },
    { id: "node_cat_5", parentId: "node_catalogo", keyword: "5", title: "Site Avulso / Sob Medida (R$ 497)", actionType: "product", productId: "Site Avulso / Personalizado", productName: "Site Avulso / Sob Medida", productPrice: "497", productDescription: "📌 Desenvolvimento de Site Exclusivo Personalizado Sob Medida (sem mensalidade).", textContent: "Você selecionou Site Avulso no catálogo:", paymentMode: "both", showInPoll: true },
    {
      id: "node_form_question",
      parentId: null,
      keyword: "9",
      title: "📝 Solicitar Informação / Orçamento",
      actionType: "collect_data",
      variableName: "informacao_cliente",
      textContent: "Qual a sua principal dúvida, segmento de empresa ou informação que deseja solicitar?",
      showInPoll: true,
    },
    {
      id: "node_form_next_step",
      parentId: "node_form_question",
      keyword: "1",
      title: "Confirmar Solicitação",
      actionType: "text",
      textContent: "Perfeito! Recebemos sua solicitação: \"{informacao_cliente}\". Um de nossos consultores entrará em contato em instantes!",
      showInPoll: true,
    },
  ];

  const officialPrompt = `Você é um Consultor Especialista de Vendas da VendasSAAS. Seu objetivo é apresentar nossos planos e soluções de forma altamente profissional, persuasiva e transparente.

NOSSOS PLANOS E VALORES DE ASSINATURA:
Todos os planos de assinatura possuem uma Taxa de Adesão (Setup) de R$ 150.

1. PLANO START — R$ 67/mês (Adesão R$ 150)
- O que inclui: Bot Fixo de Regras/Botões no WhatsApp (Apenas automação).
- LIMITAÇÃO: NÃO inclui criação de site e NÃO possui Inteligência Artificial (sem DeepSeek/ChatGPT).

2. PLANO 97 — R$ 97/mês (Adesão R$ 150)
- O que inclui: Site Institucional 100% GRÁTIS + AMBOS OS BOTS INCLUSOS (Bot de Regras Fixo + Bot Inteligente com IA DeepSeek/ChatGPT) com limite de 5.000 mensagens IA/mês.
- LIMITAÇÃO: Não inclui CRM nem disparos em massa.

3. PLANO GROWTH (O MAIS VENDIDO ⭐) — R$ 147/mês (Adesão R$ 150)
- O que inclui: Site Institucional de até 5 páginas + AMBOS OS BOTS (Bot de Regras + Bot de IA) + CRM de Gestão de Clientes + Agendamento de Horários + 5.000 mensagens IA/mês.
- LIMITAÇÃO: Suporta até 2 atendentes no CRM.

4. PLANO SCALE — R$ 497/mês (Adesão R$ 150)
- O que inclui: Loja Virtual Completa (E-Commerce) + AMBOS OS BOTS (Regras + IA Enterprise) + Multiatendimento Ilimitado + Disparador em Massa + 20.000 mensagens IA/mês.

ORIENTAÇÕES DE ATENDIMENTO:
- Se o cliente perguntar se pode ter um site diferente ou personalizado para o seu ramo/nicho (clínicas, advocacia, imobiliárias, barbearias, consultorias, prestação de serviços, etc.), responda que SIM! Nossa equipe desenvolve o site 100% sob medida com as cores, marca, logotipo e catálogo do segmento dele, sem qualquer taxa extra de criação ao assinar qualquer plano com site incluso!
- Se o cliente quiser um site completo com IA pelo menor valor, recomende o Plano 97 (R$ 97/mês).
- Se o cliente quiser apenas o bot fixo de regras sem site, ofereça o Plano Start (R$ 67/mês).
- Direcione sempre os clientes com foco em vendas para o PLANO GROWTH (R$ 147/mês) por ser a solução mais completa com CRM inclusa.`;

  for (const t of tenants) {
    let settings: any = {};
    try {
      settings = JSON.parse(t.settings || '{}');
    } catch (e) {}

    settings.products = officialProducts;
    settings.custom_rules_nodes = officialRulesNodes;
    settings.welcome_message = "Olá! Seja muito bem-vindo(a) ao nosso atendimento! 💙\n\nEscolha um dos nossos planos oficiais abaixo para começar:";
    settings.ai_prompt = officialPrompt;

    await prisma.tenant.update({
      where: { id: t.id },
      data: {
        settings: JSON.stringify(settings)
      }
    });

    console.log(`✅ Tenant ${t.name} (${t.id}) atualizado com produtos e regras oficiais!`);
  }

  console.log("🎉 Todos os tenants sincronizados com sucesso!");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
