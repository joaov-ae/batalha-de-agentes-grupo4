import calendar
import json
import logging
import math
import os
import re
import time
import unicodedata
from datetime import date, datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from google import genai
from google.cloud import bigquery
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from guardrails_client import GuardrailsUnavailable, check_input, check_output

load_dotenv(Path(__file__).resolve().parent / ".env")

logger = logging.getLogger("financial_agent")

# Challenge project: every model call must be billed to this quota.
DEFAULT_GCP_PROJECT = "batalha-time-04-z85x"
DEFAULT_GCP_LOCATION = "global"

MODEL_CANDIDATES = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash-lite",
]

AGENT_TONE = os.getenv(
        "AGENT_TONE",
        "Acolhedor, claro, objetivo e responsável, com tom de atendimento bancário; sem alarmismo e sem se passar por uma instituição financeira.",
)

SYSTEM_INSTRUCTION = f"""
Você é um assistente de organização financeira. Use o tom configurado: {AGENT_TONE}
Responda em português e em JSON puro, sem markdown.

Guardrails obrigatórios:
1. Use apenas os valores, categorias e oportunidades presentes no JSON recebido.
2. Não invente gastos, percentuais, parcelas ou serviços assinados.
3. Sugira somente oportunidades explicitamente listadas em "oportunidades_ajustaveis".
4. Não recomende reduzir ou cancelar saúde, medicamentos, alimentação básica, moradia, contas essenciais, transporte necessário, educação, dívidas ou gastos com pets.
5. Não recomende zerar uma categoria. Reduções devem ser graduais, de 15% a 30%.
6. Se houver mais de um serviço de áudio recorrente identificado, proponha avaliar manter apenas o que a pessoa mais usa; não escolha por ela.
7. Não dê sermão nem prometa resultado. Diferencie estimativa de certeza.

Responda com o schema:
{{
    "diagnostico": "texto curto e objetivo",
    "acoes": [
        {{"titulo": "nome da oportunidade existente no contexto", "valor": 0.0, "descricao": "texto curto"}}
    ],
    "fechamento": "texto curto"
}}
"""

DISCRETIONARY_CATEGORIES = {
    "delivery": "Delivery",
    "assinaturas": "Assinaturas",
    "lazer": "Lazer",
    "lojas e sites": "Lojas e sites",
    "restaurantes": "Restaurantes",
    "viagens": "Viagens",
}

AUDIO_SERVICES = {
        "spotify": "Spotify",
        "deezer": "Deezer",
        "youtube music": "YouTube Music",
}

PROTECTED_TERMS = (
        "saude", "farmacia", "medicamento", "hospital", "mercado", "supermercado",
        "moradia", "aluguel", "agua", "energia", "transporte publico", "educacao",
        "pet", "emprestimo", "divida", "essencial", "basico",
)


class Action(BaseModel):
        model_config = ConfigDict(extra="forbid")

        titulo: str = Field(min_length=1)
        valor: float | None = Field(default=None, ge=0)
        descricao: str = Field(min_length=1)


class AgentResponse(BaseModel):
        model_config = ConfigDict(extra="forbid")

        diagnostico: str = Field(min_length=1)
        acoes: list[Action]
        fechamento: str = Field(min_length=1)


class ModelUnavailableError(RuntimeError):
        pass


def load_api_key() -> str:
    for key_name in ("GEMINI_API_KEY", "GOOGLE_API_KEY", "API_KEY", "key"):
        value = os.getenv(key_name)
        if value and value.strip():
            return value.strip()

    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            if key.strip() in {"GEMINI_API_KEY", "GOOGLE_API_KEY", "API_KEY", "key"}:
                return value.strip().strip('"\'')

    raise RuntimeError("API key not found. Add GEMINI_API_KEY or key to the .env file.")


