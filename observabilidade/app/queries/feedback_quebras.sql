-- Like rate por dimensão da mensagem votada: estado do cliente, origem da conversa, status do agente e se a
-- mensagem sofreu intervenção.
WITH com_iv AS (
  SELECT DISTINCT mensagem_id FROM `$obs.intervencoes`
),
base AS (
  SELECT
    f.voto,
    c.estado_cliente,
    c.origem,
    m.status,
    x.mensagem_id IS NOT NULL AS com_intervencao
  FROM `$obs.feedback_mensagens` f
  JOIN `$obs.mensagens` m USING (mensagem_id)
  JOIN `$obs.conversas` c ON c.conversa_id = m.conversa_id
  LEFT JOIN com_iv x ON x.mensagem_id = f.mensagem_id
  WHERE DATE(f.criado_em, 'America/Sao_Paulo') BETWEEN @data_inicio AND @data_fim
),
longa AS (
  SELECT 'estado_cliente' AS dimensao, estado_cliente AS valor, voto FROM base
  UNION ALL SELECT 'origem', origem, voto FROM base
  UNION ALL SELECT 'status_agente', status, voto FROM base
  UNION ALL SELECT 'com_intervencao', CAST(com_intervencao AS STRING), voto FROM base
)
SELECT dimensao, valor, COUNT(*) AS votos, SAFE_DIVIDE(COUNTIF(voto = 'up'), COUNT(*)) AS like_rate
FROM longa
GROUP BY dimensao, valor
ORDER BY dimensao, votos DESC
