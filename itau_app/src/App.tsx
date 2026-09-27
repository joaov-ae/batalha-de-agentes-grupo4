/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';
import { CartoesScreen } from './features/banking/CartoesScreen';
import { ControleGastosHub } from './features/banking/ControleGastosHub';
import { ControleGastosWizard } from './features/banking/ControleGastosWizard';
import { TarjetasRegionalScreen } from './features/banking/TarjetasRegionalScreen';
import { MenuScreen } from './features/banking/MenuScreen';
import { ExtratoScreen } from './features/banking/ExtratoScreen';
import { IaiChatScreen } from './features/banking/IaiChatScreen';
import { BottomTabBar, TabId } from './design-system/organisms/BottomTabBar';
import { StandaloneStorybook } from './features/storybook/StandaloneStorybook';
import { FinancialGoal, INITIAL_GOALS } from './features/banking/goalsStore';

export type MobileScreen =
  | 'cartoes'
  | 'hub'
  | 'wizard'
  | 'regional'
  | 'menu'
  | 'storybook'
  | 'extrato'
  | 'iai';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<MobileScreen>('hub');
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [hasActiveControl, setHasActiveControl] = useState(false);
  const [goals, setGoals] = useState<FinancialGoal[]>(INITIAL_GOALS);

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
    if (tab === 'pix') setCurrentScreen('hub');
  };

  const handleGoalCreated = (newGoal: FinancialGoal) => {
    setGoals((prev) => {
      const exists = prev.some((g) => g.title.toLowerCase() === newGoal.title.toLowerCase());
      if (exists) {
        return prev.map((g) => (g.title.toLowerCase() === newGoal.title.toLowerCase() ? newGoal : g));
      }
      return [newGoal, ...prev];
    });
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
              onNavigateToExtrato={() => {
                setActiveTab('extrato');
                setCurrentScreen('extrato');
              }}
            />
          )}

          {currentScreen === 'hub' && (
            <ControleGastosHub
              onStartControle={() => setCurrentScreen('wizard')}
              onNavigateToCartoes={() => {
                setActiveTab('produtos');
                setCurrentScreen('cartoes');
              }}
              onNavigateToExtrato={() => {
                setActiveTab('extrato');
                setCurrentScreen('extrato');
              }}
              onNavigateToIai={() => setCurrentScreen('iai')}
              hasActiveControl={hasActiveControl}
              activeGoals={goals}
            />
          )}

          {currentScreen === 'extrato' && (
            <ExtratoScreen
              onBack={() => {
                setActiveTab('inicio');
                setCurrentScreen('hub');
              }}
            />
          )}

          {currentScreen === 'iai' && (
            <IaiChatScreen
              onBack={() => {
                setActiveTab('inicio');
                setCurrentScreen('hub');
              }}
              onGoalCreated={handleGoalCreated}
              activeGoals={goals}
            />
          )}

          {currentScreen === 'wizard' && (
            <ControleGastosWizard
              onClose={() => {
                setHasActiveControl(true);
                setCurrentScreen('hub');
                setActiveTab('inicio');
              }}
            />
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
              onNavigateToIai={() => setCurrentScreen('iai')}
              onOpenStorybook={() => {
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
              }}
            />
          )}
        </main>

        {/* Bottom Tab Bar (shown on standard mobile screens) */}
        {currentScreen !== 'wizard' &&
          currentScreen !== 'iai' && (
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
