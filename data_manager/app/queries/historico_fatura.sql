SELECT data, ROUND(vlr, 2) AS valor, tipo_fatura, descr AS descricao
FROM `$dm.stg_extrato`
WHERE id_usuario = @id_usuario AND micro = 'Pagamento de fatura'
  AND data > DATE_SUB(@data_referencia, INTERVAL @meses MONTH)
ORDER BY data DESC
