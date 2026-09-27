-- Consumo discricionário por categoria macro: mês atual até a data de referência contra a média
-- do próprio cliente nos 3 meses completos anteriores, proporcional ao dia do mês.
-- Base do ajuste "gasto acima da própria média" (nunca compara com outras pessoas).
CREATE OR REPLACE TABLE `$dm.consumo_categoria`
CLUSTER BY id_usuario AS
WITH mensal AS (
  SELECT
    id_usuario,
    -- Loja de conveniência é a única parte discricionária da macro "Posto de combustivel".
    IF(micro = 'Loja de conveniencia', micro, macro) AS macro,
    DATE_DIFF(DATE_TRUNC(@data_referencia, MONTH), DATE_TRUNC(data, MONTH), MONTH) AS meses_atras,
    SUM(vlr) AS total
  FROM `$dm.stg_extrato`
  WHERE discricionario
  GROUP BY 1, 2, 3
),
fator AS (
  SELECT EXTRACT(DAY FROM @data_referencia) / EXTRACT(DAY FROM LAST_DAY(@data_referencia)) AS proporcao_mes
)
SELECT
  m.id_usuario,
  m.macro,
  ROUND(SUM(IF(meses_atras = 0, total, 0)), 2) AS gasto_mes_atual,
  ROUND(SUM(IF(meses_atras BETWEEN 1 AND 3, total, 0)) / 3, 2) AS media_mensal_3m,
  ROUND(SUM(IF(meses_atras BETWEEN 1 AND 3, total, 0)) / 3 * ANY_VALUE(f.proporcao_mes), 2) AS esperado_ate_hoje,
  @data_referencia AS data_referencia
FROM mensal m CROSS JOIN fator f
GROUP BY 1, 2;
