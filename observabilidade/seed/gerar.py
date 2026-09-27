"""Gera a base simulada de observabilidade e grava no BigQuery (e/ou em JSONL local).

O agente ainda não está em produção, então os eventos são simulados, mas com o vocabulário real dos serviços
(app/catalogo.py) e as regras do escopo:
- piloto A/B: metade dos clientes recebe o agente (tratamento) e metade não (controle, só resultado_ciclo);
- no máximo um aviso proativo por dia por cliente; quem desativa as notificações não recebe mais avisos;
- ajuste recusado duas vezes sai da lista daquele cliente (MAX_RECUSAS);
- o momento 3 (fora_da_curva) entra no ar depois do MVP (mes_lancamento_fora_da_curva);
- /analyze só pede consentimento em risco_vermelho e saldo_estimado_no_limite; ja_no_buraco vira atendimento humano.

Tendências de longo prazo embutidas (o que as métricas devem conseguir mostrar): like rate e aceite de ajustes
subindo com o tempo, fallback do filtro de saída caindo (iterações de prompt), semanas com pico de ataques
(E02/E04/E01) e menor entrada no negativo do tratamento a partir do 3º mês.

Uso:
    python -m seed.gerar                          # clientes do data_manager (fallback sintético) -> BigQuery
    python -m seed.gerar --sem-bq --saida-local /tmp/obs --fonte-clientes sintetico
"""

import argparse
import json
import logging
import math
import random
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from app.catalogo import (
    CODIGOS,
    MAX_RECUSAS,
    STATUS_COM_CONSENTIMENTO,
    STATUS_POR_ESTADO,
    Decisao,
    Estado,
    Fonte,
    GrupoAB,
    Momento,
    MotivoDislike,
    ResultadoAjuste,
    StatusAlerta,
    StatusChat,
    TipoAjuste,
    Voto,
)
from seed.schemas import TABELAS

log = logging.getLogger("seed")

BRT = timezone(timedelta(hours=-3))
# Taxa do limite calibrada na base pelo data_manager (data_manager.parametros.taxa_juros_limite_dia).
TAXA_JUROS_LIMITE_DIA = 0.0010187
SQL_DIR = Path(__file__).parent.parent / "sql"

# Categorias que o /savings do financial-agent aceita como gasto discricionário.
CATEGORIAS_DISCRICIONARIAS = ["Delivery", "Restaurantes", "Lazer", "Lojas e sites", "Viagens"]
GRUPOS_ASSINATURA = ["video", "musica"]

# Chance de o cliente entrar no negativo no mês, por estado do mês.
P_NEGATIVO = {
    Estado.fecha_bem: 0.02,
    Estado.zero_a_zero: 0.12,
    Estado.vai_faltar: 0.40,
    Estado.ja_no_buraco: 0.90,
}
PESOS_ESTADO = {Estado.fecha_bem: 0.48, Estado.zero_a_zero: 0.24, Estado.vai_faltar: 0.24, Estado.ja_no_buraco: 0.04}

PESOS_ATAQUE_NORMAL = {
    "E05": 0.24, "E09": 0.24, "E02": 0.10, "E04": 0.08, "E01": 0.07,
    "E03": 0.07, "E07": 0.06, "E08": 0.04, "E06": 0.05, "E10": 0.05,
}
PESOS_ATAQUE_PICO = {"E02": 0.45, "E04": 0.30, "E01": 0.15, "E03": 0.05, "E10": 0.05}
PESOS_SAIDA = {
    "S07": 0.35, "S02": 0.20, "S08": 0.15, "S01": 0.08, "S06": 0.06,
    "S03": 0.06, "S04": 0.04, "S05": 0.03, "S09": 0.03,
}
PESOS_FILTRO = {"AG_FILTRO_NUMERO": 0.60, "AG_FILTRO_TERMO_PROTEGIDO": 0.25, "AG_FILTRO_ESCOPO": 0.15}
PESOS_MOTIVO = {
    "normal": {MotivoDislike.nao_entendi: 0.4, MotivoDislike.numero_errado: 0.3,
               MotivoDislike.fora_do_escopo: 0.15, MotivoDislike.insistente: 0.15},
    "filtro": {MotivoDislike.nao_entendi: 0.6, MotivoDislike.fora_do_escopo: 0.2,
               MotivoDislike.numero_errado: 0.1, MotivoDislike.insistente: 0.1},
    "escopo": {MotivoDislike.fora_do_escopo: 0.7, MotivoDislike.nao_entendi: 0.3},
    "bloqueio": {MotivoDislike.nao_entendi: 0.5, MotivoDislike.fora_do_escopo: 0.5},
    "atendimento": {MotivoDislike.nao_entendi: 0.5, MotivoDislike.fora_do_escopo: 0.5},
    "alerta": {MotivoDislike.insistente: 0.5, MotivoDislike.numero_errado: 0.25, MotivoDislike.nao_entendi: 0.25},
    "ajustes": {MotivoDislike.numero_errado: 0.4, MotivoDislike.nao_entendi: 0.3, MotivoDislike.insistente: 0.3},
}
AJUSTE_P = {"normal": -0.0, "filtro": -0.30, "escopo": -0.20, "bloqueio": -0.15,
            "atendimento": -0.05, "alerta": -0.02, "ajustes": 0.05}


