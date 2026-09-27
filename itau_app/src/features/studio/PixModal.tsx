import React, { useState } from 'react';
import { useCliente, brlCliente } from '../cliente/ClienteContext';
import { 
  ArrowLeft, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  FileCode2, 
  QrCode, 
  Sparkles, 
  Building2, 
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { ScreenType, PixTransferParams } from './studioTypes';

interface PixModalProps {
  onNavigate: (screen: ScreenType) => void;
  pixParams?: PixTransferParams;
}

export const PixModal: React.FC<PixModalProps> = ({ onNavigate, pixParams }) => {
  const cliente = useCliente();
  const [selectedMode, setSelectedMode] = useState<'contato' | 'copia_cola' | 'qr_code'>(
    pixParams?.mode || 'contato'
  );
  const [amount, setAmount] = useState<string>(pixParams?.suggestedAmount || '50,00');
  const [recipientName, setRecipientName] = useState<string>(
    pixParams?.recipient?.name || 'Carlos Silva'
  );
  const [pixKey, setPixKey] = useState<string>(
    pixParams?.recipient?.key || 'carlos.silva@email.com'
  );
  const [copiaColaCode, setCopiaColaCode] = useState<string>(
    '00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540550.005802BR5912Carlos Silva6009Sao Paulo62070503***6304E2CA'
  );

  // Etapas: 'input' -> 'confirmacao_comprometimento' -> 'sucesso'
  const [step, setStep] = useState<'input' | 'confirmacao_comprometimento' | 'sucesso'>('input');

  const handleConfirmAmount = () => {
    // Ao confirmar o valor, avança para a confirmação que exibe o banner e alerta de comprometimento
    setStep('confirmacao_comprometimento');
  };

  const handleProceedPayment = () => {
    setStep('sucesso');
    setTimeout(() => {
      onNavigate('hub');
    }, 2200);
  };

  const handleCancelPayment = () => {
    // Se não, retorna diretamente à página inicial
    onNavigate('hub');
  };

  return (
    <div className="relative flex-1 h-full bg-white flex flex-col justify-between text-slate-800 font-sans select-none overflow-hidden">
      {/* Header */}
      <div>
        <header className="p-4 border-b border-[#E8ECEF] flex items-center justify-between flex-shrink-0">
          <button 
            onClick={() => {
              if (step === 'confirmacao_comprometimento') {
                setStep('input');
              } else {
                onNavigate('hub');
              }
            }}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </button>
          
          <div className="flex items-center gap-1.5 font-bold text-sm text-[#002244]">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Área Pix Personnalité</span>
          </div>

          <button 
            onClick={() => onNavigate('hub')}
            className="p-1 text-slate-400 hover:text-slate-600"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Seleção do Tipo de Pix (Contatos, Copia e Cola, QR Code) no step inicial */}
        {step === 'input' && (
          <div className="px-4 pt-3 pb-1 flex gap-1.5 border-b border-slate-100">
            <button
              onClick={() => setSelectedMode('contato')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedMode === 'contato'
                  ? 'bg-orange-50 text-itau-orange border border-orange-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Contato
            </button>
            <button
              onClick={() => setSelectedMode('copia_cola')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                selectedMode === 'copia_cola'
                  ? 'bg-orange-50 text-itau-orange border border-orange-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Copia e Cola
            </button>
            <button
              onClick={() => setSelectedMode('qr_code')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                selectedMode === 'qr_code'
                  ? 'bg-orange-50 text-itau-orange border border-orange-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              QR Code
            </button>
          </div>
        )}

        {/* Conteúdo dinâmico das etapas */}
        <main className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* ETAPA 1: INPUT DE DADOS E VALOR */}
          {step === 'input' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Modo Copia e Cola */}
              {selectedMode === 'copia_cola' && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">Código Pix Copia e Cola</span>
                  <textarea
                    value={copiaColaCode}
                    onChange={(e) => setCopiaColaCode(e.target.value)}
                    rows={2}
                    className="w-full bg-[#F4F6F8] border border-[#E8ECEF] rounded-xl p-2.5 text-[11px] font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-itau-orange resize-none"
                    placeholder="Cole o código Pix aqui..."
                  />
                </div>
              )}

              {/* Modo QR Code */}
              {selectedMode === 'qr_code' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                  <div className="w-16 h-16 bg-white border border-slate-300 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                    <QrCode className="w-10 h-10 text-slate-800" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">QR Code Identificado</p>
                  <span className="text-[10px] text-slate-500 font-mono block">Chave: 11988887766 • Nubank</span>
                </div>
              )}

              {/* Input do Valor */}
              <div>
                <span className="text-xs text-itau-gray-text font-medium">Valor a transferir</span>
                <div className="flex items-center text-3xl font-extrabold font-mono text-[#002244] mt-1 border-b-2 border-itau-orange pb-2">
                  <span className="text-itau-orange text-xl mr-1">R$</span>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-transparent focus:outline-none"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Card do Destinatário */}
              <div className="bg-[#F4F6F8] rounded-2xl p-3.5 border border-[#E8ECEF] space-y-2">
                <span className="text-[11px] font-bold text-slate-600 block">Destinatário da transferência</span>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FFF4EB] text-itau-orange flex items-center justify-center font-bold text-xs border border-[#FFE0CC]">
                    {recipientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{recipientName}</h3>
                    <p className="text-[10px] text-slate-500 font-mono">{pixKey}</p>
                    <span className="text-[10px] text-emerald-600 font-semibold">Itaú Unibanco (341) • Conta Corrente</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>Limite Pix protegido pelo perfil Itaú Personnalité.</span>
              </div>
            </div>
          )}

          {/* ETAPA 2: CONFIRMAÇÃO COM O BANNER DE REFERÊNCIA E AVISO DE COMPROMETIMENTO DA RENDA */}
          {step === 'confirmacao_comprometimento' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* BANNER EXATO CONFORME A IMAGEM DE REFERÊNCIA */}
              <section className="bg-gradient-to-r from-[#FFFDF9] via-[#FFF6EE] to-[#FFEDE0] rounded-2xl p-4 border border-[#FFDFC4] shadow-sm relative overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-medium text-slate-800 leading-relaxed pr-1">
                    <strong>{brlCliente(cliente.renda.salario)} a mais na conta!</strong> Vamos programar os gastos deste mês, na medida para você?
                  </p>
                  <div className="flex-shrink-0 pt-0.5">
                    <Sparkles className="w-4 h-4 text-itau-orange animate-pulse" />
                  </div>
                </div>
              </section>

              {/* MENSAGEM DE AVISO DE COMPROMETIMENTO DA RENDA MENSAL */}
              <div className="bg-white border-2 border-amber-300 rounded-2xl p-4 shadow-sm space-y-2.5">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                    Atenção ao seu orçamento do mês
                  </h3>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  Este pagamento de <strong className="text-slate-900 font-mono">R$ {amount}</strong> para <strong className="text-slate-900">{recipientName}</strong> vai <strong>comprometer parte da sua renda mensal programada</strong>.
                </p>

                <p className="text-xs text-slate-600 font-medium">
                  Você deseja mesmo fazer esse pagamento agora?
                </p>
              </div>

              {/* Resumo da transação */}
              <div className="bg-[#F4F6F8] rounded-xl p-3 border border-[#E8ECEF] text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-500">
                  <span>Valor:</span>
                  <span className="font-bold text-slate-800">R$ {amount}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Forma:</span>
                  <span className="text-slate-800">Pix Instantâneo</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Origem:</span>
                  <span className="text-slate-800">Conta Corrente Personnalité</span>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 3: SUCESSO */}
          {step === 'sucesso' && (
            <div className="py-12 text-center space-y-3 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-lg font-bold text-[#002244]">Pix Realizado com Sucesso!</h2>
              <p className="text-xs text-slate-600">
                Transferência de <strong className="font-mono">R$ {amount}</strong> enviada com sucesso para <strong>{recipientName}</strong>.
              </p>
              <span className="text-[10px] text-slate-400 block pt-1">
                Redirecionando para a página inicial...
              </span>
            </div>
          )}
        </main>
      </div>

      {/* Botões do Rodapé */}
      <footer className="p-4 border-t border-[#E8ECEF] bg-white flex-shrink-0">
        {step === 'input' && (
          <button
            onClick={handleConfirmAmount}
            className="w-full py-3.5 bg-itau-orange hover:bg-itau-orange-dark text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md active:scale-[0.99]"
          >
            Confirmar Valor
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {step === 'confirmacao_comprometimento' && (
          <div className="space-y-2">
            <button
              onClick={handleProceedPayment}
              className="w-full py-3.5 bg-itau-orange hover:bg-itau-orange-dark text-white rounded-xl font-bold text-xs transition-colors shadow-md active:scale-[0.99]"
            >
              Sim, prosseguir com pagamento
            </button>

            <button
              onClick={handleCancelPayment}
              className="w-full py-3 bg-[#F4F6F8] hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
            >
              Não, retornar à página inicial
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};
