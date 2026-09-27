-- Saúde do guardrails: camada que respondeu, fail-open (degradado) e latência.
SELECT
  camada,
  COUNT(*) AS intervencoes,
  SAFE_DIVIDE(COUNTIF(degradado), COUNT(*)) AS pct_degradado,
  APPROX_QUANTILES(latencia_ms, 100)[OFFSET(50)] AS latencia_p50_ms,
  APPROX_QUANTILES(latencia_ms, 100)[OFFSET(95)] AS latencia_p95_ms
FROM `$obs.intervencoes`
WHERE fonte = 'guardrails' AND DATE(criado_em, 'America/Sao_Paulo') BETWEEN @data_inicio AND @data_fim
GROUP BY camada
ORDER BY intervencoes DESC
