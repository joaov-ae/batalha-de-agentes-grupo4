-- Gasto por categoria macro nos últimos 12 meses: total, média mensal e mês atual (até a data de referência).
SELECT
  macro AS categoria,
  ROUND(SUM(vlr), 2) AS total_12m,
  ROUND(SUM(vlr) / 12, 2) AS media_mensal,
  ROUND(SUM(IF(DATE_TRUNC(data, MONTH) = DATE_TRUNC(@data_referencia, MONTH), vlr, 0)), 2) AS gasto_mes_atual,
  COUNT(*) AS lancamentos,
  LOGICAL_OR(consumo) AS via_fatura
FROM `$dm.stg_extrato`
WHERE id_usuario = @id_usuario AND tipo = 'S'
  AND data > DATE_SUB(@data_referencia, INTERVAL 12 MONTH)
GROUP BY macro
ORDER BY total_12m DESC
