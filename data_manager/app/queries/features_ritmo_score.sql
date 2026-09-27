SELECT r.id_usuario, r.saida_variavel_diaria, r.saida_variavel_diaria_7d,
  IFNULL(s.score, 0) AS score, IFNULL(s.sinais, []) AS sinais, IFNULL(s.meses_vermelho_consecutivos, 0) AS meses_vermelho_consecutivos
FROM `$dm.ritmo_variavel` r
LEFT JOIN `$dm.score_alerta` s USING (id_usuario)
