-- Saldo de fechamento por dia de calendário.
-- A base não tem ordem dentro do dia. O fechamento é o saldo_apos `c` de um lançamento que move a conta
-- cuja abertura implícita (c - fluxo do dia) coincide com o saldo anterior de algum lançamento do dia
-- (o primeiro da cadeia). Validado: reconcilia fech(d) = fech(d-1) + fluxo(d) em ~98,7% dos dias, sem
-- ambiguidade. Dias só com consumo mantêm o saldo; dias sem lançamento repetem o último fechamento.
CREATE OR REPLACE TABLE `$dm.saldo_diario`
CLUSTER BY id_usuario AS
WITH conta AS (
  SELECT id_usuario, data, saldo_apos, valor_sinal,
    SUM(valor_sinal) OVER (PARTITION BY id_usuario, data) AS fluxo_dia
  FROM `$dm.stg_extrato`
  WHERE afeta_conta
),
candidatos AS (
  SELECT c.id_usuario, c.data, MIN(c.saldo_apos) AS fechamento
  FROM conta c
  JOIN conta j
    ON c.id_usuario = j.id_usuario AND c.data = j.data
   AND CAST(ROUND((j.saldo_apos - j.valor_sinal) * 100) AS INT64) = CAST(ROUND((c.saldo_apos - c.fluxo_dia) * 100) AS INT64)
  GROUP BY 1, 2
),
dia AS (
  SELECT
    s.id_usuario, s.data,
    SUM(IF(s.afeta_conta, s.valor_sinal, 0)) AS fluxo_conta,
    SUM(IF(s.afeta_conta AND s.tipo = 'E', s.vlr, 0)) AS entradas_conta,
    SUM(IF(s.afeta_conta AND s.tipo = 'S', s.vlr, 0)) AS saidas_conta,
    SUM(IF(s.consumo, s.vlr, 0)) AS consumo,
    COUNTIF(s.afeta_conta) AS n_conta,
    MIN(IF(s.afeta_conta, s.saldo_apos, NULL)) AS min_conta,
    MAX(s.saldo_apos) AS max_saldo
  FROM `$dm.stg_extrato` s
  GROUP BY 1, 2
),
dia_fech AS (
  SELECT d.*, IF(d.n_conta = 0, d.max_saldo, COALESCE(c.fechamento, d.min_conta)) AS fechamento_obs
  FROM dia d LEFT JOIN candidatos c USING (id_usuario, data)
),
calendario AS (
  SELECT id_usuario, data
  FROM (SELECT id_usuario, MIN(data) AS ini FROM `$dm.stg_extrato` GROUP BY 1),
  UNNEST(GENERATE_DATE_ARRAY(ini, @data_referencia)) AS data
)
SELECT
  cal.id_usuario,
  cal.data,
  DATE_TRUNC(cal.data, MONTH) AS mes,
  IFNULL(f.fluxo_conta, 0) AS fluxo_conta,
  IFNULL(f.entradas_conta, 0) AS entradas_conta,
  IFNULL(f.saidas_conta, 0) AS saidas_conta,
  IFNULL(f.consumo, 0) AS consumo,
  LAST_VALUE(f.fechamento_obs IGNORE NULLS) OVER (
    PARTITION BY cal.id_usuario ORDER BY cal.data ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS saldo_fechamento
FROM calendario cal
LEFT JOIN dia_fech f USING (id_usuario, data);
