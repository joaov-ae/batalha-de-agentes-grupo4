"""Orquestração dos guardrails: regras (sempre) -> camada semântica (Gemini + Model Armor em paralelo).

Latência:
- Regras determinísticas rodam sempre (<5 ms). Violação de bloqueio faz short-circuit, sem rede.
- Gemini e Model Armor rodam em paralelo, com orçamento de `timeout_semantico_ms`. O que não voltar a
  tempo é cancelado e vale o veredito das regras (fail-open, `degradado=true`).
- Cache LRU com TTL pelo hash do texto normalizado.
"""

import asyncio
import hashlib
import json
import logging
import time
from collections import OrderedDict
from typing import Any

from app.catalogo import CATALOGO, ORDEM_DECISAO, Decisao, Severidade
from app.config import Settings
from app.normalizar import normalizar
from app.regras import entrada as regras_entrada
from app.regras import saida as regras_saida
from app.regras.comum import Achado, mascarar
from app.schemas import EntradaRequest, SaidaRequest, Veredito, Violacao
from app.semantico.base import Avaliador, Direcao

log = logging.getLogger("guardrails")


class CacheTTL:
    def __init__(self, tamanho: int, ttl_s: int):
        self._dados: OrderedDict[str, tuple[float, Veredito]] = OrderedDict()
        self._tamanho = tamanho
        self._ttl = ttl_s

    def get(self, chave: str) -> Veredito | None:
        item = self._dados.get(chave)
        if item is None:
            return None
        criado, veredito = item
        if time.monotonic() - criado > self._ttl:
            del self._dados[chave]
            return None
        self._dados.move_to_end(chave)
        return veredito

    def set(self, chave: str, veredito: Veredito) -> None:
        self._dados[chave] = (time.monotonic(), veredito)
        self._dados.move_to_end(chave)
        while len(self._dados) > self._tamanho:
            self._dados.popitem(last=False)


def _violacao(a: Achado) -> Violacao:
    return Violacao(
        codigo=a.codigo, categoria=CATALOGO[a.codigo].categoria, severidade=a.severidade, camada="regra",
        evidencia=a.evidencia,
    )


def _descartar(tarefa: asyncio.Task) -> None:
    if not tarefa.cancelled() and tarefa.exception() is not None:
        log.warning("camada semântica atrasada falhou: %r", tarefa.exception())


def _chave(*partes: Any) -> str:
    return hashlib.sha256(json.dumps(partes, ensure_ascii=False, sort_keys=True, default=str).encode()).hexdigest()


