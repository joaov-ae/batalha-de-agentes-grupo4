SELECT id_usuario, chave, tipo, tipo_item, descricao, micro, dia_tipico, valor_previsto, ultima_data,
  ocorreu_no_mes_atual, reagendavel, grupo_assinatura, parcelas_restantes
FROM `$dm.recorrencias`
