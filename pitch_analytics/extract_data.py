"""
Script de extração de dados do BigQuery para o pitch analytics.
Salva cópias locais em parquet para alta performance e reproducibilidade.
"""

import os
from pathlib import Path
from google.cloud import bigquery
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(exist_ok=True, parents=True)

PROJECT_ID = "batalha-time-04-z85x"
DATASET_ID = "data_manager"

def extract_all():
    print("Conectando ao BigQuery...")
    client = bigquery.Client(project=PROJECT_ID)

    # 1. Perfil Mensal (12.000 linhas)
    print("Extraindo perfil_mensal...")
    query_pm = f"SELECT * FROM `{PROJECT_ID}.{DATASET_ID}.perfil_mensal`"
    df_pm = client.query(query_pm).to_dataframe()
    df_pm.to_parquet(DATA_DIR / "perfil_mensal.parquet", index=False)
    print(f" -> perfil_mensal: {len(df_pm)} linhas salvas.")

    # 2. Score de Alerta (1.000 linhas)
    print("Extraindo score_alerta...")
    query_sa = f"SELECT * FROM `{PROJECT_ID}.{DATASET_ID}.score_alerta`"
    df_sa = client.query(query_sa).to_dataframe()
    df_sa.to_parquet(DATA_DIR / "score_alerta.parquet", index=False)
    print(f" -> score_alerta: {len(df_sa)} linhas salvas.")

    # 3. Status Cliente (1.000 linhas)
    print("Extraindo status_cliente...")
    query_sc = f"SELECT * FROM `{PROJECT_ID}.{DATASET_ID}.status_cliente`"
    df_sc = client.query(query_sc).to_dataframe()
    df_sc.to_parquet(DATA_DIR / "status_cliente.parquet", index=False)
    print(f" -> status_cliente: {len(df_sc)} linhas salvas.")

    # 4. Ajustes Sugeridos (2.076 linhas)
    print("Extraindo ajustes_sugeridos...")
    query_aj = f"SELECT * FROM `{PROJECT_ID}.{DATASET_ID}.ajustes_sugeridos`"
    df_aj = client.query(query_aj).to_dataframe()
    df_aj.to_parquet(DATA_DIR / "ajustes_sugeridos.parquet", index=False)
    print(f" -> ajustes_sugeridos: {len(df_aj)} linhas salvas.")

    # 5. Projeção Diária dos clientes candidatos a demo
    print("Extraindo projecao_diaria para clientes demo...")
    query_pj = f"""
    SELECT p.* 
    FROM `{PROJECT_ID}.{DATASET_ID}.projecao_diaria` p
    INNER JOIN `{PROJECT_ID}.{DATASET_ID}.status_cliente` s ON p.id_usuario = s.id_usuario
    WHERE s.estado IN ('vai_faltar', 'zero_a_zero')
    """
    df_pj = client.query(query_pj).to_dataframe()
    df_pj.to_parquet(DATA_DIR / "projecao_diaria_candidatos.parquet", index=False)
    print(f" -> projecao_diaria_candidatos: {len(df_pj)} linhas salvas.")

    # 6. Trajetória Temporal de primeiro negativo
    print("Extraindo trajetória de transição do primeiro negativo...")
    query_trajetoria = f"""
    WITH primeiro_negativo AS (
        SELECT 
            id_usuario, 
            MIN(mes) as primeiro_mes_negativo
        FROM `{PROJECT_ID}.{DATASET_ID}.perfil_mensal`
        WHERE dias_negativos > 0
        GROUP BY id_usuario
    ),
    trajetoria AS (
        SELECT 
            p.id_usuario,
            p.mes,
            p.saldo_medio,
            p.dias_negativos,
            p.juros_pagos,
            p.renda_mes,
            pn.primeiro_mes_negativo,
            DATE_DIFF(p.mes, pn.primeiro_mes_negativo, MONTH) as diff_meses
        FROM `{PROJECT_ID}.{DATASET_ID}.perfil_mensal` p
        INNER JOIN primeiro_negativo pn ON p.id_usuario = pn.id_usuario
        WHERE pn.primeiro_mes_negativo > '2025-03-01'
    )
    SELECT * FROM trajetoria WHERE diff_meses BETWEEN -4 AND 3
    """
    df_traj = client.query(query_trajetoria).to_dataframe()
    df_traj.to_parquet(DATA_DIR / "trajetoria_primeiro_negativo.parquet", index=False)
    print(f" -> trajetoria_primeiro_negativo: {len(df_traj)} linhas salvas.")

    print("\nExtração concluída com sucesso! Todos os dados estão disponíveis em pitch_analytics/data/.")

if __name__ == "__main__":
    extract_all()