@dataclass
class Params:
    seed: int = 42
    n_clientes: int = 400
    data_inicio: date = date(2025, 1, 1)
    data_fim: date = date(2025, 12, 31)
    # Mês do piloto (1 = primeiro) em que o momento 3 (gasto fora da curva) entra no ar.
    mes_lancamento_fora_da_curva: int = 7
    semanas_de_pico: int = 3


@dataclass
class Cliente:
    id_usuario: str
    estado: Estado
    score_alerta: int
    origem_dado: str
    grupo: GrupoAB = GrupoAB.controle
    canal: str = "push"
    entrou_em: date = date(2025, 1, 1)
    dia_salario: int = 5
    notificacoes_ativas: bool = True
    chaves_ajuste: list[str] = field(default_factory=list)
    recusas: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    dias_notificados: set[date] = field(default_factory=set)
    negativos_seguidos: int = 0


def _meses(inicio: date, fim: date) -> list[date]:
    meses, d = [], inicio.replace(day=1)
    while d <= fim:
        meses.append(d)
        d = (d.replace(day=28) + timedelta(days=4)).replace(day=1)
    return meses


def _fim_do_mes(mes: date) -> date:
    return (mes.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)


def _iso(v: Any) -> Any:
    return v.isoformat() if isinstance(v, (date, datetime)) else v


