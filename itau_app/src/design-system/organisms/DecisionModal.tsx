import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertCircle,
  Building2,
  Calendar,
  Wallet,
  User,
  Sparkles,
} from 'lucide-react';
import { PixIcon } from '../atoms/PixIcon';
import { ItauButton } from '../atoms/ItauButton';

export interface DecisionModalData {
  type: 'pix' | 'mission' | 'custom';
  title: string;
  amount: number;
  recipientName?: string;
  recipientBank?: string;
  recipientKey?: string;
  recipientKeyType?: string;
  accountSource?: string;
  balanceAfter?: number;
  scheduledDate?: string;
  category?: string;
  notes?: string;
}

export interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: DecisionModalData) => void;
  data: DecisionModalData | null;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  data,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !data) return null;

  const handleConfirm = () => {
    setIsProcessing(true);
    // Simulate biometric / iToken security authorization step
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onConfirm(data);
      }, 1000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      {/* Click outside to cancel */}
      <div className="absolute inset-0" onClick={!isProcessing ? onClose : undefined} />

      {/* Modal Card / Bottom Sheet */}
      <div className="relative w-full max-w-[420px] bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-slideUp z-10 flex flex-col max-h-[90vh]">
        {/* Top Handle on Mobile */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#32BCAD] flex items-center justify-center shadow-xs">
              {data.type === 'pix' ? (
                <PixIcon className="w-4 h-4 text-[#32BCAD]" />
              ) : (
                <Sparkles className="w-4 h-4 text-[#EC7000]" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">
                {data.title || 'Confirmar Decisão'}
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Revisão antes da efetivação
              </span>
            </div>
          </div>

          {!isProcessing && (
            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Main Amount Callout */}
          <div className="bg-gradient-to-br from-slate-50 to-[#FFF8F2] p-4 rounded-2xl border border-slate-100 text-center relative overflow-hidden">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Valor a transferir
            </span>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              R$ {data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-emerald-600 font-bold inline-flex items-center gap-1 mt-1 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Taxa zero Itaú Pix
            </span>
          </div>

          {/* Details List */}
          <div className="bg-white rounded-2xl border border-slate-100 p-3.5 space-y-3 text-xs divide-y divide-slate-100">
            {/* Destinatário */}
            {data.recipientName && (
              <div className="flex items-start justify-between pt-1 first:pt-0">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Para quem:
                </span>
                <span className="font-bold text-slate-900 text-right">
                  {data.recipientName}
                </span>
              </div>
            )}

            {/* Instituição */}
            {data.recipientBank && (
              <div className="flex items-start justify-between pt-2">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Instituição:
                </span>
                <span className="font-semibold text-slate-800 text-right">
                  {data.recipientBank}
                </span>
              </div>
            )}

            {/* Chave Pix */}
            {data.recipientKey && (
              <div className="flex items-start justify-between pt-2">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <PixIcon className="w-3.5 h-3.5 text-slate-400" />
                  Chave ({data.recipientKeyType || 'CPF'}):
                </span>
                <span className="font-mono text-slate-800 text-right">
                  {data.recipientKey}
                </span>
              </div>
            )}

            {/* Quando */}
            <div className="flex items-start justify-between pt-2">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Quando:
              </span>
              <span className="font-semibold text-slate-800">
                {data.scheduledDate || 'Agora (Imediato)'}
              </span>
            </div>

            {/* Origem */}
            <div className="flex items-start justify-between pt-2">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-slate-400" />
                Origem:
              </span>
              <span className="font-semibold text-slate-800 text-right">
                {data.accountSource || 'Conta Corrente (Ag 0340 • Cc 92104-1)'}
              </span>
            </div>

            {/* Saldo após transferência */}
            {data.balanceAfter !== undefined && (
              <div className="flex items-start justify-between pt-2">
                <span className="text-slate-500">Saldo após débito:</span>
                <span className="font-bold text-slate-900">
                  R$ {data.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* Security Guarantee Box */}
          <div className="p-3 bg-slate-50 rounded-2xl flex items-start gap-2.5 border border-slate-100">
            <ShieldCheck className="w-4 h-4 text-[#EC7000] shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 leading-tight">
              Transação protegida pelo <strong>Itaú Valida</strong> e pelo{' '}
              <strong>Mecanismo Especial de Devolução (MED)</strong> do Banco Central.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 pt-3 border-t border-slate-100 bg-white shrink-0 space-y-2">
          {isProcessing ? (
            <div className="w-full py-3.5 bg-slate-100 rounded-2xl flex items-center justify-center gap-2.5 text-slate-700 text-xs font-bold">
              <div className="w-4 h-4 border-2 border-[#EC7000] border-t-transparent rounded-full animate-spin" />
              <span>Validando com iToken Itaú...</span>
            </div>
          ) : isSuccess ? (
            <div className="w-full py-3.5 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Transferência Autorizada!</span>
            </div>
          ) : (
            <>
              <ItauButton
                variant="primary"
                size="md"
                fullWidth
                onClick={handleConfirm}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Confirmar transferência
              </ItauButton>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors text-center cursor-pointer"
              >
                Cancelar / Corrigir dados
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
