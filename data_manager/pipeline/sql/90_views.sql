-- Tamanho de cada público (decisão em aberto nº 1) e o corte de 5% da base (nº 2).
CREATE OR REPLACE VIEW `$dm.contagem_estados` AS
SELECT
  data_referencia,
  estado,
  COUNT(*) AS clientes,
  ROUND(COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY data_referencia), 4) AS pct_base,
  COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY data_referencia) >= 0.05 AS acima_de_5pct,
  COUNTIF(antecipar_aviso) AS com_score_alerta
FROM `$dm.status_cliente`
GROUP BY 1, 2;

-- Candidatos para o protótipo (decisão em aberto nº 3):
-- um "vai faltar" com assinatura redundante e um "zero a zero".
CREATE OR REPLACE VIEW `$dm.candidatos_demo` AS
WITH redundancia AS (
  SELECT id_usuario, STRING_AGG(titulo, ' | ') AS assinaturas_redundantes, MAX(impacto_dias) AS max_dias_assinatura
  FROM `$dm.ajustes_sugeridos`
  WHERE tipo = 'assinatura_redundante'
  GROUP BY 1
),
n_ajustes AS (
  SELECT id_usuario, COUNT(*) AS ajustes, LOGICAL_OR(resolve) AS algum_resolve
  FROM `$dm.ajustes_sugeridos`
  GROUP BY 1
)
SELECT
  s.estado, s.id_usuario, s.saldo_hoje, s.renda_mensal, s.proximo_salario_data, s.dia_que_acaba,
  s.saldo_projetado_vespera_salario, s.score_alerta, r.assinaturas_redundantes, n.ajustes, n.algum_resolve
FROM `$dm.status_cliente` s
LEFT JOIN redundancia r USING (id_usuario)
LEFT JOIN n_ajustes n USING (id_usuario)
WHERE (s.estado = 'vai_faltar' AND r.id_usuario IS NOT NULL)
   OR s.estado = 'zero_a_zero'
ORDER BY s.estado, n.algum_resolve DESC, n.ajustes DESC, s.score_alerta DESC;
