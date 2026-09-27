-- Motor de recorrência: um item é recorrente quando aparece em pelo menos 3 dos 4 meses completos
-- anteriores ao mês da data de referência. Só entram lançamentos que movem a conta.
-- Chave: o serviço para assinaturas e a micro-categoria para o resto.
CREATE OR REPLACE TABLE `$dm.recorrencias`
CLUSTER BY id_usuario AS
WITH base AS (
  SELECT
    s.*,
    IF(s.macro = 'Assinaturas', s.servico_assinatura, s.micro) AS chave,
    DATE_DIFF(DATE_TRUNC(@data_referencia, MONTH), DATE_TRUNC(s.data, MONTH), MONTH) AS meses_atras
  FROM `$dm.stg_extrato` s
  WHERE s.afeta_conta AND NOT s.fora_da_rotina
),
mensal AS (
  SELECT id_usuario, chave, tipo, meses_atras, SUM(vlr) AS total_mes
  FROM base
  WHERE meses_atras BETWEEN 1 AND 4
  GROUP BY 1, 2, 3, 4
),
agg AS (
  SELECT
    id_usuario, chave, tipo,
    COUNT(DISTINCT meses_atras) AS meses_presentes,
    ROUND(AVG(IF(meses_atras <= 3, total_mes, NULL)), 2) AS valor_previsto
  FROM mensal
  GROUP BY 1, 2, 3
  HAVING meses_presentes >= 3
),
dia_moda AS (
  SELECT id_usuario, chave, tipo, ARRAY_AGG(dia ORDER BY n DESC, dia DESC LIMIT 1)[OFFSET(0)] AS dia_tipico
  FROM (
    SELECT id_usuario, chave, tipo, EXTRACT(DAY FROM data) AS dia, COUNT(*) AS n
    FROM base
    WHERE meses_atras BETWEEN 0 AND 6
    GROUP BY 1, 2, 3, 4
  )
  GROUP BY 1, 2, 3
),
detalhe AS (
  SELECT
    id_usuario, chave, tipo,
    ANY_VALUE(macro) AS macro,
    ANY_VALUE(micro) AS micro,
    ANY_VALUE(grupo_assinatura) AS grupo_assinatura,
    LOGICAL_OR(reagendavel) AS reagendavel,
    APPROX_TOP_COUNT(descr, 1)[OFFSET(0)].value AS descricao,
    MAX(data) AS ultima_data,
    LOGICAL_OR(meses_atras = 0) AS ocorreu_no_mes_atual,
    ARRAY_AGG(IF(parcela_total IS NOT NULL, STRUCT(parcela_atual, parcela_total), NULL) IGNORE NULLS ORDER BY data DESC LIMIT 1) AS ult_parcela
  FROM base
  GROUP BY 1, 2, 3
)
SELECT
  a.id_usuario,
  a.chave,
  a.tipo,
  CASE
    WHEN a.tipo = 'E' AND d.micro = 'Salario CLT' THEN 'salario'
    WHEN a.tipo = 'E' AND d.micro = 'Beneficio INSS' THEN 'beneficio'
    WHEN a.tipo = 'E' AND d.micro = 'Recebimento Aluguel' THEN 'aluguel_recebido'
    WHEN a.tipo = 'E' THEN 'entrada_recorrente'
    WHEN d.macro = 'Assinaturas' THEN 'assinatura'
    WHEN d.micro = 'Pagamento de fatura' THEN 'fatura'
    WHEN d.macro = 'Emprestimos e financiamentos' THEN 'financiamento'
    WHEN ARRAY_LENGTH(d.ult_parcela) > 0 THEN 'parcela'
    ELSE 'conta_fixa'
  END AS tipo_item,
  d.descricao,
  d.macro,
  d.micro,
  d.grupo_assinatura,
  d.reagendavel,
  m.dia_tipico,
  a.valor_previsto,
  a.meses_presentes,
  d.ultima_data,
  d.ocorreu_no_mes_atual,
  IF(ARRAY_LENGTH(d.ult_parcela) > 0, d.ult_parcela[OFFSET(0)].parcela_atual, NULL) AS parcela_atual,
  IF(ARRAY_LENGTH(d.ult_parcela) > 0, d.ult_parcela[OFFSET(0)].parcela_total, NULL) AS parcela_total,
  IF(ARRAY_LENGTH(d.ult_parcela) > 0,
     d.ult_parcela[OFFSET(0)].parcela_total - d.ult_parcela[OFFSET(0)].parcela_atual, NULL) AS parcelas_restantes,
  @data_referencia AS data_referencia
FROM agg a
JOIN detalhe d USING (id_usuario, chave, tipo)
JOIN dia_moda m USING (id_usuario, chave, tipo)
WHERE a.valor_previsto IS NOT NULL;
