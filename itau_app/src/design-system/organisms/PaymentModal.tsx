import React, { useState } from 'react';
import { X, CheckCircle2, QrCode, CreditCard, ArrowRight, Copy, Check } from 'lucide-react';
import { ItauButton } from '../atoms/ItauButton';
import { PixIcon } from '../atoms/PixIcon';
import confetti from 'canvas-confetti';

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceAmount?: number;
  dueDate?: string;
  onSuccess?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  invoiceAmount = 1000.0,
  dueDate = '20 Nov.',
  onSuccess,
}) => {
  const [method, setMethod] = useState<'balance' | 'pix'>('balance');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsDone(true);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#EC7000', '#002244', '#16A34A'],
      });
      onSuccess?.();
    }, 1100);
  };

  const handleCopyPix = () => {
    navigator.clipboard?.writeText?.(
      '00020126580014br.gov.bcb.pix0136itau-fatura-click-122652040000530398654071000.005802BR5910BANCO ITAU6009SAO PAULO62070503***6304E2B1'
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    // Strictly constrained to the mobile container viewport using absolute positioning
    <div
      className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-fadeIn overflow-hidden"
      onClick={onClose}
    >
      <div
        className="w-full bg-white rounded-t-[28px] shadow-2xl flex flex-col max-h-[92%] animate-slideUp border-t border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Native mobile drag pull bar */}
        <div className="pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF4EB] text-[#EC7000] flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 leading-tight">Pagamento de Fatura</h3>
              <p className="text-[11px] text-slate-400">Itaú Click •••• 1226</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="p-5 overflow-y-auto flex-1">
          {isDone ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Fatura paga com sucesso!</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Seu limite de R$ 1.000,00 foi liberado instantaneamente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Amount Box */}
              <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-slate-100 text-center">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
                  Valor total da fatura
                </span>
                <div className="text-3xl font-black text-slate-900 tabular-nums mt-1">
                  R$ {invoiceAmount.toFixed(2).replace('.', ',')}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Vencimento em <span className="font-semibold text-slate-700">{dueDate}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-600 block mb-1">
                  Escolha como deseja pagar:
                </span>

                <button
                  type="button"
                  onClick={() => setMethod('balance')}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    method === 'balance'
                      ? 'border-[#EC7000] bg-[#FFF8F2] ring-1 ring-[#EC7000]'
                      : 'border-slate-100 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Saldo da Conta Itaú</div>
                      <div className="text-[11px] text-slate-400">Saldo disponível: R$ 8.713,96</div>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      method === 'balance' ? 'border-[#EC7000] bg-[#EC7000]' : 'border-slate-300'
                    }`}
                  >
                    {method === 'balance' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('pix')}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    method === 'pix'
                      ? 'border-[#EC7000] bg-[#FFF8F2] ring-1 ring-[#EC7000]'
                      : 'border-slate-100 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#32BCAD] flex items-center justify-center">
                      <PixIcon className="w-4 h-4 fill-[#32BCAD]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Pix Copia e Cola / QR Code</div>
                      <div className="text-[11px] text-slate-400">Liberação imediata do limite</div>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      method === 'pix' ? 'border-[#EC7000] bg-[#EC7000]' : 'border-slate-300'
                    }`}
                  >
                    {method === 'pix' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              </div>

              {method === 'pix' && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <div className="text-xs text-slate-600 mb-2 font-medium">Código Pix Copia e Cola</div>
                  <button
                    onClick={handleCopyPix}
                    className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-100 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Código copiado!' : 'Copiar código Pix'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Primary Action Button - Always docked at the bottom */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          {isDone ? (
            <ItauButton variant="primary" fullWidth size="lg" onClick={onClose}>
              Concluir
            </ItauButton>
          ) : (
            <ItauButton
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isProcessing}
              onClick={handlePay}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Confirmar pagamento de R$ {invoiceAmount.toFixed(2).replace('.', ',')}
            </ItauButton>
          )}
        </div>
      </div>
    </div>
  );
};