def env_flag(name: str) -> bool | None:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return None
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def vertex_ai_enabled() -> bool:
    """True when model calls must go through Vertex AI + ADC (project quota)."""
    enterprise = env_flag("GOOGLE_GENAI_USE_ENTERPRISE")
    vertex = env_flag("GOOGLE_GENAI_USE_VERTEXAI")
    if enterprise is not None:
        return enterprise
    if vertex is not None:
        return vertex
    return bool(os.getenv("K_SERVICE") and not any(os.getenv(k) for k in ("GEMINI_API_KEY", "GOOGLE_API_KEY", "API_KEY", "key")))


def gcp_project() -> str:
    return (os.getenv("GOOGLE_CLOUD_PROJECT") or DEFAULT_GCP_PROJECT).strip()


def gcp_location() -> str:
    return (os.getenv("GOOGLE_CLOUD_LOCATION") or DEFAULT_GCP_LOCATION).strip() or DEFAULT_GCP_LOCATION


def build_genai_client() -> genai.Client:
    """Build the genai client so calls land on the project's quota.

    Vertex mode (GOOGLE_GENAI_USE_VERTEXAI=true) must NOT receive an api_key:
    google-genai drops project/location and falls back to Vertex express mode
    (API key billing) whenever an api_key is passed explicitly. Without an
    api_key the SDK resolves credentials through ADC, whose quota_project_id
    points at the challenge project.
    """
    if vertex_ai_enabled():
        project, location = gcp_project(), gcp_location()
        logger.info("genai client on Vertex AI: project=%s location=%s auth=ADC", project, location)
        return genai.Client(vertexai=True, project=project, location=location)

    logger.info("genai client on Gemini Developer API: auth=API key (personal quota)")
    return genai.Client(api_key=load_api_key())


def normalize_json_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(key): normalize_json_value(val) for key, val in value.items()}
    if isinstance(value, (list, tuple)):
        return [normalize_json_value(item) for item in value]
    if value is None:
        return None
    return value


def normalize_label(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value.casefold())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def contains_protected_terms(value: str) -> bool:
    normalized = normalize_label(value)
    return any(re.search(rf"\b{re.escape(term)}\b", normalized) for term in PROTECTED_TERMS)


def format_brl(value: float) -> str:
    formatted = f"{abs(value):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    prefix = "-" if value < 0 else ""
    return f"{prefix}R$ {formatted}"


def month_label(anomes: int) -> str:
    return f"{anomes % 100:02d}/{anomes // 100}"


def month_window(reference_date: date) -> tuple[int, int, int]:
    current_month = reference_date.year * 100 + reference_date.month
    previous = reference_date.month - 1
    previous_year = reference_date.year
    if previous == 0:
        previous = 12
        previous_year -= 1
    previous_month = previous_year * 100 + previous
    two_months_back = previous - 1
    two_months_back_year = previous_year
    if two_months_back == 0:
        two_months_back = 12
        two_months_back_year -= 1
    return two_months_back_year * 100 + two_months_back, previous_month, current_month


