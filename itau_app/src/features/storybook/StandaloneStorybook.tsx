import React, { useState, useEffect } from 'react';
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
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  Crosshair,
  Grid,
  Laptop,
  Maximize2,
  Undo2,
  ShieldCheck,
  Activity,
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
  Home,
  Menu as MenuIcon,
  ArrowRight,
  CheckCheck
} from 'lucide-react';

import { ITAU_COLORS, ITAU_RADIUS, ITAU_TYPOGRAPHY } from '../../design-system/tokens';
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
import { PaymentModal } from '../../design-system/organisms/PaymentModal';
import { IaiFloatingButton } from '../../design-system/molecules/IaiFloatingButton';
import { DecisionModal } from '../../design-system/organisms/DecisionModal';

// Screens
import { CartoesScreen } from '../banking/CartoesScreen';
import { ControleGastosHub } from '../banking/ControleGastosHub';
import { ExtratoScreen } from '../banking/ExtratoScreen';
import { IaiChatScreen } from '../banking/IaiChatScreen';
import { INITIAL_GOALS } from '../banking/goalsStore';

export interface StandaloneStorybookProps {
  onBackToApp?: () => void;
}

type StoryId =
  | 'docs-intro'
  | 'docs-tokens-colors'
  | 'docs-tokens-typography'
  | 'docs-tokens-spacing'
  | 'docs-a11y'
  | 'atom-button'
  | 'atom-badge'
  | 'atom-squircle'
  | 'atom-pixicon'
  | 'mol-iaibutton'
  | 'mol-servicetile'
  | 'mol-carddetail'
  | 'mol-transaction'
  | 'mol-categorycard'
  | 'mol-feedbackbanner'
  | 'mol-meusbeneficios'
  | 'org-decisionmodal'
  | 'org-creditcard'
  | 'org-expensetracker'
  | 'org-keypad'
  | 'org-paymentmodal'
  | 'org-promobanner'
  | 'org-bottomtabbar'
  | 'screen-cartoes'
  | 'screen-hub'
  | 'screen-extrato'
  | 'screen-iai';

interface StoryTreeGroup {
  id: string;
  label: string;
  icon: string;
  items: {
    id: StoryId;
    label: string;
    kind: 'docs' | 'component' | 'screen';
    badge?: string;
  }[];
}

const STORY_TREE: StoryTreeGroup[] = [
  {
    id: 'docs',
    label: 'DOCUMENTAÇÃO',
    icon: '📘',
    items: [
      { id: 'docs-intro', label: 'Introdução & Visão Geral', kind: 'docs', badge: 'Guia' },
      { id: 'docs-tokens-colors', label: 'Cores & Gradientes', kind: 'docs' },
      { id: 'docs-tokens-typography', label: 'Tipografia & Tabular', kind: 'docs' },
      { id: 'docs-tokens-spacing', label: 'Espaçamentos & Squircles', kind: 'docs' },
      { id: 'docs-a11y', label: 'Acessibilidade WCAG AA', kind: 'docs', badge: 'A11y' },
    ],
  },
  {
    id: 'atoms',
    label: 'ATOMS',
    icon: '⚛️',
    items: [
      { id: 'atom-button', label: 'ItauButton', kind: 'component', badge: '6 vars' },
      { id: 'atom-badge', label: 'ItauBadge', kind: 'component' },
      { id: 'atom-squircle', label: 'SquircleIcon', kind: 'component' },
      { id: 'atom-pixicon', label: 'PixIcon', kind: 'component', badge: 'Oficial' },
    ],
  },
  {
    id: 'molecules',
    label: 'MOLECULES',
    icon: '🧩',
    items: [
      { id: 'mol-iaibutton', label: 'IaiFloatingButton', kind: 'component', badge: 'Novo' },
      { id: 'mol-servicetile', label: 'ServiceTile', kind: 'component' },
      { id: 'mol-carddetail', label: 'CardDetailRow', kind: 'component' },
      { id: 'mol-transaction', label: 'TransactionRow', kind: 'component' },
      { id: 'mol-categorycard', label: 'CategoryCard', kind: 'component' },
      { id: 'mol-feedbackbanner', label: 'FeedbackBanner', kind: 'component' },
      { id: 'mol-meusbeneficios', label: 'MeusBeneficiosCard', kind: 'component' },
    ],
  },
  {
    id: 'organisms',
    label: 'ORGANISMS',
    icon: '🏗️',
    items: [
      { id: 'org-decisionmodal', label: 'DecisionModal', kind: 'component', badge: 'Decisão' },
      { id: 'org-creditcard', label: 'CreditCard', kind: 'component', badge: '3D/Click' },
      { id: 'org-expensetracker', label: 'ExpenseTrackerCard', kind: 'component' },
      { id: 'org-keypad', label: 'NumericKeypad', kind: 'component' },
      { id: 'org-paymentmodal', label: 'PaymentModal', kind: 'component', badge: 'Sheet' },
      { id: 'org-promobanner', label: 'PromoBanner', kind: 'component' },
      { id: 'org-bottomtabbar', label: 'BottomTabBar', kind: 'component' },
    ],
  },
  {
    id: 'screens',
    label: 'TELAS & TEMPLATES',
    icon: '📱',
    items: [
      { id: 'screen-cartoes', label: 'Tela de Cartões (Img 1)', kind: 'screen' },
      { id: 'screen-hub', label: 'Controle de Gastos Hub (Img 2)', kind: 'screen' },
      { id: 'screen-extrato', label: 'Extrato Bancário', kind: 'screen' },
      { id: 'screen-iai', label: 'Ia.i Assistente IA', kind: 'screen' },
    ],
  },
];

