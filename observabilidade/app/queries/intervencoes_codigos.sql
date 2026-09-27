SELECT fonte, codigo, categoria, decisao, direcao, COUNT(*) AS intervencoes, COUNT(DISTINCT id_usuario) AS clientes
FROM `$obs.intervencoes`
WHERE DATE(criado_em, 'America/Sao_Paulo') BETWEEN @data_inicio AND @data_fim
GROUP BY fonte, codigo, categoria, decisao, direcao
ORDER BY intervencoes DESC
