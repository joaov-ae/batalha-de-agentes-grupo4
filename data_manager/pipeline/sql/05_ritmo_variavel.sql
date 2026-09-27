-- Ritmo diário das saídas da conta que não são recorrentes (Pix para terceiros, saques, boletos avulsos...),
-- nos últimos 90 dias. É o "gasto variável no ritmo dos últimos 3 meses" da projeção.
-- O consumo (mercado, restaurante...) não entra aqui porque chega à conta pela fatura, que é recorrente.
-- saida_variavel_diaria_7d é o ritmo da última semana (momento 3: "no ritmo desta semana...").
CREATE OR REPLACE TABLE `$dm.ritmo_variavel`
CLUSTER BY id_usuario AS
WITH saidas AS (
  SELECT s.id_usuario, s.vlr, s.data > DATE_SUB(@data_referencia, INTERVAL 7 DAY) AS ultima_semana
  FROM `$dm.stg_extrato` s
  LEFT JOIN `$dm.recorrencias` r
    ON r.id_usuario = s.id_usuario AND r.tipo = 'S'
   AND r.chave = IF(s.macro = 'Assinaturas', s.servico_assinatura, s.micro)
  WHERE s.afeta_conta AND s.tipo = 'S' AND NOT s.fora_da_rotina
    AND s.data > DATE_SUB(@data_referencia, INTERVAL 90 DAY)
    AND r.chave IS NULL
)
SELECT
  u.id_usuario,
  ROUND(IFNULL(SUM(s.vlr), 0) / 90, 2) AS saida_variavel_diaria,
  ROUND(IFNULL(SUM(IF(s.ultima_semana, s.vlr, 0)), 0) / 7, 2) AS saida_variavel_diaria_7d,
  @data_referencia AS data_referencia
FROM (SELECT DISTINCT id_usuario FROM `$dm.stg_extrato`) u
LEFT JOIN saidas s USING (id_usuario)
GROUP BY u.id_usuario;
