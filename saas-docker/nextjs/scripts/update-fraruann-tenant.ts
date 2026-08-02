import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Atualizando tenant do fraruann159@gmail.com...");

  const user = await prisma.user.findFirst({
    where: { email: 'fraruann159@gmail.com' },
    include: { tenant: true },
  });

  if (!user || !user.tenant) {
    console.error("Usuário ou tenant não encontrado para fraruann159@gmail.com");
    return;
  }

  let settings: any = {};
  try {
    settings = JSON.parse(user.tenant.settings || '{}');
  } catch (e) {}

  // 1. Atualizar Produtos da Loja com Limitações Detalhadas
  settings.products = [
    {
      name: "Plano Start",
      price: 67.00,
      monthly: 67.00,
      type: "plan",
      description: "Presença Digital Básica + Bot Fixo de Regras (Sem IA).",
      features: [
        "Site Single Page (Página Única)",
        "Bot Starter (Baseado em Regras e Botões)",
        "Conversas Ilimitadas via Regras",
        "Hospedagem e Manutenção Inclusos"
      ],
      limitations: [
        "NÃO inclui Inteligência Artificial (DeepSeek/ChatGPT)",
        "NÃO inclui CRM de Vendas",
        "NÃO inclui Agendamento Inteligente",
        "NÃO inclui Disparos em Massa"
      ]
    },
    {
      name: "Só Bot (Assinatura)",
      price: 97.00,
      monthly: 97.00,
      type: "plan",
      description: "Ambos os bots inclusos (Bot Fixo de Regras + Bot Inteligente com IA). Sem criação de site.",
      features: [
        "AMBOS OS BOTS INCLUSOS (Bot de Regras + Bot de IA)",
        "Inteligência Artificial (DeepSeek / ChatGPT)",
        "Limite de 5.000 mensagens IA/mês",
        "Agendamento de Horários + Atendimento 24h",
        "Ideal para quem já possui site próprio"
      ],
      limitations: [
        "NÃO inclui criação de site ou landing page",
        "NÃO inclui CRM Multiatendimento",
        "NÃO inclui Disparos em Massa em lote"
      ]
    },
    {
      name: "Plano Growth (Mais Vendido ⭐)",
      price: 147.00,
      monthly: 147.00,
      type: "plan",
      description: "Solução Completa: Site até 5 páginas + Bot de Regras + Bot IA + CRM + Agendamento.",
      features: [
        "Site de até 5 páginas institucionais",
        "AMBOS OS BOTS INCLUSOS (Bot de Regras + Bot de IA)",
        "CRM de Gestão de Clientes e Leads",
        "Limite de 5.000 mensagens IA/mês",
        "Agendamento de Horários Automático",
        "Suporte Prioritário"
      ],
      limitations: [
        "Limite de até 2 atendentes humanos no CRM",
        "NÃO inclui Loja Virtual / E-commerce completo"
      ]
    },
    {
      name: "Plano Scale",
      price: 497.00,
      monthly: 497.00,
      type: "plan",
      description: "E-commerce, Loja Virtual Completa + Bot de Regras + Bot IA Enterprise + Multiatendimento.",
      features: [
        "Loja Virtual Completa (E-Commerce sem comissões)",
        "AMBOS OS BOTS INCLUSOS (Bot de Regras + Bot de IA Enterprise)",
        "Limite de 20.000 mensagens IA/mês",
        "Multiatendimento Ilimitado para Equipes",
        "Disparador em Massa + Funis de Vendas",
        "Gestor de Conta Dedicado"
      ],
      limitations: [
        "Desenvolvimento de integrações customizadas via API cobradas à parte se necessário"
      ]
    }
  ];

  // 2. Atualizar Prompt do Robô para Atendimento Transparente com Limitações Claras
  settings.ai_prompt = `Você é um Consultor Especialista de Vendas da VendasSAAS. Seu objetivo é apresentar nossos planos e soluções de forma altamente profissional, persuasiva e transparente.

NOSSOS PLANOS E VALORES DE ASSINATURA:

1. PLANO START — R$ 67/mês
- O que inclui: Site Single Page (página única) + Bot Starter Fixo de Regras/Botões.
- LIMITAÇÃO: NÃO possui Inteligência Artificial (sem DeepSeek/ChatGPT). Não possui CRM nem agendamento automático.

2. SÓ BOT (ASSINATURA) — R$ 97/mês
- O que inclui: AMBOS OS BOTS INCLUSOS (Bot de Regras Fixo + Bot Inteligente com IA DeepSeek/ChatGPT) com limite de 5.000 mensagens IA/mês. Atendimento 24h e agendamentos.
- LIMITAÇÃO: NÃO inclui criação de site (ideal para quem já possui site).

3. PLANO GROWTH (O MAIS VENDIDO ⭐) — R$ 147/mês
- O que inclui: Site Institucional de até 5 páginas + AMBOS OS BOTS (Bot de Regras + Bot de IA) + CRM de Gestão de Clientes + Agendamento de Horários + 5.000 mensagens IA/mês.
- LIMITAÇÃO: Suporta até 2 atendentes no CRM.

4. PLANO SCALE — R$ 497/mês
- O que inclui: Loja Virtual Completa (E-Commerce) + AMBOS OS BOTS (Regras + IA Enterprise) + Multiatendimento Ilimitado + Disparador em Massa + 20.000 mensagens IA/mês.

ORIENTAÇÕES DE ATENDIMENTO:
- Seja sempre claro e transparente quanto às limitações de cada plano.
- Se o cliente quiser APENAS o robô sem o site, ofereça o "Só Bot por R$ 97/mês" e explique que ele leva TANTO o bot de regras QUANTO o bot com inteligência artificial.
- Direcione os clientes com foco em vendas para o PLANO GROWTH (R$ 147/mês) por ser o melhor custo-benefício.`;

  await prisma.tenant.update({
    where: { id: user.tenant.id },
    data: {
      settings: JSON.stringify(settings)
    }
  });

  console.log(`✅ Tenant ${user.tenant.name} (${user.tenant.id}) atualizado com sucesso!`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
