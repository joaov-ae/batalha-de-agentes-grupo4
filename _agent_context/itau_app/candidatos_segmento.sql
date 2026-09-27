-- Candidatas do segmento "alvo", perto da média do grupo, com o estado atual e os ajustes do data_manager
WITH renda AS (
  SELECT id_usuario,
         SUM(IF(tipo = 'E', valor_previsto, 0)) AS renda_rec,
         SUM(IF(tipo = 'S' AND tipo_item IN ('conta_fixa', 'financiamento', 'assinatura', 'parcela'), valor_previsto, 0)) AS fixas,
         LOGICAL_OR(tipo = 'E' AND tipo_item IN ('salario', 'beneficio')) AS tem_renda_recorrente
  FROM `batalha-time-04-z85x.data_manager.recorrencias`
  GROUP BY id_usuario
),
meses AS (
  SELECT id_usuario, COUNT(*) AS n_meses, COUNTIF(saldo_fim < 0) AS meses_negativos,
         STRING_AGG(IF(saldo_fim < 0, FORMAT_DATE('%m', mes), NULL), ',' ORDER BY mes) AS quais_meses,
         AVG(entradas_conta - saidas_conta) AS fluxo_medio_conta
  FROM `batalha-time-04-z85x.data_manager.perfil_mensal`
  GROUP BY id_usuario
),
gasto_alvo AS (
  SELECT id_usuario, SUM(ABS(vlr)) / 12 AS gasto_alvo_mes
  FROM `batalha-time-04-z85x.data_manager.stg_extrato`
  WHERE consumo AND (canal = 'cartao' OR macro IN ('Lazer', 'Delivery', 'Lojas e sites'))
  GROUP BY id_usuario
),
alvo AS (
  SELECT r.id_usuario, r.renda_rec, r.fixas, m.meses_negativos, m.quais_meses,
         SAFE_DIVIDE(r.renda_rec - r.fixas, r.renda_rec) AS sobra_pct,
         SAFE_DIVIDE(IFNULL(g.gasto_alvo_mes, 0), r.renda_rec) AS gasto_pct
  FROM renda r JOIN meses m USING (id_usuario) LEFT JOIN gasto_alvo g USING (id_usuario)
  WHERE r.tem_renda_recorrente AND r.renda_rec > 0
    AND m.meses_negativos BETWEEN 1 AND m.n_meses - 1 AND m.fluxo_medio_conta >= 0
),
ajustes AS (
  SELECT id_usuario,
         STRING_AGG(CONCAT(tipo, IF(resolve, '(resolve)', '')), ' | ' ORDER BY ordem) AS ajustes,
         LOGICAL_OR(tipo = 'mudanca_data') AS tem_mudanca_data,
         LOGICAL_OR(resolve) AS algum_resolve
  FROM `batalha-time-04-z85x.data_manager.ajustes_sugeridos`
  GROUP BY id_usuario
)
SELECT a.id_usuario, s.estado, a.meses_negativos, a.quais_meses,
       ROUND(a.renda_rec, 2) AS renda, ROUND(100 * a.sobra_pct, 1) AS sobra_pct, ROUND(100 * a.gasto_pct, 1) AS gasto_pct,
       ROUND(s.saldo_hoje, 2) AS saldo_hoje, ROUND(s.saldo_projetado_vespera_salario, 2) AS vespera,
       s.proximo_salario_data, j.ajustes, j.tem_mudanca_data, j.algum_resolve,
       ROUND(ABS(a.sobra_pct - 0.389) + ABS(a.gasto_pct - 0.286), 3) AS distancia_media
FROM alvo a
JOIN `batalha-time-04-z85x.data_manager.status_cliente` s USING (id_usuario)
LEFT JOIN ajustes j USING (id_usuario)
ORDER BY (s.estado IN ('vai_faltar', 'zero_a_zero')) DESC, j.tem_mudanca_data DESC, distancia_media
LIMIT 15