def build_finance_context(rows: list[dict], reference_date: date) -> dict:
    requested_months = month_window(reference_date)
    month_data = {
        month: {
            "entradas": 0.0,
            "saidas": 0.0,
            "quantidade_transacoes": 0,
            "categorias": {},
            "servicos_audio": {},
        }
        for month in requested_months
    }
    current_month_rows = []
    current_balance = None

    for raw_row in rows:
        row = normalize_json_value(raw_row)
        month = int(row["anomes"])
        if month not in month_data:
            continue
        if month == requested_months[-1]:
            current_month_rows.append(row)
        amount = abs(float(row.get("vlr") or 0))
        transaction_type = str(row.get("tipo") or "").upper()
        current = month_data[month]
        current["quantidade_transacoes"] += 1
        if transaction_type == "E":
            current["entradas"] += amount
        elif transaction_type == "S":
            current["saidas"] += amount
            category = row.get("nom_cate_macro") or row.get("nom_cate_micro") or "Sem categoria"
            current["categorias"][category] = current["categorias"].get(category, 0.0) + amount
            if normalize_label(str(category)) == "assinaturas":
                description = normalize_label(str(row.get("descr") or ""))
                service = next(
                    (name for keyword, name in AUDIO_SERVICES.items() if keyword in description),
                    None,
                )
                if service:
                    current["servicos_audio"][service] = (
                        current["servicos_audio"].get(service, 0.0) + amount
                    )

    dated_current_rows = [row for row in current_month_rows if row.get("anomesdia") is not None]
    if dated_current_rows:
        latest_day = max(str(row["anomesdia"])[:10] for row in dated_current_rows)
        latest_day_rows = [row for row in dated_current_rows if str(row["anomesdia"])[:10] == latest_day]
        balances = [row.get("saldo_apos") for row in latest_day_rows]
        if balances and all(balance is not None for balance in balances):
            numeric_balances = [float(balance) for balance in balances]
            if len(set(numeric_balances)) == 1:
                current_balance = numeric_balances[0]

    months = []
    for month, totals in month_data.items():
        months.append({
            "anomes": month,
            "entradas": round(totals["entradas"], 2),
            "saidas": round(totals["saidas"], 2),
            "saldo_fluxo": round(totals["entradas"] - totals["saidas"], 2),
            "quantidade_transacoes": totals["quantidade_transacoes"],
            "categorias_de_saida": {
                key: round(value, 2)
                for key, value in sorted(totals["categorias"].items(), key=lambda item: item[1], reverse=True)
                if normalize_label(key) in DISCRETIONARY_CATEGORIES
            },
            "sem_dados": totals["quantidade_transacoes"] == 0,
        })

    current_totals = month_data[requested_months[-1]]
    days_elapsed = reference_date.day
    days_remaining = calendar.monthrange(reference_date.year, reference_date.month)[1] - days_elapsed
    projected_close = None
    negative_close_risk = None
    if current_totals["quantidade_transacoes"] and current_balance is not None:
        daily_net = (current_totals["entradas"] - current_totals["saidas"]) / days_elapsed
        projected_close = round(current_balance + daily_net * days_remaining, 2)
        negative_close_risk = projected_close < 0

    populated_prior = [
        month["saldo_fluxo"] for month in months[:-1] if not month["sem_dados"]
    ]
    current_run_rate = None
    if current_totals["quantidade_transacoes"]:
        current_run_rate = (current_totals["entradas"] - current_totals["saidas"]) / days_elapsed
        current_run_rate *= calendar.monthrange(reference_date.year, reference_date.month)[1]
    trend = "insuficiente"
    if current_run_rate is not None and populated_prior:
        previous_net = populated_prior[-1]
        tolerance = max(abs(previous_net) * 0.05, 1.0)
        if current_run_rate < previous_net - tolerance:
            trend = "piorando"
        elif current_run_rate > previous_net + tolerance:
            trend = "melhorando"
        else:
            trend = "estavel"

    category_variations = []
    days_in_month = calendar.monthrange(reference_date.year, reference_date.month)[1]
    previous_month_data = [month_data[month] for month in requested_months[:-1]]
    if current_totals["quantidade_transacoes"]:
        for category, current_amount in current_totals["categorias"].items():
            if normalize_label(category) not in DISCRETIONARY_CATEGORIES:
                continue
            prior_amounts = [
                prior["categorias"].get(category, 0.0)
                for prior in previous_month_data
                if prior["quantidade_transacoes"]
            ]
            baseline = sum(prior_amounts) / len(prior_amounts) if prior_amounts else 0.0
            if baseline <= 0 or current_amount <= 0:
                continue
            current_projection = current_amount / days_elapsed * days_in_month
            change_percent = (current_projection - baseline) / baseline * 100
            category_variations.append({
                "categoria": category,
                "media_meses_anteriores": round(baseline, 2),
                "projecao_mes_atual": round(current_projection, 2),
                "variacao_percentual": round(change_percent, 1),
            })
    category_variations.sort(key=lambda item: item["variacao_percentual"], reverse=True)

    return {
        "periodo": {"inicio_anomes": requested_months[0], "fim_anomes": requested_months[-1]},
        "quantidade_transacoes": sum(month["quantidade_transacoes"] for month in months),
        "meses": months,
        "variacao_categorias": category_variations,
        "assinaturas_audio_por_mes": [
            {"anomes": month, "servicos": month_data[month]["servicos_audio"]}
            for month in requested_months
        ],
        "tendencia_fluxo": trend,
        "saldo_atual_informado": round(current_balance, 2) if current_balance is not None else None,
        "saldo_projetado_fim_mes": projected_close,
        "risco_fechamento_negativo": negative_close_risk,
        "observacao_projecao": (
            "Estimativa linear baseada no saldo informado e no fluxo líquido diário deste mês; não é garantia."
            if projected_close is not None
            else "Sem transações do mês atual e saldo informado suficientes para estimar o fechamento."
        ),
    }


