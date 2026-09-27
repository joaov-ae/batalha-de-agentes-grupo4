import React, { useState } from 'react';
import { Wifi, Battery, Signal, Smartphone, LayoutGrid, Layers, RefreshCw } from 'lucide-react';
import { CartoesScreen } from './CartoesScreen';
import { ControleGastosHub } from './ControleGastosHub';
import { ControleGastosWizard } from './ControleGastosWizard';
import { TarjetasRegionalScreen } from './TarjetasRegionalScreen';
import { BottomTabBar, TabId } from '../../design-system/organisms/BottomTabBar';

export type ActiveScreen = 'cartoes' | 'hub' | 'wizard' | 'regional';

export interface PhoneMockupProps {
  initialScreen?: ActiveScreen;
  onInspectComponent?: (componentName: string) => void;
  className?: string;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  initialScreen = 'cartoes',
  onInspectComponent,
  className = '',
}) => {
  const [screen, setScreen] = useState<ActiveScreen>(initialScreen);
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [hasActiveControl, setHasActiveControl] = useState(false);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'inicio') setScreen('hub');
    if (tab === 'produtos') setScreen('cartoes');
  };

  const renderScreenContent = (targetScreen: ActiveScreen) => {
    switch (targetScreen) {
      case 'cartoes':
        return (
          <CartoesScreen
            onBack={() => setScreen('hub')}
            onOpenControleGastos={() => setScreen('wizard')}
          />
        );
      case 'hub':
        return (
          <ControleGastosHub
            onStartControle={() => setScreen('wizard')}
            onNavigateToCartoes={() => setScreen('cartoes')}
            hasActiveControl={hasActiveControl}
          />
        );
      case 'wizard':
        return (
          <ControleGastosWizard
            onClose={() => {
              setHasActiveControl(true);
              setScreen('hub');
            }}
          />
        );
      case 'regional':
        return <TarjetasRegionalScreen onBack={() => setScreen('cartoes')} />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Top Controls Bar */}
      <div className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 mb-6 bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-white">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#EC7000] animate-pulse" />
          <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
            Navegar Telas:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => {
                setViewMode('single');
                setScreen('cartoes');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'single' && screen === 'cartoes'
                  ? 'bg-[#EC7000] text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              1. Cartões (Imagem 1)
            </button>
            <button
              onClick={() => {
                setViewMode('single');
                setScreen('hub');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'single' && screen === 'hub'
                  ? 'bg-[#EC7000] text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              2. Controle de Gastos Hub (Imagem 2)
            </button>
            <button
              onClick={() => {
                setViewMode('single');
                setScreen('wizard');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'single' && screen === 'wizard'
                  ? 'bg-[#EC7000] text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              3. Wizard Teclado & Metas
            </button>
            <button
              onClick={() => {
                setViewMode('single');
                setScreen('regional');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'single' && screen === 'regional'
                  ? 'bg-[#EC7000] text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              4. Tarjetas & Cuentas (Imagens 3 e 4)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'single' ? 'grid' : 'single')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              viewMode === 'grid'
                ? 'bg-[#EC7000] border-[#EC7000] text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{viewMode === 'grid' ? 'Ver Foco Único' : 'Comparar 4 Telas Lado a Lado'}</span>
          </button>
        </div>
      </div>

      {/* ================= VIEW 1: SINGLE INTERACTIVE PHONE ================= */}
      {viewMode === 'single' && (
        <div className="relative w-full max-w-[390px] aspect-[9/19.5] max-h-[844px] h-[820px] rounded-[52px] p-3.5 bg-gradient-to-b from-[#2B303A] to-[#12151B] shadow-[0_25px_70px_rgba(0,0,0,0.6)] border-4 border-[#3D4452] flex flex-col overflow-hidden">
          {/* Outer edge buttons simulation */}
          <div className="absolute -left-[7px] top-28 w-[3px] h-10 bg-slate-600 rounded-l" />
          <div className="absolute -left-[7px] top-42 w-[3px] h-12 bg-slate-600 rounded-l" />
          <div className="absolute -left-[7px] top-58 w-[3px] h-12 bg-slate-600 rounded-l" />
          <div className="absolute -right-[7px] top-36 w-[3px] h-16 bg-slate-600 rounded-r" />

          {/* Screen Inner Glass */}
          <div className="relative w-full h-full rounded-[42px] bg-[#F4F6F8] overflow-hidden flex flex-col shadow-inner">
            {/* iOS Status Bar */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md h-11 px-7 pt-2 flex items-center justify-between text-slate-900 text-xs font-semibold shrink-0">
              <span className="tracking-tight text-[13px] font-bold">9:41</span>

              {/* Dynamic Island Pill */}
              <div className="absolute left-1/2 -translate-x-1/2 top-2.5 w-24 h-6 bg-black rounded-full flex items-center justify-between px-2.5 shadow-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700" />
                <div className="w-2 h-2 rounded-full bg-[#EC7000]/80" />
              </div>

              <div className="flex items-center gap-1.5">
                <Signal className="w-3.5 h-3.5 stroke-[2.5]" />
                <Wifi className="w-3.5 h-3.5 stroke-[2.5]" />
                <Battery className="w-5 h-3.5 stroke-[2.5]" />
              </div>
            </div>

            {/* Screen Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
              {renderScreenContent(screen)}
            </div>

            {/* Bottom Tab Bar (for Cartões and Hub) */}
            {screen !== 'wizard' && (
              <BottomTabBar
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
            )}

            {/* iOS Home Indicator Bar */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-900/30 rounded-full pointer-events-none z-50" />
          </div>
        </div>
      )}

      {/* ================= VIEW 2: 4-SCREEN SHOWCASE (AS IN ATTACHED SCREENSHOTS) ================= */}
      {viewMode === 'grid' && (
        <div className="w-full max-w-7xl overflow-x-auto pb-6">
          <div className="flex items-start justify-center gap-6 min-w-[1300px]">
            {/* Screen 1: Cartões */}
            <div className="w-[330px] h-[720px] rounded-[44px] p-3 bg-gradient-to-b from-[#2B303A] to-[#12151B] shadow-2xl border-4 border-[#3D4452] flex flex-col overflow-hidden">
              <div className="relative w-full h-full rounded-[34px] bg-[#F4F6F8] overflow-hidden flex flex-col">
                <div className="h-9 px-6 pt-1.5 flex items-center justify-between text-slate-900 text-xs font-semibold bg-white shrink-0">
                  <span className="font-bold text-[11px]">9:41</span>
                  <div className="w-18 h-4.5 bg-black rounded-full mx-auto" />
                  <div className="flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    <Battery className="w-4 h-3" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto text-xs">
                  <CartoesScreen onOpenControleGastos={() => setScreen('wizard')} />
                </div>
                <div className="p-2 bg-slate-900 text-center text-[10px] text-white font-bold">
                  Tela 1 · Cartões & Lançamentos
                </div>
              </div>
            </div>

            {/* Screen 2: Mais Acessados / Hub */}
            <div className="w-[330px] h-[720px] rounded-[44px] p-3 bg-gradient-to-b from-[#2B303A] to-[#12151B] shadow-2xl border-4 border-[#3D4452] flex flex-col overflow-hidden">
              <div className="relative w-full h-full rounded-[34px] bg-[#F4F6F8] overflow-hidden flex flex-col">
                <div className="h-9 px-6 pt-1.5 flex items-center justify-between text-slate-900 text-xs font-semibold bg-white shrink-0">
                  <span className="font-bold text-[11px]">9:41</span>
                  <div className="w-18 h-4.5 bg-black rounded-full mx-auto" />
                  <div className="flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    <Battery className="w-4 h-3" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto text-xs">
                  <ControleGastosHub
                    onStartControle={() => {
                      setViewMode('single');
                      setScreen('wizard');
                    }}
                    onNavigateToCartoes={() => {
                      setViewMode('single');
                      setScreen('cartoes');
                    }}
                  />
                </div>
                <div className="p-2 bg-slate-900 text-center text-[10px] text-white font-bold">
                  Tela 2 · Mais Acessados & Hub
                </div>
              </div>
            </div>

            {/* Screen 3: Wizard Categoria & Teclado */}
            <div className="w-[330px] h-[720px] rounded-[44px] p-3 bg-gradient-to-b from-[#2B303A] to-[#12151B] shadow-2xl border-4 border-[#3D4452] flex flex-col overflow-hidden">
              <div className="relative w-full h-full rounded-[34px] bg-white overflow-hidden flex flex-col">
                <div className="h-9 px-6 pt-1.5 flex items-center justify-between text-slate-900 text-xs font-semibold bg-white shrink-0">
                  <span className="font-bold text-[11px]">9:41</span>
                  <div className="w-18 h-4.5 bg-black rounded-full mx-auto" />
                  <div className="flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    <Battery className="w-4 h-3" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto text-xs">
                  <ControleGastosWizard
                    initialStep="amount"
                    onClose={() => setScreen('hub')}
                  />
                </div>
                <div className="p-2 bg-slate-900 text-center text-[10px] text-white font-bold">
                  Tela 3 · Defina um Valor & Teclado
                </div>
              </div>
            </div>

            {/* Screen 4: Regional Tarjetas / Paraguay */}
            <div className="w-[330px] h-[720px] rounded-[44px] p-3 bg-gradient-to-b from-[#2B303A] to-[#12151B] shadow-2xl border-4 border-[#3D4452] flex flex-col overflow-hidden">
              <div className="relative w-full h-full rounded-[34px] bg-[#F4F6F8] overflow-hidden flex flex-col">
                <div className="h-9 px-6 pt-1.5 flex items-center justify-between text-slate-900 text-xs font-semibold bg-white shrink-0">
                  <span className="font-bold text-[11px]">9:41</span>
                  <div className="w-18 h-4.5 bg-black rounded-full mx-auto" />
                  <div className="flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    <Battery className="w-4 h-3" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto text-xs">
                  <TarjetasRegionalScreen onBack={() => setScreen('cartoes')} />
                </div>
                <div className="p-2 bg-slate-900 text-center text-[10px] text-white font-bold">
                  Tela 4 · Tarjetas de Crédito & SPI
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