class Gerador:
    def __init__(self, params: Params, base: list[dict[str, Any]]) -> None:
        self.p = params
        self.rng = random.Random(params.seed)
        self.linhas: dict[str, list[dict[str, Any]]] = {t.nome: [] for t in TABELAS}
        self.meses = _meses(params.data_inicio, params.data_fim)
        self.clientes = self._montar_clientes(base)
        semanas = sorted({(d.isocalendar()[0], d.isocalendar()[1]) for d in self._dias()})
        self.semanas_pico = set(self.rng.sample(semanas[4:], min(params.semanas_de_pico, max(len(semanas) - 4, 0))))
        self._progresso = 0.0

    # ------------------------------------------------------------------ utilitários
    def _id(self) -> str:
        return str(uuid.UUID(int=self.rng.getrandbits(128), version=4))

    def _escolher(self, pesos: dict[Any, float]) -> Any:
        return self.rng.choices(list(pesos), weights=list(pesos.values()))[0]

    def _poisson(self, lam: float) -> int:
        limite, k, prod = math.exp(-lam), 0, self.rng.random()
        while prod > limite:
            k += 1
            prod *= self.rng.random()
        return k

    def _dias(self) -> list[date]:
        return [self.p.data_inicio + timedelta(days=i) for i in range((self.p.data_fim - self.p.data_inicio).days + 1)]

    def _instante(self, dia: date) -> datetime:
        return datetime(dia.year, dia.month, dia.day, self.rng.randint(8, 21), self.rng.randint(0, 59),
                        self.rng.randint(0, 59), tzinfo=BRT)

    def _add(self, tabela: str, **linha: Any) -> dict[str, Any]:
        self.linhas[tabela].append(linha)
        return linha

    # ------------------------------------------------------------------ clientes
    def _montar_clientes(self, base: list[dict[str, Any]]) -> list[Cliente]:
        clientes = [
            Cliente(b["id_usuario"], Estado(b["estado"]), int(b.get("score_alerta") or 0), b["origem_dado"])
            for b in base
        ]
        self.rng.shuffle(clientes)
        for i, c in enumerate(clientes):
            c.grupo = GrupoAB.tratamento if i % 2 == 0 else GrupoAB.controle
            c.canal = self._escolher({"push": 0.6, "chat_app": 0.3, "tela_pix": 0.1})
            # Entrada escalonada no piloto nas primeiras semanas.
            c.entrou_em = self.p.data_inicio + timedelta(days=self.rng.randint(0, 45))
            c.dia_salario = self.rng.randint(5, 7)
            chaves = [f"{TipoAjuste.assinatura_redundante}:{g}" for g in GRUPOS_ASSINATURA if self.rng.random() < 0.35]
            chaves += [f"{TipoAjuste.gasto_discricionario}:{cat}"
                       for cat in self.rng.sample(CATEGORIAS_DISCRICIONARIAS, self.rng.randint(1, 2))]
            c.chaves_ajuste = chaves
        return clientes

    def _proximo_estado(self, c: Cliente, meses_ativos: int) -> Estado:
        if c.negativos_seguidos >= 3:
            return Estado.ja_no_buraco
        permanencia = 0.70 if c.estado == Estado.ja_no_buraco else 0.72
        if self.rng.random() < permanencia:
            return c.estado
        pesos = dict(PESOS_ESTADO)
        if c.grupo == GrupoAB.tratamento:
            efeito = min(1.0, meses_ativos / 4)
            pesos[Estado.fecha_bem] += 0.12 * efeito
            pesos[Estado.zero_a_zero] += 0.05 * efeito
            pesos[Estado.vai_faltar] -= 0.12 * efeito
            pesos[Estado.ja_no_buraco] -= 0.05 * efeito
        return self._escolher(pesos)

    def _p_negativo(self, c: Cliente, meses_ativos: int) -> float:
        p = P_NEGATIVO[c.estado]
        # Efeito do agente a partir do 3º mês de piloto, só nos estados em que ele otimiza.
        if c.grupo == GrupoAB.tratamento and meses_ativos >= 2 and c.estado in (Estado.vai_faltar, Estado.zero_a_zero):
            p *= 1 - min(0.35, 0.10 * (meses_ativos - 1))
        return p

    # ------------------------------------------------------------------ geração
    def gerar(self) -> dict[str, list[dict[str, Any]]]:
        for c in self.clientes:
            self._add("clientes", id_usuario=c.id_usuario, grupo_ab=c.grupo.value, estado_inicial=c.estado.value,
                      score_alerta=c.score_alerta, canal_preferido=c.canal, notificacoes_ativas=True,
                      entrou_em=c.entrou_em, origem_dado=c.origem_dado)
        for i, mes in enumerate(self.meses):
            self._progresso = i / max(len(self.meses) - 1, 1)
            for c in self.clientes:
                if _fim_do_mes(mes) < c.entrou_em:
                    continue
                meses_ativos = i - self.meses.index(c.entrou_em.replace(day=1))
                if meses_ativos > 0:
                    c.estado = self._proximo_estado(c, meses_ativos)
                if c.grupo == GrupoAB.tratamento:
                    self._mes_tratamento(c, mes, i)
                self._resultado_ciclo(c, mes, meses_ativos)
        # Estado final das notificações (quem desativou durante o piloto).
        ativos = {c.id_usuario: c.notificacoes_ativas for c in self.clientes}
        for linha in self.linhas["clientes"]:
            linha["notificacoes_ativas"] = ativos[linha["id_usuario"]]
        return self.linhas

    def _resultado_ciclo(self, c: Cliente, mes: date, meses_ativos: int) -> None:
        negativo = self.rng.random() < self._p_negativo(c, meses_ativos)
        c.negativos_seguidos = c.negativos_seguidos + 1 if negativo else 0
        dias = 0
        juros = 0.0
        if negativo:
            dias = self.rng.randint(10, 30) if c.estado == Estado.ja_no_buraco else self.rng.randint(1, 12)
            juros = round(dias * self.rng.uniform(200, 1500) * TAXA_JUROS_LIMITE_DIA, 2)
        self._add("resultado_ciclo", id_usuario=c.id_usuario, mes=mes, grupo_ab=c.grupo.value,
                  estado_mes=c.estado.value, entrou_no_negativo=negativo, chegou_ao_salario_sem_limite=not negativo,
                  dias_no_limite=dias, juros_pagos=juros)

    def _mes_tratamento(self, c: Cliente, mes: date, i_mes: int) -> None:
        inicio, fim = max(mes, c.entrou_em), min(_fim_do_mes(mes), self.p.data_fim)
        avisos: list[tuple[date, Momento]] = []

        dia_sal = mes.replace(day=c.dia_salario)
        if inicio <= dia_sal <= fim and (c.estado != Estado.fecha_bem or self.rng.random() < 0.6):
            avisos.append((dia_sal, Momento.salario))
        if c.estado in (Estado.vai_faltar, Estado.zero_a_zero):
            n_pix = self.rng.choice([0, 1, 1, 2, 3] if c.estado == Estado.vai_faltar else [0, 0, 1])
            for _ in range(n_pix):
                avisos.append((self._dia_entre(inicio, fim), Momento.pix_compra))
            if i_mes + 1 >= self.p.mes_lancamento_fora_da_curva and self.rng.random() < 0.5:
                avisos.append((self._dia_entre(max(inicio, mes.replace(day=12)), fim), Momento.fora_da_curva))

        for dia, momento in sorted(avisos, key=lambda a: a[0]):
            # Frequência controlada: sem notificação repetida no mesmo dia; notificações desativadas não recebem aviso.
            if not c.notificacoes_ativas or dia in c.dias_notificados or not (inicio <= dia <= fim):
                continue
            c.dias_notificados.add(dia)
            self._alerta(c, self._instante(dia), momento)

        # Conversas abertas pelo cliente (/chat): adoção cresce ao longo do piloto.
        for _ in range(self._poisson(0.5 + 1.5 * self._progresso)):
            self._conversa_cliente(c, self._instante(self._dia_entre(inicio, fim)))

    def _dia_entre(self, a: date, b: date) -> date:
        if b < a:
            return a
        return a + timedelta(days=self.rng.randint(0, (b - a).days))

    # ------------------------------------------------------------------ eventos
    def _conversa(self, c: Cliente, ts: datetime, origem: str, momento: Momento | None) -> dict[str, Any]:
        return self._add("conversas", conversa_id=self._id(), sessao_id=self._id(), id_usuario=c.id_usuario,
                         iniciada_em=ts, encerrada_em=ts, origem=origem, momento=momento.value if momento else None,
                         estado_cliente=c.estado.value, n_turnos=0, teve_intervencao=False,
                         encaminhada_atendimento=False)

    def _mensagem(self, conv: dict[str, Any], papel: str, ts: datetime, endpoint: str,
                  status: str | None = None, latencia: float | None = None, reescrita: bool = False) -> dict[str, Any]:
        conv["encerrada_em"] = max(conv["encerrada_em"], ts)
        if papel == "agente":
            conv["n_turnos"] += 1
        return self._add("mensagens", mensagem_id=self._id(), conversa_id=conv["conversa_id"],
                         id_usuario=conv["id_usuario"], papel=papel, criado_em=ts, endpoint=endpoint, status=status,
                         latencia_agente_ms=round(latencia, 1) if latencia is not None else None, reescrita=reescrita)

    def _intervencao(self, conv: dict[str, Any], msg: dict[str, Any], codigo: str, tentativa: int = 1) -> None:
        cod = CODIGOS[codigo]
        conv["teve_intervencao"] = True
        camada, degradado, latencia = None, None, None
        if cod.fonte == Fonte.guardrails:
            # Medições da sessão do guardrails: regras < 1 ms, Gemini Flash-Lite ~450–750 ms, fail-open raro.
            degradado = self.rng.random() < 0.02
            camada = "regra" if degradado or self.rng.random() < 0.7 else "gemini"
            latencia = self.rng.uniform(0.1, 0.7) if camada == "regra" else self.rng.uniform(450, 750)
        self._add("intervencoes", intervencao_id=self._id(), conversa_id=conv["conversa_id"],
                  mensagem_id=msg["mensagem_id"], id_usuario=conv["id_usuario"], criado_em=msg["criado_em"],
                  fonte=cod.fonte.value, direcao=cod.direcao, codigo=cod.codigo, categoria=cod.categoria,
                  decisao=cod.decisao.value, camada=camada, degradado=degradado, tentativa=tentativa,
                  latencia_ms=round(latencia, 2) if latencia is not None else None)

    def _feedback(self, msg: dict[str, Any], contexto: str) -> None:
        if self.rng.random() > 0.20:
            return
        p_up = min(max(0.58 + 0.20 * self._progresso + AJUSTE_P[contexto], 0.05), 0.95)
        voto = Voto.up if self.rng.random() < p_up else Voto.down
        motivo = None
        if voto == Voto.down and self.rng.random() < 0.7:
            motivo = self._escolher(PESOS_MOTIVO[contexto]).value
        self._add("feedback_mensagens", feedback_id=self._id(), mensagem_id=msg["mensagem_id"],
                  conversa_id=msg["conversa_id"], id_usuario=msg["id_usuario"],
                  criado_em=msg["criado_em"] + timedelta(seconds=self.rng.randint(5, 120)), voto=voto.value,
                  motivo=motivo)

    def _latencia_llm(self) -> float:
        # O agente leva de 500 ms a 42 s por resposta (sessão do guardrails).
        return min(max(self.rng.lognormvariate(math.log(2200), 0.6), 500), 42000)

    def _alerta(self, c: Cliente, ts: datetime, momento: Momento) -> None:
        status = STATUS_POR_ESTADO[c.estado] if self.rng.random() > 0.01 else StatusAlerta.dados_insuficientes
        conv = self._conversa(c, ts, "proativa", momento)
        msg = self._mensagem(conv, "agente", ts, "/analyze", status.value, self.rng.uniform(400, 1500))
        self._feedback(msg, "alerta")

        requer = status in STATUS_COM_CONSENTIMENTO
        consentiu, n_ajustes = None, 0
        if status == StatusAlerta.atendimento_humano:
            conv["encaminhada_atendimento"] = True
            self._intervencao(conv, msg, "AG_ATENDIMENTO_HUMANO")
        if requer:
            p_sim = (0.40 if status == StatusAlerta.risco_vermelho else 0.30) + 0.15 * self._progresso
            r = self.rng.random()
            if r < p_sim + 0.35:
                consentiu = r < p_sim
                t = ts + timedelta(seconds=self.rng.randint(10, 600))
                self._mensagem(conv, "cliente", t, "/savings" if consentiu else "/analyze")
                if consentiu:
                    t += timedelta(seconds=2)
                    resp = self._mensagem(conv, "agente", t, "/savings", "ajustes", self.rng.uniform(300, 1200))
                    n_ajustes = self._ajustes(c, t, momento, conv)
                    self._feedback(resp, "ajustes")

        # Guardrail de produto: desativação das notificações (Pix é o momento mais intrusivo).
        p_desativar = 0.015 if momento == Momento.pix_compra else 0.006
        desativou = self.rng.random() < p_desativar
        if desativou:
            c.notificacoes_ativas = False
        self._add("alertas", alerta_id=self._id(), id_usuario=c.id_usuario, conversa_id=conv["conversa_id"],
                  criado_em=ts, momento=momento.value, estado_cliente=c.estado.value, score_alerta=c.score_alerta,
                  status_alerta=status.value, requer_consentimento=requer, consentiu=consentiu,
                  n_ajustes_oferecidos=n_ajustes, desativou_notificacao=desativou)
        # alerta_id dos ajustes: preenchido depois porque o alerta é gravado por último.
        for aj in self.linhas["ajustes_oferecidos"][len(self.linhas["ajustes_oferecidos"]) - n_ajustes:]:
            aj["alerta_id"] = self.linhas["alertas"][-1]["alerta_id"]

    def _ajustes(self, c: Cliente, ts: datetime, momento: Momento, conv: dict[str, Any]) -> int:
        candidatos = [k for k in c.chaves_ajuste if c.recusas[k] < MAX_RECUSAS]
        self.rng.shuffle(candidatos)
        if momento == Momento.pix_compra:
            # Mudança de data é específica do Pix/compra em questão; não repete entre avisos.
            candidatos.insert(0, f"{TipoAjuste.mudanca_data}:{conv['conversa_id'][:8]}")
        oferecidos = candidatos[:3]
        for chave in oferecidos:
            tipo = TipoAjuste(chave.split(":")[0])
            valor = {
                TipoAjuste.assinatura_redundante: self.rng.uniform(20, 60),
                TipoAjuste.gasto_discricionario: self.rng.uniform(80, 400),
                TipoAjuste.mudanca_data: self.rng.uniform(100, 1500),
            }[tipo]
            p_aceite = 0.28 + 0.12 * self._progresso + (0.10 if tipo == TipoAjuste.mudanca_data else 0.0)
            resultado = self._escolher({
                ResultadoAjuste.aceito: p_aceite, ResultadoAjuste.recusado: 0.22,
                ResultadoAjuste.agora_nao: 0.25, ResultadoAjuste.ignorado: max(0.25 - 0.12 * self._progresso, 0.05),
            })
            if resultado == ResultadoAjuste.recusado:
                c.recusas[chave] += 1
            impacto = self.rng.randint(0, 8)
            self._add("ajustes_oferecidos", ajuste_id=self._id(), alerta_id=None, id_usuario=c.id_usuario,
                      criado_em=ts + timedelta(seconds=self.rng.randint(5, 900)), tipo=tipo.value, chave=chave,
                      valor=round(valor, 2), impacto_dias=impacto, resolve=impacto >= 3 and self.rng.random() < 0.6,
                      resultado=resultado.value)
        return len(oferecidos)

    def _conversa_cliente(self, c: Cliente, ts: datetime) -> None:
        conv = self._conversa(c, ts, "cliente", None)
        semana = ts.isocalendar()[:2]
        pico = semana in self.semanas_pico
        t = ts
        for _ in range(self.rng.choice([1, 1, 2, 2, 3, 4, 5])):
            t += timedelta(seconds=self.rng.randint(15, 240))
            pergunta = self._mensagem(conv, "cliente", t, "/chat")

            if c.estado == Estado.ja_no_buraco:
                resp = self._mensagem(conv, "agente", t + timedelta(seconds=1), "/chat",
                                      StatusChat.atendimento_humano.value, self.rng.uniform(150, 600))
                conv["encaminhada_atendimento"] = True
                self._intervencao(conv, resp, "AG_ATENDIMENTO_HUMANO")
                self._feedback(resp, "atendimento")
                break

            # Guardrail de entrada (simula a integração orquestrador -> guardrails-itau).
            if self.rng.random() < 0.012 * (6 if pico else 1):
                codigo = self._escolher(PESOS_ATAQUE_PICO if pico else PESOS_ATAQUE_NORMAL)
                self._intervencao(conv, pergunta, codigo)
                if CODIGOS[codigo].decisao == Decisao.bloquear:
                    resp = self._mensagem(conv, "agente", t + timedelta(seconds=1), "/chat", "bloqueado_guardrail",
                                          self.rng.uniform(5, 800))
                    self._feedback(resp, "bloqueio")
                    if self.rng.random() < 0.6:
                        break
                    continue

            if self.rng.random() < 0.07:
                resp = self._mensagem(conv, "agente", t + timedelta(seconds=1), "/chat",
                                      StatusChat.fora_escopo.value, self.rng.uniform(150, 600))
                self._intervencao(conv, resp, self._escolher({"AG_ESCOPO_INVEST": 0.45, "AG_ESCOPO_GERAL": 0.55}))
                self._feedback(resp, "escopo")
                continue

            latencia = self._latencia_llm()
            filtrada = self.rng.random() < 0.13 - 0.08 * self._progresso
            saida = self.rng.random() < 0.012
            resp = self._mensagem(conv, "agente", t + timedelta(milliseconds=latencia), "/chat",
                                  StatusChat.respondido.value, latencia, reescrita=filtrada or saida)
            if filtrada:
                self._intervencao(conv, resp, self._escolher(PESOS_FILTRO))
            if saida:
                self._intervencao(conv, resp, self._escolher(PESOS_SAIDA))
            self._feedback(resp, "filtro" if filtrada else "normal")


