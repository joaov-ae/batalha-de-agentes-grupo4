-- A/B do escopo: tratamento (recebe o agente) x controle, por mês.
SELECT
  mes,
  grupo_ab,
  COUNT(*) AS clientes,
  SAFE_DIVIDE(COUNTIF(entrou_no_negativo), COUNT(*)) AS taxa_entrada_negativo,
  SAFE_DIVIDE(COUNTIF(chegou_ao_salario_sem_limite), COUNT(*)) AS pct_chegou_sem_limite,
  AVG(dias_no_limite) AS dias_no_limite_medio,
  SUM(juros_pagos) AS juros_pagos_total,
  AVG(juros_pagos) AS juros_pagos_medio
FROM `$obs.resultado_ciclo`
WHERE mes BETWEEN DATE_TRUNC(@data_inicio, MONTH) AND @data_fim
GROUP BY mes, grupo_ab
ORDER BY mes, grupo_ab
