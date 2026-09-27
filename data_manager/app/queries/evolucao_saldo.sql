-- Erosão do saldo mês a mês (o sinal que antecede o primeiro negativo).
SELECT
  mes, saldo_medio, saldo_minimo, saldo_fim, dias_negativos, juros_pagos, renda_mes,
  ROUND(entradas_conta, 2) AS entradas_conta, ROUND(saidas_conta, 2) AS saidas_conta,
  ROUND(consumo, 2) AS consumo_cartao_e_pix, meses_atras = 0 AS mes_parcial
FROM `$dm.perfil_mensal`
WHERE id_usuario = @id_usuario AND meses_atras BETWEEN 0 AND @meses
ORDER BY mes