# ---------------------------------------------------------------------- entrada e saída
def clientes_base(n: int, fonte: str, seed: int) -> list[dict[str, Any]]:
    """Clientes reais do data_manager (somente leitura) ou sintéticos, sempre em ordem determinística."""
    rng = random.Random(seed)
    if fonte in ("auto", "data_manager"):
        try:
            from app import bq

            linhas = bq.run("SELECT id_usuario, estado, score_alerta FROM `$dm.status_cliente` ORDER BY id_usuario")
            escolhidos = rng.sample(linhas, min(n, len(linhas)))
            log.info("clientes: %d do data_manager.status_cliente", len(escolhidos))
            return [{**e, "origem_dado": "data_manager"} for e in escolhidos]
        except Exception as exc:
            if fonte == "data_manager":
                raise
            log.warning("data_manager.status_cliente indisponível (%s); usando clientes sintéticos", exc)
    estados = list(PESOS_ESTADO)
    return [
        {
            "id_usuario": str(uuid.UUID(int=rng.getrandbits(128), version=4)),
            "estado": rng.choices(estados, weights=list(PESOS_ESTADO.values()))[0].value,
            "score_alerta": rng.randint(0, 6),
            "origem_dado": "sintetico",
        }
        for _ in range(n)
    ]


def serializar(linhas: dict[str, list[dict[str, Any]]]) -> dict[str, list[dict[str, Any]]]:
    return {t: [{k: _iso(v) for k, v in linha.items()} for linha in ls] for t, ls in linhas.items()}