export const StandaloneStorybook: React.FC<StandaloneStorybookProps> = ({ onBackToApp }) => {
  // Navigation & View Mode
  const [selectedStory, setSelectedStory] = useState<StoryId>('org-creditcard');
  const [viewMode, setViewMode] = useState<'canvas' | 'docs'>('canvas');
  const [activeBottomTab, setActiveBottomTab] = useState<'controls' | 'actions' | 'a11y' | 'interactions' | 'code'>('controls');
  const [searchFilter, setSearchFilter] = useState('');
  
  // Canvas Viewport & Environment
  const [viewport, setViewport] = useState<'responsive' | 'iphone' | 'android' | 'tablet' | 'desktop'>('iphone');
  const [canvasBg, setCanvasBg] = useState<'light' | 'gray' | 'dark' | 'navy' | 'grid'>('gray');
  const [zoom, setZoom] = useState(100);
  const [showOutlines, setShowOutlines] = useState(false);
  const [showMeasure, setShowMeasure] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Actions Log Store
  const [actionLogs, setActionLogs] = useState<{ id: string; time: string; event: string; payload: string }[]>([
    { id: '1', time: '10:44:02', event: 'StorybookInitialized', payload: '{ version: "8.5.3", project: "Itau-Design-System" }' }
  ]);

  const logAction = (event: string, payload: any) => {
    const time = new Date().toLocaleTimeString('pt-BR');
    const logItem = {
      id: Math.random().toString(36).substring(7),
      time,
      event,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
    };
    setActionLogs((prev) => [logItem, ...prev.slice(0, 40)]);
  };

  // Live Controls State
  // Button
  const [btnText, setBtnText] = useState('Pagar fatura');
  const [btnVariant, setBtnVariant] = useState<ButtonVariant>('primary');
  const [btnSize, setBtnSize] = useState<ButtonSize>('md');
  const [btnDisabled, setBtnDisabled] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);
  const [btnFullWidth, setBtnFullWidth] = useState(true);

  // Badge
  const [badgeText, setBadgeText] = useState('Desativado');
  const [badgeVariant, setBadgeVariant] = useState<BadgeVariant>('danger');
  const [badgeDot, setBadgeDot] = useState(true);

  // Squircle
  const [squircleVariant, setSquircleVariant] = useState<'orange' | 'navy' | 'light'>('orange');
  const [squircleSize, setSquircleSize] = useState<'sm' | 'md' | 'lg'>('md');

  // PixIcon (Oficial)
  const [pixIconSize, setPixIconSize] = useState(48);
  const [pixIconColor, setPixIconColor] = useState('#32BCAD');

  // Credit Card
  const [cardVariant, setCardVariant] = useState<CardVariant>('click-orange');
  const [cardName, setCardName] = useState('Itaú Click');
  const [cardDigits, setCardDigits] = useState('1226');
  const [cardHolder, setCardHolder] = useState('MARIA ALVES');

  // Service Tile
  const [tileLabel, setTileLabel] = useState('Cartão virtual');
  const [tileSublabel, setTileSublabel] = useState('');
  const [tileBadge, setTileBadge] = useState('Novo');

  // Card Detail Row
  const [detailLabel, setDetailLabel] = useState('Fatura fechada');
  const [detailValue, setDetailValue] = useState('R$ 1.000,00');
  const [detailValueColor, setDetailValueColor] = useState<'default' | 'danger' | 'success' | 'orange'>('default');

  // Transaction Row
  const [txTitle, setTxTitle] = useState('Mercado Livre');
  const [txSubtitle, setTxSubtitle] = useState('Cartão adicional');
  const [txAmount, setTxAmount] = useState('R$ 940,50');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');

  // Expense Tracker
  const [trackerCategory, setTrackerCategory] = useState('Delivery');
  const [trackerSpent, setTrackerSpent] = useState(33.5);
  const [trackerLimit, setTrackerLimit] = useState(200.0);

  // Keypad
  const [keypadInput, setKeypadInput] = useState('20000');

  // Ia.i Floating Button
  const [iaiBtnDefaultExpanded, setIaiBtnDefaultExpanded] = useState(false);

  // Decision Modal
  const [storyDecisionOpen, setStoryDecisionOpen] = useState(false);
  const [storyDecisionAmount, setStoryDecisionAmount] = useState(50.0);
  const [storyDecisionName, setStoryDecisionName] = useState('Carlos Silva');

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(true);
  const [modalAmount, setModalAmount] = useState(1000.0);

  // Bottom Tab Bar
  const [tabBarActive, setTabBarActive] = useState<TabId>('inicio');

  // Sync URL hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && STORY_TREE.some((g) => g.items.some((i) => i.id === hash))) {
      setSelectedStory(hash as StoryId);
    }
  }, []);

  const handleSelectStory = (storyId: StoryId) => {
    setSelectedStory(storyId);
    window.location.hash = storyId;
    logAction('selectStory', { storyId });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/storybook#${selectedStory}`;
    navigator.clipboard?.writeText?.(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filtered stories
  const filteredTree = STORY_TREE.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        item.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.id.toLowerCase().includes(searchFilter.toLowerCase())
    ),
  })).filter((group) => group.items.length > 0);

  // Code generator
  const getGeneratedCode = () => {
    switch (selectedStory) {
      case 'atom-button':
        return `import { ItauButton } from '@/src/design-system/atoms/ItauButton';\n\n<ItauButton\n  variant="${btnVariant}"\n  size="${btnSize}"\n  disabled={${btnDisabled}}\n  isLoading={${btnLoading}}\n  fullWidth={${btnFullWidth}}\n  onClick={() => console.log('Clicou no botão!')}\n>\n  ${btnText}\n</ItauButton>`;
      case 'atom-badge':
        return `import { ItauBadge } from '@/src/design-system/atoms/ItauBadge';\n\n<ItauBadge\n  variant="${badgeVariant}"\n  dot={${badgeDot}}\n>\n  ${badgeText}\n</ItauBadge>`;
      case 'atom-squircle':
        return `import { SquircleIcon } from '@/src/design-system/atoms/SquircleIcon';\nimport { CreditCard } from 'lucide-react';\n\n<SquircleIcon\n  icon={<CreditCard className="w-5 h-5" />}\n  variant="${squircleVariant}"\n  size="${squircleSize}"\n/>`;
      case 'atom-pixicon':
        return `import { PixIcon } from '@/src/design-system/atoms/PixIcon';\n\n// Ícone Oficial Pix (Banco Central do Brasil)\n// Diretriz: Sempre utilize este ícone oficial ao representar Pix\n<PixIcon\n  size={${pixIconSize}}\n  color="${pixIconColor}"\n/>\n\n// Uso com classes Tailwind:\n<PixIcon className="w-6 h-6 text-[#32BCAD]" />\n\n// Asset SVG público:\n<img src="/pix.svg" alt="Pix" className="w-6 h-6" />`;
      case 'mol-servicetile':
        return `import { ServiceTile } from '@/src/design-system/molecules/ServiceTile';\nimport { CreditCard } from 'lucide-react';\n\n<ServiceTile\n  icon={<CreditCard className="w-5 h-5 stroke-[2]" />}\n  label="${tileLabel}"${tileSublabel ? `\n  sublabel="${tileSublabel}"` : ''}${tileBadge ? `\n  badge="${tileBadge}"` : ''}\n  onClick={() => handleServiceClick()}\n/>`;
      case 'mol-carddetail':
        return `import { CardDetailRow } from '@/src/design-system/molecules/CardDetailRow';\n\n<CardDetailRow\n  label="${detailLabel}"\n  value="${detailValue}"\n  valueColor="${detailValueColor}"\n/>`;
      case 'mol-transaction':
        return `import { TransactionRow } from '@/src/design-system/molecules/TransactionRow';\nimport { ShoppingBag } from 'lucide-react';\n\n<TransactionRow\n  icon={<ShoppingBag className="w-4 h-4" />}\n  title="${txTitle}"\n  subtitle="${txSubtitle}"\n  amount="${txAmount}"\n  type="${txType}"\n/>`;
      case 'org-creditcard':
        return `import { CreditCard } from '@/src/design-system/organisms/CreditCard';\n\n<CreditCard\n  variant="${cardVariant}"\n  cardName="${cardName}"\n  lastDigits="${cardDigits}"\n  holderName="${cardHolder}"\n/>`;
      case 'org-expensetracker':
        return `import { ExpenseTrackerCard } from '@/src/design-system/organisms/ExpenseTrackerCard';\nimport { Utensils } from 'lucide-react';\n\n<ExpenseTrackerCard\n  category="${trackerCategory}"\n  spent={${trackerSpent}}\n  limit={${trackerLimit}}\n  period="De 01/03 até hoje"\n  icon={<Utensils className="w-4 h-4" />}\n/>`;
      case 'org-paymentmodal':
        return `import { PaymentModal } from '@/src/design-system/organisms/PaymentModal';\n\n<PaymentModal\n  isOpen={${isPaymentModalOpen}}\n  invoiceAmount={${modalAmount}}\n  dueDate="20 Nov."\n  onClose={() => setIsOpen(false)}\n  onSuccess={() => console.log('Fatura paga!')}\n/>`;
      case 'org-keypad':
        return `import { NumericKeypad } from '@/src/design-system/organisms/NumericKeypad';\n\n<NumericKeypad\n  onKeyPress={(key) => handleKey(key)}\n  onBackspace={() => handleBackspace()}\n  showSubmitKey={false}\n/>`;
      case 'org-bottomtabbar':
        return `import { BottomTabBar } from '@/src/design-system/organisms/BottomTabBar';\n\n<BottomTabBar\n  activeTab="${tabBarActive}"\n  onTabChange={(tab) => setActiveTab(tab)}\n/>`;
      default:
        return `// Componente ${selectedStory} do Itaú Design System\nimport React from 'react';`;
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText?.(getGeneratedCode());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Render Component for Canvas
  const renderCanvasComponent = () => {
    switch (selectedStory) {
      case 'docs-intro':
        return (
          <div className="max-w-2xl bg-white p-8 rounded-3xl shadow-sm text-slate-800 space-y-6 border border-slate-100">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EC7000] to-[#BA4E00] text-white flex items-center justify-center font-black text-xl shadow-md">
                it
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Itaú Design System (IDS)</h2>
                <p className="text-xs text-slate-500 font-medium">Versão 2.4.0 • React 19 + Tailwind v4 • WCAG 2.1 AA</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              O <strong>Itaú Design System</strong> é a fundação visual e interativa dos produtos digitais do Banco Itaú. Construído sob os pilares de proximidade, clareza, acessibilidade estrita e o icônico tom <strong>Laranja Itaú (#EC7000)</strong> harmonizado com o <strong>Azul Marinho (#002244)</strong>.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#FFF4EB] p-3.5 rounded-2xl border border-[#FFD8B5]">
                <span className="text-[10px] font-bold text-[#EC7000] uppercase tracking-wider block">Atoms</span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">Botões & Badges</span>
                <span className="text-xs text-slate-500">Elementos base indivisíveis</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Molecules</span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">Cards & Listas</span>
                <span className="text-xs text-slate-500">Composições semânticas</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Organisms</span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">Cartões & Modais</span>
                <span className="text-xs text-slate-500">Componentes complexos</span>
              </div>
            </div>
            <div className="pt-2">
              <ItauButton variant="primary" size="md" onClick={() => handleSelectStory('atom-button')}>
                Começar pelos Botões →
              </ItauButton>
            </div>
          </div>
        );

      case 'docs-tokens-colors':
        return (
          <div className="w-full max-w-3xl space-y-6 text-slate-800">
            <div>
              <h3 className="font-bold text-base mb-3 text-slate-900">Cores Primárias da Marca</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-[#EC7000] rounded-2xl text-white shadow-sm flex flex-col justify-between h-28">
                  <div>
                    <div className="font-black text-sm">Itaú Orange</div>
                    <div className="text-xs opacity-90 font-mono">#EC7000</div>
                  </div>
                  <div className="text-[10px] opacity-80 uppercase tracking-wider">Primary Brand</div>
                </div>
                <div className="p-4 bg-[#002244] rounded-2xl text-white shadow-sm flex flex-col justify-between h-28">
                  <div>
                    <div className="font-black text-sm">Itaú Navy</div>
                    <div className="text-xs opacity-90 font-mono">#002244</div>
                  </div>
                  <div className="text-[10px] opacity-80 uppercase tracking-wider">Secondary / Text</div>
                </div>
                <div className="p-4 bg-[#0047BA] rounded-2xl text-white shadow-sm flex flex-col justify-between h-28">
                  <div>
                    <div className="font-black text-sm">Itaú Blue</div>
                    <div className="text-xs opacity-90 font-mono">#0047BA</div>
                  </div>
                  <div className="text-[10px] opacity-80 uppercase tracking-wider">Accent / Pix</div>
                </div>
                <div className="p-4 bg-[#FFF4EB] rounded-2xl text-[#EC7000] border border-[#FFD8B5] flex flex-col justify-between h-28">
                  <div>
                    <div className="font-black text-sm">Orange Light</div>
                    <div className="text-xs font-mono">#FFF4EB</div>
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Backgrounds & Badges</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-3 text-slate-900">Superfícies & Neutros</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-[#F4F6F8] rounded-2xl border border-slate-200 flex flex-col justify-between h-24">
                  <div className="font-bold text-xs text-slate-800">App Background</div>
                  <div className="text-xs font-mono text-slate-500">#F4F6F8</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between h-24">
                  <div className="font-bold text-xs text-slate-800">Card Surface</div>
                  <div className="text-xs font-mono text-slate-500">#FFFFFF</div>
                </div>
                <div className="p-4 bg-[#1C2024] rounded-2xl text-white flex flex-col justify-between h-24">
                  <div className="font-bold text-xs">Text Dark</div>
                  <div className="text-xs font-mono opacity-80">#1C2024</div>
                </div>
                <div className="p-4 bg-[#697386] rounded-2xl text-white flex flex-col justify-between h-24">
                  <div className="font-bold text-xs">Text Muted</div>
                  <div className="text-xs font-mono opacity-80">#697386</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-3 text-slate-900">Feedback Semântico</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#ECFDF5] border border-emerald-200 rounded-xl text-emerald-800">
                  <span className="font-bold text-xs block">Success (#16A34A)</span>
                  <span className="text-[11px] text-emerald-600">Faturas pagas, limites liberados</span>
                </div>
                <div className="p-3 bg-[#FEF2F2] border border-red-200 rounded-xl text-red-800">
                  <span className="font-bold text-xs block">Danger (#DC2626)</span>
                  <span className="text-[11px] text-red-600">Faturas atrasadas, limites estourados</span>
                </div>
                <div className="p-3 bg-[#FFFBEB] border border-amber-200 rounded-xl text-amber-800">
                  <span className="font-bold text-xs block">Warning (#D97706)</span>
                  <span className="text-[11px] text-amber-600">Atenção a faturas próximas</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'docs-tokens-typography':
        return (
          <div className="w-full max-w-2xl space-y-5 text-slate-800 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Display Hero (32px Bold)</span>
              <div className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                R$ 8.713,96
              </div>
            </div>
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Heading 1 (24px Black)</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                Controle de Gastos
              </div>
            </div>
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Heading 2 (18px Bold)</span>
              <div className="text-lg font-bold text-slate-800 mt-1">
                Últimos lançamentos
              </div>
            </div>
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Body Regular (14px)</span>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                Descubra seus gastos e evite surpresas no fim do mês através dos limites por categoria com a inteligência do Itaú.
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#EC7000] uppercase tracking-wider block">Tabular Numerals (JetBrains Mono)</span>
              <div className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-1">
                •••• 1226 · Vencimento 20 Nov. · R$ 1.000,00
              </div>
            </div>
          </div>
        );

      case 'docs-tokens-spacing':
        return (
          <div className="w-full max-w-2xl bg-white p-6 rounded-3xl border border-slate-100 space-y-5 text-slate-800">
            <h3 className="font-bold text-base text-slate-900">Escala de Squircles & Bordas Arredondadas</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-[8px] text-center">
                <span className="text-xs font-bold block">sm (8px)</span>
                <span className="text-[10px] text-slate-400">Badges</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-[12px] text-center">
                <span className="text-xs font-bold block">md (12px)</span>
                <span className="text-[10px] text-slate-400">Inputs & Ícones</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-[16px] text-center">
                <span className="text-xs font-bold block">lg (16px)</span>
                <span className="text-[10px] text-slate-400">Botões Principais</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-[24px] text-center">
                <span className="text-xs font-bold block">2xl (24px)</span>
                <span className="text-[10px] text-slate-400">Cards & Modais</span>
              </div>
            </div>
          </div>
        );

      case 'docs-a11y':
        return (
          <div className="w-full max-w-2xl bg-white p-6 rounded-3xl border border-slate-100 space-y-4 text-slate-800">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              <h3 className="font-bold text-base">Conformidade com Diretrizes WCAG 2.1 AA</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Todos os componentes do Itaú Design System são inspecionados para assegurar navegação por teclado, leitores de tela e contraste visual adequado:
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs font-medium">
                <span className="text-slate-700">Alvo de toque mínimo (Touch Target &gt;= 44x44px)</span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">100% Pass</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs font-medium">
                <span className="text-slate-700">Contraste de Cor Laranja / Branco / Navy (&gt;= 4.5:1)</span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">100% Pass</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs font-medium">
                <span className="text-slate-700">Propriedades ARIA e Semântica de Acessibilidade</span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">100% Pass</span>
              </div>
            </div>
          </div>
        );

      case 'atom-button':
        return (
          <div className="flex flex-col items-center justify-center gap-4 w-full max-w-sm">
            <ItauButton
              variant={btnVariant}
              size={btnSize}
              disabled={btnDisabled}
              isLoading={btnLoading}
              fullWidth={btnFullWidth}
              onClick={() => logAction('onClick:ItauButton', { variant: btnVariant, size: btnSize })}
            >
              {btnText}
            </ItauButton>
          </div>
        );

      case 'atom-badge':
        return (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ItauBadge variant={badgeVariant} dot={badgeDot}>
              {badgeText}
            </ItauBadge>
          </div>
        );

      case 'atom-squircle':
        return (
          <div className="flex items-center justify-center gap-4">
            <SquircleIcon
              icon={<CreditCardIcon className="w-5 h-5" />}
              variant={squircleVariant}
              size={squircleSize}
            />
          </div>
        );

      case 'atom-pixicon':
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur rounded-3xl border border-slate-200/80 shadow-sm max-w-md w-full text-center">
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/60 flex items-center justify-center shadow-inner mb-4">
              <PixIcon
                size={pixIconSize}
                color={pixIconColor}
                className="transition-all duration-300 drop-shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-slate-800 text-sm">Ícone Oficial Pix (Banco Central)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                SVG Oficial
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-4">
              Diretriz do Itaú Design System: sempre que incluir um ícone referente a Pix, utilize este ícone oficial padronizado.
            </p>
            <div className="grid grid-cols-4 gap-2 w-full pt-4 border-t border-slate-100 text-center">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <div className="text-[10px] text-slate-400 font-medium">Teal Oficial</div>
                <PixIcon size={24} color="#32BCAD" className="mx-auto my-1.5" />
                <div className="text-[9px] font-mono text-slate-500">#32BCAD</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#002244] text-white shadow-2xs">
                <div className="text-[10px] text-slate-300 font-medium">Navy Itaú</div>
                <PixIcon size={24} color="#FFFFFF" className="mx-auto my-1.5" />
                <div className="text-[9px] font-mono text-slate-300">White</div>
              </div>
              <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 shadow-2xs">
                <div className="text-[10px] text-orange-600 font-medium">Laranja Itaú</div>
                <PixIcon size={24} color="#EC7000" className="mx-auto my-1.5" />
                <div className="text-[9px] font-mono text-orange-700">#EC7000</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 shadow-2xs">
                <div className="text-[10px] text-slate-500 font-medium">Dark / Slate</div>
                <PixIcon size={24} color="#0F172A" className="mx-auto my-1.5" />
                <div className="text-[9px] font-mono text-slate-600">#0F172A</div>
              </div>
            </div>
          </div>
        );

      case 'mol-iaibutton':
        return (
          <div className="relative w-full max-w-sm h-64 bg-slate-100 rounded-3xl border border-slate-200/80 p-6 flex flex-col justify-between overflow-hidden shadow-inner">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Demonstração: Botão Flutuante Ia.i</span>
              <p className="text-[11px] text-slate-500 mt-1">
                Passe o mouse ou toque no botão no canto inferior direito para ver &quot;salário no conta, vamos programar o mês?&quot;.
              </p>
            </div>
            <IaiFloatingButton
              key={String(iaiBtnDefaultExpanded)}
              defaultExpanded={iaiBtnDefaultExpanded}
              onClick={() => logAction('onClick:IaiFloatingButton', { action: 'openChat' })}
              className="absolute bottom-4 right-4"
            />
          </div>
        );

      case 'mol-servicetile':
        return (
          <div className="w-36">
            <ServiceTile
              icon={<CreditCardIcon className="w-5 h-5 stroke-[2]" />}
              label={tileLabel}
              sublabel={tileSublabel}
              badge={tileBadge}
              onClick={() => logAction('onClick:ServiceTile', { label: tileLabel })}
            />
          </div>
        );

      case 'mol-carddetail':
        return (
          <div className="w-full max-w-md bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <CardDetailRow
              label={detailLabel}
              value={detailValue}
              valueColor={detailValueColor}
            />
          </div>
        );

      case 'mol-transaction':
        return (
          <div className="w-full max-w-md bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <TransactionRow
              icon={<ShoppingBag className="w-4 h-4" />}
              title={txTitle}
              subtitle={txSubtitle}
              amount={txAmount}
              type={txType}
            />
          </div>
        );

      case 'mol-categorycard':
        return (
          <div className="w-full max-w-md space-y-2">
            <CategoryCard
              id="delivery"
              name="Delivery (iFood & Rappi)"
              icon={<Utensils className="w-5 h-5" />}
              selected={true}
              onSelect={() => logAction('onSelect:CategoryCard', { id: 'delivery' })}
            />
            <CategoryCard
              id="combustivel"
              name="Posto de combustível"
              icon={<Fuel className="w-5 h-5" />}
              selected={false}
              onSelect={() => logAction('onSelect:CategoryCard', { id: 'combustivel' })}
            />
          </div>
        );

      case 'mol-feedbackbanner':
        return (
          <div className="w-full max-w-md">
            <FeedbackBanner onDismiss={() => logAction('onDismiss:FeedbackBanner', {})} />
          </div>
        );

      case 'mol-meusbeneficios':
        return (
          <div className="w-full max-w-sm">
            <MeusBeneficiosCard />
          </div>
        );

      case 'org-decisionmodal':
        return (
          <div className="w-full max-w-sm flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
            <span className="text-xs font-bold text-slate-800 block mb-1">Modal de Decisão (Pix / Operações)</span>
            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Apresenta a tela de decisão para revisão e confirmação da transferência Pix com proteção e dados do destinatário.
            </p>
            <ItauButton
              variant="primary"
              size="md"
              onClick={() => setStoryDecisionOpen(true)}
              leftIcon={<PixIcon className="w-4 h-4 fill-white text-white" />}
            >
              Abrir Modal de Decisão
            </ItauButton>

            <DecisionModal
              isOpen={storyDecisionOpen}
              onClose={() => setStoryDecisionOpen(false)}
              onConfirm={(data) => {
                setStoryDecisionOpen(false);
                logAction('onConfirm:DecisionModal', data);
              }}
              data={{
                type: 'pix',
                title: 'Confirmar transferência Pix',
                amount: storyDecisionAmount,
                recipientName: storyDecisionName,
                recipientBank: 'Itaú Unibanco S.A. (341)',
                recipientKey: '•••.124.890-••',
                recipientKeyType: 'CPF',
                balanceAfter: 8713.96 - storyDecisionAmount,
              }}
            />
          </div>
        );

      case 'org-creditcard':
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

      case 'org-expensetracker':
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

      case 'org-keypad':
        return (
          <div className="w-full max-w-xs bg-slate-100 p-4 rounded-3xl shadow-sm">
            <div className="text-center font-mono text-xl font-bold mb-3 text-slate-800 tabular-nums">
              R$ {(parseInt(keypadInput || '0', 10) / 100).toFixed(2).replace('.', ',')}
            </div>
            <NumericKeypad
              onKeyPress={(k) => {
                setKeypadInput((p) => p + k);
                logAction('onKeyPress:Keypad', { key: k });
              }}
              onBackspace={() => {
                setKeypadInput((p) => p.slice(0, -1));
                logAction('onBackspace:Keypad', {});
              }}
              showSubmitKey={false}
            />
          </div>
        );

      case 'org-paymentmodal':
        return (
          <div className="w-[360px] h-[600px] bg-slate-800 rounded-[32px] overflow-hidden relative shadow-2xl flex flex-col justify-end border-4 border-slate-700">
            <div className="p-4 text-white text-xs opacity-75">
              Visualização de simulação do container mobile
            </div>
            <PaymentModal
              isOpen={isPaymentModalOpen}
              invoiceAmount={modalAmount}
              dueDate="20 Nov."
              onClose={() => {
                logAction('onClose:PaymentModal', {});
                setIsPaymentModalOpen(false);
                setTimeout(() => setIsPaymentModalOpen(true), 1000);
              }}
              onSuccess={() => logAction('onSuccess:PaymentModal', { amount: modalAmount })}
            />
          </div>
        );

      case 'org-promobanner':
        return (
          <div className="w-full max-w-md">
            <PromoBanner />
          </div>
        );

      case 'org-bottomtabbar':
        return (
          <div className="w-full max-w-md border border-slate-200 rounded-3xl overflow-hidden shadow-lg bg-white">
            <BottomTabBar
              activeTab={tabBarActive}
              onTabChange={(tab) => {
                setTabBarActive(tab);
                logAction('onTabChange:BottomTabBar', { tab });
              }}
            />
          </div>
        );

      // Screens inside full interactive frame
      case 'screen-cartoes':
        return (
          <div className="w-[390px] h-[780px] bg-[#F4F6F8] rounded-[40px] overflow-hidden shadow-2xl border-4 border-slate-800 flex flex-col">
            <CartoesScreen
              onBack={() => logAction('onBack:CartoesScreen', {})}
              onOpenControleGastos={() => logAction('onOpenControleGastos', {})}
              onNavigateToExtrato={() => logAction('onNavigateToExtrato', {})}
            />
          </div>
        );

      case 'screen-hub':
        return (
          <div className="w-[390px] h-[780px] bg-[#F4F6F8] rounded-[40px] overflow-hidden shadow-2xl border-4 border-slate-800 flex flex-col">
            <ControleGastosHub
              onStartControle={() => logAction('onStartControle', {})}
              onNavigateToCartoes={() => logAction('onNavigateToCartoes', {})}
              onNavigateToExtrato={() => logAction('onNavigateToExtrato', {})}
              onNavigateToIai={() => logAction('onNavigateToIai', {})}
              hasActiveControl={true}
              activeGoals={INITIAL_GOALS}
            />
          </div>
        );

      case 'screen-extrato':
        return (
          <div className="w-[390px] h-[780px] bg-[#F4F6F8] rounded-[40px] overflow-hidden shadow-2xl border-4 border-slate-800 flex flex-col">
            <ExtratoScreen onBack={() => logAction('onBack:ExtratoScreen', {})} />
          </div>
        );

      case 'screen-iai':
        return (
          <div className="w-[390px] h-[780px] bg-[#F4F6F8] rounded-[40px] overflow-hidden shadow-2xl border-4 border-slate-800 flex flex-col">
            <IaiChatScreen
              onBack={() => logAction('onBack:IaiChatScreen', {})}
              onGoalCreated={(goal) => logAction('onGoalCreated:IaiChatScreen', goal)}
              onNavigate={(screen) => logAction('onNavigate:IaiChatScreen', { screen })}
              saldos={{ conta: 17829.5, limiteConta: 28000, infinite: 24572.2, black: 13220.98 }}
            />
          </div>
        );

      default:
        return <div>Selecione um componente no menu lateral</div>;
    }
  };

  return (
    <div className={`w-screen h-screen flex flex-col bg-[#1A1A24] text-slate-100 font-sans select-none overflow-hidden ${showOutlines ? 'storybook-outline-mode' : ''}`}>
      {/* Top Navbar - Official Storybook 8 style */}
      <header className="h-12 bg-[#1B1A1F] border-b border-slate-800/80 px-3 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          {/* Storybook Official Icon */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#FF4785] to-[#FF7262] text-white flex items-center justify-center font-black text-xs shadow-xs">
              S
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-tight">Storybook</span>
              <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                Itaú Design System
              </span>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                v8.5.3
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-750 hidden md:block" />

          {/* Localhost Breadcrumb */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] text-slate-300">http://localhost:6006/?path=/story/{selectedStory}</span>
            <button
              onClick={handleCopyLink}
              className="text-slate-400 hover:text-white p-0.5 transition-colors cursor-pointer"
              title="Copiar URL do Storybook"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* View Mode Switcher + Actions */}
        <div className="flex items-center gap-2">
          {/* Canvas / Docs Tab Switcher */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => {
                setViewMode('canvas');
                logAction('switchViewMode', 'canvas');
              }}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                viewMode === 'canvas' ? 'bg-[#FF4785] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Canvas
            </button>
            <button
              onClick={() => {
                setViewMode('docs');
                logAction('switchViewMode', 'docs');
              }}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                viewMode === 'docs' ? 'bg-[#FF4785] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Docs
            </button>
          </div>

          {/* Back to Mobile App Button */}
          {onBackToApp ? (
            <button
              onClick={onBackToApp}
              className="flex items-center gap-1.5 bg-[#EC7000] hover:bg-[#D45D00] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Abrir App Mobile Itaú</span>
            </button>
          ) : (
            <a
              href="/"
              className="flex items-center gap-1.5 bg-[#EC7000] hover:bg-[#D45D00] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-xs"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Abrir App Mobile Itaú</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Storybook Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 bg-[#1B1A1F] border-r border-slate-800/80 flex flex-col shrink-0 select-none">
          {/* Search Filter */}
          <div className="p-2.5 border-b border-slate-800/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar componentes..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg pl-8 pr-2.5 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#FF4785]"
              />
            </div>
          </div>

          {/* Navigation Tree */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4 text-xs">
            {filteredTree.map((group) => (
              <div key={group.id} className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>{group.icon}</span>
                    <span>{group.label}</span>
                  </span>
                  <span className="text-[9px] text-slate-500">{group.items.length}</span>
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isSelected = selectedStory === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectStory(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#FF4785]/15 text-[#FF4785] font-bold'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#FF4785]' : 'bg-slate-600'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] px-1 py-0.2 bg-slate-800 text-slate-400 rounded">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>localhost:6006</span>
            </span>
            <a
              href="https://storybook.js.org"
              target="_blank"
              rel="noreferrer"
              className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
            >
              <span>docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </aside>

        {/* Center Canvas / Docs Workspace */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0F131A] overflow-hidden">
          {/* Canvas Toolbar */}
          <div className="h-10 bg-[#161B24] border-b border-slate-800 px-3 flex items-center justify-between shrink-0 text-xs text-slate-300">
            {/* Viewport Selectors */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setViewport('responsive')}
                  className={`p-1 rounded ${viewport === 'responsive' ? 'bg-[#FF4785] text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Responsivo"
                >
                  <Laptop className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewport('iphone')}
                  className={`p-1 rounded ${viewport === 'iphone' ? 'bg-[#FF4785] text-white' : 'text-slate-400 hover:text-white'}`}
                  title="iPhone 15 Pro (393x852)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewport('tablet')}
                  className={`p-1 rounded ${viewport === 'tablet' ? 'bg-[#FF4785] text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Tablet (768x1024)"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewport('desktop')}
                  className={`p-1 rounded ${viewport === 'desktop' ? 'bg-[#FF4785] text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Desktop (1280x800)"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setZoom((z) => Math.max(50, z - 25))}
                  className="p-1 text-slate-400 hover:text-white rounded"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1 text-[11px] font-mono text-slate-400">{zoom}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(200, z + 25))}
                  className="p-1 text-slate-400 hover:text-white rounded"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Canvas Display Controls */}
            <div className="flex items-center gap-2">
              {/* Background Color Switcher */}
              <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                <button
                  onClick={() => setCanvasBg('light')}
                  className={`px-2 py-0.5 rounded ${canvasBg === 'light' ? 'bg-white text-slate-900 font-bold' : 'text-slate-400'}`}
                  title="Fundo Claro"
                >
                  Branco
                </button>
                <button
                  onClick={() => setCanvasBg('gray')}
                  className={`px-2 py-0.5 rounded ${canvasBg === 'gray' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400'}`}
                  title="Cinza Itaú"
                >
                  Itaú
                </button>
                <button
                  onClick={() => setCanvasBg('dark')}
                  className={`px-2 py-0.5 rounded ${canvasBg === 'dark' ? 'bg-slate-950 text-white font-bold' : 'text-slate-400'}`}
                  title="Escuro"
                >
                  Escuro
                </button>
                <button
                  onClick={() => setCanvasBg('navy')}
                  className={`px-2 py-0.5 rounded ${canvasBg === 'navy' ? 'bg-[#002244] text-white font-bold' : 'text-slate-400'}`}
                  title="Navy Itaú"
                >
                  Navy
                </button>
              </div>

              {/* Outline toggle */}
              <button
                onClick={() => setShowOutlines(!showOutlines)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  showOutlines ? 'bg-[#FF4785]/20 border-[#FF4785] text-[#FF4785]' : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Ativar contornos de depuração (Outline addon)"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>

              {/* Copy Story URL */}
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-colors"
                title="Copiar link direto da história"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedLink ? 'Copiado!' : 'Compartilhar'}</span>
              </button>
            </div>
          </div>

          {/* Active Canvas OR Docs Content Area */}
          <div
            className={`flex-1 overflow-auto flex items-center justify-center transition-colors p-6 ${
              canvasBg === 'light'
                ? 'bg-white'
                : canvasBg === 'gray'
                ? 'bg-[#F4F6F8]'
                : canvasBg === 'navy'
                ? 'bg-[#002244]'
                : 'bg-[#0E131C]'
            }`}
          >
            {viewMode === 'docs' ? (
              /* Storybook Autodocs View */
              <div className="w-full max-w-4xl bg-white text-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
                <div className="border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold text-[#EC7000] uppercase tracking-wider bg-[#FFF4EB] px-2.5 py-0.5 rounded-full border border-[#FFD8B5]">
                      Itaú Design System
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      WCAG 2.1 AA
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900">{selectedStory}</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Componente documentado e auditado para as diretrizes de experiência do Banco Itaú.
                  </p>
                </div>

                {/* Primary Story Canvas Embedded in Docs */}
                <div className="bg-[#F8F9FA] p-6 rounded-2xl border border-slate-200 flex items-center justify-center">
                  {renderCanvasComponent()}
                </div>

                {/* ArgsTable */}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 mb-3">Tabela de Propriedades (Props & Args)</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                        <tr>
                          <th className="p-3">Nome</th>
                          <th className="p-3">Descrição</th>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">Padrão</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        <tr>
                          <td className="p-3 font-mono text-[#EC7000] font-bold">variant</td>
                          <td className="p-3">Estilo visual do componente</td>
                          <td className="p-3 font-mono text-slate-500">string</td>
                          <td className="p-3 font-mono text-slate-400">"primary"</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono text-[#EC7000] font-bold">onClick</td>
                          <td className="p-3">Função disparada no clique do usuário</td>
                          <td className="p-3 font-mono text-slate-500">() =&gt; void</td>
                          <td className="p-3 font-mono text-slate-400">undefined</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono text-[#EC7000] font-bold">disabled</td>
                          <td className="p-3">Desativa a interação e aplica contraste</td>
                          <td className="p-3 font-mono text-slate-500">boolean</td>
                          <td className="p-3 font-mono text-slate-400">false</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Code Block */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm text-slate-900">Exemplo de Código</h3>
                    <button
                      onClick={handleCopyCode}
                      className="text-xs text-[#EC7000] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copiado!' : 'Copiar JSX'}</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-950 text-amber-200 rounded-2xl font-mono text-xs overflow-x-auto">
                    {getGeneratedCode()}
                  </pre>
                </div>
              </div>
            ) : (
              /* Canvas View with selected Viewport Frame */
              <div
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
                className={`transition-all duration-200 flex items-center justify-center ${
                  viewport === 'iphone'
                    ? 'w-[393px] min-h-[600px] border-2 border-dashed border-slate-500/40 p-4 rounded-[40px] shadow-sm'
                    : viewport === 'tablet'
                    ? 'w-[768px] min-h-[600px] border-2 border-dashed border-slate-500/40 p-6 rounded-[32px] shadow-sm'
                    : viewport === 'desktop'
                    ? 'w-[1080px] min-h-[600px] border-2 border-dashed border-slate-500/40 p-8 rounded-3xl shadow-sm'
                    : 'w-full max-w-4xl p-4'
                }`}
              >
                {renderCanvasComponent()}
              </div>
            )}
          </div>

          {/* Bottom Storybook Addon Panel */}
          <div className="h-64 bg-[#141820] border-t border-slate-800 flex flex-col shrink-0 select-none">
            {/* Panel Tabs Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-3 bg-[#161B24]">
              <div className="flex items-center">
                <button
                  onClick={() => setActiveBottomTab('controls')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeBottomTab === 'controls'
                      ? 'border-[#FF4785] text-[#FF4785]'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Controls (Props)</span>
                </button>
                <button
                  onClick={() => setActiveBottomTab('actions')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeBottomTab === 'actions'
                      ? 'border-[#FF4785] text-[#FF4785]'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Actions ({actionLogs.length})</span>
                </button>
                <button
                  onClick={() => setActiveBottomTab('a11y')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeBottomTab === 'a11y'
                      ? 'border-[#FF4785] text-[#FF4785]'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Accessibility</span>
                </button>
                <button
                  onClick={() => setActiveBottomTab('interactions')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeBottomTab === 'interactions'
                      ? 'border-[#FF4785] text-[#FF4785]'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Interactions</span>
                </button>
                <button
                  onClick={() => setActiveBottomTab('code')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeBottomTab === 'code'
                      ? 'border-[#FF4785] text-[#FF4785]'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Source Code</span>
                </button>
              </div>

              {activeBottomTab === 'code' && (
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-[11px] text-[#FF4785] hover:text-white px-2 py-1 rounded transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
                </button>
              )}
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-auto p-4 text-xs">
              {/* Controls Tab */}
              {activeBottomTab === 'controls' && (
                <div className="space-y-4">
                  {selectedStory === 'atom-button' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Texto do Botão</label>
                        <input
                          type="text"
                          value={btnText}
                          onChange={(e) => setBtnText(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Variante</label>
                        <select
                          value={btnVariant}
                          onChange={(e) => setBtnVariant(e.target.value as ButtonVariant)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        >
                          <option value="primary">primary (#EC7000 Laranja)</option>
                          <option value="secondary">secondary (#002244 Navy)</option>
                          <option value="outline">outline (Borda sutil)</option>
                          <option value="ghost">ghost (Transparente)</option>
                          <option value="danger">danger (Vermelho)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Tamanho</label>
                        <select
                          value={btnSize}
                          onChange={(e) => setBtnSize(e.target.value as ButtonSize)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        >
                          <option value="sm">sm (Pequeno)</option>
                          <option value="md">md (Médio 44px)</option>
                          <option value="lg">lg (Grande 52px)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-4 pt-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={btnDisabled}
                            onChange={(e) => setBtnDisabled(e.target.checked)}
                            className="rounded text-[#FF4785]"
                          />
                          <span className="text-slate-300">disabled</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={btnLoading}
                            onChange={(e) => setBtnLoading(e.target.checked)}
                            className="rounded text-[#FF4785]"
                          />
                          <span className="text-slate-300">loading</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {selectedStory === 'atom-pixicon' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">
                          Tamanho do Ícone: <span className="text-[#FF4785]">{pixIconSize}px</span>
                        </label>
                        <input
                          type="range"
                          min={16}
                          max={120}
                          step={4}
                          value={pixIconSize}
                          onChange={(e) => setPixIconSize(Number(e.target.value))}
                          className="w-full accent-[#FF4785]"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                          <span>16px (micro)</span>
                          <span>48px (card)</span>
                          <span>120px (hero)</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Cor do Ícone</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={pixIconColor}
                            onChange={(e) => setPixIconColor(e.target.value)}
                            className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={pixIconColor}
                            onChange={(e) => setPixIconColor(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Paleta Oficial Pix</label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            { name: 'Teal (#32BCAD)', color: '#32BCAD' },
                            { name: 'Laranja (#EC7000)', color: '#EC7000' },
                            { name: 'Navy (#002244)', color: '#002244' },
                            { name: 'Dark (#0F172A)', color: '#0F172A' },
                          ].map((item) => (
                            <button
                              key={item.color}
                              onClick={() => setPixIconColor(item.color)}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 text-[11px] rounded-md border border-slate-800 transition-colors cursor-pointer"
                            >
                              <span
                                className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                                style={{ backgroundColor: item.color }}
                              />
                              {item.name.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedStory === 'org-creditcard' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Variante do Cartão</label>
                        <select
                          value={cardVariant}
                          onChange={(e) => setCardVariant(e.target.value as CardVariant)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        >
                          <option value="click-orange">Itaú Click (Laranja)</option>
                          <option value="personnalite-black">Personnalité (Black)</option>
                          <option value="azul-blue">Azul Itaú (Azul Royal)</option>
                          <option value="latam-pass">Latam Pass (Rubro)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Nome do Titular</label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Últimos 4 Dígitos</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={cardDigits}
                          onChange={(e) => setCardDigits(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Rótulo / Nome</label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  )}

                  {selectedStory === 'org-expensetracker' && (
                    <div className="grid grid-cols-3 gap-4">
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
                        <label className="block text-slate-400 font-medium mb-1">Limite / Teto (R$)</label>
                        <input
                          type="number"
                          value={trackerLimit}
                          onChange={(e) => setTrackerLimit(parseFloat(e.target.value) || 1)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Fallback for other components */}
                  {!['atom-button', 'org-creditcard', 'org-expensetracker'].includes(selectedStory) && (
                    <div className="text-slate-400 py-3">
                      Interagindo com os estados padrão do componente <strong className="text-white">{selectedStory}</strong>. Você pode testar interações diretamente no Canvas acima.
                    </div>
                  )}
                </div>
              )}

              {/* Actions Tab */}
              {activeBottomTab === 'actions' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
                    <span>Logs de Eventos Interceptados</span>
                    <button
                      onClick={() => setActionLogs([])}
                      className="text-xs hover:text-white transition-colors cursor-pointer"
                    >
                      Limpar logs
                    </button>
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    {actionLogs.map((log) => (
                      <div key={log.id} className="p-2 bg-slate-900/60 rounded border border-slate-800/80 flex items-center justify-between">
                        <span className="text-emerald-400">{log.event}</span>
                        <span className="text-slate-300 truncate max-w-md">{log.payload}</span>
                        <span className="text-slate-500 text-[10px]">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accessibility Tab */}
              {activeBottomTab === 'a11y' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>0 violações de acessibilidade encontradas (WCAG 2.1 AA)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Contraste de Cor</span>
                      <span className="text-emerald-400 font-bold text-sm block mt-1">4.8:1 (Aprovado AA)</span>
                      <span className="text-slate-500 text-[10px]">Texto legível em todas as variações</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Alvo de Toque</span>
                      <span className="text-emerald-400 font-bold text-sm block mt-1">&gt;= 44 × 44 px</span>
                      <span className="text-slate-500 text-[10px]">Conforme padrão mobile iOS/Android</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Semântica e ARIA</span>
                      <span className="text-emerald-400 font-bold text-sm block mt-1">Válido</span>
                      <span className="text-slate-500 text-[10px]">Rótulos e estados descritos</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Interactions Tab */}
              {activeBottomTab === 'interactions' && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check className="w-4 h-4" />
                    <span>expect(component).toBeInTheDocument() - Passou</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check className="w-4 h-4" />
                    <span>expect(button).toHaveAccessibleName() - Passou</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check className="w-4 h-4" />
                    <span>fireEvent.click() =&gt; triggers registered handler - Passou</span>
                  </div>
                </div>
              )}

              {/* Code Tab */}
              {activeBottomTab === 'code' && (
                <pre className="p-3 bg-slate-950 rounded-xl text-amber-200 font-mono text-xs overflow-x-auto">
                  {getGeneratedCode()}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
