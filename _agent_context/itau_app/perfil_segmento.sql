-- Segmento "renda recorrente, fecha alguns meses no negativo (não todos), renda cobre as despesas médias"
-- vs. clientes com renda recorrente que nunca negativam. Base: data_manager (12 meses de 2025).
WITH renda AS (
  SELECT id_usuario,
         SUM(IF(tipo = 'E', valor_previsto, 0)) AS renda_rec,
         SUM(IF(tipo = 'S' AND tipo_item IN ('conta_fixa', 'financiamento', 'assinatura', 'parcela'), valor_previsto, 0)) AS fixas,
         LOGICAL_OR(tipo = 'E' AND tipo_item IN ('salario', 'beneficio')) AS tem_renda_recorrente
  FROM `batalha-time-04-z85x.data_manager.recorrencias`
  GROUP BY id_usuario
),
meses AS (
  SELECT id_usuario,
         COUNT(*) AS n_meses,
         COUNTIF(saldo_fim < 0) AS meses_negativos,
         SUM(dias_negativos) AS dias_negativos_ano,
         AVG(entradas_conta - saidas_conta) AS fluxo_medio_conta
  FROM `batalha-time-04-z85x.data_manager.perfil_mensal`
  GROUP BY id_usuario
),
gasto_alvo AS (
  -- cartão (todo o consumo no cartão) + lazer, delivery e compras (lojas e sites) em qualquer canal
  SELECT id_usuario, SUM(ABS(vlr)) / 12 AS gasto_alvo_mes
  FROM `batalha-time-04-z85x.data_manager.stg_extrato`
  WHERE consumo AND (canal = 'cartao' OR macro IN ('Lazer', 'Delivery', 'Lojas e sites'))
  GROUP BY id_usuario
),
base AS (
  SELECT r.id_usuario, r.renda_rec, r.fixas, m.meses_negativos, m.dias_negativos_ano, m.fluxo_medio_conta,
         IFNULL(g.gasto_alvo_mes, 0) AS gasto_alvo_mes,
         SAFE_DIVIDE(r.renda_rec - r.fixas, r.renda_rec) AS sobra_apos_fixas_pct,
         SAFE_DIVIDE(IFNULL(g.gasto_alvo_mes, 0), r.renda_rec) AS gasto_alvo_pct_renda,
         CASE
           WHEN m.meses_negativos BETWEEN 1 AND m.n_meses - 1 AND m.fluxo_medio_conta >= 0 THEN 'alvo'
           WHEN m.meses_negativos = 0 AND m.dias_negativos_ano = 0 THEN 'nunca_negativa'
         END AS grupo
  FROM renda r
  JOIN meses m USING (id_usuario)
  LEFT JOIN gasto_alvo g USING (id_usuario)
  WHERE r.tem_renda_recorrente AND r.renda_rec > 0
)
SELECT grupo,
       COUNT(*) AS clientes,
       ROUND(100 * AVG(sobra_apos_fixas_pct), 1) AS sobra_apos_fixas_pct_media,
       ROUND(100 * APPROX_QUANTILES(sobra_apos_fixas_pct, 2)[OFFSET(1)], 1) AS sobra_apos_fixas_pct_mediana,
       ROUND(100 * AVG(gasto_alvo_pct_renda), 1) AS gasto_alvo_pct_renda_media,
       ROUND(AVG(gasto_alvo_mes), 2) AS gasto_alvo_mes_medio,
       ROUND(AVG(renda_rec), 2) AS renda_media,
       ROUND(AVG(meses_negativos), 1) AS meses_negativos_medio
FROM base
WHERE grupo IS NOT NULL
GROUP BY grupo
ORDER BY grupo
