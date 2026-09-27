import React, { useState } from 'react';
import {
  ChevronLeft,
  X,
  Fuel,
  Utensils,
  Store,
  ShoppingCart,
  Car,
  CheckCircle2,
  Lightbulb,
  ChevronRight,
  DollarSign,
  ArrowLeftRight,
} from 'lucide-react';
import { CategoryCard } from '../../design-system/molecules/CategoryCard';
import { NumericKeypad } from '../../design-system/organisms/NumericKeypad';
import { ExpenseTrackerCard } from '../../design-system/organisms/ExpenseTrackerCard';
import { ItauButton } from '../../design-system/atoms/ItauButton';
import confetti from 'canvas-confetti';

export type WizardStep = 'category' | 'amount' | 'success';

export interface CategoryOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  iconBgColor: string;
  lastMonthSpent: number;
}

export interface ControleGastosWizardProps {
  onClose: () => void;
  onFinish?: () => void;
  initialStep?: WizardStep;
  className?: string;
}

export const ControleGastosWizard: React.FC<ControleGastosWizardProps> = ({
  onClose,
  initialStep = 'category',
  className = '',
}) => {
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('delivery');
  const [rawAmountCents, setRawAmountCents] = useState<number>(20000); // R$ 200,00
  const [toast, setToast] = useState<string | null>(null);

  const categories: CategoryOption[] = [
    {
      id: 'combustivel',
      name: 'Posto de combustível',
      icon: <Fuel className="w-5 h-5 text-[#EC7000]" />,
      iconBgColor: 'bg-orange-50 text-[#EC7000]',
      lastMonthSpent: 420.5,
    },
    {
      id: 'delivery',
      name: 'Delivery',
      icon: <Utensils className="w-5 h-5 text-[#EC7000]" />,
      iconBgColor: 'bg-orange-50 text-[#EC7000]',
      lastMonthSpent: 234.22,
    },
    {
      id: 'restaurantes',
      name: 'Restaurantes',
      icon: <Store className="w-5 h-5 text-[#EC7000]" />,
      iconBgColor: 'bg-orange-50 text-[#EC7000]',
      lastMonthSpent: 512.9,
    },
    {
      id: 'mercado',
      name: 'Mercado',
      icon: <ShoppingCart className="w-5 h-5 text-[#EC7000]" />,
      iconBgColor: 'bg-orange-50 text-[#EC7000]',
      lastMonthSpent: 890.3,
    },
    {
      id: 'transporte',
      name: 'Transporte por app',
      icon: <Car className="w-5 h-5 text-[#EC7000]" />,
      iconBgColor: 'bg-orange-50 text-[#EC7000]',
      lastMonthSpent: 180.0,
    },
  ];

  const selectedCategory =
    categories.find((c) => c.id === selectedCategoryId) || categories[1];

  const formattedAmount = (rawAmountCents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleKeyPress = (digit: string) => {
    if (digit === ',') return;
    const num = parseInt(digit, 10);
    if (isNaN(num)) return;
    if (rawAmountCents > 1000000) return;
    setRawAmountCents((prev) => prev * 10 + num);
  };

  const handleBackspace = () => {
    setRawAmountCents((prev) => Math.floor(prev / 10));
  };

  const handleCreateControl = () => {
    setStep('success');
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.5 },
      colors: ['#EC7000', '#002244', '#16A34A'],
    });
  };

  return (
    <div className={`bg-white h-full flex flex-col justify-between select-none relative overflow-hidden ${className}`}>
      {/* Floating Toast */}
      {toast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-[#002244] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg animate-fadeIn pointer-events-none">
          {toast}
        </div>
      )}

      {/* ================= STEP 1: CATEGORY SELECTION ================= */}
      {step === 'category' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Top Close */}
            <div className="flex justify-end mb-3">
              <button
                onClick={onClose}
                type="button"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Title */}
            <h1 className="text-xl font-black text-slate-900 leading-snug tracking-tight mb-6">
              Em qual destas categorias você gastou mais no último mês?
            </h1>

            {/* Category Cards List */}
            <div className="space-y-2.5 pb-4">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  id={cat.id}
                  name={cat.name}
                  icon={cat.icon}
                  iconBgColor={cat.iconBgColor}
                  selected={selectedCategoryId === cat.id}
                  onSelect={(id) => setSelectedCategoryId(id)}
                />
              ))}
            </div>
          </div>

          {/* Primary Action Button - Strictly docked at the bottom of the screen */}
          <div className="p-4 border-t border-slate-100 bg-white/95 backdrop-blur-md shrink-0">
            <ItauButton
              variant="primary"
              size="lg"
              fullWidth
              disabled={!selectedCategoryId}
              onClick={() => setStep('amount')}
              rightIcon={<ChevronRight className="w-5 h-5" />}
            >
              Quero descobrir
            </ItauButton>
          </div>
        </div>
      )}

      {/* ================= STEP 2: DEFINE AMOUNT / KEYPAD ================= */}
      {step === 'amount' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Scrollable Content Area: Header + Amount + Keypad */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-between">
            <div>
              {/* Top Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setStep('category')}
                  type="button"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors -ml-2 cursor-pointer"
                  aria-label="Voltar"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={onClose}
                  type="button"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Title */}
              <h1 className="text-xl font-black text-slate-900 leading-snug tracking-tight mb-4">
                Defina um valor para {selectedCategory.name.toLowerCase()}
              </h1>

              {/* Amount Display */}
              <div className="relative pb-3 border-b-2 border-[#EC7000] mb-4 flex items-baseline">
                <span className="text-2xl font-black text-slate-900 mr-2">R$</span>
                <span className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                  {formattedAmount}
                </span>
                <span className="w-0.5 h-8 bg-[#EC7000] animate-pulse ml-1 inline-block" />
              </div>

              {/* Spending Insight Hint */}
              <div className="flex items-center gap-2 text-xs text-slate-600 py-2 px-3 bg-slate-50 rounded-xl mb-4 border border-slate-100">
                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  Total gasto no último mês:{' '}
                  <strong className="text-slate-900 font-bold tabular-nums">
                    R$ {selectedCategory.lastMonthSpent.toFixed(2).replace('.', ',')}
                  </strong>
                </span>
              </div>
            </div>

            {/* Numeric Banking Keypad */}
            <div className="pt-2 pb-2">
              <NumericKeypad
                onKeyPress={handleKeyPress}
                onBackspace={handleBackspace}
                showSubmitKey={false}
              />
            </div>
          </div>

          {/* Primary Action Button - Strictly docked at the very bottom of the screen */}
          <div className="p-4 border-t border-slate-100 bg-white shrink-0">
            <ItauButton
              variant="primary"
              size="lg"
              fullWidth
              disabled={rawAmountCents === 0}
              onClick={handleCreateControl}
              rightIcon={<ChevronRight className="w-5 h-5" />}
            >
              Criar controle
            </ItauButton>
          </div>
        </div>
      )}

      {/* ================= STEP 3: SUCCESS & TRACKER VIEW ================= */}
      {step === 'success' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9FA]">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Top Close */}
            <div className="flex justify-end mb-2">
              <button
                onClick={onClose}
                type="button"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success icon & text */}
            <div className="mb-5">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-md">
                <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 leading-snug tracking-tight">
                Tudo certo! O controle dessa categoria foi criado
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                De 01/03 até hoje
              </p>
            </div>

            {/* Dynamic Tracker Card */}
            <div className="mb-4">
              <ExpenseTrackerCard
                category={selectedCategory.name}
                spent={33.5}
                limit={rawAmountCents / 100}
                period="De 01/03 até hoje"
                icon={selectedCategory.icon}
                onClick={() => {
                  setToast('Detalhes do orçamento de ' + selectedCategory.name);
                  setTimeout(() => setToast(null), 2500);
                }}
              />
            </div>

            {/* Quick Action Shortcuts */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              <button
                type="button"
                onClick={() => {
                  setToast('Carregando todos os controles ativos');
                  setTimeout(() => setToast(null), 2000);
                }}
                className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm text-left hover:shadow transition-all group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#FFF4EB] text-[#EC7000] flex items-center justify-center mb-2">
                  <DollarSign className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="text-xs font-bold text-slate-800 block group-hover:text-[#EC7000] transition-colors">
                  Acompanhar controles
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setToast('Abrindo histórico de pagamentos');
                  setTimeout(() => setToast(null), 2000);
                }}
                className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm text-left hover:shadow transition-all group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#EC7000] flex items-center justify-center mb-2">
                  <ArrowLeftRight className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="text-xs font-bold text-slate-800 block group-hover:text-[#EC7000] transition-colors">
                  Pagamentos
                </span>
              </button>
            </div>
          </div>

          {/* Primary Action Button - Strictly docked at the very bottom of the screen */}
          <div className="p-4 border-t border-slate-200/80 bg-white shrink-0">
            <ItauButton
              variant="outline"
              size="lg"
              fullWidth
              onClick={onClose}
            >
              Voltar ao início
            </ItauButton>
          </div>
        </div>
      )}
    </div>
  );
};
