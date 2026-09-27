/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';
import { CartoesScreen } from './features/banking/CartoesScreen';
import { ControleGastosWizard } from './features/banking/ControleGastosWizard';
import { TarjetasRegionalScreen } from './features/banking/TarjetasRegionalScreen';
import { MenuScreen } from './features/banking/MenuScreen';
import { ExtratoScreen, ExtraTransaction } from './features/banking/ExtratoScreen';
import { IaiChatScreen } from './features/banking/IaiChatScreen';
import { PixComprovante, PixSaldos } from './features/banking/PixFlow';
import { BottomTabBar, TabId } from './design-system/organisms/BottomTabBar';
import { StandaloneStorybook } from './features/storybook/StandaloneStorybook';
// Telas e jornadas vindas do protótipo do Vertex AI Studio (Build)
import { HubScreen } from './features/studio/HubScreen';
import { IaiLandingScreen } from './features/studio/IaiLandingScreen';
import { MetaDetailScreen } from './features/studio/MetaDetailScreen';
import { PixModal } from './features/studio/PixModal';
import { WizardScreen as SimuladorScreen } from './features/studio/WizardScreen';
import { FinancialGoal, PixTransferParams, ScreenType as StudioScreen } from './features/studio/studioTypes';
import { MARIA_PERSONA, INITIAL_GOALS } from './features/studio/studioConstants';

export type MobileScreen =
  | 'cartoes'
  | 'hub'
  | 'wizard'
  | 'regional'
  | 'menu'
  | 'storybook'
  | 'extrato'
  | 'iai'
  | 'iai_landing'
  | 'meta_detail'
  | 'pix_area'
  | 'simulador';

// Telas em tela cheia (sem a barra de abas)
const FULL_SCREENS: MobileScreen[] = ['wizard', 'iai', 'iai_landing', 'meta_detail', 'simulador'];

