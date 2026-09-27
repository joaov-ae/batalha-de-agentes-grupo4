-- KPIs do período. Datas no fuso de São Paulo; intervenção e encaminhamento derivados dos fatos.
WITH aceites AS (
  SELECT DISTINCT alerta_id FROM `$obs.ajustes_oferecidos` WHERE resultado = 'aceito'
),
conv AS (
  SELECT conversa_id, id_usuario FROM `$obs.conversas`
  WHERE DATE(iniciada_em, 'America/Sao_Paulo') BETWEEN @data_inicio AND @data_fim
),
iv AS (
  SELECT * FROM `$obs.intervencoes`
  WHERE DATE(criado_em, 'America/Sao_Paulo') BETWEEN @data_inicio AND @data_fim
),
fb AS (
  SELECT voto FROM `$obs.feedback_mensagens`
  WHERE DATE(criado_em, 'America/Sao_Paulo') BETWEEN @data_inicio AND @data_fim
),
al AS (
  SELECT a.*, x.alerta_id IS NOT NULL AS teve_aceite
  FROM `$obs.alertas` a
  LEFT JOIN aceites x USING (alerta_id)
  WHERE DATE(a.criado_em, 'America/Sao_Paulo') BETWEEN @data_inicio AND @data_fim
)
SELECT
  (SELECT COUNT(DISTINCT id_usuario) FROM conv) AS clientes_ativos,
  (SELECT COUNT(*) FROM conv) AS conversas,
  (SELECT COUNT(DISTINCT conversa_id) FROM iv) AS conversas_com_intervencao,
  SAFE_DIVIDE((SELECT COUNT(DISTINCT conversa_id) FROM iv), (SELECT COUNT(*) FROM conv)) AS pct_conversas_com_intervencao,
  (SELECT COUNT(*) FROM iv) AS intervencoes,
  (SELECT COUNT(DISTINCT id_usuario) FROM iv) AS clientes_com_intervencao,
  (SELECT COUNT(DISTINCT id_usuario) FROM iv WHERE fonte = 'atendimento_humano') AS clientes_encaminhados_atendimento,
  (SELECT COUNT(*) FROM fb) AS votos,
  SAFE_DIVIDE((SELECT COUNTIF(voto = 'up') FROM fb), (SELECT COUNT(*) FROM fb)) AS like_rate,
  (SELECT COUNT(*) FROM al) AS alertas,
  SAFE_DIVIDE((SELECT COUNTIF(teve_aceite) FROM al), (SELECT COUNT(*) FROM al)) AS pct_alertas_com_ajuste_aceito,
  SAFE_DIVIDE(
    (SELECT COUNT(DISTINCT id_usuario) FROM al WHERE desativou_notificacao),
    (SELECT COUNT(DISTINCT id_usuario) FROM al)
  ) AS pct_clientes_desativaram_notificacao
