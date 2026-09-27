-- Ranking de reincidência: clientes com mais intervenções no período (filtro opcional por fonte).
SELECT
  i.id_usuario,
  ANY_VALUE(c.grupo_ab) AS grupo_ab,
  COUNT(*) AS intervencoes,
  COUNT(DISTINCT i.conversa_id) AS conversas_com_intervencao,
  ARRAY_AGG(DISTINCT i.codigo ORDER BY i.codigo) AS codigos,
  MAX(i.criado_em) AS ultima_intervencao
FROM `$obs.intervencoes` i
LEFT JOIN `$obs.clientes` c USING (id_usuario)
WHERE DATE(i.criado_em, 'America/Sao_Paulo') BETWEEN @data_inicio AND @data_fim
  AND (@fonte = '' OR i.fonte = @fonte)
GROUP BY i.id_usuario
ORDER BY intervencoes DESC, ultima_intervencao DESC
LIMIT @limite
