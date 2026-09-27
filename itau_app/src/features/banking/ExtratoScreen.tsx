import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  Search,
  Download,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Filter,
  ShoppingBag,
  Coins,
  Coffee,
  Fuel,
  Utensils,
  Tv,
  Building,
  TrendingUp,
  ArrowLeftRight,
  CheckCircle2,
  X,
  Share2,
  FileText,
  Database,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { PixIcon } from '../../design-system/atoms/PixIcon';
import { TransactionRow } from '../../design-system/molecules/TransactionRow';
import { ItauButton } from '../../design-system/atoms/ItauButton';

export interface ExtratoScreenProps {
  onBack: () => void;
  className?: string;
}

interface TransactionItem {
  id: string;
  dateGroup: string;
  title: string;
  subtitle: string;
  amount: number;
  type: 'income' | 'expense';
  category: 'pix' | 'cartao' | 'transferencia' | 'boleto' | 'investimento';
  icon: React.ReactNode;
  iconBg: 'orange' | 'light' | 'gray' | 'green';
  installments?: string;
  authCode: string;
  timestamp: string;
}

export const ExtratoScreen: React.FC<ExtratoScreenProps> = ({
  onBack,
  className = '',
}) => {
  const [showBalance, setShowBalance] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '15' | '30' | 'mes'>('mes');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // BigQuery Connection State
  const [bqStatus, setBqStatus] = useState<{
    connected: boolean;
    loading: boolean;
    source: string;
    totalRows: number;
    error?: string;
    serviceAccount: string;
    targetProject: string;
    table: string;
    requiredRoles: string[];
    iamConsoleUrl: string;
  }>({
    connected: false,
    loading: true,
    source: 'init',
    totalRows: 0,
    serviceAccount: 'ais-sandbox@ais-us-west2-f2e32972e0d046d4b.iam.gserviceaccount.com',
    targetProject: 'batalha-time-04-z85x',
    table: 'extrato_sintetico',
    requiredRoles: [
      'roles/bigquery.dataViewer',
      'roles/bigquery.jobUser',
      'roles/serviceusage.serviceUsageConsumer',
    ],
    iamConsoleUrl: 'https://console.cloud.google.com/iam-admin/iam?project=batalha-time-04-z85x',
  });
  const [isBqModalOpen, setIsBqModalOpen] = useState(false);

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const rawTransactions: TransactionItem[] = [
    {
      id: 'tx-1',
      dateGroup: 'Hoje, 3 de maio',
      title: 'Mercado Livre',
      subtitle: 'Cartão de crédito Itaú Click',
      amount: 470.25,
      type: 'expense',
      category: 'cartao',
      icon: <ShoppingBag className="w-4 h-4" />,
      iconBg: 'gray',
      installments: 'Em 2x',
      authCode: 'ITAU-AUTH-99214-ML',
      timestamp: 'Hoje às 14:32',
    },
    {
      id: 'tx-2',
      dateGroup: 'Hoje, 3 de maio',
      title: 'Pagamento de Fatura Itaú',
      subtitle: 'Cartão Itaú Click final 1226',
      amount: 1000.0,
      type: 'expense',
      category: 'cartao',
      icon: <Coins className="w-4 h-4" />,
      iconBg: 'orange',
      authCode: 'ITAU-AUTH-88412-FAT',
      timestamp: 'Hoje às 11:15',
    },
    {
      id: 'tx-3',
      dateGroup: 'Hoje, 3 de maio',
      title: 'Starbucks Coffee',
      subtitle: 'Apple Pay • Cartão Click',
      amount: 40.5,
      type: 'expense',
      category: 'cartao',
      icon: <Coffee className="w-4 h-4" />,
      iconBg: 'gray',
      authCode: 'ITAU-AUTH-77149-SB',
      timestamp: 'Hoje às 09:05',
    },
    {
      id: 'tx-4',
      dateGroup: 'Ontem, 2 de maio',
      title: 'Tech Solutions Brasil Ltda',
      subtitle: 'Transferência Pix recebida',
      amount: 12500.0,
      type: 'income',
      category: 'pix',
      icon: <PixIcon className="w-4 h-4 text-emerald-600 fill-emerald-600" />,
      iconBg: 'green',
      authCode: 'PIX-E00000000202605021200',
      timestamp: '2 de maio às 10:20',
    },
    {
      id: 'tx-5',
      dateGroup: 'Ontem, 2 de maio',
      title: 'Posto Ipiranga Jardins',
      subtitle: 'Débito em conta',
      amount: 210.0,
      type: 'expense',
      category: 'cartao',
      icon: <Fuel className="w-4 h-4" />,
      iconBg: 'gray',
      authCode: 'ITAU-AUTH-65492-POSTO',
      timestamp: '2 de maio às 19:45',
    },
    {
      id: 'tx-6',
      dateGroup: 'Ontem, 2 de maio',
      title: 'iFood Delivery',
      subtitle: 'Débito online',
      amount: 68.9,
      type: 'expense',
      category: 'cartao',
      icon: <Utensils className="w-4 h-4" />,
      iconBg: 'gray',
      authCode: 'ITAU-AUTH-55420-IFOOD',
      timestamp: '2 de maio às 21:10',
    },
    {
      id: 'tx-7',
      dateGroup: '28 de abril',
      title: 'Aplicação CDB Itaú DI 100%',
      subtitle: 'Reserva e Liquidez Diária',
      amount: 1500.0,
      type: 'expense',
      category: 'investimento',
      icon: <TrendingUp className="w-4 h-4 text-[#0047BA]" />,
      iconBg: 'light',
      authCode: 'ITAU-INV-33910-CDB',
      timestamp: '28 de abril às 15:00',
    },
    {
      id: 'tx-8',
      dateGroup: '28 de abril',
      title: 'Boleto Condomínio Residencial',
      subtitle: 'Pagamento de conta DDA',
      amount: 1250.0,
      type: 'expense',
      category: 'boleto',
      icon: <Building className="w-4 h-4" />,
      iconBg: 'orange',
      authCode: 'ITAU-BOL-44910-COND',
      timestamp: '28 de abril às 08:30',
    },
    {
      id: 'tx-9',
      dateGroup: '25 de abril',
      title: 'Netflix Assinatura Mensal',
      subtitle: 'Débito automático',
      amount: 55.9,
      type: 'expense',
      category: 'cartao',
      icon: <Tv className="w-4 h-4" />,
      iconBg: 'gray',
      authCode: 'ITAU-SUB-22190-NTFX',
      timestamp: '25 de abril às 04:00',
    },
    {
      id: 'tx-10',
      dateGroup: '25 de abril',
      title: 'Mariana Silva',
      subtitle: 'Pix enviado via chave celular',
      amount: 180.0,
      type: 'expense',
      category: 'pix',
      icon: <PixIcon className="w-4 h-4 text-[#EC7000] fill-[#EC7000]" />,
      iconBg: 'orange',
      authCode: 'PIX-E00000000202604251640',
      timestamp: '25 de abril às 16:40',
    },
  ];

  const [transactions, setTransactions] = useState<TransactionItem[]>(rawTransactions);

  const fetchBqData = async () => {
    setBqStatus((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/bigquery/extrato');
      const data = await res.json();
      const isOk = data.success === true;
      setBqStatus({
        connected: isOk,
        loading: false,
        source: data.source || 'api',
        totalRows: data.totalRows || (Array.isArray(data.data) ? data.data.length : 0),
        error: data.error,
        serviceAccount: data.serviceAccount || 'ais-sandbox@ais-us-west2-f2e32972e0d046d4b.iam.gserviceaccount.com',
        targetProject: data.targetProject || 'batalha-time-04-z85x',
        table: data.table || 'extrato_sintetico',
        requiredRoles: data.requiredRoles || [
          'roles/bigquery.dataViewer',
          'roles/bigquery.jobUser',
          'roles/serviceusage.serviceUsageConsumer',
        ],
        iamConsoleUrl: data.iamConsoleUrl || 'https://console.cloud.google.com/iam-admin/iam?project=batalha-time-04-z85x',
      });

      if (isOk && Array.isArray(data.data) && data.data.length > 0) {
        const mapped: TransactionItem[] = data.data.map((row: any, idx: number) => {
          const rawAmount = parseFloat(row.valor || row.amount || row.vl_transacao || -50);
          const isIncome = rawAmount > 0 || (row.tipo && String(row.tipo).toLowerCase().includes('cred'));
          const absAmount = Math.abs(rawAmount);
          const cat = (row.categoria || row.tipo || 'cartao').toLowerCase();

          return {
            id: row.id || `bq-tx-${idx}`,
            dateGroup: row.data ? `Data: ${row.data}` : 'Hoje, 3 de maio',
            title: row.descricao || row.estabelecimento || row.titulo || 'Transação BigQuery',
            subtitle: row.forma_pagamento || row.conta_origem || 'Conta Corrente Itaú',
            amount: absAmount,
            type: isIncome ? 'income' : 'expense',
            category: cat.includes('pix') ? 'pix' : cat.includes('boleto') ? 'boleto' : 'cartao',
            icon: cat.includes('pix') ? <PixIcon className="w-4 h-4 text-[#EC7000] fill-[#EC7000]" /> : <Coins className="w-4 h-4" />,
            iconBg: isIncome ? 'green' : 'orange',
            authCode: row.authCode || `BQ-AUTH-${idx + 1000}`,
            timestamp: row.data || 'Registrado no BigQuery',
          };
        });
        setTransactions(mapped);
      }
    } catch (err: any) {
      console.warn('Could not fetch BigQuery extrato:', err);
      setBqStatus((prev) => ({
        ...prev,
        loading: false,
        connected: false,
        error: err.message,
      }));
    }
  };

  React.useEffect(() => {
    fetchBqData();
  }, []);

  // Filtering transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Category filter
      if (selectedCategory !== 'todos' && tx.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = tx.title.toLowerCase().includes(query);
        const matchesSubtitle = tx.subtitle.toLowerCase().includes(query);
        const matchesAmount = tx.amount.toString().includes(query);
        return matchesTitle || matchesSubtitle || matchesAmount;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  // Group by dateGroup
  const groupedTransactions = useMemo(() => {
    const groups: { [date: string]: TransactionItem[] } = {};
    filteredTransactions.forEach((tx) => {
      if (!groups[tx.dateGroup]) {
        groups[tx.dateGroup] = [];
      }
      groups[tx.dateGroup].push(tx);
    });
    return groups;
  }, [filteredTransactions]);

  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'pix', label: 'Pix' },
    { id: 'cartao', label: 'Cartões' },
    { id: 'boleto', label: 'Boletos' },
    { id: 'investimento', label: 'Investimentos' },
  ];

  return (
    <div className={`flex flex-col h-full bg-[#F4F6F8] relative overflow-hidden font-sans text-slate-800 ${className}`}>
      {/* Toast */}
      {toastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-[#002244] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-slate-700 animate-fadeIn pointer-events-none">
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-100 shrink-0">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-1 text-slate-800 hover:text-[#EC7000] font-semibold text-sm transition-colors py-1 px-1 -ml-1 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700" />
          <span>Extrato</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Buscar lançamento"
            aria-label="Buscar"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => notify('Extrato exportado em PDF com sucesso!')}
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Exportar extrato"
            aria-label="Exportar"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* BigQuery Integration Indicator Bar */}
      <div className="bg-[#002244] text-white px-3.5 py-1.5 flex items-center justify-between text-[11px] shrink-0 border-b border-slate-700/80">
        <div className="flex items-center gap-1.5 truncate">
          <Database className="w-3.5 h-3.5 text-[#EC7000] shrink-0" />
          <span className="font-bold text-slate-100">BigQuery:</span>
          <span className="text-slate-300 font-mono text-[10px] truncate">
            {bqStatus.table}
          </span>
        </div>
        <button
          onClick={() => setIsBqModalOpen(true)}
          type="button"
          className="flex items-center gap-1 bg-white/10 hover:bg-white/20 active:scale-95 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer shrink-0 ml-2"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${bqStatus.connected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
          <span>{bqStatus.connected ? 'Conectado' : 'Conexão IAM'}</span>
        </button>
      </div>

      {/* BigQuery Connection Modal */}
      {isBqModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#002244] flex items-center justify-center text-[#EC7000]">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Google BigQuery</h3>
                  <p className="text-[11px] text-slate-500">Tabela de Extrato Sintético</p>
                </div>
              </div>
              <button
                onClick={() => setIsBqModalOpen(false)}
                type="button"
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl space-y-1.5 border border-slate-100 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Projeto:</span>
                  <span className="font-semibold text-slate-800">{bqStatus.targetProject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dataset:</span>
                  <span className="font-semibold text-slate-800">hackathon_dados</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tabela:</span>
                  <span className="font-semibold text-[#0047BA]">{bqStatus.table}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Origem:</span>
                  <span className={`font-semibold ${bqStatus.connected ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {bqStatus.connected ? 'Google Cloud BigQuery (Ao Vivo)' : 'Dados Sincronizados (Pendente IAM)'}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-3 text-amber-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Para liberar acesso ao vivo no GCP:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Conceda acesso à Service Account do Cloud Run no projeto <strong className="font-mono">{bqStatus.targetProject}</strong>:
                </p>
                <div className="bg-white/80 p-2 rounded-xl text-[10px] font-mono break-all select-all border border-amber-200 text-slate-800">
                  {bqStatus.serviceAccount}
                </div>
                <div className="text-[10px] text-amber-700 space-y-0.5">
                  <p className="font-semibold">Papéis necessários (IAM):</p>
                  <p>• BigQuery Data Viewer (<code className="font-mono text-[9px]">roles/bigquery.dataViewer</code>)</p>
                  <p>• BigQuery Job User (<code className="font-mono text-[9px]">roles/bigquery.jobUser</code>)</p>
                  <p>• Service Usage Consumer (<code className="font-mono text-[9px]">roles/serviceusage.serviceUsageConsumer</code>)</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  fetchBqData();
                  notify('Testando conexão com BigQuery...');
                }}
                disabled={bqStatus.loading}
                type="button"
                className="flex-1 py-2.5 px-3 bg-[#EC7000] hover:bg-[#d66400] text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${bqStatus.loading ? 'animate-spin' : ''}`} />
                <span>{bqStatus.loading ? 'Conectando...' : 'Reconectar BigQuery'}</span>
              </button>
              <a
                href={bqStatus.iamConsoleUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                title="Abrir IAM no Google Cloud Console"
              >
                <span>Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Optional Search Bar */}
      {isSearchOpen && (
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 animate-fadeIn shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, valor ou tipo..."
              className="w-full pl-9 pr-8 py-2 bg-slate-100 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EC7000]"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6 space-y-4">
        {/* Balance & Overview Card */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_14px_rgba(0,0,0,0.03)] border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Saldo da conta corrente</span>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
              aria-label={showBalance ? 'Ocultar saldo' : 'Mostrar saldo'}
            >
              {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          <div className="text-2xl font-black text-slate-900 tabular-nums mt-1 tracking-tight">
            {showBalance ? 'R$ 8.713,96' : '••••••••'}
          </div>

          <div className="text-[11px] text-slate-400 mt-0.5">
            + R$ 4.500,00 de limite da conta (Cheque Especial)
          </div>

          {/* Income vs Expense Pills */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
            <div className="bg-emerald-50/70 p-2.5 rounded-2xl border border-emerald-100/60">
              <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-bold">
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Entradas</span>
              </div>
              <div className="text-xs font-black text-emerald-800 tabular-nums mt-0.5">
                {showBalance ? '+ R$ 12.500,00' : '••••'}
              </div>
            </div>

            <div className="bg-orange-50/70 p-2.5 rounded-2xl border border-orange-100/60">
              <div className="flex items-center gap-1.5 text-[#EC7000] text-[11px] font-bold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Saídas</span>
              </div>
              <div className="text-xs font-black text-slate-900 tabular-nums mt-0.5">
                {showBalance ? '- R$ 4.837,72' : '••••'}
              </div>
            </div>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-2xl">
          {[
            { id: '7', label: '7 dias' },
            { id: '15', label: '15 dias' },
            { id: '30', label: '30 dias' },
            { id: 'mes', label: 'Mês atual' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedPeriod(tab.id as any)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                selectedPeriod === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Filters (Horizontal Scroll) */}
        <div className="overflow-x-auto no-scrollbar flex items-center gap-2 py-0.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#002244] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.id === 'pix' && (
                <PixIcon
                  className={`w-3.5 h-3.5 ${
                    selectedCategory === 'pix' ? 'text-[#32BCAD] fill-[#32BCAD]' : 'text-[#32BCAD] fill-[#32BCAD]'
                  }`}
                />
              )}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Grouped Transactions List */}
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-100">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Nenhum lançamento encontrado</p>
            <p className="text-xs text-slate-400 mt-1">
              Tente alterar os filtros ou a busca selecionada.
            </p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([date, txs]) => (
            <div
              key={date}
              className="bg-white rounded-3xl p-4 shadow-[0_2px_14px_rgba(0,0,0,0.03)] border border-slate-100"
            >
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {date}
              </div>

              <div className="divide-y divide-slate-100">
                {txs.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    icon={tx.icon}
                    iconBg={tx.iconBg}
                    title={tx.title}
                    subtitle={tx.subtitle}
                    amount={`${tx.type === 'income' ? '+ ' : '- '}R$ ${tx.amount
                      .toFixed(2)
                      .replace('.', ',')}`}
                    type={tx.type}
                    installments={tx.installments}
                    onClick={() => setSelectedTx(tx)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Primary Action Button - Strictly docked at the bottom of the screen */}
      <div className="p-4 border-t border-slate-100 bg-white/95 backdrop-blur-md shrink-0">
        <ItauButton
          variant="outline"
          size="md"
          fullWidth
          onClick={() => notify('Gerando relatório completo em PDF...')}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Exportar extrato completo (PDF / OFX)
        </ItauButton>
      </div>

      {/* Transaction Detail Bottom Sheet Modal (inside viewport) */}
      {selectedTx && (
        <div
          className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-fadeIn overflow-hidden"
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="w-full bg-white rounded-t-[28px] shadow-2xl flex flex-col max-h-[85%] animate-slideUp border-t border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="pt-2.5 pb-1 flex justify-center shrink-0">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-sm text-slate-900">Comprovante de Lançamento</h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="text-center py-2">
                <div
                  className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-2 ${
                    selectedTx.type === 'income'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {selectedTx.icon}
                </div>
                <div className="text-2xl font-black text-slate-900 tabular-nums">
                  {selectedTx.type === 'income' ? '+ ' : '- '}R${' '}
                  {selectedTx.amount.toFixed(2).replace('.', ',')}
                </div>
                <div className="text-sm font-bold text-slate-800 mt-1">{selectedTx.title}</div>
                <div className="text-xs text-slate-400">{selectedTx.subtitle}</div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Data e hora</span>
                  <span className="font-bold text-slate-800">{selectedTx.timestamp}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Instituição</span>
                  <span className="font-bold text-slate-800">Banco Itaú Unibanco S.A.</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Autenticação</span>
                  <span className="font-mono font-bold text-[11px] text-slate-700">
                    {selectedTx.authCode}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmado
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Action */}
            <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex gap-2">
              <ItauButton
                variant="outline"
                size="md"
                className="flex-1"
                onClick={() => setSelectedTx(null)}
              >
                Fechar
              </ItauButton>
              <ItauButton
                variant="primary"
                size="md"
                className="flex-1"
                onClick={() => {
                  notify('Comprovante copiado para compartilhamento!');
                  setSelectedTx(null);
                }}
                leftIcon={<Share2 className="w-4 h-4" />}
              >
                Compartilhar
              </ItauButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
