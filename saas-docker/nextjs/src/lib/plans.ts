export type Plan = {
  id: string;
  name: string;
  description: string;
  price: number;
  maxUsers: number;
  maxWhatsappInstances: number;
  features: string[];
};

export const PLANS: Record<string, Plan> = {
  solo: {
    id: 'solo',
    name: 'Solo',
    description: 'Ideal para profissionais independentes e pequenos negócios.',
    price: 97,
    maxUsers: 1,
    maxWhatsappInstances: 1,
    features: [
      '1 Conexão de WhatsApp',
      '1 Usuário no sistema',
      'Atendimento básico com IA',
      'Gestão de Leads'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Para empresas em crescimento que precisam escalar o atendimento.',
    price: 197,
    maxUsers: 5,
    maxWhatsappInstances: 3,
    features: [
      'Até 3 Conexões de WhatsApp',
      'Até 5 Usuários no sistema',
      'Atendimento avançado com IA',
      'Dashboard Completo de Vendas',
      'Suporte via WhatsApp'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Operações grandes que exigem volume e customização máxima.',
    price: 497,
    maxUsers: 999, // Represents unlimited in UI
    maxWhatsappInstances: 999,
    features: [
      'WhatsApp Ilimitado',
      'Usuários Ilimitados',
      'Treinamento de IA Personalizado',
      'Múltiplos Módulos Ativos',
      'Gerente de Contas Dedicado'
    ]
  }
};

export const getPlanDetails = (planId: string): Plan => {
  return PLANS[planId] || PLANS['solo'];
};
