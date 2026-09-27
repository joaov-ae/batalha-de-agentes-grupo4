-- Onde o dinheiro mais saiu nos últimos 12 meses, por descrição do lançamento (inclui serviço de assinatura).
SELECT
  descr AS descricao,
  macro AS categoria,
  ANY_VALUE(servico_assinatura) AS servico_assinatura,
  ANY_VALUE(grupo_assinatura) AS grupo_assinatura,
  COUNT(*) AS vezes,
  ROUND(SUM(vlr), 2) AS total_12m,
  ROUND(AVG(vlr), 2) AS valor_medio,
  MAX(data) AS ultima_data
FROM `$dm.stg_extrato`
WHERE id_usuario = @id_usuario AND tipo = 'S'
  AND data > DATE_SUB(@data_referencia, INTERVAL 12 MONTH)
GROUP BY descr, macro
ORDER BY total_12m DESC
LIMIT @limite