def build_savings_context(finance_context: dict) -> dict:
    months = finance_context["meses"]
    months_with_data = [month for month in months if not month["sem_dados"]]
    current_month = months[-1]
    category_candidates = []

    def category_spend(month: dict, normalized_category: str) -> float:
        return sum(
            amount for category, amount in month["categorias_de_saida"].items()
            if normalize_label(category) == normalized_category
        )

    for normalized_category, display_category in DISCRETIONARY_CATEGORIES.items():
        observed = [category_spend(month, normalized_category) for month in months_with_data]
        if not observed:
            continue
        average = sum(observed) / len(observed)
        if average <= 0:
            continue
        current_spend = category_spend(current_month, normalized_category)
        variation = next(
            (item["variacao_percentual"] for item in finance_context["variacao_categorias"]
             if normalize_label(item["categoria"]) == normalized_category),
            None,
        )
        category_candidates.append({
            "categoria": display_category,
            "media_mensal_observada": round(average, 2),
            "gasto_no_mes_referencia": round(current_spend, 2),
            "variacao_percentual_no_ritmo_atual": variation,
            "economia_sugerida_15_por_cento": round(average * 0.15, 2),
        })

    audio_months = finance_context["assinaturas_audio_por_mes"]
    current_audio = audio_months[-1]["servicos"]
    recurring_audio = []
    for service, current_amount in current_audio.items():
        occurrence_count = sum(month["servicos"].get(service, 0.0) > 0 for month in audio_months)
        if occurrence_count >= 2:
            recurring_audio.append({"servico": service, "valor_no_mes_referencia": round(current_amount, 2)})

    audio_saving_range = None
    if len(recurring_audio) >= 2:
        observed_prices = [service["valor_no_mes_referencia"] for service in recurring_audio]
        audio_saving_range = {
            "minimo": round(sum(observed_prices) - max(observed_prices), 2),
            "maximo": round(sum(observed_prices) - min(observed_prices), 2),
        }

    category_candidates.sort(key=lambda item: item["media_mensal_observada"], reverse=True)
    if audio_saving_range:
        category_candidates = [item for item in category_candidates if item["categoria"] != "Assinaturas"]

    return {
        "periodo": finance_context["periodo"],
        "modo_demo": finance_context.get("modo_demo", False),
        "oportunidades_ajustaveis": category_candidates[:3],
        "assinaturas_audio_recorrentes_identificadas": recurring_audio,
        "economia_potencial_audio_se_manter_apenas_um": audio_saving_range,
    }


