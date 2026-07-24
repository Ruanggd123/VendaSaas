export type Plan = {
  id: string;
  name: string;
  tagline: string;
  price: number;
  maxUsers: number;
  maxWhatsappInstances: number;
  maxConversations: number;
  bonus: string;
  bonusValue: string;
  idealFor: string;
  features: string[];
  limits: string[];
};

export const PLANS: Record<string, Plan> = {
  site_gratis: {
    id: 'site_gratis',
    name: 'Site Grátis',
    tagline: 'Site institucional grátis + atendimento IA',
    price: 97,
    maxUsers: 1,
    maxWhatsappInstances: 1,
    maxConversations: 1000,
    bonus: 'Site Institucional Grátis',
    bonusValue: 'R$ 497',
    idealFor: 'Autônomos, MEI e profissionais liberais',
    features: [
      'Site Institucional 100% GRÁTIS (economia de R$ 497)',
      '1 Número de WhatsApp',
      'Até 1.000 atendimentos/mês',
      'Bot Inteligente (IA + Regras)',
      'Respostas com Áudio de Voz',
      'Catálogo de Produtos',
      'Agendamento de Horários',
      'Suporte via WhatsApp',
    ],
    limits: [
      '❌ Sem CRM / Painel de Vendas',
      '❌ Sem Multi-Atendente',
      '❌ Sem E-commerce / Loja Virtual',
      '❌ Limitado a 1.000 atendimentos/mês',
    ],
  },
  crm_gratis: {
    id: 'crm_gratis',
    name: 'CRM Grátis',
    tagline: 'Plataforma CRM grátis + atendimento ilimitado',
    price: 197,
    maxUsers: 5,
    maxWhatsappInstances: 1,
    maxConversations: 99999,
    bonus: 'Plataforma + CRM Grátis',
    bonusValue: 'R$ 997',
    idealFor: 'Pequenas empresas e equipes de vendas',
    features: [
      'Plataforma Web + CRM 100% GRÁTIS (economia de R$ 997)',
      '1 Número de WhatsApp',
      'Atendimentos ILIMITADOS',
      'Multi-Atendente (até 2 atendentes humanos)',
      'Painel de Vendas completo',
      'Envio de Pix no Chat',
      'Catálogo de Produtos',
      'Notificações de Vendas em Tempo Real',
      'Suporte Prioritário VIP',
    ],
    limits: [
      '❌ Sem Loja Virtual / E-commerce',
      '❌ Sem Disparo em Massa',
      '❌ Limitado a 1 WhatsApp',
      '✅ Atendimento ILIMITADO',
    ],
  },
  loja_gratis: {
    id: 'loja_gratis',
    name: 'Loja Grátis',
    tagline: 'Loja virtual grátis + 3 WhatsApp + disparo em massa',
    price: 397,
    maxUsers: 999,
    maxWhatsappInstances: 3,
    maxConversations: 99999,
    bonus: 'Loja Virtual Grátis',
    bonusValue: 'R$ 1.997',
    idealFor: 'Marcas, e-commerces e operações em crescimento',
    features: [
      'Loja Virtual E-Commerce 100% GRÁTIS (economia de R$ 1.997)',
      'Até 3 Números de WhatsApp',
      'Atendimentos ILIMITADOS',
      'Multi-Atendente ILIMITADO',
      'Disparo em Massa (Campanhas)',
      'Base de Conhecimento (RAG)',
      'Catálogo Ilimitado + Pix',
      'Gestão de Estoque em Tempo Real',
      'Sem Comissões por Venda',
      'API Dedicada',
      'Gerente de Contas',
    ],
    limits: [
      '✅ TUDO incluso',
      '✅ 3 WhatsApp',
      '✅ Atendimento ILIMITADO',
      '✅ Disparo em Massa',
    ],
  },
};

export const getPlanDetails = (planId: string): Plan => {
  return PLANS[planId] || PLANS['site_gratis'];
};
