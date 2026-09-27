-- Resultado do ciclo anterior: entre os dois últimos salários, o cliente chegou sem usar o limite?
WITH salarios AS (
  SELECT DISTINCT data
  FROM `$dm.stg_extrato`
  WHERE id_usuario = @id_usuario AND micro = @micro_renda AND tipo = 'E'
),
ultimos AS (
  SELECT data, ROW_NUMBER() OVER (ORDER BY data DESC) AS rn FROM salarios
)
SELECT
  (SELECT data FROM ultimos WHERE rn = 2) AS inicio_ciclo,
  (SELECT data FROM ultimos WHERE rn = 1) AS fim_ciclo,
  COUNTIF(saldo_fechamento < 0) AS dias_negativos,
  COUNTIF(saldo_fechamento < 0) = 0 AS chegou_sem_limite,
  ROUND(MIN(saldo_fechamento), 2) AS saldo_minimo
FROM `$dm.saldo_diario`
WHERE id_usuario = @id_usuario
  AND data >= (SELECT data FROM ultimos WHERE rn = 2)
  AND data < (SELECT data FROM ultimos WHERE rn = 1)
