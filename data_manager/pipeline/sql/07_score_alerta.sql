-- Score de alerta: 6 sinais nos últimos 3 meses, 1 ponto cada. Score >= 4 antecipa o aviso do meio do mês.
-- Cortes calibrados para ~130 clientes com score >= 4 na referência 2025-12-15 (o escopo cita 133 em alerta).
-- Juros e saques aparecem na base mesmo sem saldo negativo, por isso exigem recorrência ou foram trocados.
-- meses_atras = 0 é o mês da data de referência (parcial); 1..3 são os 3 meses completos anteriores.
CREATE OR REPLACE TABLE `$dm.score_alerta`
CLUSTER BY id_usuario AS
WITH p AS (
  SELECT
    id_usuario,
    MAX(IF(meses_atras = 1, saldo_medio, NULL)) AS saldo_medio_m1,
    MAX(IF(meses_atras = 2, saldo_medio, NULL)) AS saldo_medio_m2,
    MAX(IF(meses_atras = 3, saldo_medio, NULL)) AS saldo_medio_m3,
    SUM(IF(meses_atras BETWEEN 0 AND 3, dias_negativos, 0)) AS dias_negativos_3m,
    COUNTIF(meses_atras BETWEEN 0 AND 3 AND tipo_fatura IN ('minimo', 'parcial')) AS meses_fatura_parcial,
    SUM(IF(meses_atras BETWEEN 0 AND 3, juros_pagos, 0)) AS juros_3m,
    COUNTIF(meses_atras BETWEEN 1 AND 3 AND juros_pagos > 0) AS meses_com_juros,
    SUM(IF(meses_atras BETWEEN 0 AND 3, emprestimos, 0)) AS emprestimos_3m,
    MAX(IF(meses_atras = 1, consumo + saidas_conta, NULL)) AS gasto_m1,
    AVG(IF(meses_atras BETWEEN 2 AND 4, consumo + saidas_conta, NULL)) AS gasto_media_m2_m4,
    -- meses seguidos com algum dia negativo, contando do mês atual para trás
    COUNTIF(meses_atras = 0 AND dias_negativos > 0) AS neg_m0,
    COUNTIF(meses_atras = 1 AND dias_negativos > 0) AS neg_m1,
    COUNTIF(meses_atras = 2 AND dias_negativos > 0) AS neg_m2
  FROM `$dm.perfil_mensal`
  GROUP BY 1
),
sinais AS (
  SELECT
    id_usuario,
    saldo_medio_m3 > saldo_medio_m2 AND saldo_medio_m2 > saldo_medio_m1 AS s_saldo_em_queda,
    dias_negativos_3m > 0 AS s_dias_no_negativo,
    meses_fatura_parcial >= 2 AS s_fatura_minimo_ou_parcial,
    meses_com_juros >= 2 AS s_juros_de_limite,
    emprestimos_3m > 0 AS s_emprestimo,
    gasto_m1 > 1.15 * gasto_media_m2_m4 AS s_gasto_acima_do_habitual,
    dias_negativos_3m,
    ROUND(juros_3m, 2) AS juros_3m,
    IF(neg_m0 = 1, IF(neg_m1 = 1, IF(neg_m2 = 1, 3, 2), 1), 0) AS meses_vermelho_consecutivos
  FROM p
)
SELECT
  id_usuario,
  CAST(IFNULL(s_saldo_em_queda, FALSE) AS INT64)
  + CAST(IFNULL(s_dias_no_negativo, FALSE) AS INT64)
  + CAST(IFNULL(s_fatura_minimo_ou_parcial, FALSE) AS INT64)
  + CAST(IFNULL(s_juros_de_limite, FALSE) AS INT64)
  + CAST(IFNULL(s_emprestimo, FALSE) AS INT64)
  + CAST(IFNULL(s_gasto_acima_do_habitual, FALSE) AS INT64) AS score,
  ARRAY(
    SELECT nome FROM UNNEST([
      IF(IFNULL(s_saldo_em_queda, FALSE), 'saldo_em_queda', NULL),
      IF(IFNULL(s_dias_no_negativo, FALSE), 'dias_no_negativo', NULL),
      IF(IFNULL(s_fatura_minimo_ou_parcial, FALSE), 'fatura_minimo_ou_parcial', NULL),
      IF(IFNULL(s_juros_de_limite, FALSE), 'juros_de_limite', NULL),
      IF(IFNULL(s_emprestimo, FALSE), 'emprestimo', NULL),
      IF(IFNULL(s_gasto_acima_do_habitual, FALSE), 'gasto_acima_do_habitual', NULL)
    ]) AS nome WHERE nome IS NOT NULL
  ) AS sinais,
  dias_negativos_3m,
  juros_3m,
  meses_vermelho_consecutivos,
  @data_referencia AS data_referencia
FROM sinais;
