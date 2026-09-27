SELECT id_usuario, saldo_fechamento AS saldo_hoje
FROM `$dm.saldo_diario`
WHERE data = @data_referencia
