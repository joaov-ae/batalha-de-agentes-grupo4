export interface FinancialGoal {
  id: string;
  title: string;
  category: 'carro' | 'casa' | 'filho' | 'viagem' | 'reserva' | 'outros';
  targetAmount: number;
  currentAmount: number;
  monthlySaving: number;
  timeframeMonths: number;
  recommendedInvestment: string;
  estimatedEarnings: number;
  createdAt: string;
  isActive: boolean;
  description?: string;
}

export const INITIAL_GOALS: FinancialGoal[] = [
  {
    id: 'goal-carro',
    title: 'Comprar Carro Novo',
    category: 'carro',
    targetAmount: 60000,
    currentAmount: 18500,
    monthlySaving: 2250,
    timeframeMonths: 24,
    recommendedInvestment: 'CDB Itaú DI 100% CDI',
    estimatedEarnings: 5840,
    createdAt: '15/03/2026',
    isActive: true,
    description: 'Guardando R$ 2.250/mês no CDB Itaú você atinge R$ 60.000 em 24 meses com rendimentos acelerados.',
  },
  {
    id: 'goal-filho',
    title: 'Planejamento Chegada do Bebê',
    category: 'filho',
    targetAmount: 35000,
    currentAmount: 8200,
    monthlySaving: 2750,
    timeframeMonths: 12,
    recommendedInvestment: 'CDB Itaú DI + Previdência Infantil',
    estimatedEarnings: 2100,
    createdAt: '01/04/2026',
    isActive: true,
    description: 'Reserva para despesas de saúde, quarto e início da previdência do bebê.',
  }
];