def build_savings_fallback(savings_context: dict) -> dict:
    actions = []
    audio_range = savings_context["economia_potencial_audio_se_manter_apenas_um"]
    audio_services = savings_context["assinaturas_audio_recorrentes_identificadas"]
    if audio_range and audio_services:
        names = ", ".join(service["servico"] for service in audio_services)
        minimum = audio_range["minimo"]
        maximum = audio_range["maximo"]
        actions.append({
            "titulo": "Revisar serviços de áudio",
            "valor": minimum,
            "descricao": (
                f"Há pagamentos recorrentes identificados para {names}. Se você decidir manter apenas um, "
                f"a economia potencial observada fica entre {format_brl(minimum)} e {format_brl(maximum)} por mês, "
                "dependendo de qual prefere usar."
            ),
        })

    for candidate in savings_context["oportunidades_ajustaveis"]:
        amount = candidate["economia_sugerida_15_por_cento"]
        change = candidate["variacao_percentual_no_ritmo_atual"]
        trend_detail = (
            f" No ritmo atual, a categoria está {change:.1f}% acima da média anterior."
            if change is not None and change > 0
            else ""
        )
        actions.append({
            "titulo": f"Revisar gastos com {candidate['categoria']}",
            "valor": amount,
            "descricao": (
                f"A média observada foi de {format_brl(candidate['media_mensal_observada'])} por mês. "
                f"Uma redução gradual de 15% representa cerca de {format_brl(amount)} mensais.{trend_detail}"
            ),
        })

    if not actions:
        return {
            "diagnostico": "Não encontrei oportunidades ajustáveis suficientes para sugerir uma economia com confiança.",
            "acoes": [],
            "fechamento": "A análise ficou limitada a possibilidades identificadas nos registros.",
        }
    return {
        "diagnostico": "Encontrei alguns pontos ajustáveis nos três meses analisados. São possibilidades, não metas obrigatórias.",
        "acoes": actions,
        "fechamento": "Você escolhe o que faz sentido para sua rotina; não é necessário cortar tudo de uma vez.",
    }


def validate_savings_plan(plan: dict, savings_context: dict) -> dict:
    fallback = build_savings_fallback(savings_context)
    category_values = {
        normalize_label(candidate["categoria"]): candidate["economia_sugerida_15_por_cento"]
        for candidate in savings_context["oportunidades_ajustaveis"]
    }
    audio_range = savings_context["economia_potencial_audio_se_manter_apenas_um"]
    audio_labels = [
        normalize_label(item["servico"])
        for item in savings_context["assinaturas_audio_recorrentes_identificadas"]
    ]
    if not plan["acoes"]:
        return fallback

    full_response_text = normalize_label(
        " ".join([plan["diagnostico"], plan["fechamento"]] + [
            f"{action['titulo']} {action['descricao']}" for action in plan["acoes"]
        ])
    )
    if contains_protected_terms(full_response_text):
        return fallback

    for action in plan["acoes"]:
        text = normalize_label(f"{action['titulo']} {action['descricao']}")
        value = action["valor"]
        if contains_protected_terms(text):
            return fallback
        matching_categories = [label for label in category_values if label in text]
        matching_audio = bool(audio_range) and (
            "audio" in text or any(label in text for label in audio_labels)
        )
        if len(matching_categories) > 1 or (matching_categories and matching_audio):
            return fallback
        if matching_categories:
            allowed_values = [category_values[matching_categories[0]]]
        elif matching_audio:
            allowed_values = list(audio_range.values())
        else:
            return fallback
        if value is None or not any(math.isclose(value, allowed, abs_tol=0.01) for allowed in allowed_values):
            return fallback
    return plan


