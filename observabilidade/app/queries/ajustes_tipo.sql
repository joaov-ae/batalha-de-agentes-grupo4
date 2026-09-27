SELECT
  tipo,
  COUNT(*) AS oferecidos,
  COUNTIF(resultado = 'aceito') AS aceitos,
  COUNTIF(resultado = 'recusado') AS recusados,
  COUNTIF(resultado = 'agora_nao') AS agora_nao,
  COUNTIF(resultado = 'ignorado') AS ignorados,
  SAFE_DIVIDE(COUNTIF(resultado = 'aceito'), COUNT(*)) AS pct_aceite,
  AVG(IF(resultado = 'aceito', impacto_dias, NULL)) AS dias_ganhos_medio_aceitos,
  SUM(IF(resultado = 'aceito', valor, 0)) AS valor_aceito_total
FROM `$obs.ajustes_oferecidos`
WHERE DATE(criado_em, 'America/Sao_Paulo') BETWEEN @data_inicio AND @data_fim
GROUP BY tipo
ORDER BY oferecidos DESC
