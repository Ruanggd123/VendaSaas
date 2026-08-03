export type PartnerTierName = 'Bronze' | 'Prata' | 'Ouro' | 'Diamante';

export interface PartnerTierInfo {
  name: PartnerTierName;
  icon: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  recurringRate: number; // Porcentagem de comissão recorrente (mês 2+)
  firstMonthRate: number; // Porcentagem do 1º mês (50%)
  minClients: number;
  maxClients: number | null;
  nextTierName: PartnerTierName | null;
  clientsNeededForNext: number;
  progressPercent: number;
}

export const PARTNER_TIERS: Record<PartnerTierName, {
  name: PartnerTierName;
  icon: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  recurringRate: number;
  firstMonthRate: number;
  minClients: number;
  maxClients: number | null;
}> = {
  Bronze: {
    name: 'Bronze',
    icon: '🥉',
    color: 'from-amber-600 to-amber-800',
    badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
    badgeText: 'Nível Bronze (30%)',
    recurringRate: 30,
    firstMonthRate: 50,
    minClients: 1,
    maxClients: 10,
  },
  Prata: {
    name: 'Prata',
    icon: '🥈',
    color: 'from-slate-400 to-slate-600',
    badgeBg: 'bg-slate-400/10 border-slate-400/30 text-slate-700 dark:text-slate-300',
    badgeText: 'Nível Prata (35%)',
    recurringRate: 35,
    firstMonthRate: 50,
    minClients: 11,
    maxClients: 30,
  },
  Ouro: {
    name: 'Ouro',
    icon: '🥇',
    color: 'from-yellow-400 to-amber-500',
    badgeBg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400',
    badgeText: 'Nível Ouro ⭐ (42%)',
    recurringRate: 42,
    firstMonthRate: 50,
    minClients: 31,
    maxClients: 70,
  },
  Diamante: {
    name: 'Diamante',
    icon: '💎',
    color: 'from-cyan-400 to-blue-600',
    badgeBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-300 font-extrabold shadow-sm shadow-cyan-500/20',
    badgeText: 'Nível Diamante 💎 (50%)',
    recurringRate: 50,
    firstMonthRate: 50,
    minClients: 71,
    maxClients: null,
  },
};

/**
 * Calcula o nível do parceiro baseado no número de clientes ativos indicados
 */
export function calculatePartnerTier(activeClientsCount: number): PartnerTierInfo {
  let tierName: PartnerTierName = 'Bronze';

  if (activeClientsCount >= 71) {
    tierName = 'Diamante';
  } else if (activeClientsCount >= 31) {
    tierName = 'Ouro';
  } else if (activeClientsCount >= 11) {
    tierName = 'Prata';
  } else {
    tierName = 'Bronze';
  }

  const tier = PARTNER_TIERS[tierName];

  let nextTierName: PartnerTierName | null = null;
  let clientsNeededForNext = 0;
  let progressPercent = 100;

  if (tierName === 'Bronze') {
    nextTierName = 'Prata';
    clientsNeededForNext = Math.max(0, 11 - activeClientsCount);
    progressPercent = Math.min(100, Math.round((activeClientsCount / 11) * 100));
  } else if (tierName === 'Prata') {
    nextTierName = 'Ouro';
    clientsNeededForNext = Math.max(0, 31 - activeClientsCount);
    progressPercent = Math.min(100, Math.round(((activeClientsCount - 10) / (31 - 10)) * 100));
  } else if (tierName === 'Ouro') {
    nextTierName = 'Diamante';
    clientsNeededForNext = Math.max(0, 71 - activeClientsCount);
    progressPercent = Math.min(100, Math.round(((activeClientsCount - 30) / (71 - 30)) * 100));
  } else {
    nextTierName = null;
    clientsNeededForNext = 0;
    progressPercent = 100;
  }

  return {
    ...tier,
    nextTierName,
    clientsNeededForNext,
    progressPercent,
  };
}

/**
 * Calcula a comissão para uma determinada venda considerando se é 1º mês ou recorrência
 */
export function calculateCommissionForSale(saleAmount: number, isFirstMonth: boolean, activeClientsCount: number): {
  rate: number;
  commissionAmount: number;
  tierName: PartnerTierName;
  isFirstMonthBonus: boolean;
} {
  const tier = calculatePartnerTier(activeClientsCount);
  const rate = isFirstMonth ? 50 : tier.recurringRate;
  const commissionAmount = Number(((saleAmount * rate) / 100).toFixed(2));

  return {
    rate,
    commissionAmount,
    tierName: tier.name,
    isFirstMonthBonus: isFirstMonth,
  };
}
