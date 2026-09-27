-- Taxas por período: bloqueio de mensagens do cliente pelo guardrails e respostas do LLM substituídas pelo
-- filtro de saída do agente (quanto menor, melhor o prompt).
WITH msg AS (
  SELECT
    IF(@granularidade = 'semana', DATE_TRUNC(d, WEEK(MONDAY)), DATE_TRUNC(d, MONTH)) AS periodo,
    papel, status, mensagem_id
  FROM (SELECT *, DATE(criado_em, 'America/Sao_Paulo') AS d FROM `$obs.mensagens`)
  WHERE d BETWEEN @data_inicio AND @data_fim
),
iv AS (
  SELECT mensagem_id, fonte, decisao FROM `$obs.intervencoes`
  WHERE DATE(criado_em, 'America/Sao_Paulo') BETWEEN @data_inicio AND @data_fim
)
SELECT
  periodo,
  COUNTIF(papel = 'cliente') AS mensagens_cliente,
  COUNTIF(papel = 'agente' AND status = 'respondido') AS respostas_llm,
  COUNT(DISTINCT IF(iv.fonte = 'guardrails' AND iv.decisao = 'bloquear', msg.mensagem_id, NULL)) AS bloqueadas_guardrails,
  COUNT(DISTINCT IF(iv.fonte = 'agente_filtro_saida', msg.mensagem_id, NULL)) AS substituidas_filtro,
  SAFE_DIVIDE(
    COUNT(DISTINCT IF(iv.fonte = 'guardrails' AND iv.decisao = 'bloquear', msg.mensagem_id, NULL)),
    COUNTIF(papel = 'cliente')
  ) AS pct_bloqueio,
  SAFE_DIVIDE(
    COUNT(DISTINCT IF(iv.fonte = 'agente_filtro_saida', msg.mensagem_id, NULL)),
    COUNTIF(papel = 'agente' AND status = 'respondido')
  ) AS pct_substituidas_filtro
FROM msg
LEFT JOIN iv USING (mensagem_id)
GROUP BY periodo
ORDER BY periodo