def gravar_local(linhas: dict[str, list[dict[str, Any]]], pasta: Path) -> None:
    pasta.mkdir(parents=True, exist_ok=True)
    for tabela, ls in linhas.items():
        with open(pasta / f"{tabela}.jsonl", "w") as f:
            for linha in ls:
                f.write(json.dumps(linha, ensure_ascii=False) + "\n")
    log.info("JSONL gravado em %s", pasta)


def gravar_bq(linhas: dict[str, list[dict[str, Any]]]) -> None:
    from google.cloud import bigquery

    from app import bq

    for t in TABELAS:
        config = bigquery.LoadJobConfig(
            schema=t.schema,
            write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
            clustering_fields=["id_usuario"],
            time_partitioning=bigquery.TimePartitioning(field=t.campo_particao) if t.campo_particao else None,
        )
        bq.client().load_table_from_json(linhas[t.nome], bq.table(t.nome), job_config=config).result()
        log.info("%s: %d linhas", t.nome, len(linhas[t.nome]))
    bq.run((SQL_DIR / "90_views.sql").read_text())
    log.info("views criadas")


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--seed", type=int, default=Params.seed)
    ap.add_argument("--clientes", type=int, default=Params.n_clientes)
    ap.add_argument("--data-inicio", type=date.fromisoformat, default=Params.data_inicio)
    ap.add_argument("--data-fim", type=date.fromisoformat, default=Params.data_fim)
    ap.add_argument("--fonte-clientes", choices=["auto", "data_manager", "sintetico"], default="auto")
    ap.add_argument("--saida-local", type=Path, help="pasta para gravar um JSONL por tabela")
    ap.add_argument("--sem-bq", action="store_true", help="não grava no BigQuery")
    a = ap.parse_args()

    params = Params(seed=a.seed, n_clientes=a.clientes, data_inicio=a.data_inicio, data_fim=a.data_fim)
    linhas = serializar(Gerador(params, clientes_base(a.clientes, a.fonte_clientes, a.seed)).gerar())
    for tabela, ls in linhas.items():
        log.info("%-20s %7d linhas", tabela, len(ls))
    if a.saida_local:
        gravar_local(linhas, a.saida_local)
    if not a.sem_bq:
        gravar_bq(linhas)


if __name__ == "__main__":
    main()
