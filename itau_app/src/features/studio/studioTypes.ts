export type ScreenType = 
  | 'hub' 
  | 'cartoes' 
  | 'extrato' 
  | 'pix' 
  | 'iai' 
  | 'iai_landing'
  | 'menu' 
  | 'wizard'
  | 'storybook'
  | 'meta_detail';

export interface PersonaProfile {
  name: string;
  initials: string;
  segment: string;
  level: number;
  monthlyIncome: number;
  fixedCosts: number;
  fixedDetails: {
    moradia: number;
    aguaLuz: number;
    internet: number;
    seguros: number;
  };
  cardMasked: string;
  cardLimit: number;
  currentInvoice: number;
}

export interface InvestmentSuggestion {
  id: string;
  name: string;
  type: 'CDB DI' | 'LCI/LCA' | 'Tesouro Selic' | 'Previdência';
  returnRate: string;
  liquidity: string;
  risk: 'Baixo' | 'Médio';
  recommendedFor: string;
}

export interface CategoryCap {
  category: string;
  amount: number;
  percentage: number;
  description: string;
  color: string;
}

export interface FinancialGoal {
  id: string;
  title: string;
  category: 'essenciais' | 'lazer' | 'futuro' | 'transporte' | 'moradia' | 'geral';
  targetAmount: number;
  currentAmount: number;
  color: string;
  iconName: string;
  deadline?: string;
  itauShopPointsBonus?: number;
  suggestedInvestments?: InvestmentSuggestion[];
  level?: number;
}

export interface Transaction {
  id: string;
  title: string;
  category: 'moradia' | 'lazer' | 'salario' | 'transporte' | 'mercado' | 'seguros' | 'pix';
  type: 'debit' | 'credit';
  amount: number;
  date: string;
  account: string;
  paymentMethod: 'Cartão Personnalité' | 'Pix' | 'Débito Automático' | 'Transferência TED';
}

export interface FrequentContact {
  id: string;
  initials: string;
  name: string;
  bank: string;
  key?: string;
}

export type PixOptionType = 'contato' | 'copia_cola' | 'qr_code';

export interface PixTransferParams {
  mode: PixOptionType;
  recipient?: FrequentContact;
  suggestedAmount?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'iai';
  text: string;
  timestamp: string;
  quickAction?: {
    type: 'create_goal' | 'open_pix' | 'view_wizard' | 'show_extrato' | 'view_home';
    label: string;
    payload?: any;
  };
  contacts?: FrequentContact[];
  showPixOptions?: boolean;
  categoryCaps?: CategoryCap[];
}

export type StorybookTab = 'atoms' | 'molecules' | 'organisms' | 'tokens' | 'screens';
