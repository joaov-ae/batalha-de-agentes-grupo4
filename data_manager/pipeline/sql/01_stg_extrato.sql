-- Extrato limpo até a data de referência, com colunas derivadas usadas por todo o pipeline.
CREATE OR REPLACE TABLE `$dm.stg_extrato`
CLUSTER BY id_usuario AS
SELECT
  e.id_usuario,
  DATE(e.anomesdia) AS data,
  e.anomes,
  e.tipo,
  e.descr,
  e.vlr,
  IF(e.tipo = 'E', e.vlr, -e.vlr) AS valor_sinal,
  e.nom_cate_macro AS macro,
  e.nom_cate_micro AS micro,
  e.saldo_apos,
  CAST(e.parcela_atual AS INT64) AS parcela_atual,
  CAST(e.parcela_total AS INT64) AS parcela_total,
  CASE SPLIT(e.descr, ' ')[SAFE_OFFSET(0)]
    WHEN 'pix' THEN 'pix'
    WHEN 'cart' THEN 'cartao'
    WHEN 'saque' THEN 'saque'
    WHEN 'assin' THEN 'assinatura'
    WHEN 'cred' THEN 'credito'
    WHEN 'pag' THEN 'pagamento'
    WHEN 'pagto' THEN 'pagamento'
    WHEN 'bol' THEN 'pagamento'
    ELSE 'debito_automatico'
  END AS canal,
  NOT IFNULL(r.consumo, FALSE) AS afeta_conta,
  IFNULL(r.consumo, FALSE) AS consumo,
  IFNULL(r.discricionario, FALSE) AS discricionario,
  IFNULL(r.reagendavel, FALSE) AS reagendavel,
  IFNULL(r.fora_da_rotina, FALSE) AS fora_da_rotina,
  IF(e.nom_cate_macro = 'Assinaturas', TRIM(REGEXP_REPLACE(e.descr, r'^assin\s+', '')), NULL) AS servico_assinatura,
  CASE
    WHEN e.nom_cate_macro != 'Assinaturas' THEN NULL
    WHEN REGEXP_CONTAINS(e.descr, r'netflix|disney|hbo|star plus|paramount|globoplay|apple tv|amazon prime') THEN 'video'
    WHEN REGEXP_CONTAINS(e.descr, r'spotify|deezer|youtube music') THEN 'musica'
    ELSE 'outros'
  END AS grupo_assinatura,
  IF(e.nom_cate_micro = 'Pagamento de fatura', REGEXP_EXTRACT(e.descr, r'(integral|parcial|minimo)$'), NULL) AS tipo_fatura
FROM `$fonte` e
LEFT JOIN `$dm.ref_categorias` r ON r.micro = e.nom_cate_micro
WHERE DATE(e.anomesdia) <= @data_referencia;
