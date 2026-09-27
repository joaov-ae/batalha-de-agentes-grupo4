-- Gasto por categoria macro: mês atual (até a data de referência) e média dos N meses completos anteriores.
WITH m AS (
  SELECT
    macro,
    DATE_DIFF(DATE_TRUNC(@data_referencia, MONTH), DATE_TRUNC(data, MONTH), MONTH) AS meses_atras,
    SUM(vlr) AS total,
    LOGICAL_OR(consumo) AS via_fatura
  FROM `$dm.stg_extrato`
  WHERE id_usuario = @id_usuario AND tipo = 'S'
  GROUP BY 1, 2
)
SELECT
  macro,
  ROUND(SUM(IF(meses_atras = 0, total, 0)), 2) AS gasto_mes_atual,
  ROUND(SUM(IF(meses_atras BETWEEN 1 AND @meses, total, 0)) / @meses, 2) AS media_mensal,
  LOGICAL_OR(via_fatura) AS via_fatura
FROM m
WHERE meses_atras <= @meses
GROUP BY macro
ORDER BY media_mensal DESC
