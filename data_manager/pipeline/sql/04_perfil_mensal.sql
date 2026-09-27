-- Um registro por cliente e mês (o mês da data de referência é parcial).
CREATE OR REPLACE TABLE `$dm.perfil_mensal`
CLUSTER BY id_usuario AS
WITH saldo AS (
  SELECT
    id_usuario, mes,
    SUM(entradas_conta) AS entradas_conta,
    SUM(saidas_conta) AS saidas_conta,
    SUM(consumo) AS consumo,
    MIN(saldo_fechamento) AS saldo_minimo,
    ROUND(AVG(saldo_fechamento), 2) AS saldo_medio,
    ARRAY_AGG(saldo_fechamento ORDER BY data DESC LIMIT 1)[OFFSET(0)] AS saldo_fim,
    COUNTIF(saldo_fechamento < 0) AS dias_negativos,
    ROUND(SUM(IF(saldo_fechamento < 0, -saldo_fechamento, 0)), 2) AS saldo_devedor_dia_acumulado,
    COUNT(*) AS dias_no_mes
  FROM `$dm.saldo_diario`
  GROUP BY 1, 2
),
extrato AS (
  SELECT
    id_usuario, DATE_TRUNC(data, MONTH) AS mes,
    ROUND(SUM(IF(micro = 'Juros pagos', vlr, 0)), 2) AS juros_pagos,
    ROUND(SUM(IF(micro = 'Pagamento de fatura', vlr, 0)), 2) AS valor_fatura,
    MAX(CASE tipo_fatura WHEN 'minimo' THEN 3 WHEN 'parcial' THEN 2 WHEN 'integral' THEN 1 END) AS pior_fatura,
    ROUND(SUM(IF(discricionario, vlr, 0)), 2) AS consumo_discricionario,
    COUNTIF(micro = 'Saque') AS saques,
    COUNTIF(micro IN ('Emprestimos', 'Outros emprestimos')) AS emprestimos,
    ROUND(SUM(IF(tipo = 'E' AND micro IN ('Salario CLT', 'Beneficio INSS', 'Recebimento Aluguel', 'Recebimentos diversos'), vlr, 0)), 2) AS renda_mes
  FROM `$dm.stg_extrato`
  GROUP BY 1, 2
)
SELECT
  s.*,
  IFNULL(e.juros_pagos, 0) AS juros_pagos,
  IFNULL(e.valor_fatura, 0) AS valor_fatura,
  CASE e.pior_fatura WHEN 3 THEN 'minimo' WHEN 2 THEN 'parcial' WHEN 1 THEN 'integral' END AS tipo_fatura,
  IFNULL(e.consumo_discricionario, 0) AS consumo_discricionario,
  IFNULL(e.saques, 0) AS saques,
  IFNULL(e.emprestimos, 0) AS emprestimos,
  IFNULL(e.renda_mes, 0) AS renda_mes,
  DATE_DIFF(DATE_TRUNC(@data_referencia, MONTH), s.mes, MONTH) AS meses_atras
FROM saldo s
LEFT JOIN extrato e USING (id_usuario, mes);
