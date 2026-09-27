SELECT
  IF(@granularidade = 'semana', DATE_TRUNC(d, WEEK(MONDAY)), DATE_TRUNC(d, MONTH)) AS periodo,
  COUNT(*) AS votos,
  COUNTIF(voto = 'up') AS likes,
  COUNTIF(voto = 'down') AS dislikes,
  SAFE_DIVIDE(COUNTIF(voto = 'up'), COUNT(*)) AS like_rate
FROM (
  SELECT DATE(criado_em, 'America/Sao_Paulo') AS d, voto FROM `$obs.feedback_mensagens`
)
WHERE d BETWEEN @data_inicio AND @data_fim
GROUP BY periodo
ORDER BY periodo