def build_initial_alert(finance_context: dict) -> dict:
    risk = finance_context["risco_fechamento_negativo"]
    reference_month = finance_context["periodo"]["fim_anomes"]
    label = month_label(reference_month)
    demo_note = " (mês de referência da demonstração)" if finance_context.get("modo_demo") else ""
    evidence = next(
        (item for item in finance_context["variacao_categorias"] if item["variacao_percentual"] > 0),
        None,
    )
    public_trend = {
        key: finance_context[key]
        for key in (
            "periodo", "quantidade_transacoes", "meses", "variacao_categorias",
            "tendencia_fluxo", "saldo_atual_informado", "saldo_projetado_fim_mes",
            "risco_fechamento_negativo", "observacao_projecao", "modo_demo",
        )
        if key in finance_context
    }

    if risk is True:
        message = (
            f"A projeção para {label}{demo_note} indica que você pode fechar o período no vermelho, "
            f"com saldo estimado de {format_brl(finance_context['saldo_projetado_fim_mes'])}."
        )
        if evidence:
            message += (
                f" No ritmo atual, seus gastos com {evidence['categoria']} estão "
                f"{evidence['variacao_percentual']:.1f}% acima da média dos meses anteriores."
            )
        return {
            "status": "risco_vermelho",
            "mensagem": message,
            "pergunta": "Quer que eu procure possibilidades de economia nos gastos ajustáveis dos três meses?",
            "requer_consentimento_para_economia": True,
            "tendencia": public_trend,
        }

    if risk is False:
        message = (
            f"A projeção para {label}{demo_note} indica saldo positivo de "
            f"{format_brl(finance_context['saldo_projetado_fim_mes'])}. É uma estimativa baseada nos registros disponíveis."
        )
        return {
            "status": "saldo_estimado_positivo",
            "mensagem": message,
            "pergunta": None,
            "requer_consentimento_para_economia": False,
            "tendencia": public_trend,
        }

    return {
        "status": "dados_insuficientes",
        "mensagem": f"Ainda não há saldo e movimentação suficientes para estimar o fechamento de {label}{demo_note}.",
        "pergunta": None,
        "requer_consentimento_para_economia": False,
        "tendencia": public_trend,
    }


