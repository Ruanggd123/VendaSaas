export type Plan = {
  id: string;
  name: string;
  tagline: string;
  price: number;
  monthlyPrice: number;
  setupFee: number;
  maxUsers: number;
  maxWhatsappInstances: number;
  maxConversations: number | null;
  hasSite: boolean;
  hasAI: boolean;
  hasCRM: boolean;
  hasEcommerce: boolean;
  hasMassDispatch: boolean;
  features: string[];
  limits: string[];
};

export const PLANS: Record<string, Plan> = {
  start: {
    id: 'start',
    name: 'Plano Start',
    tagline: 'Apenas Bot Fixo de Regras no WhatsApp (Sem site)',
    price: 67,
    monthlyPrice: 67,
    setupFee: 150,
    maxUsers: 1,
    maxWhatsappInstances: 1,
    maxConversations: 1000,
    hasSite: false,
    hasAI: false,
    hasCRM: false,
    hasEcommerce: false,
    hasMassDispatch: false,
    features: [
      'Bot Fixo de Regras e Botões',
      'Conversas Ilimitadas via Regras',
      'Atendimento Automático 24/7',
      'Hospedagem & Suporte Inclusos',
    ],
    limits: [
      '❌ NÃO inclui criação de site',
      '❌ NÃO inclui Inteligência Artificial',
      '❌ NÃO inclui CRM de Vendas',
    ],
  },
  plano_97: {
    id: 'plano_97',
    name: 'Plano 97',
    tagline: 'Site Institucional Grátis + Ambos os Bots (Regras + IA)',
    price: 97,
    monthlyPrice: 97,
    setupFee: 150,
    maxUsers: 1,
    maxWhatsappInstances: 1,
    maxConversations: 5000,
    hasSite: true,
    hasAI: true,
    hasCRM: false,
    hasEcommerce: false,
    hasMassDispatch: false,
    features: [
      'Site Institucional 100% GRÁTIS',
      'AMBOS OS BOTS (Bot de Regras + Bot de IA)',
      'Inteligência Artificial (DeepSeek / ChatGPT)',
      'Limite de 5.000 mensagens IA/mês',
      'Agendamento de Horários Automático',
    ],
    limits: [
      '❌ Sem CRM Multiatendente',
      '❌ Sem Disparos em Massa',
    ],
  },
  growth: {
    id: 'growth',
    name: 'Plano Growth ⭐',
    tagline: 'Solução Completa: Site 5 Páginas + Ambos os Bots + CRM + Agendamento',
    price: 147,
    monthlyPrice: 147,
    setupFee: 150,
    maxUsers: 2,
    maxWhatsappInstances: 1,
    maxConversations: 5000,
    hasSite: true,
    hasAI: true,
    hasCRM: true,
    hasEcommerce: false,
    hasMassDispatch: false,
    features: [
      'Site Institucional de até 5 páginas',
      'AMBOS OS BOTS (Regras + IA 5k msgs/mês)',
      'CRM de Gestão de Clientes e Vendas',
      'Agendamento Automático de Horários',
      'Suporte Prioritário VIP',
    ],
    limits: [
      'Limite de até 2 atendentes no CRM',
      '❌ Sem Loja Virtual E-Commerce',
    ],
  },
  scale: {
    id: 'scale',
    name: 'Plano Scale',
    tagline: 'Loja Virtual E-Commerce + Ambos os Bots + Multiatendimento + Disparo em Massa',
    price: 497,
    monthlyPrice: 497,
    setupFee: 150,
    maxUsers: 999,
    maxWhatsappInstances: 3,
    maxConversations: null,
    hasSite: true,
    hasAI: true,
    hasCRM: true,
    hasEcommerce: true,
    hasMassDispatch: true,
    features: [
      'Loja Virtual Completa (E-Commerce sem comissões)',
      'AMBOS OS BOTS (Regras + IA Enterprise 20k msgs/mês)',
      'Multiatendimento Ilimitado para Equipes',
      'Disparador em Massa + Funis de Vendas',
      'Gestor de Conta Dedicado',
    ],
    limits: [
      '✅ TUDO INCLUSO ILIMITADO',
    ],
  },
};

export const getPlanDetails = (planId: string): Plan => {
  const normalized = (planId || "").toLowerCase().trim();

  if (normalized.includes("start") || normalized.includes("67") || normalized.includes("solo") || normalized.includes("fixo")) {
    return PLANS.start;
  }
  if (normalized.includes("97") || normalized.includes("site_gratis") || (normalized.includes("site") && !normalized.includes("growth") && !normalized.includes("scale"))) {
    return PLANS.plano_97;
  }
  if (normalized.includes("growth") || normalized.includes("147") || normalized.includes("crm_gratis") || normalized.includes("pro") || normalized.includes("equipe")) {
    return PLANS.growth;
  }
  if (normalized.includes("scale") || normalized.includes("497") || normalized.includes("loja_gratis") || normalized.includes("loja") || normalized.includes("business") || normalized.includes("enterprise")) {
    return PLANS.scale;
  }

  return PLANS.growth;
};
