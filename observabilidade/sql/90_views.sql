-- Views de conveniência para consulta direta no BigQuery (Looker Studio, notebooks).
CREATE OR REPLACE VIEW `$obs.v_kpis_mensais` AS
WITH
conv AS (
  SELECT DATE_TRUNC(DATE(iniciada_em, 'America/Sao_Paulo'), MONTH) AS mes, COUNT(*) AS conversas
  FROM `$obs.conversas` GROUP BY mes
),
iv AS (
  SELECT DATE_TRUNC(DATE(criado_em, 'America/Sao_Paulo'), MONTH) AS mes, COUNT(*) AS intervencoes
  FROM `$obs.intervencoes` GROUP BY mes
),
fb AS (
  SELECT DATE_TRUNC(DATE(criado_em, 'America/Sao_Paulo'), MONTH) AS mes,
         SAFE_DIVIDE(COUNTIF(voto = 'up'), COUNT(*)) AS like_rate
  FROM `$obs.feedback_mensagens` GROUP BY mes
),
al AS (
  SELECT DATE_TRUNC(DATE(criado_em, 'America/Sao_Paulo'), MONTH) AS mes, COUNT(*) AS alertas
  FROM `$obs.alertas` GROUP BY mes
),
aj AS (
  SELECT DATE_TRUNC(DATE(criado_em, 'America/Sao_Paulo'), MONTH) AS mes,
         SAFE_DIVIDE(COUNTIF(resultado = 'aceito'), COUNT(*)) AS pct_aceite_ajustes
  FROM `$obs.ajustes_oferecidos` GROUP BY mes
)
SELECT mes, conversas, intervencoes, like_rate, alertas, pct_aceite_ajustes
FROM conv
LEFT JOIN iv USING (mes)
LEFT JOIN fb USING (mes)
LEFT JOIN al USING (mes)
LEFT JOIN aj USING (mes);

CREATE OR REPLACE VIEW `$obs.v_impacto_ab` AS
SELECT
  mes,
  SAFE_DIVIDE(COUNTIF(grupo_ab = 'tratamento' AND entrou_no_negativo), COUNTIF(grupo_ab = 'tratamento'))
    AS taxa_negativo_tratamento,
  SAFE_DIVIDE(COUNTIF(grupo_ab = 'controle' AND entrou_no_negativo), COUNTIF(grupo_ab = 'controle'))
    AS taxa_negativo_controle
FROM `$obs.resultado_ciclo`
GROUP BY mes;
