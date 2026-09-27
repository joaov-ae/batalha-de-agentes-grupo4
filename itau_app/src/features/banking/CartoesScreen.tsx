import React, { useState } from 'react';
import {
  ChevronLeft,
  HelpCircle,
  CreditCard as CreditCardIcon,
  Settings,
  Sliders,
  ShoppingBag,
  Coins,
  Coffee,
  Plus,
  Barcode,
  TrendingUp,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { CreditCard, CardVariant } from '../../design-system/organisms/CreditCard';
import { CardDetailRow } from '../../design-system/molecules/CardDetailRow';
import { ServiceTile } from '../../design-system/molecules/ServiceTile';
import { TransactionRow } from '../../design-system/molecules/TransactionRow';
import { FeedbackBanner } from '../../design-system/molecules/FeedbackBanner';
import { MeusBeneficiosCard } from '../../design-system/molecules/MeusBeneficiosCard';
import { ItauButton } from '../../design-system/atoms/ItauButton';
import { PaymentModal } from '../../design-system/organisms/PaymentModal';

export interface CartoesScreenProps {
  onBack?: () => void;
  onOpenControleGastos?: () => void;
  onNavigateToExtrato?: () => void;
  className?: string;
}

export const CartoesScreen: React.FC<CartoesScreenProps> = ({
  onBack,
  onOpenControleGastos,
  onNavigateToExtrato,
  className = '',
}) => {
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [showFeedback, setShowFeedback] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const cards: {
    variant: CardVariant;
    cardName: string;
    lastDigits: string;
    type: string;
    holderName: string;
    invoiceAmount: number;
    availableLimit: number;
    totalLimit: number;
    dueDate: string;
    closeDate: string;
  }[] = [
    {
      variant: 'click-orange',
      cardName: 'Itaú Click',
      lastDigits: '1226',
      type: 'Crédito',
      holderName: 'ROBERTO ALVES',
      invoiceAmount: isPaid ? 0.0 : 1000.0,
      availableLimit: isPaid ? 2000.0 : 1000.0,
      totalLimit: 8000.0,
      dueDate: '20 Nov.',
      closeDate: '12 Nov.',
    },
    {
      variant: 'black',
      cardName: 'Mastercard Black',
      lastDigits: '1234',
      type: 'Crédito Adicional',
      holderName: 'ROBERTO ALVES',
      invoiceAmount: 3450.0,
      availableLimit: 12500.0,
      totalLimit: 25000.0,
      dueDate: '25 Nov.',
      closeDate: '18 Nov.',
    },
    {
      variant: 'gold',
      cardName: 'Itaú Gold',
      lastDigits: '8839',
      type: 'Crédito',
      holderName: 'ROBERTO ALVES',
      invoiceAmount: 420.0,
      availableLimit: 4580.0,
      totalLimit: 5000.0,
      dueDate: '10 Dez.',
      closeDate: '02 Dez.',
    },
  ];

  const currentCard = cards[activeCardIndex];

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className={`flex flex-col h-full bg-[#F4F6F8] relative overflow-hidden font-sans text-slate-800 ${className}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-[#002244] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-slate-700 animate-fadeIn pointer-events-none">
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-100 shrink-0">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-1 text-slate-800 hover:text-[#EC7000] font-semibold text-sm transition-colors py-1 px-1 -ml-1 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700" />
          <span>Cartões</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => showNotification('Central de Ajuda e Atendimento 24h Itaú')}
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Ajuda"
            aria-label="Ajuda"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24 space-y-4">
        {/* Card Carousel */}
        <div className="relative">
          <div className="overflow-x-auto no-scrollbar flex snap-x snap-mandatory gap-3 py-1">
            {cards.map((card, idx) => (
              <div
                key={card.lastDigits}
                className="w-[88%] shrink-0 snap-center cursor-pointer"
                onClick={() => setActiveCardIndex(idx)}
              >
                <CreditCard
                  variant={card.variant}
                  cardName={card.cardName}
                  lastDigits={card.lastDigits}
                  type={card.type}
                  holderName={card.holderName}
                  isActive={activeCardIndex === idx}
                />
              </div>
            ))}
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center items-center gap-1.5 mt-2">
            {cards.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveCardIndex(idx)}
                className={`transition-all duration-200 rounded-full cursor-pointer ${
                  activeCardIndex === idx
                    ? 'w-6 h-1.5 bg-[#EC7000]'
                    : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Ir para cartão ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Card Summary Block (White Card) */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] border border-slate-100/90">
          <div className="divide-y divide-slate-100">
            <CardDetailRow
              label="Fatura fechada"
              value={`R$ ${currentCard.invoiceAmount.toFixed(2).replace('.', ',')}`}
              valueColor={currentCard.invoiceAmount === 0 ? 'success' : 'default'}
              onClick={() => showNotification('Detalhes da fatura do cartão')}
            />

            <CardDetailRow
              label="Débito automático"
              value="Desativado"
              valueColor="danger"
              onClick={() => showNotification('Gerenciar débito automático da fatura')}
            />

            <CardDetailRow
              label="Vencimento"
              value={currentCard.dueDate}
              secondaryValue={`Fechamento: ${currentCard.closeDate}`}
              onClick={() => showNotification(`Vencimento programado para ${currentCard.dueDate}`)}
            />

            <CardDetailRow
              label="Limite disponível"
              value={`R$ ${currentCard.availableLimit.toFixed(2).replace('.', ',')}`}
              secondaryValue={`Limite total: R$ ${currentCard.totalLimit.toFixed(2).replace('.', ',')}`}
              onClick={() => showNotification('Visualizar limites do cartão')}
            />
          </div>

          {/* Action Buttons: Parcelar & Pagar */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-2">
            <ItauButton
              variant="outline"
              size="md"
              fullWidth
              onClick={() => showNotification('Simulador de parcelamento da fatura em até 24x')}
            >
              Parcelar
            </ItauButton>

            <ItauButton
              variant="primary"
              size="md"
              fullWidth
              disabled={currentCard.invoiceAmount === 0}
              onClick={() => setIsPaymentOpen(true)}
            >
              {currentCard.invoiceAmount === 0 ? 'Paga' : 'Pagar'}
            </ItauButton>
          </div>

          {/* Feedback Banner */}
          {showFeedback && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <FeedbackBanner
                question="O que achou dessa versão do espaço do seu cartão?"
                onDismiss={() => setShowFeedback(false)}
              />
            </div>
          )}
        </div>

        {/* Section: Serviços */}
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-2 px-1">
            Serviços
          </h2>

          <div className="grid grid-cols-3 gap-2.5">
            <ServiceTile
              icon={<CreditCardIcon className="w-5 h-5 stroke-[2]" />}
              label="Cartão virtual"
              onClick={() => showNotification('Gerar cartão virtual para compras seguras online')}
            />
            <ServiceTile
              icon={<Settings className="w-5 h-5 stroke-[2]" />}
              label="Gestão do cartão"
              onClick={() => showNotification('Configurações, bloqueio temporário e senha')}
            />
            <ServiceTile
              icon={<Sliders className="w-5 h-5 stroke-[2]" />}
              label="Limite do cartão"
              onClick={() => showNotification('Ajustar limite diário e crédito')}
            />
          </div>
        </div>

        {/* Controle de Gastos Teaser */}
        {onOpenControleGastos && (
          <div
            onClick={onOpenControleGastos}
            className="bg-gradient-to-r from-[#FFF4EB] to-white p-3.5 rounded-2xl border border-[#FFD8B5] flex items-center justify-between cursor-pointer hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EC7000] text-white flex items-center justify-center font-black shadow-sm">
                $
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Novo: Controle de Gastos</span>
                <span className="text-[11px] text-slate-500">Defina metas para delivery, mercado e combustível</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#EC7000]" />
          </div>
        )}

        {/* Section: Últimos lançamentos */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-slate-900">
              Últimos lançamentos
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              Maio 2026
            </span>
          </div>

          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1.5">
            Hoje, 3 de maio
          </div>

          <div className="divide-y divide-slate-100">
            <TransactionRow
              icon={<ShoppingBag className="w-4 h-4" />}
              iconBg="gray"
              title="Mercado livre"
              subtitle="Cartão adicional"
              amount="R$ 940,50"
              installments="Em 2x"
              onClick={() => showNotification('Compra Mercado Livre: 2x de R$ 470,25')}
            />

            <TransactionRow
              icon={<Coins className="w-4 h-4" />}
              iconBg="green"
              title="Fatura paga"
              subtitle="Limite liberado"
              amount="R$ 8.713,96"
              type="income"
              onClick={() => showNotification('Pagamento confirmado via Pix em 03/05')}
            />

            <TransactionRow
              icon={<Coffee className="w-4 h-4" />}
              iconBg="gray"
              title="Starbucks"
              subtitle="Apple Pay"
              amount="R$ 40,50"
              onClick={() => showNotification('Compra no Starbucks via Apple Pay')}
            />

            <TransactionRow
              icon={<Coffee className="w-4 h-4" />}
              iconBg="gray"
              title="Starbucks"
              subtitle="Apple Pay"
              amount="R$ 40,50"
              onClick={() => showNotification('Compra no Starbucks via Apple Pay')}
            />
          </div>

          <div className="mt-4 pt-1">
            <ItauButton
              variant="outline"
              size="md"
              fullWidth
              onClick={() => {
                if (onNavigateToExtrato) {
                  onNavigateToExtrato();
                } else {
                  showNotification('Carregando extrato completo de lançamentos');
                }
              }}
            >
              Acessar extrato completo
            </ItauButton>
          </div>
        </div>

        {/* Section: Meus benefícios */}
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-2 px-1">
            Meus benefícios
          </h2>

          <MeusBeneficiosCard
            points={15000}
            monetaryValue={150}
            onExtratoClick={() => showNotification('Extrato de pontos do Programa Itaú')}
            onBeneficiosItauClick={() => showNotification('Catálogo de benefícios Itaú Shop e Cinema')}
            onBeneficiosCartaoClick={() => showNotification('Benefícios da bandeira Mastercard')}
          />
        </div>

        {/* Section: Aproveite mais de cartões */}
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-2 px-1">
            Aproveite mais de cartões
          </h2>

          <div className="grid grid-cols-2 gap-2.5">
            <ServiceTile
              icon={<Plus className="w-5 h-5 stroke-[2.5]" />}
              label="Solicitar novo cartão"
              sublabel="Mais opções para você"
              onClick={() => showNotification('Solicitação de novos cartões')}
            />
            <ServiceTile
              icon={<Barcode className="w-5 h-5 stroke-[2]" />}
              label="Pague contas"
              sublabel="Use o limite do cartão"
              onClick={() => showNotification('Pagamento de contas e boletos no cartão')}
            />
            <ServiceTile
              icon={<TrendingUp className="w-5 h-5 stroke-[2]" />}
              label="Aumento de limite"
              sublabel="Análise instantânea"
              onClick={() => showNotification('Simulação de aumento de limite')}
            />
            <ServiceTile
              icon={<Layers className="w-5 h-5 stroke-[2]" />}
              label="Acelerador de pontos"
              sublabel="Multiplique por 2x"
              onClick={() => showNotification('Ativar Acelerador de Pontos Itaú')}
            />
          </div>
        </div>

        {/* Trust badge */}
        <div className="text-center py-4 text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Ambiente protegido pelo Banco Itaú S.A.</span>
        </div>
      </div>

      {/* Payment Modal strictly within mobile screen */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        invoiceAmount={currentCard.invoiceAmount}
        dueDate={currentCard.dueDate}
        onSuccess={() => {
          setIsPaid(true);
          showNotification('Fatura quitada! Limite restabelecido.');
        }}
      />
    </div>
  );
};
