-- Juros de limite pagos no ano da data de referência e dias no negativo.
SELECT
  ROUND(SUM(juros_pagos), 2) AS juros_pagos_ano,
  SUM(dias_negativos) AS dias_negativos_ano,
  COUNTIF(dias_negativos > 0) AS meses_com_negativo
FROM `$dm.perfil_mensal`
WHERE id_usuario = @id_usuario AND EXTRACT(YEAR FROM mes) = EXTRACT(YEAR FROM @data_referencia)
