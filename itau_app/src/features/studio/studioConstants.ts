import { PersonaProfile, FinancialGoal, Transaction, InvestmentSuggestion } from './studioTypes';

export const MARIA_PERSONA: PersonaProfile = {
  name: 'Renata Lopes', // sobrescrito em App.tsx pelo perfil real (/api/cliente)
  initials: 'RL',
  segment: 'Itaú Personnalité',
  level: 4,
  monthlyIncome: 10000.00,
  fixedCosts: 3620.00,
  fixedDetails: {
    moradia: 2650.00,
    aguaLuz: 340.00,
    internet: 180.00,
    seguros: 450.00,
  },
  cardMasked: '•••• 9241',
  cardLimit: 35000.00,
  currentInvoice: 4280.50,
};

export const DEFAULT_INVESTMENT_OPTIONS: InvestmentSuggestion[] = [
  {
    id: 'inv-1',
    name: 'CDB Personnalité DI',
    type: 'CDB DI',
    returnRate: '100% a 103% do CDI',
    liquidity: 'Diária com resgate imediato',
    risk: 'Baixo',
    recommendedFor: 'Ideal para aportes mensais e reservas com segurança total Itaú.',
  },
  {
    id: 'inv-2',
    name: 'LCA Itaú Sustentável',
    type: 'LCI/LCA',
    returnRate: '94% do CDI (Isento de IR)',
    liquidity: '9 meses',
    risk: 'Baixo',
    recommendedFor: 'Rendimento líquido superior sem tributação de Imposto de Renda.',
  },
  {
    id: 'inv-3',
    name: 'Tesouro Selic 2029',
    type: 'Tesouro Selic',
    returnRate: 'Selic + 0,15% a.a.',
    liquidity: 'Diária (D+0)',
    risk: 'Baixo',
    recommendedFor: 'Garantido pelo Tesouro Nacional, excelente para metas de médio e longo prazo.',
  }
];

export const INITIAL_GOALS: FinancialGoal[] = [
  {
    id: 'goal-casa',
    title: 'Comprar uma casa',
    category: 'moradia',
    targetAmount: 700000.00,
    currentAmount: 2030.00,
    color: '#EC7000',
    iconName: 'Home',
    deadline: 'dezembro 2030',
    itauShopPointsBonus: 450,
    suggestedInvestments: DEFAULT_INVESTMENT_OPTIONS,
    level: 1,
  },
  {
    id: 'goal-carro',
    title: 'Comprar Carro Novo',
    category: 'transporte',
    targetAmount: 60000.00,
    currentAmount: 27000.00,
    color: '#0047BA',
    iconName: 'Car',
    deadline: '24 meses',
    itauShopPointsBonus: 1200,
    suggestedInvestments: DEFAULT_INVESTMENT_OPTIONS,
    level: 2,
  },
  {
    id: 'goal-bebe',
    title: 'Planejamento Chegada do Bebê',
    category: 'geral',
    targetAmount: 35000.00,
    currentAmount: 10500.00,
    color: '#059669',
    iconName: 'HeartHandshake',
    deadline: '12 meses',
    itauShopPointsBonus: 850,
    suggestedInvestments: DEFAULT_INVESTMENT_OPTIONS,
    level: 1,
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    title: 'Crédito de Salário Empresa S/A',
    category: 'salario',
    type: 'credit',
    amount: 10000.00,
    date: 'Hoje, 08:30',
    account: 'Conta Corrente Personnalité',
    paymentMethod: 'Transferência TED'
  },
  {
    id: 'tx-2',
    title: 'Condomínio e Moradia Jardins',
    category: 'moradia',
    type: 'debit',
    amount: 2650.00,
    date: 'Hoje, 09:15',
    account: 'Conta Corrente',
    paymentMethod: 'Débito Automático'
  },
  {
    id: 'tx-3',
    title: 'Enel Energia & Água Sabesp',
    category: 'moradia',
    type: 'debit',
    amount: 340.00,
    date: 'Ontem',
    account: 'Conta Corrente',
    paymentMethod: 'Débito Automático'
  },
  {
    id: 'tx-4',
    title: 'Jantar Restaurante Fasano',
    category: 'lazer',
    type: 'debit',
    amount: 480.00,
    date: 'Ontem',
    account: 'Mastercard Black',
    paymentMethod: 'Cartão Personnalité'
  },
  {
    id: 'tx-5',
    title: 'Uber Viagens São Paulo',
    category: 'transporte',
    type: 'debit',
    amount: 68.40,
    date: '2 dias atrás',
    account: 'Mastercard Black',
    paymentMethod: 'Cartão Personnalité'
  },
  {
    id: 'tx-6',
    title: 'Seguro Cartão & Residencial',
    category: 'seguros',
    type: 'debit',
    amount: 450.00,
    date: '3 dias atrás',
    account: 'Conta Corrente',
    paymentMethod: 'Débito Automático'
  },
  {
    id: 'tx-7',
    title: 'Pix recebido de Camila Silva',
    category: 'pix',
    type: 'credit',
    amount: 350.00,
    date: '4 dias atrás',
    account: 'Conta Corrente',
    paymentMethod: 'Pix'
  }
];

export const SUGGESTED_QUICK_PROMPTS = [
  'Qual meu Raio-X de contas fixas?',
  'Quanto posso gastar com lazer este mês?',
  'Como aplicar a divisão 50/30/20 no meu salário?',
  'Definir meu teto de gastos de transporte do mês.',
  'Criar meta Comprar uma casa'
];
