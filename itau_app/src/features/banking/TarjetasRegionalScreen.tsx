import React, { useState } from 'react';
import {
  ChevronLeft,
  Eye,
  EyeOff,
  CreditCard as CreditCardIcon,
  Sliders,
  FileText,
  ArrowRightLeft,
  Receipt,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { CreditCard } from '../../design-system/organisms/CreditCard';
import { ServiceTile } from '../../design-system/molecules/ServiceTile';
import { ItauButton } from '../../design-system/atoms/ItauButton';
import { useCliente } from '../cliente/ClienteContext';

export interface TarjetasRegionalScreenProps {
  onBack?: () => void;
  className?: string;
}

export const TarjetasRegionalScreen: React.FC<TarjetasRegionalScreenProps> = ({
  onBack,
  className = '',
}) => {
  const cliente = useCliente();
  const [activeTab, setActiveTab] = useState<'tarjetas' | 'cuentas'>('tarjetas');
  const [showBalance, setShowBalance] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className={`bg-[#F4F6F8] min-h-full pb-20 relative font-sans text-slate-800 ${className}`}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-[#002244] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg animate-fadeIn">
          {toast}
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-100">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-1 text-slate-800 hover:text-[#EC7000] font-semibold text-sm transition-colors py-1 px-1 -ml-1 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700" />
          <span>{activeTab === 'tarjetas' ? 'Tarjetas de crédito' : 'Cuentas'}</span>
        </button>

        <button
          onClick={() => setShowBalance(!showBalance)}
          type="button"
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title={showBalance ? 'Ocultar saldos' : 'Mostrar saldos'}
        >
          {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </header>

      {/* Sub-navigation Tabs */}
      <div className="px-4 pt-2.5">
        <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('tarjetas')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'tarjetas'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tarjetas de crédito
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cuentas')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'cuentas'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cuentas
          </button>
        </div>
      </div>

      {/* Content depending on selected tab */}
      <div className="px-4 pt-3 space-y-4">
        {activeTab === 'tarjetas' ? (
          /* View 1: Tarjetas de crédito (Image 3) */
          <>
            <div className="relative">
              <CreditCard
                variant="black"
                cardName="Black"
                type="Crédito Adicional"
                lastDigits="1234"
                holderName={cliente.nome.toUpperCase()}
              />
            </div>

            {/* Info Card */}
            <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Disponible</span>
                <button
                  onClick={() => notify('Detalles completos de la tarjeta')}
                  className="text-xs font-bold text-slate-600 hover:text-[#EC7000] flex items-center gap-0.5"
                >
                  Detalles <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-2xl font-black text-slate-900 tabular-nums mt-0.5 tracking-tight">
                {showBalance ? 'Gs. 3.000.000' : '••••••••'}
              </div>

              <div className="text-xs text-slate-500 mt-1">
                Línea de crédito <span className="font-semibold text-slate-800">{showBalance ? 'Gs. 5.000.000' : '••••'}</span>
              </div>

              <div className="divide-y divide-slate-100 mt-3 pt-2 border-t border-slate-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">Último cierre</span>
                  <span className="font-bold text-slate-800">25 mayo</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">Vencimiento</span>
                  <span className="font-bold text-slate-800">06 junio</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">Pago mínimo</span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {showBalance ? 'Gs. 250.000' : '••••'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-1">
                <ItauButton
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => notify('Iniciando pago de tarjeta...')}
                >
                  Pagar
                </ItauButton>
              </div>
            </div>

            {/* Quick Tiles */}
            <div className="grid grid-cols-3 gap-2.5">
              <ServiceTile
                icon={<CreditCardIcon className="w-5 h-5 stroke-[2]" />}
                label="Datos de la tarjeta"
                onClick={() => notify('Consultando datos seguros de la tarjeta')}
              />
              <ServiceTile
                icon={<Sliders className="w-5 h-5 stroke-[2]" />}
                label="Aumento de línea"
                onClick={() => notify('Simulación de aumento de línea de crédito')}
              />
              <ServiceTile
                icon={<FileText className="w-5 h-5 stroke-[2]" />}
                label="Consulta de extractos"
                onClick={() => notify('Extractos mensuales')}
              />
            </div>
          </>
        ) : (
          /* View 2: Cuentas en Guaranies (Image 4) */
          <>
            {/* Account Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <CreditCardIcon className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Cuenta corriente en Guaranies
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  N° 123456
                </span>
              </div>
            </div>

            {/* Balance Card */}
            <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] border border-slate-100">
              <span className="text-xs font-medium text-slate-500 block">
                Saldo disponible
              </span>
              <div className="text-2xl font-black text-slate-900 tabular-nums mt-0.5 tracking-tight">
                {showBalance ? 'Gs. 700.000' : '••••••••'}
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Saldo actual</span>
                <span className="font-bold text-slate-800 tabular-nums">
                  {showBalance ? 'Gs. 700.000' : '••••'}
                </span>
              </div>
            </div>

            {/* Quick Tiles */}
            <div className="grid grid-cols-3 gap-2.5">
              <ServiceTile
                icon={<CreditCardIcon className="w-5 h-5 stroke-[2]" />}
                label="Tarjeta virtual"
                onClick={() => notify('Generando tarjeta virtual')}
              />
              <ServiceTile
                icon={<ArrowRightLeft className="w-5 h-5 stroke-[2]" />}
                label="Transferir"
                onClick={() => notify('Transferencia SPI')}
              />
              <ServiceTile
                icon={<Receipt className="w-5 h-5 stroke-[2]" />}
                label="Pagar servicios"
                onClick={() => notify('Pago de servicios públicos y privados')}
              />
            </div>

            {/* Movimientos */}
            <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Movimientos
              </h3>
              <div className="text-[11px] font-semibold text-slate-400 py-1">
                Ayer, 24 de enero de 2025
              </div>

              <div className="divide-y divide-slate-100">
                <div
                  onClick={() => notify('Detalles de transferencia enviada')}
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-xl px-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Transferencia enviada SPI
                      </span>
                      <span className="text-[11px] text-slate-400">SPI 88294</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 tabular-nums">
                    {showBalance ? 'Gs -20.000' : '••••'}
                  </span>
                </div>

                <div
                  onClick={() => notify('Detalles de transferencia recibida')}
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-xl px-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Transferencia recibida
                      </span>
                      <span className="text-[11px] text-slate-400">Banco Itaú</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 tabular-nums">
                    {showBalance ? 'Gs 30.000' : '••••'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
