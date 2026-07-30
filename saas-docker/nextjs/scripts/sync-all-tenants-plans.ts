import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Atualizando TODOS os tenants do banco de dados com a estrutura oficial de planos...");

  const tenants = await prisma.tenant.findMany({});

  const officialProducts = [
    {
      name: "Plano Start",
      price: 150.00,
      monthly: 67.00,
      type: "plan",
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
    }
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
- Se o cliente quiser um site completo com IA pelo menor valor, recomende o Plano 97 (R$ 97/mês).
- Se o cliente quiser apenas o bot fixo de regras sem site, ofereça o Plano Start (R$ 67/mês).
- Direcione sempre os clientes com foco em vendas para o PLANO GROWTH (R$ 147/mês) por ser a solução mais completa com CRM inclusa.`;

  for (const t of tenants) {
    let settings: any = {};
    try {
      settings = JSON.parse(t.settings || '{}');
    } catch (e) {}

    settings.products = officialProducts;
    settings.ai_prompt = officialPrompt;

    await prisma.tenant.update({
      where: { id: t.id },
      data: {
        settings: JSON.stringify(settings)
      }
    });

    console.log(`✅ Tenant ${t.name} (${t.id}) atualizado!`);
  }

  console.log("🎉 Todos os tenants sincronizados com sucesso!");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