class Motor:
    def __init__(self, settings: Settings, avaliadores: list[Avaliador] | None = None):
        self.settings = settings
        self.avaliadores = avaliadores or []
        self.cache = CacheTTL(settings.cache_tamanho, settings.cache_ttl_s)

    # ------------------------------------------------------------------ camada semântica
    async def _semantico(self, direcao: Direcao, texto: str, contexto: str | None) -> tuple[list[Violacao], list[str], bool]:
        """(violações, camadas que responderam, degradado)."""
        if not self.avaliadores:
            return [], [], False
        tarefas = {asyncio.create_task(a.avaliar(direcao, texto, contexto)): a.nome for a in self.avaliadores}
        feitas, pendentes = await asyncio.wait(tarefas, timeout=self.settings.timeout_semantico_ms / 1000)
        for t in pendentes:
            # Não cancela: cancelar derruba a conexão HTTP/gRPC e a próxima chamada paga o handshake de novo.
            # A resposta atrasada termina em segundo plano e é descartada.
            t.add_done_callback(_descartar)
            log.warning("camada %s estourou %d ms (fail-open)", tarefas[t], self.settings.timeout_semantico_ms)
        violacoes: list[Violacao] = []
        camadas: list[str] = []
        degradado = bool(pendentes)
        for t in feitas:
            if t.exception() is not None:
                degradado = True
                log.warning("camada %s falhou (fail-open): %r", tarefas[t], t.exception())
                continue
            camadas.append(tarefas[t])
            violacoes.extend(t.result())
        return violacoes, camadas, degradado

    def _deve_rodar_semantico(self, modo: str, achados: list[Achado]) -> bool:
        if not self.settings.semantico_habilitado or not self.avaliadores or modo == "nunca":
            return False
        # Short-circuit: regra de alta severidade que bloqueia já decide; não gasta rede.
        if any(a.severidade == Severidade.alta and CATALOGO[a.codigo].decisao == Decisao.bloquear for a in achados):
            return False
        if modo == "suspeito":
            return any(a.severidade == Severidade.media for a in achados)
        return True

    # ------------------------------------------------------------------ montagem do veredito
    def _montar(
        self,
        achados: list[Achado],
        semanticas: list[Violacao],
        camadas: list[str],
        degradado: bool,
        texto_original: str,
        incluir_uuid: bool,
    ) -> Veredito:
        violacoes = [_violacao(a) for a in achados if a.severidade == Severidade.alta]
        codigos = {v.codigo for v in violacoes}
        for v in semanticas:
            if v.codigo not in codigos:
                violacoes.append(v)
                codigos.add(v.codigo)
        suspeitas = [_violacao(a) for a in achados if a.severidade == Severidade.media and a.codigo not in codigos]

        if not violacoes:
            return Veredito(decisao=Decisao.permitir, permitido=True, suspeitas=suspeitas, camadas=camadas, degradado=degradado)

        violacoes.sort(key=lambda v: ORDEM_DECISAO[CATALOGO[v.codigo].decisao], reverse=True)
        principal = CATALOGO[violacoes[0].codigo]
        decisao = principal.decisao

        instrucoes = []
        for v in violacoes:
            item = CATALOGO[v.codigo]
            instrucao = item.instrucao_agente.replace("{evidencias}", v.evidencia or "")
            if instrucao not in instrucoes:
                instrucoes.append(instrucao)

        texto_sanitizado = None
        if any(CATALOGO[v.codigo].decisao == Decisao.mascarar for v in violacoes):
            texto_sanitizado = mascarar(texto_original, incluir_uuid=incluir_uuid)

        return Veredito(
            decisao=decisao,
            permitido=decisao in (Decisao.permitir_com_instrucao, Decisao.mascarar),
            violacoes=violacoes,
            suspeitas=suspeitas,
            instrucao_agente=" ".join(instrucoes),
            resposta_sugerida=principal.resposta_sugerida if decisao in (Decisao.bloquear, Decisao.reescrever) else None,
            texto_sanitizado=texto_sanitizado,
            camadas=camadas,
            degradado=degradado,
        )

    def _registrar(self, direcao: str, v: Veredito, sessao_id: str | None) -> None:
        log.info(json.dumps({
            "evento": "guardrail", "direcao": direcao, "sessao_id": sessao_id, "decisao": v.decisao,
            "codigos": [x.codigo for x in v.violacoes], "suspeitas": [x.codigo for x in v.suspeitas],
            "camadas": v.camadas, "degradado": v.degradado, "cache": v.cache, "latencia_ms": v.latencia_ms,
        }, ensure_ascii=False))

    # ------------------------------------------------------------------ API
    async def avaliar_entrada(self, req: EntradaRequest) -> Veredito:
        inicio = time.perf_counter()
        historico = req.historico[-self.settings.max_historico:]
        contexto = "\n".join(f"{f.papel}: {f.texto}" for f in historico) or None
        chave = _chave("entrada", normalizar(req.mensagem), contexto)
        veredito = self.cache.get(chave)
        if veredito is not None:
            veredito = veredito.model_copy(update={"cache": True})
        else:
            achados = regras_entrada.avaliar(req.mensagem)
            semanticas, camadas, degradado = [], [], False
            if self._deve_rodar_semantico(self.settings.modo_semantico_entrada, achados):
                semanticas, camadas, degradado = await self._semantico("entrada", req.mensagem, contexto)
            veredito = self._montar(achados, semanticas, ["regra", *camadas], degradado, req.mensagem, incluir_uuid=False)
            if not degradado:
                self.cache.set(chave, veredito.model_copy(deep=True))
        veredito.latencia_ms = round((time.perf_counter() - inicio) * 1000, 2)
        self._registrar("entrada", veredito, req.sessao_id)
        return veredito

    async def avaliar_saida(self, req: SaidaRequest) -> Veredito:
        inicio = time.perf_counter()
        ultima = req.tentativa >= self.settings.max_tentativas_saida
        chave = _chave("saida", req.resposta, req.mensagem_usuario, req.contexto_tools, ultima)
        veredito = self.cache.get(chave)
        if veredito is not None:
            veredito = veredito.model_copy(update={"cache": True})
        else:
            achados = regras_saida.avaliar(req.resposta, req.mensagem_usuario, req.contexto_tools)
            semanticas, camadas, degradado = [], [], False
            if self._deve_rodar_semantico(self.settings.modo_semantico_saida, achados):
                semanticas, camadas, degradado = await self._semantico("saida", req.resposta, req.mensagem_usuario)
            veredito = self._montar(achados, semanticas, ["regra", *camadas], degradado, req.resposta, incluir_uuid=True)
            # Última tentativa: em vez de pedir outra reescrita, entrega a resposta padrão.
            if ultima and veredito.decisao == Decisao.reescrever:
                veredito.decisao = Decisao.bloquear
                veredito.instrucao_agente = (
                    f"Limite de {self.settings.max_tentativas_saida} tentativas atingido: envie a resposta_sugerida ao cliente. "
                    + (veredito.instrucao_agente or "")
                )
            if not degradado:
                self.cache.set(chave, veredito.model_copy(deep=True))
        veredito.latencia_ms = round((time.perf_counter() - inicio) * 1000, 2)
        self._registrar("saida", veredito, req.sessao_id)
        return veredito
