-- Funil do aviso proativo: /analyze -> consentimento -> /savings -> ajuste aceito, por momento e status.
WITH aceites AS (
  SELECT DISTINCT alerta_id FROM `$obs.ajustes_oferecidos` WHERE resultado = 'aceito'
),
al AS (
  SELECT
    a.*, x.alerta_id IS NOT NULL AS teve_aceite
  FROM `$obs.alertas` a
  LEFT JOIN aceites x USING (alerta_id)
  WHERE DATE(a.criado_em, 'America/Sao_Paulo') BETWEEN @data_inicio AND @data_fim
)
SELECT
  momento,
  status_alerta,
  COUNT(*) AS enviados,
  COUNTIF(requer_consentimento) AS pediram_consentimento,
  COUNTIF(consentiu IS NOT NULL) AS responderam,
  COUNTIF(consentiu) AS consentiram,
  COUNTIF(n_ajustes_oferecidos > 0) AS com_ajuste_oferecido,
  COUNTIF(teve_aceite) AS com_ajuste_aceito,
  COUNTIF(desativou_notificacao) AS desativaram_notificacao
FROM al
GROUP BY momento, status_alerta
ORDER BY momento, enviados DESC
