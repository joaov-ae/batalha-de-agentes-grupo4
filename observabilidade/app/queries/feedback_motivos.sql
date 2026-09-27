SELECT IFNULL(motivo, 'sem_motivo') AS motivo, COUNT(*) AS dislikes
FROM `$obs.feedback_mensagens`
WHERE voto = 'down' AND DATE(criado_em, 'America/Sao_Paulo') BETWEEN @data_inicio AND @data_fim
GROUP BY motivo
ORDER BY dislikes DESC
