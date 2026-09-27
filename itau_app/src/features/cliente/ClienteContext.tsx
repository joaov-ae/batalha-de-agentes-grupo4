/**
 * Perfil da cliente exibida no app: nome fictício, números reais (data_manager / BigQuery).
 * Carregado uma vez de /api/cliente e compartilhado por todas as telas.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface GrupoFixas {
  nome: string;
  icone: string;
  valor: number;
  percentual: number;
  itens: string[];
}

export interface TetoCategoria {
  categoria: string;
  descricao: string;
  valor: number;
  percentual: number;
  cor: string;
}

export interface PerfilCliente {
  idUsuario: string;
  nome: string;
  primeiroNome: string;
  iniciais: string;
  segmento: string;
  nivel: number;
  saldoHoje: number;
  limiteConta: number;
  renda: { mensal: number; salario: number; outras: number; salarioDia: number; salarioData: string };
  fixas: { total: number; percentualRenda: number; grupos: GrupoFixas[] };
  sobraAposFixas: number;
  sobraAposFixasPct: number;
  faturaCartao: number;
  gastosMedios: { categoria: string; media: number }[];
  estiloDeVidaMedio: number;
  transporteMedio: number;
  tetos: TetoCategoria[];
  situacao: { estado: string; saldoVesperaSalario: number; proximoSalario: string; sobraPorDia: number };
  historico: { meses: number; mesesNoNegativo: number; quais: string[] };
  origem: string;
}

// Mesmos números da cópia do data_manager (data/plano-salario-snapshot.json), usados até a API responder
const PERFIL_INICIAL: PerfilCliente = {
  idUsuario: '5865ce27-0681-4dcc-9475-3df9d15a6858',
  nome: 'Renata Lopes',
  primeiroNome: 'Renata',
  iniciais: 'RL',
  segmento: 'Itaú Personnalité',
  nivel: 4,
  saldoHoje: 2794.3,
  limiteConta: 28000,
  renda: { mensal: 8058.12, salario: 5366.81, outras: 2691.31, salarioDia: 7, salarioData: '7 de janeiro' },
  fixas: { total: 6517.29, percentualRenda: 80.9, grupos: [] },
  sobraAposFixas: 1540.83,
  sobraAposFixasPct: 19.1,
  faturaCartao: 805.47,
  gastosMedios: [],
  estiloDeVidaMedio: 0,
  transporteMedio: 0,
  tetos: [],
  situacao: { estado: 'zero_a_zero', saldoVesperaSalario: 107.45, proximoSalario: '7 de janeiro', sobraPorDia: 31.73 },
  historico: { meses: 12, mesesNoNegativo: 3, quais: ['ago/25', 'out/25', 'nov/25'] },
  origem: 'inicial',
};

const ClienteContext = createContext<PerfilCliente>(PERFIL_INICIAL);

export const ClienteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [perfil, setPerfil] = useState<PerfilCliente>(PERFIL_INICIAL);

  useEffect(() => {
    fetch('/api/cliente')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((p: PerfilCliente) => setPerfil(p))
      .catch(() => {});
  }, []);

  return <ClienteContext.Provider value={perfil}>{children}</ClienteContext.Provider>;
};

export const useCliente = () => useContext(ClienteContext);

export const brlCliente = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: casas, maximumFractionDigits: casas });
