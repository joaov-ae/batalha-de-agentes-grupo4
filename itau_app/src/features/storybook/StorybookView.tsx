import React, { useState } from 'react';
import {
  BookOpen,
  Sliders,
  Code2,
  FileText,
  Copy,
  Check,
  Smartphone,
  Tablet,
  Monitor,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { ITAU_COLORS } from '../../design-system/tokens';
import { ItauButton, ButtonVariant, ButtonSize } from '../../design-system/atoms/ItauButton';
import { ItauBadge, BadgeVariant } from '../../design-system/atoms/ItauBadge';
import { SquircleIcon } from '../../design-system/atoms/SquircleIcon';
import { PixIcon } from '../../design-system/atoms/PixIcon';
import { ServiceTile } from '../../design-system/molecules/ServiceTile';
import { CardDetailRow } from '../../design-system/molecules/CardDetailRow';
import { TransactionRow } from '../../design-system/molecules/TransactionRow';
import { CategoryCard } from '../../design-system/molecules/CategoryCard';
import { FeedbackBanner } from '../../design-system/molecules/FeedbackBanner';
import { MeusBeneficiosCard } from '../../design-system/molecules/MeusBeneficiosCard';
import { CreditCard, CardVariant } from '../../design-system/organisms/CreditCard';
import { NumericKeypad } from '../../design-system/organisms/NumericKeypad';
import { ExpenseTrackerCard } from '../../design-system/organisms/ExpenseTrackerCard';
import { PromoBanner } from '../../design-system/organisms/PromoBanner';
import { BottomTabBar, TabId } from '../../design-system/organisms/BottomTabBar';
import { IaiFloatingButton } from '../../design-system/molecules/IaiFloatingButton';
import { DecisionModal } from '../../design-system/organisms/DecisionModal';

import {
  CreditCard as CreditCardIcon,
  ShoppingBag,
  Coins,
  Coffee,
  Fuel,
  Utensils,
  Store,
  ShoppingCart,
  Car,
  Settings,
  Sliders as SlidersIcon,
  Barcode,
  ArrowLeftRight,
} from 'lucide-react';

export interface StorybookViewProps {
  onBackToApp?: () => void;
  className?: string;
}

export const StorybookView: React.FC<StorybookViewProps> = ({
  onBackToApp,
  className = '',
}) => {
  // Navigation State
  const [selectedStory, setSelectedStory] = useState<string>('CreditCard');
  const [activeBottomTab, setActiveBottomTab] = useState<'controls' | 'docs' | 'code'>('controls');
  const [canvasBg, setCanvasBg] = useState<'light' | 'dark' | 'gray' | 'grid'>('gray');
  const [viewport, setViewport] = useState<'mobile' | 'mobile-lg' | 'responsive'>('mobile');
  const [copiedCode, setCopiedCode] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Component Props State (Live Controls)
  // Button
  const [btnText, setBtnText] = useState('Pagar fatura');
  const [btnVariant, setBtnVariant] = useState<ButtonVariant>('primary');
  const [btnSize, setBtnSize] = useState<ButtonSize>('md');
  const [btnDisabled, setBtnDisabled] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);

  // PixIcon
  const [storybookPixSize, setStorybookPixSize] = useState(48);
  const [storybookPixColor, setStorybookPixColor] = useState('#32BCAD');

  // Credit Card
  const [cardVariant, setCardVariant] = useState<CardVariant>('click-orange');
  const [cardName, setCardName] = useState('Itaú Click');
  const [cardDigits, setCardDigits] = useState('1226');
  const [cardHolder, setCardHolder] = useState('ROBERTO ALVES');

  // Service Tile
  const [tileLabel, setTileLabel] = useState('Cartão virtual');
  const [tileSublabel, setTileSublabel] = useState('');
  const [tileBadge, setTileBadge] = useState('');

  // Expense Tracker
  const [trackerCategory, setTrackerCategory] = useState('Delivery');
  const [trackerSpent, setTrackerSpent] = useState(33.5);
  const [trackerLimit, setTrackerLimit] = useState(200.0);

  // Keypad display
  const [keypadInput, setKeypadInput] = useState('20000');

  // Bottom Tab Bar
  const [bottomActiveTab, setBottomActiveTab] = useState<TabId>('inicio');

  // Decision Modal
  const [storybookDecisionOpen, setStorybookDecisionOpen] = useState(false);

  // Badge
  const [badgeText, setBadgeText] = useState('Desativado');
  const [badgeVariant, setBadgeVariant] = useState<BadgeVariant>('danger');
  const [badgeDot, setBadgeDot] = useState(true);

  // Stories Tree
  const storiesTree = [
    {
      category: 'Design Tokens',
      items: [
        { id: 'TokensColors', label: 'Cores & Gradientes' },
        { id: 'TokensTypography', label: 'Tipografia & Escala' },
      ],
    },
    {
      category: 'Atoms',
      items: [
        { id: 'ItauButton', label: 'Button' },
        { id: 'ItauBadge', label: 'Badge' },
        { id: 'SquircleIcon', label: 'SquircleIcon' },
        { id: 'PixIcon', label: 'PixIcon (Oficial)' },
      ],
    },
    {
      category: 'Molecules',
      items: [
        { id: 'IaiFloatingButton', label: 'IaiFloatingButton' },
        { id: 'ServiceTile', label: 'ServiceTile' },
        { id: 'CardDetailRow', label: 'CardDetailRow' },
        { id: 'TransactionRow', label: 'TransactionRow' },
        { id: 'CategoryCard', label: 'CategoryCard' },
        { id: 'FeedbackBanner', label: 'FeedbackBanner' },
        { id: 'MeusBeneficiosCard', label: 'MeusBeneficiosCard' },
      ],
    },
    {
      category: 'Organisms',
      items: [
        { id: 'DecisionModal', label: 'DecisionModal' },
        { id: 'CreditCard', label: 'CreditCard' },
        { id: 'ExpenseTrackerCard', label: 'ExpenseTrackerCard' },
        { id: 'NumericKeypad', label: 'NumericKeypad' },
        { id: 'PromoBanner', label: 'PromoBanner' },
        { id: 'BottomTabBar', label: 'BottomTabBar' },
      ],
    },
  ];

  // Helper to render live component
  const renderPreview = () => {
    switch (selectedStory) {
      case 'TokensColors':
        return (
          <div className="w-full max-w-2xl space-y-6 text-slate-800">
            <div>
              <h3 className="font-bold text-base mb-2">Cores da Marca Itaú</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#EC7000] rounded-xl text-white shadow-sm">
                  <div className="font-bold text-sm">Itaú Orange</div>
                  <div className="text-xs opacity-90">#EC7000</div>
                  <div className="text-[10px] mt-2 opacity-80">Primary Brand</div>
                </div>
                <div className="p-3 bg-[#002244] rounded-xl text-white shadow-sm">
                  <div className="font-bold text-sm">Itaú Navy</div>
                  <div className="text-xs opacity-90">#002244</div>
                  <div className="text-[10px] mt-2 opacity-80">Secondary / Headings</div>
                </div>
                <div className="p-3 bg-[#0047BA] rounded-xl text-white shadow-sm">
                  <div className="font-bold text-sm">Itaú Blue</div>
                  <div className="text-xs opacity-90">#0047BA</div>
                  <div className="text-[10px] mt-2 opacity-80">Accent / Pix</div>
                </div>
                <div className="p-3 bg-[#FFF4EB] rounded-xl text-[#EC7000] border border-[#FFD8B5]">
                  <div className="font-bold text-sm">Orange Light</div>
                  <div className="text-xs">#FFF4EB</div>
                  <div className="text-[10px] mt-2">Backgrounds & Badges</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">Neutros e Superfícies</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#F4F6F8] rounded-xl border border-slate-200">
                  <div className="font-bold text-sm text-slate-800">Gray Bg</div>
                  <div className="text-xs text-slate-500">#F4F6F8</div>
                  <div className="text-[10px] text-slate-400 mt-2">App Background</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <div className="font-bold text-sm text-slate-800">White Card</div>
                  <div className="text-xs text-slate-500">#FFFFFF</div>
                  <div className="text-[10px] text-slate-400 mt-2">Surface Container</div>
                </div>
                <div className="p-3 bg-[#1C2024] rounded-xl text-white">
                  <div className="font-bold text-sm">Text Dark</div>
                  <div className="text-xs opacity-80">#1C2024</div>
                  <div className="text-[10px] opacity-70 mt-2">Titles & Big Numbers</div>
                </div>
                <div className="p-3 bg-[#697386] rounded-xl text-white">
                  <div className="font-bold text-sm">Text Muted</div>
                  <div className="text-xs opacity-80">#697386</div>
                  <div className="text-[10px] opacity-70 mt-2">Captions & Dates</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'TokensTypography':
        return (
          <div className="w-full max-w-2xl space-y-5 text-slate-800">
            <div className="border-b border-slate-200 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Display / Hero (32px)</span>
              <div className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                R$ 8.713,96
              </div>
            </div>
            <div className="border-b border-slate-200 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Heading 1 (24px)</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                Controle de Gastos
              </div>
            </div>
            <div className="border-b border-slate-200 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Heading 2 (18px)</span>
              <div className="text-lg font-bold text-slate-800 mt-1">
                Últimos lançamentos
              </div>
            </div>
            <div className="border-b border-slate-200 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Body Regular (14px)</span>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                Descubra os seus gastos e evite surpresas no fim do mês através dos limites por categoria.
              </p>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Tabular Numerals (Mono/Numbers)</span>
              <div className="text-base font-bold font-mono tabular-nums text-[#EC7000] mt-1">
                •••• 1226 · Vencimento 20 Nov.
              </div>
            </div>
          </div>
        );

      case 'ItauButton':
        return (
          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <ItauButton
              variant={btnVariant}
              size={btnSize}
              disabled={btnDisabled}
              isLoading={btnLoading}
              fullWidth
            >
              {btnText}
            </ItauButton>
          </div>
        );

      case 'ItauBadge':
        return (
          <div className="flex flex-wrap items-center gap-3">
            <ItauBadge variant={badgeVariant} dot={badgeDot}>
              {badgeText}
            </ItauBadge>
          </div>
        );

      case 'SquircleIcon':
        return (
          <div className="flex items-center gap-4">
            <SquircleIcon icon={<CreditCardIcon className="w-5 h-5" />} variant="orange" size="md" />
            <SquircleIcon icon={<Settings className="w-5 h-5" />} variant="navy" size="md" />
            <SquircleIcon icon={<SlidersIcon className="w-5 h-5" />} variant="light" size="md" />
          </div>
        );

      case 'PixIcon':
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs max-w-sm w-full text-center">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner mb-3">
              <PixIcon
                size={storybookPixSize}
                color={storybookPixColor}
                className="transition-all duration-300"
              />
            </div>
            <span className="font-bold text-slate-900 text-sm">Ícone Oficial Pix (BCB)</span>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              Padrão vetorial do Banco Central do Brasil para uso em pagamentos, transferências e chaves Pix.
            </p>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 w-full justify-center">
              <span className="text-[10px] font-bold text-slate-400">Tamanho:</span>
              <input
                type="range"
                min={20}
                max={80}
                value={storybookPixSize}
                onChange={(e) => setStorybookPixSize(Number(e.target.value))}
                className="w-24 accent-[#FF4785]"
              />
              <span className="text-[10px] font-mono text-slate-600">{storybookPixSize}px</span>
            </div>
          </div>
        );

      case 'IaiFloatingButton':
        return (
          <div className="relative w-full max-w-sm h-64 bg-slate-100 rounded-3xl border border-slate-200/80 p-6 flex flex-col justify-between overflow-hidden shadow-inner">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Demonstração: Botão Flutuante Ia.i</span>
              <p className="text-[11px] text-slate-500 mt-1">
                Passe o mouse ou toque no botão para ver a expansão para &quot;Pergunte o que quiser&quot;.
              </p>
            </div>
            <IaiFloatingButton
              onClick={() => alert('Abrir Ia.i chat')}
              className="absolute bottom-4 right-4"
            />
          </div>
        );

      case 'ServiceTile':
        return (
          <div className="w-36">
            <ServiceTile
              icon={<CreditCardIcon className="w-5 h-5 stroke-[2]" />}
              label={tileLabel}
              sublabel={tileSublabel}
              badge={tileBadge}
            />
          </div>
        );

      case 'CardDetailRow':
        return (
          <div className="w-full max-w-md bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <CardDetailRow
              label="Fatura fechada"
              value="R$ 1.000,00"
            />
            <CardDetailRow
              label="Débito automático"
              value="Desativado"
              valueColor="danger"
            />
            <CardDetailRow
              label="Vencimento"
              value="20 Nov."
              secondaryValue="Fechamento: 12 Nov."
            />
          </div>
        );

      case 'TransactionRow':
        return (
          <div className="w-full max-w-md bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <TransactionRow
              icon={<ShoppingBag className="w-4 h-4" />}
              iconBg="gray"
              title="Mercado livre"
              subtitle="Cartão adicional"
              amount="R$ 940,50"
              installments="Em 2x"
            />
            <TransactionRow
              icon={<Coins className="w-4 h-4" />}
              iconBg="green"
              title="Fatura paga"
              subtitle="Limite liberado"
              amount="R$ 8.713,96"
              type="income"
            />
            <TransactionRow
              icon={<Coffee className="w-4 h-4" />}
              iconBg="gray"
              title="Starbucks"
              subtitle="Apple Pay"
              amount="R$ 40,50"
            />
          </div>
        );

      case 'CategoryCard':
        return (
          <div className="w-full max-w-md space-y-2">
            <CategoryCard
              id="combustivel"
              name="Posto de combustível"
              icon={<Fuel className="w-5 h-5" />}
              selected={false}
            />
            <CategoryCard
              id="delivery"
              name="Delivery"
              icon={<Utensils className="w-5 h-5" />}
              selected={true}
            />
            <CategoryCard
              id="restaurantes"
              name="Restaurantes"
              icon={<Store className="w-5 h-5" />}
              selected={false}
            />
          </div>
        );

      case 'FeedbackBanner':
        return (
          <div className="w-full max-w-md">
            <FeedbackBanner />
          </div>
        );

      case 'MeusBeneficiosCard':
        return (
          <div className="w-full max-w-sm">
            <MeusBeneficiosCard />
          </div>
        );

      case 'DecisionModal':
        return (
          <div className="w-full max-w-sm flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
            <span className="text-xs font-bold text-slate-800 block mb-1">Modal de Decisão (Pix)</span>
            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Modal de revisão para confirmação de transferências com dados do destinatário e proteção Itaú.
            </p>
            <ItauButton
              variant="primary"
              size="md"
              onClick={() => setStorybookDecisionOpen(true)}
              leftIcon={<PixIcon className="w-4 h-4 fill-white text-white" />}
            >
              Abrir Modal de Decisão
            </ItauButton>

            <DecisionModal
              isOpen={storybookDecisionOpen}
              onClose={() => setStorybookDecisionOpen(false)}
              onConfirm={() => setStorybookDecisionOpen(false)}
              data={{
                type: 'pix',
                title: 'Confirmar transferência Pix',
                amount: 50.0,
                recipientName: 'Carlos Silva',
                recipientBank: 'Itaú Unibanco S.A. (341)',
                recipientKey: '•••.124.890-••',
                recipientKeyType: 'CPF',
                balanceAfter: 8663.96,
              }}
            />
          </div>
        );

      case 'CreditCard':
        return (
          <div className="w-full max-w-sm">
            <CreditCard
              variant={cardVariant}
              cardName={cardName}
              lastDigits={cardDigits}
              holderName={cardHolder}
            />
          </div>
        );

      case 'ExpenseTrackerCard':
        return (
          <div className="w-full max-w-sm">
            <ExpenseTrackerCard
              category={trackerCategory}
              spent={trackerSpent}
              limit={trackerLimit}
              icon={<Utensils className="w-4 h-4" />}
            />
          </div>
        );

      case 'NumericKeypad':
        return (
          <div className="w-full max-w-xs bg-slate-100 p-4 rounded-3xl">
            <div className="text-center font-mono text-xl font-bold mb-3 text-slate-800 tabular-nums">
              R$ {(parseInt(keypadInput || '0', 10) / 100).toFixed(2).replace('.', ',')}
            </div>
            <NumericKeypad
              onKeyPress={(k) => setKeypadInput((p) => p + k)}
              onBackspace={() => setKeypadInput((p) => p.slice(0, -1))}
              showSubmitKey={false}
            />
          </div>
        );

      case 'PromoBanner':
        return (
          <div className="w-full max-w-md">
            <PromoBanner />
          </div>
        );

      case 'BottomTabBar':
        return (
          <div className="w-full max-w-md border border-slate-200 rounded-3xl overflow-hidden shadow-lg">
            <BottomTabBar
              activeTab={bottomActiveTab}
              onTabChange={setBottomActiveTab}
            />
          </div>
        );

      default:
        return <div>Selecione um componente no menu lateral</div>;
    }
  };

  // Helper for Generated Code Snippet
  const getGeneratedCode = () => {
    switch (selectedStory) {
      case 'ItauButton':
        return `<ItauButton\n  variant="${btnVariant}"\n  size="${btnSize}"\n  disabled={${btnDisabled}}\n  isLoading={${btnLoading}}\n  fullWidth\n>\n  ${btnText}\n</ItauButton>`;
      case 'PixIcon':
        return `import { PixIcon } from '@/src/design-system/atoms/PixIcon';\n\n// Ícone Oficial Pix\n<PixIcon size={${storybookPixSize}} color="${storybookPixColor}" />\n\n// Ou com Tailwind CSS:\n<PixIcon className="w-5 h-5 text-[#32BCAD]" />`;
      case 'CreditCard':
        return `<CreditCard\n  variant="${cardVariant}"\n  cardName="${cardName}"\n  lastDigits="${cardDigits}"\n  holderName="${cardHolder}"\n/>`;
      case 'ServiceTile':
        return `<ServiceTile\n  icon={<CreditCard className="w-5 h-5 stroke-[2]" />}\n  label="${tileLabel}"${tileSublabel ? `\n  sublabel="${tileSublabel}"` : ''}${tileBadge ? `\n  badge="${tileBadge}"` : ''}\n  onClick={() => console.log('clicked')}\n/>`;
      case 'ExpenseTrackerCard':
        return `<ExpenseTrackerCard\n  category="${trackerCategory}"\n  spent={${trackerSpent}}\n  limit={${trackerLimit}}\n  period="De 01/03 até hoje"\n  icon={<Utensils className="w-4 h-4" />}\n/>`;
      case 'NumericKeypad':
        return `<NumericKeypad\n  onKeyPress={(k) => handleInput(k)}\n  onBackspace={handleBackspace}\n/>`;
      case 'FeedbackBanner':
        return `<FeedbackBanner\n  question="O que achou dessa versão do espaço do seu cartão?"\n  onDismiss={() => handleDismiss()}\n/>`;
      default:
        return `<${selectedStory} />`;
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText?.(getGeneratedCode());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const [showMobileNav, setShowMobileNav] = useState(false);

  return (
    <div className={`h-full min-h-[600px] flex flex-col bg-[#0F131A] text-slate-100 font-sans select-none overflow-hidden ${className}`}>
      {/* Top Header */}
      <header className="px-3 py-2.5 bg-[#161B24] border-b border-slate-800 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-2">
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="p-1.5 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Voltar ao App"
            >
              <ChevronRight className="w-5 h-5 rotate-180 text-[#EC7000]" />
            </button>
          )}
          <div className="w-7 h-7 rounded-lg bg-[#EC7000] text-white flex items-center justify-center font-black shadow-sm">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white">Itaú DS</span>
              <span className="text-[9px] bg-[#EC7000]/20 text-[#EC7000] px-1 py-0.2 rounded font-bold border border-[#EC7000]/30">
                v2.4
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Component Selector Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedStory}
            onChange={(e) => setSelectedStory(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-lg px-2 py-1 max-w-[140px] truncate focus:outline-none focus:border-[#EC7000]"
          >
            {storiesTree.map((group) => (
              <optgroup key={group.category} label={group.category}>
                {group.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="flex items-center gap-1 bg-[#EC7000] hover:bg-[#D45D00] text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <span>App</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Layout: Canvas + Inspector */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0B0E14] overflow-hidden">
        {/* Canvas Toolbar */}
        <div className="px-3 py-1.5 bg-[#161B24] border-b border-slate-800 flex items-center justify-between shrink-0 text-xs">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-500">DS</span>
            <span className="text-slate-600">/</span>
            <span className="text-[#EC7000] font-bold truncate max-w-[120px]">{selectedStory}</span>
          </div>

          {/* Canvas Background Controls */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg text-[10px]">
            <button
              onClick={() => setCanvasBg('light')}
              className={`px-1.5 py-0.5 rounded ${canvasBg === 'light' ? 'bg-white text-slate-900 font-bold' : 'text-slate-400'}`}
              title="Fundo Claro"
            >
              Claro
            </button>
            <button
              onClick={() => setCanvasBg('gray')}
              className={`px-1.5 py-0.5 rounded ${canvasBg === 'gray' ? 'bg-slate-600 text-white font-bold' : 'text-slate-400'}`}
              title="Fundo Itaú"
            >
              Itaú
            </button>
            <button
              onClick={() => setCanvasBg('dark')}
              className={`px-1.5 py-0.5 rounded ${canvasBg === 'dark' ? 'bg-slate-900 text-white font-bold' : 'text-slate-400'}`}
              title="Fundo Escuro"
            >
              Escuro
            </button>
          </div>
        </div>

          {/* Interactive Preview Canvas */}
          <div
            className={`flex-1 overflow-auto flex items-center justify-center p-8 transition-colors ${
              canvasBg === 'light'
                ? 'bg-white'
                : canvasBg === 'gray'
                ? 'bg-[#F4F6F8]'
                : 'bg-[#0E131C]'
            }`}
          >
            <div
              className={`transition-all duration-300 flex items-center justify-center ${
                viewport === 'mobile'
                  ? 'w-[390px] border border-dashed border-slate-400/40 p-6 rounded-3xl shadow-sm'
                  : 'w-full max-w-4xl p-4'
              }`}
            >
              {renderPreview()}
            </div>
          </div>

          {/* Bottom Panel: Controls / Docs / Code */}
          <div className="h-64 bg-[#141820] border-t border-slate-800 flex flex-col shrink-0">
            {/* Panel Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveBottomTab('controls')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeBottomTab === 'controls'
                      ? 'border-[#EC7000] text-[#EC7000]'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Controls (Props)</span>
                </button>
                <button
                  onClick={() => setActiveBottomTab('docs')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeBottomTab === 'docs'
                      ? 'border-[#EC7000] text-[#EC7000]'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Documentação & Anatomia</span>
                </button>
                <button
                  onClick={() => setActiveBottomTab('code')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeBottomTab === 'code'
                      ? 'border-[#EC7000] text-[#EC7000]'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Código JSX</span>
                </button>
              </div>

              {activeBottomTab === 'code' && (
                <button
                  onClick={handleCopyCode}
                  className="text-xs text-slate-300 hover:text-white flex items-center gap-1 py-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copiado!' : 'Copiar JSX'}</span>
                </button>
              )}
            </div>

            {/* Panel Body */}
            <div className="flex-1 p-4 overflow-y-auto text-xs">
              {activeBottomTab === 'controls' && (
                <div className="space-y-3">
                  {selectedStory === 'ItauButton' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Texto (children)</label>
                        <input
                          type="text"
                          value={btnText}
                          onChange={(e) => setBtnText(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Variant</label>
                        <select
                          value={btnVariant}
                          onChange={(e) => setBtnVariant(e.target.value as ButtonVariant)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        >
                          <option value="primary">primary (Orange)</option>
                          <option value="outline">outline (Navy Border)</option>
                          <option value="secondary">secondary (Navy)</option>
                          <option value="ghost">ghost</option>
                          <option value="danger">danger</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Size</label>
                        <select
                          value={btnSize}
                          onChange={(e) => setBtnSize(e.target.value as ButtonSize)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        >
                          <option value="sm">sm (36px)</option>
                          <option value="md">md (46px)</option>
                          <option value="lg">lg (52px)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-4 pt-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={btnDisabled}
                            onChange={(e) => setBtnDisabled(e.target.checked)}
                          />
                          <span>disabled</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={btnLoading}
                            onChange={(e) => setBtnLoading(e.target.checked)}
                          />
                          <span>isLoading</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {selectedStory === 'CreditCard' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Modelo / Cartão</label>
                        <select
                          value={cardVariant}
                          onChange={(e) => {
                            const v = e.target.value as CardVariant;
                            setCardVariant(v);
                            if (v === 'click-orange') setCardName('Itaú Click');
                            if (v === 'black') setCardName('Mastercard Black');
                            if (v === 'gold') setCardName('Itaú Gold');
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        >
                          <option value="click-orange">Itaú Click (Laranja)</option>
                          <option value="black">Mastercard Black</option>
                          <option value="gold">Itaú Gold</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Últimos 4 dígitos</label>
                        <input
                          type="text"
                          value={cardDigits}
                          maxLength={4}
                          onChange={(e) => setCardDigits(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Nome no Cartão</label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  )}

                  {selectedStory === 'ExpenseTrackerCard' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Categoria</label>
                        <input
                          type="text"
                          value={trackerCategory}
                          onChange={(e) => setTrackerCategory(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Gasto Atual (R$)</label>
                        <input
                          type="number"
                          value={trackerSpent}
                          onChange={(e) => setTrackerSpent(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Meta / Teto (R$)</label>
                        <input
                          type="number"
                          value={trackerLimit}
                          onChange={(e) => setTrackerLimit(parseFloat(e.target.value) || 1)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  )}

                  {selectedStory === 'ServiceTile' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Título</label>
                        <input
                          type="text"
                          value={tileLabel}
                          onChange={(e) => setTileLabel(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Subtítulo (opcional)</label>
                        <input
                          type="text"
                          value={tileSublabel}
                          onChange={(e) => setTileSublabel(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Badge (ex: Novo)</label>
                        <input
                          type="text"
                          value={tileBadge}
                          onChange={(e) => setTileBadge(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Fallback info when controls aren't applicable */}
                  {!['ItauButton', 'CreditCard', 'ExpenseTrackerCard', 'ServiceTile'].includes(selectedStory) && (
                    <div className="text-slate-400 py-2">
                      Este componente está usando props padrão do Design System Itaú. Você pode interagir diretamente com ele no Canvas acima.
                    </div>
                  )}
                </div>
              )}

              {activeBottomTab === 'docs' && (
                <div className="max-w-2xl text-slate-300 space-y-2">
                  <h4 className="font-bold text-white text-sm">Diretrizes de Uso no Banco Itaú</h4>
                  <p className="leading-relaxed">
                    Os componentes do Itaú Design System seguem padrões estritos de acessibilidade (WCAG AA), tipografia geométrica arredondada e foco claro no tom de cor característico <strong>Laranja Itaú (#EC7000)</strong> para ações afirmativas primárias e <strong>Azul Marinho (#002244)</strong> para estruturas e botões secundários com contorno.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 mt-2">
                    <li>Alvos de toque mínimos de 44x44px em todos os botões e linhas interativas.</li>
                    <li>Squircles suaves de 16px a 24px com sombras sutis de 1 nível de elevação.</li>
                    <li>Uso obrigatório de números tabulares (<code className="text-[#EC7000]">tabular-nums</code>) em moedas e faturas.</li>
                  </ul>
                </div>
              )}

              {activeBottomTab === 'code' && (
                <pre className="p-3 bg-slate-950 rounded-xl text-amber-200 font-mono text-xs overflow-x-auto">
                  {getGeneratedCode()}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
  );
};
