SELECT
  IF(@granularidade = 'semana', DATE_TRUNC(d, WEEK(MONDAY)), DATE_TRUNC(d, MONTH)) AS periodo,
  fonte,
  COUNT(*) AS intervencoes,
  COUNT(DISTINCT id_usuario) AS clientes
FROM (SELECT DATE(criado_em, 'America/Sao_Paulo') AS d, fonte, id_usuario FROM `$obs.intervencoes`)
WHERE d BETWEEN @data_inicio AND @data_fim
GROUP BY periodo, fonte
ORDER BY periodo, fonte
