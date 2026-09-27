"""Schemas das tabelas do dataset `observabilidade`.

Fatos particionados por dia no campo de tempo e clusterizados por id_usuario (consultas de longo prazo filtram por
período e as fichas de cliente por id_usuario).
"""

from dataclasses import dataclass

from google.cloud import bigquery

F = bigquery.SchemaField


@dataclass(frozen=True)
class Tabela:
    nome: str
    schema: list[bigquery.SchemaField]
    campo_particao: str | None = None


CLIENTES = Tabela(
    "clientes",
    [
        F("id_usuario", "STRING", "REQUIRED"),
        F("grupo_ab", "STRING", "REQUIRED"),
        F("estado_inicial", "STRING"),
        F("score_alerta", "INTEGER"),
        F("canal_preferido", "STRING"),
        F("notificacoes_ativas", "BOOLEAN"),
        F("entrou_em", "DATE"),
        F("origem_dado", "STRING", description="data_manager (cliente real da base) ou sintetico"),
    ],
)

CONVERSAS = Tabela(
    "conversas",
    [
        F("conversa_id", "STRING", "REQUIRED"),
        F("sessao_id", "STRING"),
        F("id_usuario", "STRING", "REQUIRED"),
        F("iniciada_em", "TIMESTAMP", "REQUIRED"),
        F("encerrada_em", "TIMESTAMP"),
        F("origem", "STRING", description="proativa (/analyze) ou cliente (/chat)"),
        F("momento", "STRING"),
        F("estado_cliente", "STRING"),
        F("n_turnos", "INTEGER"),
        F("teve_intervencao", "BOOLEAN"),
        F("encaminhada_atendimento", "BOOLEAN"),
    ],
    "iniciada_em",
)

MENSAGENS = Tabela(
    "mensagens",
    [
        F("mensagem_id", "STRING", "REQUIRED"),
        F("conversa_id", "STRING", "REQUIRED"),
        F("id_usuario", "STRING", "REQUIRED"),
        F("papel", "STRING", description="cliente ou agente"),
        F("criado_em", "TIMESTAMP", "REQUIRED"),
        F("endpoint", "STRING", description="/analyze, /savings ou /chat"),
        F("status", "STRING", description="status devolvido pelo agente"),
        F("latencia_agente_ms", "FLOAT"),
        F("reescrita", "BOOLEAN", description="resposta substituída pelo filtro do agente ou reescrita pelo guardrails"),
    ],
    "criado_em",
)

INTERVENCOES = Tabela(
    "intervencoes",
    [
        F("intervencao_id", "STRING", "REQUIRED"),
        F("conversa_id", "STRING"),
        F("mensagem_id", "STRING"),
        F("id_usuario", "STRING", "REQUIRED"),
        F("criado_em", "TIMESTAMP", "REQUIRED"),
        F("fonte", "STRING", "REQUIRED"),
        F("direcao", "STRING"),
        F("codigo", "STRING", "REQUIRED"),
        F("categoria", "STRING"),
        F("decisao", "STRING"),
        F("camada", "STRING", description="regra, gemini ou model_armor (só guardrails)"),
        F("degradado", "BOOLEAN"),
        F("tentativa", "INTEGER"),
        F("latencia_ms", "FLOAT"),
    ],
    "criado_em",
)

ALERTAS = Tabela(
    "alertas",
    [
        F("alerta_id", "STRING", "REQUIRED"),
        F("id_usuario", "STRING", "REQUIRED"),
        F("conversa_id", "STRING"),
        F("criado_em", "TIMESTAMP", "REQUIRED"),
        F("momento", "STRING"),
        F("estado_cliente", "STRING"),
        F("score_alerta", "INTEGER"),
        F("status_alerta", "STRING"),
        F("requer_consentimento", "BOOLEAN"),
        F("consentiu", "BOOLEAN"),
        F("n_ajustes_oferecidos", "INTEGER"),
        F("desativou_notificacao", "BOOLEAN"),
    ],
    "criado_em",
)

AJUSTES = Tabela(
    "ajustes_oferecidos",
    [
        F("ajuste_id", "STRING", "REQUIRED"),
        F("alerta_id", "STRING"),
        F("id_usuario", "STRING", "REQUIRED"),
        F("criado_em", "TIMESTAMP", "REQUIRED"),
        F("tipo", "STRING"),
        F("chave", "STRING", description="identifica o mesmo ajuste entre ofertas (regra de 2 recusas)"),
        F("valor", "FLOAT"),
        F("impacto_dias", "INTEGER"),
        F("resolve", "BOOLEAN"),
        F("resultado", "STRING"),
    ],
    "criado_em",
)

FEEDBACK = Tabela(
    "feedback_mensagens",
    [
        F("feedback_id", "STRING", "REQUIRED"),
        F("mensagem_id", "STRING", "REQUIRED"),
        F("conversa_id", "STRING"),
        F("id_usuario", "STRING", "REQUIRED"),
        F("criado_em", "TIMESTAMP", "REQUIRED"),
        F("voto", "STRING", "REQUIRED"),
        F("motivo", "STRING"),
    ],
    "criado_em",
)

RESULTADO_CICLO = Tabela(
    "resultado_ciclo",
    [
        F("id_usuario", "STRING", "REQUIRED"),
        F("mes", "DATE", "REQUIRED"),
        F("grupo_ab", "STRING"),
        F("estado_mes", "STRING"),
        F("entrou_no_negativo", "BOOLEAN"),
        F("chegou_ao_salario_sem_limite", "BOOLEAN"),
        F("dias_no_limite", "INTEGER"),
        F("juros_pagos", "FLOAT"),
    ],
)

TABELAS = [CLIENTES, CONVERSAS, MENSAGENS, INTERVENCOES, ALERTAS, AJUSTES, FEEDBACK, RESULTADO_CICLO]
POR_NOME = {t.nome: t for t in TABELAS}
