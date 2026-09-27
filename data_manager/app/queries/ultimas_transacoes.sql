SELECT data, tipo, descr AS descricao, ROUND(vlr, 2) AS valor, macro AS categoria, micro AS subcategoria, canal,
  afeta_conta, parcela_atual, parcela_total
FROM `$dm.stg_extrato`
WHERE id_usuario = @id_usuario
  AND (@categoria = '' OR LOWER(macro) = LOWER(@categoria) OR LOWER(micro) = LOWER(@categoria))
ORDER BY data DESC, vlr DESC
LIMIT @limite
