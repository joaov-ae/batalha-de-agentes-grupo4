-- Taxa diária de juros do limite calibrada na própria base (evita número inventado):
-- juros pagos no mês / soma dos saldos devedores diários do mês, só nos meses com dias negativos.
-- Referência 2025-12-15: ~0,102% ao dia (~3,1% ao mês).
CREATE OR REPLACE TABLE `$dm.parametros` AS
SELECT
  SAFE_DIVIDE(SUM(juros_pagos), SUM(saldo_devedor_dia_acumulado)) AS taxa_juros_limite_dia,
  COUNT(*) AS meses_na_amostra,
  @data_referencia AS data_referencia
FROM `$dm.perfil_mensal`
WHERE dias_negativos > 0 AND meses_atras >= 1;
