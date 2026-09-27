-- Linha do tempo de um cliente: todos os eventos observados, do mais recente ao mais antigo.
SELECT * FROM (
  SELECT iniciada_em AS em, 'conversa' AS tipo, conversa_id, origem AS detalhe, momento AS extra
  FROM `$obs.conversas` WHERE id_usuario = @id_usuario
  UNION ALL
  SELECT criado_em, 'alerta', conversa_id, status_alerta, momento
  FROM `$obs.alertas` WHERE id_usuario = @id_usuario
  UNION ALL
  SELECT criado_em, 'ajuste', NULL, tipo, resultado
  FROM `$obs.ajustes_oferecidos` WHERE id_usuario = @id_usuario
  UNION ALL
  SELECT criado_em, 'intervencao', conversa_id, codigo, decisao
  FROM `$obs.intervencoes` WHERE id_usuario = @id_usuario
  UNION ALL
  SELECT criado_em, 'feedback', conversa_id, voto, motivo
  FROM `$obs.feedback_mensagens` WHERE id_usuario = @id_usuario
)
ORDER BY em DESC
LIMIT @limite
