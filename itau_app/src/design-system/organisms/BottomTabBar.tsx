import React from 'react';
import { Home, FileText, Barcode, Gift, Grid } from 'lucide-react';

export type TabId = 'inicio' | 'extrato' | 'pagamentos' | 'pra-voce' | 'menu' | 'pix' | 'produtos';

export interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  className?: string;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onTabChange,
  className = '',
}) => {
  const tabs = [
    { id: 'inicio' as TabId, label: 'Início', icon: Home },
    { id: 'extrato' as TabId, label: 'Extrato', icon: FileText },
    { id: 'pagamentos' as TabId, label: 'Pagamentos', icon: Barcode },
    { id: 'pra-voce' as TabId, label: 'Pra você', icon: Gift },
    { id: 'menu' as TabId, label: 'Menu', icon: Grid },
  ];

  return (
    <nav
      className={`
        bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]
        px-3 py-1 flex items-center justify-around select-none z-30
        ${className}
      `}
      aria-label="Navegação Principal"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            type="button"
            className="flex flex-col items-center justify-center py-1 px-2 group cursor-pointer focus-visible:outline-none transition-transform active:scale-95"
            aria-label={tab.label}
          >
            <Icon
              className={`w-5 h-5 transition-colors ${
                isActive
                  ? 'text-[#EC7000] stroke-[2.2]'
                  : 'text-slate-400 group-hover:text-slate-600 stroke-[1.8]'
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 font-medium transition-colors ${
                isActive ? 'text-[#EC7000] font-bold' : 'text-slate-500'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