// Saldo/limite da conta (vêm de /api/pix/saldo) e limites dos cartões usados no Pix
const INITIAL_SALDOS: PixSaldos = { conta: 17829.5, limiteConta: 28000, infinite: 24572.2, black: 13220.98 };

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<MobileScreen>('hub');
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [goals, setGoals] = useState<FinancialGoal[]>(INITIAL_GOALS);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
  // Gamificação: pontos Itaú Shop da Maria
  const [itauShopPoints, setItauShopPoints] = useState(3200);
  // Saldos compartilhados por Home, Extrato e Pix; descontados a cada Pix e aporte
  const [saldos, setSaldos] = useState<PixSaldos>(INITIAL_SALDOS);
  const [extraTransactions, setExtraTransactions] = useState<ExtraTransaction[]>([]);
  // Cada abertura do chat é uma conversa nova (key), com pergunta inicial ou jornada de meta opcionais
  const [chatSession, setChatSession] = useState<{ key: number; initialPrompt?: string; goalFlow?: boolean }>({ key: 0 });
  const [pixParams, setPixParams] = useState<PixTransferParams | undefined>(undefined);

  useEffect(() => {
    fetch('/api/pix/saldo')
      .then((r) => r.json())
      .then((d) => {
        if (Number.isFinite(Number(d.saldo))) {
          setSaldos((prev) => ({ ...prev, conta: Number(d.saldo), limiteConta: Number(d.limiteConta) }));
        }
      })
      .catch(() => {});
  }, []);

  // Check if current route is standalone Storybook
  const [isStorybookMode, setIsStorybookMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.pathname.startsWith('/storybook') ||
      window.location.search.includes('view=storybook') ||
      window.location.search.includes('path=/story') ||
      window.location.hash.includes('storybook') ||
      window.location.hash.startsWith('#docs-') ||
      window.location.hash.startsWith('#atom-') ||
      window.location.hash.startsWith('#mol-') ||
      window.location.hash.startsWith('#org-') ||
      window.location.hash.startsWith('#screen-')
    );
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const isSb =
        window.location.pathname.startsWith('/storybook') ||
        window.location.search.includes('view=storybook') ||
        window.location.search.includes('path=/story') ||
        window.location.hash.includes('storybook') ||
        window.location.hash.startsWith('#docs-') ||
        window.location.hash.startsWith('#atom-') ||
        window.location.hash.startsWith('#mol-') ||
        window.location.hash.startsWith('#org-') ||
        window.location.hash.startsWith('#screen-');
      setIsStorybookMode(isSb);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // When in standalone Storybook mode, render the full-screen official Storybook interface
  if (isStorybookMode) {
    return (
      <StandaloneStorybook
        onBackToApp={() => {
          window.history.pushState({}, '', '/');
          setIsStorybookMode(false);
          setCurrentScreen('hub');
        }}
      />
    );
  }

  // Tab navigation handler
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'inicio') setCurrentScreen('hub');
    if (tab === 'extrato') setCurrentScreen('extrato');
    if (tab === 'pagamentos') setCurrentScreen('cartoes');
    if (tab === 'pra-voce') setCurrentScreen('cartoes');
    if (tab === 'produtos') setCurrentScreen('cartoes');
    if (tab === 'menu') setCurrentScreen('menu');
    if (tab === 'pix') {
      setPixParams(undefined);
      setCurrentScreen('pix_area');
    }
  };

  const goTo = (screen: MobileScreen, tab?: TabId) => {
    if (tab) setActiveTab(tab);
    setCurrentScreen(screen);
  };

  const openStorybook = () => {
    try {
      const newWin = window.open('/storybook', '_blank');
      if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
        window.history.pushState({}, '', '/storybook');
        setIsStorybookMode(true);
      }
    } catch {
      window.history.pushState({}, '', '/storybook');
      setIsStorybookMode(true);
    }
  };

  // Abre o chat da ia.i (sempre uma conversa nova)
  const openChat = (opts: { initialPrompt?: string; goalFlow?: boolean } = {}) => {
    setChatSession((prev) => ({ key: prev.key + 1, ...opts }));
    setCurrentScreen('iai');
  };

  // Navegação usada pelas telas do Studio
  const studioNavigate = (screen: StudioScreen) => {
    switch (screen) {
      case 'hub': return goTo('hub', 'inicio');
      case 'cartoes': return goTo('cartoes', 'produtos');
      case 'extrato': return goTo('extrato', 'extrato');
      case 'menu': return goTo('menu', 'menu');
      case 'pix': setPixParams(undefined); return goTo('pix_area');
      case 'iai': return openChat();
      case 'iai_landing': return goTo('iai_landing');
      case 'wizard': return goTo('simulador');
      case 'meta_detail': return goTo('meta_detail');
      case 'storybook': return openStorybook();
    }
  };

  const handleGoalCreated = (newGoal: FinancialGoal) => {
    setGoals((prev) => {
      const exists = prev.some((g) => g.title.toLowerCase() === newGoal.title.toLowerCase());
      if (exists) {
        return prev.map((g) => (g.title.toLowerCase() === newGoal.title.toLowerCase() ? { ...newGoal, currentAmount: g.currentAmount } : g));
      }
      return [newGoal, ...prev];
    });
    setItauShopPoints((p) => p + (newGoal.itauShopPointsBonus || 500));
  };

  // Aporte em meta: soma na meta, gera pontos, debita a conta e aparece no extrato
  const handleMakeAporte = (goalId: string, amount: number, earnedPoints: number) => {
    const goal = goals.find((g) => g.id === goalId);
    setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g)));
    setSelectedGoal((g) => (g && g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g));
    setItauShopPoints((p) => p + earnedPoints);
    setSaldos((s) => ({ ...s, conta: s.conta - amount }));
    setExtraTransactions((prev) => [
      {
        id: `aporte-${Date.now()}`,
        title: `Aporte Meta: ${goal?.title || 'Investimento'}`,
        subtitle: 'Conta Corrente Personnalité • Débito imediato',
        amount,
        type: 'expense',
      },
      ...prev,
    ]);
  };

  // Pix concluído no chat: desconta da conta ou do limite do cartão usado
  const handlePixDone = (c: PixComprovante) => {
    setSaldos((s) => ({ ...s, [c.fonte.id]: s[c.fonte.id] - c.amount }));
  };

  return (
    <div className="min-h-screen bg-[#E5E9F0] sm:py-6 flex flex-col items-center justify-center font-sans antialiased selection:bg-[#EC7000] selection:text-white relative">
      {/* Dedicated Mobile Device Viewport Container */}
      <div className="w-full sm:max-w-[420px] min-h-screen sm:min-h-[852px] sm:max-h-[880px] bg-[#F4F6F8] sm:rounded-[48px] shadow-2xl sm:border-4 sm:border-slate-800/80 flex flex-col relative overflow-hidden sm:transform">
        
        {/* iOS Native Status Bar */}
        <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md h-11 px-7 pt-2 flex items-center justify-between text-slate-900 text-xs font-semibold shrink-0 select-none">
          <span className="tracking-tight text-[13px] font-bold">9:41</span>

          {/* Dynamic Island */}
          <div className="w-24 h-6 bg-black rounded-full flex items-center justify-between px-2.5 shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700" />
            <div className="w-2 h-2 rounded-full bg-[#EC7000]/80" />
          </div>

          <div className="flex items-center gap-1.5 text-slate-800">
            <Signal className="w-3.5 h-3.5 stroke-[2.5]" />
            <Wifi className="w-3.5 h-3.5 stroke-[2.5]" />
            <Battery className="w-5 h-3.5 stroke-[2.5]" />
          </div>
        </div>

        {/* Scrollable Screen Content */}
        <main className="flex-1 overflow-hidden relative flex flex-col">
          {currentScreen === 'cartoes' && (
            <CartoesScreen
              onBack={() => {
                setActiveTab('inicio');
                setCurrentScreen('hub');
              }}
              onOpenControleGastos={() => setCurrentScreen('wizard')}
              onOpenSimulador={() => setCurrentScreen('simulador')}
              onNavigateToExtrato={() => {
                setActiveTab('extrato');
                setCurrentScreen('extrato');
              }}
            />
          )}

          {currentScreen === 'hub' && (
            <HubScreen
              persona={MARIA_PERSONA}
              goals={goals}
              itauShopPoints={itauShopPoints}
              saldo={saldos.conta}
              limiteConta={saldos.limiteConta}
              onNavigate={studioNavigate}
              onOpenQuickPrompt={(prompt) => openChat({ initialPrompt: prompt })}
              onOpenNewGoalFlow={() => openChat({ goalFlow: true })}
              onSelectGoal={(goal) => {
                setSelectedGoal(goal);
                setCurrentScreen('meta_detail');
              }}
            />
          )}

          {currentScreen === 'iai_landing' && (
            <IaiLandingScreen
              onNavigate={studioNavigate}
              onActivateWithCategoryCaps={() =>
                openChat({ initialPrompt: 'Programe a divisão do salário entre gastos essenciais e não essenciais.' })
              }
              onGoToRegularChat={() => openChat()}
            />
          )}

          {currentScreen === 'meta_detail' && (
            <MetaDetailScreen
              goal={selectedGoal || goals[0]}
              itauShopPoints={itauShopPoints}
              onNavigate={studioNavigate}
              onMakeAporte={handleMakeAporte}
            />
          )}

          {currentScreen === 'pix_area' && (
            <PixModal key={pixParams?.mode || 'contato'} onNavigate={studioNavigate} pixParams={pixParams} />
          )}

          {currentScreen === 'simulador' && (
            <SimuladorScreen persona={MARIA_PERSONA} onNavigate={studioNavigate} onGoalCreated={handleGoalCreated} />
          )}

          {currentScreen === 'extrato' && (
            <ExtratoScreen
              onBack={() => goTo('hub', 'inicio')}
              saldo={saldos.conta}
              limiteConta={saldos.limiteConta}
              extraTransactions={extraTransactions}
              onAskIai={(title) =>
                openChat({ initialPrompt: `Qual o impacto do gasto em "${title}" no meu limite de lazer sem culpa?` })
              }
            />
          )}

          {currentScreen === 'iai' && (
            <IaiChatScreen
              key={chatSession.key}
              onBack={() => goTo('hub', 'inicio')}
              onNavigate={studioNavigate}
              onGoalCreated={handleGoalCreated}
              onStartPixArea={(mode) => {
                setPixParams({ mode });
                setCurrentScreen('pix_area');
              }}
              saldos={saldos}
              onPixDone={handlePixDone}
              initialPrompt={chatSession.initialPrompt}
              isGoalCreationFlow={chatSession.goalFlow}
            />
          )}

          {currentScreen === 'wizard' && (
            <ControleGastosWizard onClose={() => goTo('hub', 'inicio')} />
          )}

          {currentScreen === 'regional' && (
            <TarjetasRegionalScreen
              onBack={() => {
                setActiveTab('menu');
                setCurrentScreen('menu');
              }}
            />
          )}

          {currentScreen === 'menu' && (
            <MenuScreen
              onNavigateToCartoes={() => {
                setActiveTab('produtos');
                setCurrentScreen('cartoes');
              }}
              onNavigateToControleGastos={() => setCurrentScreen('wizard')}
              onNavigateToRegional={() => setCurrentScreen('regional')}
              onNavigateToExtrato={() => {
                setActiveTab('extrato');
                setCurrentScreen('extrato');
              }}
              onNavigateToIai={() => openChat()}
              onNavigateToSimulador={() => goTo('simulador')}
              onOpenStorybook={openStorybook}
            />
          )}
        </main>

        {/* Bottom Tab Bar (shown on standard mobile screens) */}
        {!FULL_SCREENS.includes(currentScreen) && (
            <div className="sticky bottom-0 z-30 shrink-0">
              <BottomTabBar
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
              {/* iOS Home Indicator */}
              <div className="h-4 bg-white flex items-center justify-center pb-1">
                <div className="w-32 h-1 bg-slate-900/30 rounded-full" />
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