def load_bigquery_context(user_id: str, reference_date: date | None = None) -> dict:
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT") or "batalha-time-04-z85x"
    dataset = os.getenv("BIGQUERY_DATASET") or "hackathon_dados"
    table = os.getenv("BIGQUERY_TABLE") or "extrato_sintetico"
    demo_mode = reference_date is None and os.getenv("DEMO_MODE", "false").lower() == "true"
    reference_date = reference_date or datetime.now(ZoneInfo("America/Sao_Paulo")).date()

    if not all(re.fullmatch(r"[A-Za-z0-9_-]+", value) for value in (project_id, dataset, table)):
        raise RuntimeError("Configuração inválida de projeto, dataset ou tabela do BigQuery.")

    client = bigquery.Client(project=project_id)
    if demo_mode:
        query = f"""
            WITH latest AS (
                SELECT MAX(anomes) AS latest_month
                FROM `{project_id}.{dataset}.{table}`
                WHERE id_usuario = @user_id
            )
                SELECT t.anomes, t.anomesdia, t.tipo, t.vlr,
                     t.nom_cate_macro, t.nom_cate_micro, t.descr, t.saldo_apos
            FROM `{project_id}.{dataset}.{table}` AS t
            CROSS JOIN latest
            WHERE t.id_usuario = @user_id
              AND t.anomes BETWEEN CAST(FORMAT_DATE(
                    '%Y%m', DATE_SUB(
                        DATE(DIV(latest.latest_month, 100), MOD(latest.latest_month, 100), 1),
                        INTERVAL 2 MONTH
                    )
                  ) AS INT64) AND latest.latest_month
            ORDER BY t.anomesdia DESC
        """
        query_parameters = [bigquery.ScalarQueryParameter("user_id", "STRING", user_id)]
    else:
        start_month, _, current_month = month_window(reference_date)
        query = f"""
                SELECT anomes, anomesdia, tipo, vlr,
                     nom_cate_macro, nom_cate_micro, descr, saldo_apos
            FROM `{project_id}.{dataset}.{table}`
            WHERE id_usuario = @user_id
              AND anomes BETWEEN @start_month AND @current_month
            ORDER BY anomesdia DESC
        """
        query_parameters = [
            bigquery.ScalarQueryParameter("user_id", "STRING", user_id),
            bigquery.ScalarQueryParameter("start_month", "INT64", start_month),
            bigquery.ScalarQueryParameter("current_month", "INT64", current_month),
        ]
    job_config = bigquery.QueryJobConfig(query_parameters=query_parameters)
    rows = [dict(row) for row in client.query(query, job_config=job_config).result()]

    if not rows:
        raise LookupError("Nenhuma transação encontrada para este usuário nos três meses solicitados.")

    if demo_mode:
        reference_month = max(int(row["anomes"]) for row in rows)
        reference_rows = [row for row in rows if int(row["anomes"]) == reference_month]
        transaction_dates = [
            date.fromisoformat(str(row["anomesdia"])[:10])
            for row in reference_rows
            if row.get("anomesdia") is not None
        ]
        reference_date = max(transaction_dates) if transaction_dates else date(reference_month // 100, reference_month % 100, 1)

    context = build_finance_context(rows, reference_date)
    context["modo_demo"] = demo_mode
    return context


def extract_json_from_text(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()
    result = json.loads(cleaned)
    return AgentResponse.model_validate(result).model_dump()


def gerar_plano_otimizacao(json_contexto: dict, user_id: str = "default_user") -> dict:
    client = build_genai_client()
    
    # Validação de entrada (Guardrails)
    try:
        # Simplificamos o contexto para o guardrail de entrada se necessário
        check_input(f"Gerar plano para contexto: {json.dumps(json_contexto)[:500]}", user_id)
    except GuardrailsUnavailable:
        pass # Se o serviço cair, seguimos com as regras locais

    prompt = (
        "Analise somente este contexto financeiro e responda no schema JSON configurado. "
        + json.dumps(json_contexto, ensure_ascii=False)
    )

    last_error = None
    for model_name in MODEL_CANDIDATES:
        for attempt in range(3):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config={
                        "system_instruction": SYSTEM_INSTRUCTION,
                        "temperature": 0.3,
                        "top_p": 0.9,
                        "response_mime_type": "application/json",
                        "response_schema": {
                            "type": "OBJECT",
                            "properties": {
                                "diagnostico": {"type": "STRING"},
                                "acoes": {
                                    "type": "ARRAY",
                                    "items": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "titulo": {"type": "STRING"},
                                            "valor": {"type": "NUMBER", "nullable": True},
                                            "descricao": {"type": "STRING"},
                                        },
                                        "required": ["titulo", "descricao"],
                                    },
                                },
                                "fechamento": {"type": "STRING"},
                            },
                            "required": ["diagnostico", "acoes", "fechamento"],
                        },
                    },
                )
                if not response.text:
                    raise ValueError("O modelo retornou uma resposta vazia.")
                
                plano = extract_json_from_text(response.text)
                
                # Validação de saída (Guardrails)
                try:
                    res_text = f"{plano['diagnostico']} " + " ".join([a['descricao'] for a in plano['acoes']])
                    check_output(res_text, "Gerar plano de economia", json_contexto, user_id)
                except GuardrailsUnavailable:
                    pass

                return plano
            except ValidationError as exc:
                raise ValueError("O modelo retornou JSON fora do schema esperado.") from exc
            except Exception as exc:  # pragma: no cover - runtime fallback
                last_error = exc
                message = str(exc).lower()
                retryable = any(code in message for code in ("429", "500", "502", "503", "504", "unavailable", "timeout"))
                model_missing = "404" in message or "not found" in message
                if not retryable and not model_missing:
                    raise
                if retryable and attempt < 2:
                    time.sleep(2 ** attempt)
                    continue
                break

    raise ModelUnavailableError(f"Todos os modelos falharam. Último erro: {last_error}")


if __name__ == "__main__":
    raise SystemExit("Use a API: envie POST /analyze com {\"user_id\": \"...\"}.")
