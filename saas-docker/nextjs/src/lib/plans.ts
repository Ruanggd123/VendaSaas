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
    setupFee: 0,
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
    setupFee: 0,
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
    setupFee: 0,
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
    setupFee: 0,
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

// Fonte única de verdade: normaliza QUALQUER valor de plano (canônico, legado
// ou nome cru de produto salvo por webhooks) para os ids canônicos
// start | plano_97 | growth | scale.
// Plano desconhecido => start (fail-closed: MENOS acesso, nunca mais).
export const normalizePlanId = (raw: string | null | undefined): string => {
  const value = (raw || "").toLowerCase().trim();
  if (!value) return PLANS.start.id;

  // 1. Ids canônicos exatos
  if (value === "start" || value === "plano_97" || value === "growth" || value === "scale") {
    return value;
  }

  // 2. Planos altos PRIMEIRO (ex: "497" contém "97", "growth" não pode cair em check anterior)
  if (
    value.includes("497") || value.includes("scale") ||
    value.includes("loja_gratis") || value.includes("loja") ||
    value.includes("business") || value.includes("enterprise") ||
    value.includes("corporativo") || value.includes("e-commerce") || value.includes("ecommerce")
  ) {
    return PLANS.scale.id;
  }

  // 3. Plano Growth (crm / equipe / pro ia)
  if (
    value.includes("147") || value.includes("growth") ||
    value.includes("crm_gratis") || value.includes("pro ia") ||
    value.includes("equipe") || value.includes("crm") || value.includes("multi") ||
    value.includes("pro")
  ) {
    return PLANS.growth.id;
  }

  // 4. Plano 97 (site / agendamento / ia)
  if (
    value.includes("97") || value.includes("site_gratis") ||
    value.includes("site") || value.includes("plataforma")
  ) {
    return PLANS.plano_97.id;
  }

  // 5. Planos básicos (termos genéricos por último)
  if (
    value.includes("start") || value.includes("67") ||
    value.includes("solo") || value.includes("fixo") ||
    value.includes("bot") || value.includes("starter")
  ) {
    return PLANS.start.id;
  }

  // 6. Fallback fail-closed
  return PLANS.start.id;
};

export const getPlanDetails = (planId: string): Plan => {
  return PLANS[normalizePlanId(planId)] || PLANS.start;
};

// ─────────────────────────────────────────────────────────────────────────────
// Matriz de permissões por módulo (PURA: sem imports externos para ser usável
// no middleware/edge). Fonte da verdade para UI, middleware e APIs.
// ─────────────────────────────────────────────────────────────────────────────
export const MODULES = {
  conversas: "conversas",
  agenda: "agenda",
  crm: "crm",
  whatsapp: "whatsapp",
  equipe: "equipe",
  site: "site",
  ai: "ai",
  ecommerce: "ecommerce",
  disparos: "disparos",
} as const;

export type ModuleId = (typeof MODULES)[keyof typeof MODULES];

export const MODULE_LABELS: Record<ModuleId, string> = {
  conversas: "Conversas & Bot",
  agenda: "Agenda de Horários",
  crm: "CRM de Vendas",
  whatsapp: "Conexão WhatsApp",
  equipe: "Equipe (Multiatendimento)",
  site: "Site & Briefing",
  ai: "Inteligência Artificial",
  ecommerce: "Loja Virtual E-Commerce",
  disparos: "Disparos em Massa",
};

// Módulos que cada plano lista como acesso (espelha PLANS + checklist de vendas)
export const PLAN_MODULES: Record<string, ModuleId[]> = {
  start: ["conversas", "whatsapp"],
  plano_97: ["conversas", "whatsapp", "agenda", "site", "ai"],
  growth: ["conversas", "whatsapp", "agenda", "site", "ai", "crm", "equipe"],
  scale: ["conversas", "whatsapp", "agenda", "site", "ai", "crm", "equipe", "ecommerce", "disparos"],
};

export const getPlanModules = (planId: string | null | undefined): ModuleId[] => {
  const normalized = normalizePlanId(planId ?? "");
  return PLAN_MODULES[normalized] || PLAN_MODULES.start;
};

export const planHas = (planId: string | null | undefined, module: ModuleId): boolean => {
  return getPlanModules(planId).includes(module);
};

// Rota -> módulo pago exigido (usado no middleware para bloquear URL direta)
export const ROUTE_MODULE_MAP: { prefix: string; module: ModuleId }[] = [
  { prefix: "/conversas", module: MODULES.conversas },
  { prefix: "/agenda", module: MODULES.agenda },
  { prefix: "/vendas", module: MODULES.crm },
  { prefix: "/ecommerce", module: MODULES.ecommerce },
  { prefix: "/workflow", module: MODULES.disparos },
  { prefix: "/equipe", module: MODULES.equipe },
  { prefix: "/meu-projeto", module: MODULES.site },
];

// Retorna o módulo bloqueado para esta rota segundo o plano, ou null se liberado
export const blockedModuleForPath = (
  pathname: string,
  planId: string | null | undefined
): ModuleId | null => {
  const lower = pathname.toLowerCase();
  const modules = getPlanModules(planId);
  for (const { prefix, module } of ROUTE_MODULE_MAP) {
    if (lower.startsWith(prefix) && !modules.includes(module)) return module;
  }
  return null;
};
