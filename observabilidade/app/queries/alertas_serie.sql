WITH aceites AS (
  SELECT DISTINCT alerta_id FROM `$obs.ajustes_oferecidos` WHERE resultado = 'aceito'
),
al AS (
  SELECT
    DATE(a.criado_em, 'America/Sao_Paulo') AS d,
    a.*, x.alerta_id IS NOT NULL AS teve_aceite
  FROM `$obs.alertas` a
  LEFT JOIN aceites x USING (alerta_id)
)
SELECT
  IF(@granularidade = 'semana', DATE_TRUNC(d, WEEK(MONDAY)), DATE_TRUNC(d, MONTH)) AS periodo,
  COUNT(*) AS enviados,
  SAFE_DIVIDE(COUNTIF(consentiu), COUNTIF(requer_consentimento)) AS pct_consentimento,
  SAFE_DIVIDE(COUNTIF(teve_aceite), COUNT(*)) AS pct_com_ajuste_aceito,
  COUNTIF(desativou_notificacao) AS desativacoes
FROM al
WHERE d BETWEEN @data_inicio AND @data_fim
GROUP BY periodo
ORDER BY periodo
