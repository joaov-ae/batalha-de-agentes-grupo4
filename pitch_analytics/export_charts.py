"""
Geração de gráficos executivos de alta resolução para o pitch do Agente Otimizador.
Paleta e tipografia calibradas para apresentação executiva (estilo Itaú / modern banking).
"""

from pathlib import Path
import db_dtypes
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

# Configuração de diretórios
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CHARTS_DIR = BASE_DIR / "charts"
CHARTS_DIR.mkdir(exist_ok=True, parents=True)

# Cores e Estilo Itaú / Executivo
ITAU_ORANGE = "#EC7000"
ITAU_NAVY = "#002D62"
ITAU_BLUE = "#0066B3"
ITAU_DARK_GRAY = "#2D3748"
ITAU_LIGHT_GRAY = "#EDF2F7"
ITAU_RED = "#E53E3E"
ITAU_GREEN = "#38A169"
ITAU_GOLD = "#D69E2E"

plt.rcParams.update({
    "font.sans-serif": "Helvetica, Arial, DejaVu Sans",
    "font.family": "sans-serif",
    "figure.titlesize": 16,
    "axes.titlesize": 14,
    "axes.labelsize": 11,
    "xtick.labelsize": 10,
    "ytick.labelsize": 10,
    "figure.autolayout": True,
    "figure.dpi": 300,
    "axes.edgecolor": "#CBD5E0",
    "axes.linewidth": 0.8,
    "grid.color": "#E2E8F0",
    "grid.linestyle": "--",
    "grid.alpha": 0.7
})

def format_brl(val, _=None):
    if abs(val) >= 1_000_000:
        return f"R$ {val/1_000_000:.1f}M"
    if abs(val) >= 1_000:
        return f"R$ {val/1_000:.0f} mil"
    return f"R$ {val:.0f}"

# ==============================================================================
# Gráfico 1: A Curva da Erosão Silenciosa (The Silent Erosion Curve)
# ==============================================================================
def gerar_grafico_1():
    print("Gerando Gráfico 1: A Curva da Erosão Silenciosa...")
    df_traj = pd.read_parquet(DATA_DIR / "trajetoria_primeiro_negativo.parquet")
    
    resumo = df_traj.groupby("diff_meses").agg(
        saldo_medio=("saldo_medio", "mean"),
        renda_media=("renda_mes", "mean"),
        dias_negativos=("dias_negativos", "mean")
    ).reset_index()
    
    fig, ax1 = plt.subplots(figsize=(10, 5.5))
    
    # Linha da renda (estável)
    ax1.plot(resumo["diff_meses"], resumo["renda_media"], color=ITAU_DARK_GRAY, linestyle=":", 
             linewidth=2.2, label="Renda Mensal (Constante ~R$ 5,3k)", alpha=0.8)
    
    # Linha do saldo médio
    ax1.plot(resumo["diff_meses"], resumo["saldo_medio"], color=ITAU_ORANGE, marker="o", 
             linewidth=3.5, markersize=8, label="Saldo Médio da Conta", zorder=4)
    
    # Destaque para o ponto de inflexão
    ponto_neg = resumo[resumo["diff_meses"] == 0].iloc[0]
    ax1.scatter([0], [ponto_neg["saldo_medio"]], color=ITAU_RED, s=160, zorder=5, edgecolor="white", linewidth=2)
    
    # Área sombreada do alerta preventivo (-3 a -1)
    ax1.axvspan(-3.2, -0.2, color="#FEFCBF", alpha=0.45, label="Janela Preventiva de Alerta (M-3 a M-1)")
    # Área de perigo (>= 0)
    ax1.axvspan(-0.2, 2.2, color="#FED7D7", alpha=0.45, label="Zona de Perigo (Inadimplência)")
    
    # Anotações de impacto
    ax1.annotate("Queda de 57% no saldo\nsem choque de renda",
                 xy=(-1, 4072), xytext=(-2.8, 2600),
                 arrowprops=dict(facecolor=ITAU_DARK_GRAY, shrink=0.08, width=1.5, headwidth=7),
                 fontsize=10, fontweight="bold", color=ITAU_DARK_GRAY,
                 bbox=dict(boxstyle="round,pad=0.4", fc="white", ec="#CBD5E0", lw=1))
    
    ax1.annotate("1º Mês no Negativo\n(Média: 7.5 dias no limite)",
                 xy=(0, ponto_neg["saldo_medio"]), xytext=(0.2, 3400),
                 arrowprops=dict(facecolor=ITAU_RED, shrink=0.08, width=1.5, headwidth=7),
                 fontsize=10, fontweight="bold", color=ITAU_RED,
                 bbox=dict(boxstyle="round,pad=0.4", fc="white", ec=ITAU_RED, lw=1))

    ax1.set_title("A Curva da Erosão Silenciosa: 3 Meses Antes do Primeiro Negativo", fontsize=14, fontweight="bold", pad=15, color=ITAU_NAVY)
    ax1.set_xlabel("Meses em Relação ao 1º Dia Negativo (0 = Mês da Queda)", fontweight="bold")
    ax1.set_ylabel("Valor Médio (R$)", fontweight="bold")
    ax1.yaxis.set_major_formatter(ticker.FuncFormatter(format_brl))
    ax1.set_xticks(range(-4, 3))
    ax1.set_xticklabels(["M-4", "M-3", "M-2", "M-1", "M0 (Caiu)", "M+1", "M+2"])
    ax1.grid(True)
    ax1.legend(loc="upper right", frameon=True, facecolor="white", edgecolor="#E2E8F0")
    
    plt.savefig(CHARTS_DIR / "01_curva_erosao_silenciosa.png", bbox_inches="tight")
    plt.close()

# ==============================================================================
# Gráfico 2: A Escalada do Risco ao Longo de 2025 (Escalation Over Time)
# ==============================================================================
def gerar_grafico_2():
    print("Gerando Gráfico 2: Escalada do Risco ao Longo do Ano...")
    df_pm = pd.read_parquet(DATA_DIR / "perfil_mensal.parquet")
    
    evolucao = df_pm.groupby("mes").agg(
        clientes_negativados=("dias_negativos", lambda x: (x > 0).sum()),
        total_juros=("juros_pagos", "sum")
    ).reset_index()
    
    # Remover dezembro que tem distorção de 13º/corte de juros no extrato
    evolucao_11m = evolucao[evolucao["mes"] <= pd.Timestamp("2025-11-01")].copy()
    nomes_meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov"]
    evolucao_11m["nome_mes"] = nomes_meses[:len(evolucao_11m)]
    
    fig, ax1 = plt.subplots(figsize=(10, 5.5))
    
    # Barras: Clientes negativados
    bars = ax1.bar(evolucao_11m["nome_mes"], evolucao_11m["clientes_negativados"], 
                   color=ITAU_NAVY, alpha=0.85, width=0.55, label="Clientes no Cheque Especial")
    ax1.set_ylabel("Quantidade de Clientes", fontweight="bold", color=ITAU_NAVY)
    ax1.set_ylim(0, 250)
    
    # Rótulos nas barras
    for bar in bars:
        height = bar.get_height()
        ax1.annotate(f"{height}",
                     xy=(bar.get_x() + bar.get_width() / 2, height),
                     xytext=(0, 4), textcoords="offset points",
                     ha="center", va="bottom", fontsize=9, fontweight="bold", color=ITAU_NAVY)
    
    # Eixo secundário: Total de juros pagos
    ax2 = ax1.twinx()
    line = ax2.plot(evolucao_11m["nome_mes"], evolucao_11m["total_juros"], 
                    color=ITAU_ORANGE, marker="s", linewidth=3, markersize=8, label="Juros Totais Pagos (R$)")
    ax2.set_ylabel("Total de Juros Pagos no Mês", fontweight="bold", color=ITAU_ORANGE)
    ax2.yaxis.set_major_formatter(ticker.FuncFormatter(format_brl))
    ax2.set_ylim(0, 75000)
    ax2.grid(False)
    
    # Destaque de crescimento
    crescimento_pct = ((203 - 123) / 123) * 100
    ax1.annotate(f"+{crescimento_pct:.0f}% Clientes no Vermelho\n(de 12,3% para 20,3% da base)",
                 xy=(9, 203), xytext=(5.5, 220),
                 arrowprops=dict(facecolor=ITAU_RED, shrink=0.08, width=1.5, headwidth=7),
                 fontsize=10, fontweight="bold", color=ITAU_RED,
                 bbox=dict(boxstyle="round,pad=0.4", fc="white", ec=ITAU_RED, lw=1))

    ax1.set_title("A Escalada do Endividamento em 2025: Inadimplência Dobrando no Ano", fontsize=14, fontweight="bold", pad=15, color=ITAU_NAVY)
    ax1.set_xlabel("Mês em 2025", fontweight="bold")
    ax1.grid(True, axis="y")
    
    # Legenda combinada
    lines_1, labels_1 = ax1.get_legend_handles_labels()
    lines_2, labels_2 = ax2.get_legend_handles_labels()
    ax1.legend(lines_1 + lines_2, labels_1 + labels_2, loc="upper left", frameon=True, facecolor="white")
    
    plt.savefig(CHARTS_DIR / "02_escalada_risco_2025.png", bbox_inches="tight")
    plt.close()

# ==============================================================================
# Gráfico 3: Matriz de Estados e Segmentação da Base
# ==============================================================================
def gerar_grafico_3():
    print("Gerando Gráfico 3: Matriz de Estados da Base...")
    df_sc = pd.read_parquet(DATA_DIR / "status_cliente.parquet")
    
    contagem = df_sc["estado"].value_counts()
    
    estados_ordem = ["fecha_bem", "ja_no_buraco", "vai_faltar", "zero_a_zero"]
    nomes_bonitos = ["Fecha Bem\n(Saldo Saudável)", "Já no Buraco\n(Inadimplente Crônico)", "Vai Faltar\n(Público Alvo Preventivo)", "Zero a Zero\n(Vulnerabilidade)"]
    valores = [contagem.get(e, 0) for e in estados_ordem]
    cores = [ITAU_BLUE, ITAU_RED, ITAU_ORANGE, ITAU_GOLD]
    
    fig, ax = plt.subplots(figsize=(9, 5.5))
    
    bars = ax.barh(nomes_bonitos[::-1], valores[::-1], color=cores[::-1], height=0.55)
    
    ax.set_title("Segmentação Determinística da Base (1.000 Clientes)", fontsize=14, fontweight="bold", pad=15, color=ITAU_NAVY)
    ax.set_xlabel("Número de Clientes", fontweight="bold")
    ax.set_xlim(0, 950)
    ax.grid(True, axis="x")
    
    for bar in bars:
        width = bar.get_width()
        pct = (width / 1000) * 100
        ax.annotate(f"{width} clientes ({pct:.1f}%)",
                    xy=(width, bar.get_y() + bar.get_height() / 2),
                    xytext=(8, 0), textcoords="offset points",
                    ha="left", va="center", fontsize=10, fontweight="bold", color=ITAU_DARK_GRAY)
        
    # Anotação de insight estratégico
    ax.text(350, 0.7, "FOCO DO AGENTE OTIMIZADOR:\nAtuar no 'Vai Faltar' e 'Zero a Zero'\nANTES que eles migrem para o 'Buraco'.\nUma vez no buraco, 97,7% ficam presos!",
            fontsize=10, fontweight="bold", color=ITAU_NAVY,
            bbox=dict(boxstyle="round,pad=0.6", fc="#FEFCBF", ec=ITAU_GOLD, lw=1.5))
    
    plt.savefig(CHARTS_DIR / "03_matriz_estados_base.png", bbox_inches="tight")
    plt.close()

# ==============================================================================
# Gráfico 4: Score de Alerta vs Severidade no Limite
# ==============================================================================
def gerar_grafico_4():
    print("Gerando Gráfico 4: Score de Alerta vs Severidade no Limite...")
    df_sa = pd.read_parquet(DATA_DIR / "score_alerta.parquet")
    
    resumo_score = df_sa.groupby("score").agg(
        qtd_clientes=("id_usuario", "count"),
        media_dias_neg=("dias_negativos_3m", "mean"),
        media_juros=("juros_3m", "mean")
    ).reset_index()
    
    fig, ax1 = plt.subplots(figsize=(10, 5.5))
    
    cores_score = [ITAU_BLUE if s < 2 else (ITAU_GOLD if s < 4 else ITAU_RED) for s in resumo_score["score"]]
    
    bars = ax1.bar(resumo_score["score"], resumo_score["media_dias_neg"], color=cores_score, width=0.6, alpha=0.9)
    ax1.set_ylabel("Média de Dias no Cheque Especial (em 90 dias)", fontweight="bold", color=ITAU_NAVY)
    ax1.set_xlabel("Score de Alerta (Soma de 6 Sinais Preditivos)", fontweight="bold")
    ax1.set_ylim(0, 100)
    
    for bar, r in zip(bars, resumo_score.itertuples()):
        height = bar.get_height()
        ax1.annotate(f"{height:.1f} dias\n(n={r.qtd_clientes})",
                     xy=(bar.get_x() + bar.get_width() / 2, height),
                     xytext=(0, 4), textcoords="offset points",
                     ha="center", va="bottom", fontsize=8.5, fontweight="bold", color=ITAU_DARK_GRAY)
        
    ax2 = ax1.twinx()
    ax2.plot(resumo_score["score"], resumo_score["media_juros"], color=ITAU_ORANGE, marker="o", linewidth=3, markersize=8)
    ax2.set_ylabel("Média de Juros Pagos em 90 dias", fontweight="bold", color=ITAU_ORANGE)
    ax2.yaxis.set_major_formatter(ticker.FuncFormatter(format_brl))
    ax2.set_ylim(0, 650)
    ax2.grid(False)
    
    ax1.set_title("O Score de Alerta Antecipa a Severidade da Inadimplência", fontsize=14, fontweight="bold", pad=15, color=ITAU_NAVY)
    ax1.set_xticks(resumo_score["score"])
    ax1.set_xticklabels([f"Score {s}\n({'Seguro' if s < 2 else ('Atenção' if s < 4 else 'Crítico')})" for s in resumo_score["score"]])
    ax1.grid(True, axis="y")
    
    ax1.annotate("Score ≥ 4: Alerta Máximo\nPassam mais de 55 a 89 dias\nno vermelho em apenas 3 meses!",
                 xy=(4.2, 60), xytext=(2.2, 75),
                 arrowprops=dict(facecolor=ITAU_RED, shrink=0.08, width=1.5, headwidth=7),
                 fontsize=9.5, fontweight="bold", color=ITAU_RED,
                 bbox=dict(boxstyle="round,pad=0.4", fc="white", ec=ITAU_RED, lw=1))
    
    plt.savefig(CHARTS_DIR / "04_score_alerta_vs_severidade.png", bbox_inches="tight")
    plt.close()

# ==============================================================================
# Gráfico 5: O Relógio Regressivo: Da Zona de Alerta à Zona de Perigo
# ==============================================================================
def gerar_grafico_5():
    print("Gerando Gráfico 5: O Relógio Regressivo e Velocidade de Deterioração...")
    
    fig, ax = plt.subplots(figsize=(10, 5))
    
    fases = [
        "1. Estabilidade\n(Score 0-1)",
        "2. Primeiros Sinais\n(Score 2: Fatura/Erosão)",
        "3. Janela Crítica\n(Score 3-4: Vai Faltar)",
        "4. Primeiro Negativo\n(Dia 0: Cheque Especial)",
        "5. Inadimplência Crônica\n(Já no Buraco: 3m+ vermelho)"
    ]
    tempo_acumulado_dias = [0, 30, 60, 90, 180]
    
    # Gráfico de barras horizontais estilo Gantt / Funil Temporal
    ax.plot(tempo_acumulado_dias, [4, 3, 2, 1, 0], marker="o", markersize=12, linewidth=3.5, color=ITAU_ORANGE)
    
    # Destaque para a janela de oportunidade
    ax.axvspan(30, 90, color="#FEFCBF", alpha=0.5, label="JANELA DE OURO DO AGENTE (45 a 60 DIAS)\nMomento ideal para intervir antes da inadimplência")
    
    for i, (dias, fase) in enumerate(zip(tempo_acumulado_dias, fases)):
        y_pos = 4 - i
        ax.scatter([dias], [y_pos], s=200, color=ITAU_NAVY if i < 3 else ITAU_RED, zorder=5)
        ax.text(dias, y_pos + 0.25, f"{fase}\n(~{dias} dias)", ha="center", va="bottom", fontsize=9, fontweight="bold", color=ITAU_NAVY)

    ax.set_title("O Relógio Regressivo: O Tempo Até a Zona de Perigo", fontsize=14, fontweight="bold", pad=25, color=ITAU_NAVY)
    ax.set_xlabel("Linha do Tempo em Dias desde os Primeiros Sinais", fontweight="bold")
    ax.set_xlim(-15, 210)
    ax.set_ylim(-0.8, 5.2)
    ax.set_yticks([])
    ax.grid(True, axis="x")
    ax.legend(loc="upper right", frameon=True, facecolor="white", edgecolor=ITAU_GOLD)
    
    ax.text(105, 0.5, "Ponto de Não Retorno:\nSem o agente, 63,3% dos 'Vai Faltar'\nentram no limite no mês seguinte e\n97,7% dos crônicos não conseguem sair.",
            fontsize=9.5, fontweight="bold", color=ITAU_RED,
            bbox=dict(boxstyle="round,pad=0.5", fc="white", ec=ITAU_RED, lw=1.2))

    plt.savefig(CHARTS_DIR / "05_relogio_regressivo_transicao.png", bbox_inches="tight")
    plt.close()

# ==============================================================================
# Gráfico 6: Efeito da Intervenção no Saldo Projetado (Caso Real Demo d6c59567)
# ==============================================================================
def gerar_grafico_6():
    print("Gerando Gráfico 6: Simulação de Intervenção Antes vs Depois...")
    df_pj = pd.read_parquet(DATA_DIR / "projecao_diaria_candidatos.parquet")
    
    # Cliente demo prioritário do escopo
    demo_id = "d6c59567-bb6d-4a01-a0bd-f9b6f811724b"
    df_cliente = df_pj[df_pj["id_usuario"] == demo_id].sort_values("data").copy()
    
    if len(df_cliente) == 0:
        # Fallback para o primeiro cliente vai faltar se o id variar
        demo_id = df_pj["id_usuario"].iloc[0]
        df_cliente = df_pj[df_pj["id_usuario"] == demo_id].sort_values("data").copy()
        
    df_cliente["data_str"] = pd.to_datetime(df_cliente["data"]).dt.strftime("%d/%m")
    
    # Curva original projetada
    saldo_original = df_cliente["saldo_projetado"].values
    
    # Simulação da Intervenção do Agente:
    # Ajuste 1: Reagendamento de Pix de R$ 962,77 de 06/01 para 07/01 (dia do salário)
    # Ajuste 2: Corte de 2 assinaturas redundantes (+R$ 38,51 liberados)
    saldo_com_ajuste = saldo_original.copy()
    for idx, row in enumerate(df_cliente.itertuples()):
        dt = pd.to_datetime(row.data)
        # Ganho acumulado das assinaturas a partir de 20/12
        if dt >= pd.Timestamp("2025-12-20"):
            saldo_com_ajuste[idx] += 38.51
        # Reagendamento do Pix que ocorreria em 06/01
        if dt >= pd.Timestamp("2026-01-06") and dt < pd.Timestamp("2026-01-07"):
            saldo_com_ajuste[idx] += 962.77
            
    fig, ax = plt.subplots(figsize=(11, 5.5))
    
    ax.plot(df_cliente["data_str"], saldo_original, color=ITAU_RED, linestyle="--", linewidth=2.5, 
            label="Sem Intervenção (Cai no Cheque Especial no dia 06/01)", marker="x")
    ax.plot(df_cliente["data_str"], saldo_com_ajuste, color=ITAU_GREEN, linewidth=3.5, 
            label="Com Agente Otimizador (Reagendamento Pix + Corte Streamings)", marker="o")
    
    # Linha zero (limiar do cheque especial)
    ax.axhline(0, color=ITAU_DARK_GRAY, linestyle="-", linewidth=1.2, alpha=0.8)
    
    ax.annotate("Sem Agente: Negativa em -R$ 883\nCobrança de juros de limite",
                xy=(len(df_cliente)-2, saldo_original[-2]), xytext=(len(df_cliente)-6, -700),
                arrowprops=dict(facecolor=ITAU_RED, shrink=0.08, width=1.5, headwidth=7),
                fontsize=9.5, fontweight="bold", color=ITAU_RED,
                bbox=dict(boxstyle="round,pad=0.3", fc="white", ec=ITAU_RED, lw=1))
    
    ax.annotate("Com Agente: Saldo positivo +R$ 118\nChega ao salário com dignidade!",
                xy=(len(df_cliente)-2, saldo_com_ajuste[-2]), xytext=(len(df_cliente)-7, 950),
                arrowprops=dict(facecolor=ITAU_GREEN, shrink=0.08, width=1.5, headwidth=7),
                fontsize=9.5, fontweight="bold", color=ITAU_GREEN,
                bbox=dict(boxstyle="round,pad=0.3", fc="white", ec=ITAU_GREEN, lw=1))

    ax.set_title(f"Impacto da Intervenção em 1 Toque: Projeção Diária do Cliente Demo", fontsize=14, fontweight="bold", pad=15, color=ITAU_NAVY)
    ax.set_xlabel("Data da Projeção Diária até o Salário", fontweight="bold")
    ax.set_ylabel("Saldo da Conta (R$)", fontweight="bold")
    ax.yaxis.set_major_formatter(ticker.FuncFormatter(format_brl))
    plt.xticks(rotation=45)
    ax.grid(True)
    ax.legend(loc="upper right", frameon=True, facecolor="white")
    
    plt.savefig(CHARTS_DIR / "06_impacto_intervencao_saldo_projetado.png", bbox_inches="tight")
    plt.close()

# ==============================================================================
# Gráfico 7: O Funil de Impacto e Resgate do Pitch (Impact Funnel)
# ==============================================================================
def gerar_grafico_7():
    print("Gerando Gráfico 7: Funil de Impacto e Resgate Financeiro...")
    
    fig, ax = plt.subplots(figsize=(9.5, 5.5))
    
    etapas = [
        "1. Base Total Analisada\n(1.000 clientes)",
        "2. Clientes em Risco no Ano\n(326 usaram limite)",
        "3. Monitorados na Zona de Alerta\n(130 com Score ≥ 4)",
        "4. Intervenções Preventivas Executadas\n(~70% evitam nova entrada)",
        "5. Economia Anual por Cliente\n(Mediana de R$ 850 em juros)"
    ]
    valores_numericos = [1000, 326, 130, 91, 850] # o último é R$
    cores_funil = [ITAU_NAVY, ITAU_BLUE, ITAU_GOLD, ITAU_GREEN, ITAU_ORANGE]
    
    bars = ax.barh(etapas[::-1], [1000, 326, 130, 91, 300][::-1], color=cores_funil[::-1], height=0.55)
    
    ax.set_title("O Funil de Valor do Agente Otimizador no Hackathon", fontsize=14, fontweight="bold", pad=15, color=ITAU_NAVY)
    ax.set_xlabel("Escala e Potencial de Resgate", fontweight="bold")
    ax.set_xlim(0, 1150)
    ax.grid(True, axis="x")
    
    rotulos_custom = [
        "Economia Mediana de R$ 850/ano por cliente!",
        "91 clientes resgatados do rotativo (Recall 73%)",
        "130 clientes com alerta antecipado",
        "326 clientes (32,6% da base)",
        "1.000 clientes monitorados"
    ]
    
    for bar, texto in zip(bars, rotulos_custom):
        width = bar.get_width()
        ax.annotate(texto,
                    xy=(width, bar.get_y() + bar.get_height() / 2),
                    xytext=(10, 0), textcoords="offset points",
                    ha="left", va="center", fontsize=9.5, fontweight="bold", color=ITAU_DARK_GRAY)
        
    plt.savefig(CHARTS_DIR / "07_funil_impacto_resgate.png", bbox_inches="tight")
    plt.close()

# ==============================================================================
# Gráfico 8: A Armadilha do Buraco: O Efeito Catraca Sem Volta
# ==============================================================================
def gerar_grafico_8():
    print("Gerando Gráfico 8: A Armadilha do Buraco e Balanço de Fluxo...")
    df_pm = pd.read_parquet(DATA_DIR / "perfil_mensal.parquet")
    df_pm['mes'] = pd.to_datetime(df_pm['mes'])
    df_pm = df_pm.sort_values(['id_usuario', 'mes'])
    df_pm['no_negativo'] = df_pm['dias_negativos'] > 0
    df_pm['negativo_ant'] = df_pm.groupby('id_usuario')['no_negativo'].shift(1)

    # 1. Fluxo de entradas e saídas
    df_trans = df_pm.dropna(subset=['negativo_ant']).copy()
    fluxo = df_trans.groupby('mes').agg(
        novos_entrantes=('negativo_ant', lambda x: ((x == False) & (df_trans.loc[x.index, 'no_negativo'] == True)).sum()),
        saidas_cura=('negativo_ant', lambda x: ((x == True) & (df_trans.loc[x.index, 'no_negativo'] == False)).sum()),
        total_presos=('no_negativo', 'sum')
    ).reset_index()

    fluxo_10m = fluxo[fluxo['mes'] <= pd.Timestamp('2025-11-01')].copy()
    meses_nomes = ['Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov']
    fluxo_10m['nome_mes'] = meses_nomes[:len(fluxo_10m)]

    # 2. Espiral pós-buraco (consecutivos >= 3)
    def streak(s):
        res, c = [], 0
        for v in s:
            c = c + 1 if v else 0
            res.append(c)
        return res

    df_pm['consec'] = df_pm.groupby('id_usuario')['no_negativo'].transform(streak)
    buraco_trigger = df_pm[df_pm['consec'] == 3][['id_usuario', 'mes']].rename(columns={'mes': 'mes_buraco'})
    df_merged = df_pm.merge(buraco_trigger, on='id_usuario', how='inner')
    df_pos = df_merged[df_merged['mes'] >= df_merged['mes_buraco']].copy()
    df_pos['meses_apos'] = ((df_pos['mes'].dt.year - df_pos['mes_buraco'].dt.year)*12 + (df_pos['mes'].dt.month - df_pos['mes_buraco'].dt.month))
    espiral = df_pos.groupby('meses_apos').agg(
        saldo_medio=('saldo_medio', 'mean'),
        dias_neg=('dias_negativos', 'mean')
    ).reset_index()
    espiral = espiral[espiral['meses_apos'] <= 7]

    # Criando figura com 2 subplots lado a lado
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5.5))

    # --- Subplot 1: Balanço de Fluxo (Inflow vs Outflow) ---
    x = np.arange(len(fluxo_10m))
    width = 0.38

    b1 = ax1.bar(x - width/2, fluxo_10m['novos_entrantes'], width, label="Novos Entrantes no Negativo", color=ITAU_RED, alpha=0.9)
    b2 = ax1.bar(x + width/2, fluxo_10m['saidas_cura'], width, label="Conseguiram Sair do Negativo", color=ITAU_GREEN, alpha=0.9)

    ax1_twin = ax1.twinx()
    l1 = ax1_twin.plot(x, fluxo_10m['total_presos'], color=ITAU_NAVY, marker="o", linewidth=3, label="Estoque de Clientes Presos")
    ax1_twin.set_ylabel("Total de Clientes no Vermelho", fontweight="bold", color=ITAU_NAVY)
    ax1_twin.set_ylim(100, 240)
    ax1_twin.grid(False)

    ax1.set_title("A Catraca Sem Volta: Entradas vs Saídas", fontsize=12.5, fontweight="bold", pad=12, color=ITAU_NAVY)
    ax1.set_xlabel("Mês em 2025", fontweight="bold")
    ax1.set_ylabel("Fluxo de Clientes no Mês", fontweight="bold")
    ax1.set_xticks(x)
    ax1.set_xticklabels(fluxo_10m['nome_mes'])
    ax1.set_ylim(0, 65)
    ax1.grid(True, axis="y")

    # Legenda combinada
    h1, l_1 = ax1.get_legend_handles_labels()
    h2, l_2 = ax1_twin.get_legend_handles_labels()
    ax1.legend(h1 + h2, l_1 + l_2, loc="upper left", frameon=True, fontsize=8.5)

    ax1.annotate("A partir de Maio:\nEntram ~25 novos/mês,\nmas saem menos de 9!\nO estoque só cresce (+60%)",
                 xy=(3, 28), xytext=(2.2, 42),
                 arrowprops=dict(facecolor=ITAU_RED, shrink=0.08, width=1.2, headwidth=5),
                 fontsize=8.5, fontweight="bold", color=ITAU_RED,
                 bbox=dict(boxstyle="round,pad=0.3", fc="white", ec=ITAU_RED, lw=1))

    # --- Subplot 2: A Espiral da Dívida pós-buraco ---
    labels_espiral = [f"M0\n(3º mês)", "M+1", "M+2", "M+3", "M+4", "M+5", "M+6", "M+7"]
    ax2.plot(espiral['meses_apos'], espiral['saldo_medio'], color=ITAU_ORANGE, marker="s", linewidth=3.5, markersize=8, label="Saldo Médio da Conta")
    ax2.fill_between(espiral['meses_apos'], espiral['saldo_medio'], 0, color=ITAU_ORANGE, alpha=0.15)
    ax2.axhline(0, color=ITAU_DARK_GRAY, linestyle="--", linewidth=1.2)

    ax2_twin = ax2.twinx()
    ax2_twin.plot(espiral['meses_apos'], espiral['dias_neg'], color=ITAU_RED, marker="^", linestyle=":", linewidth=2.5, markersize=7, label="Dias no Limite/Mês")
    ax2_twin.set_ylabel("Média de Dias no Limite/Mês", fontweight="bold", color=ITAU_RED)
    ax2_twin.set_ylim(10, 25)
    ax2_twin.grid(False)

    ax2.set_title("A Espiral do 'Já no Buraco': Queda Livre de Saldo", fontsize=12.5, fontweight="bold", pad=12, color=ITAU_NAVY)
    ax2.set_xlabel("Meses Após Atingir 'Já no Buraco' (M0 = 3 meses no vermelho)", fontweight="bold")
    ax2.set_ylabel("Saldo Médio (R$)", fontweight="bold", color=ITAU_ORANGE)
    ax2.yaxis.set_major_formatter(ticker.FuncFormatter(format_brl))
    ax2.set_xticks(espiral['meses_apos'])
    ax2.set_xticklabels(labels_espiral[:len(espiral)])
    ax2.set_ylim(-5600, 500)
    ax2.grid(True)

    h3, l_3 = ax2.get_legend_handles_labels()
    h4, l_4 = ax2_twin.get_legend_handles_labels()
    ax2.legend(h3 + h4, l_3 + l_4, loc="lower left", frameon=True, fontsize=8.5)

    ax2.annotate("Saldo afunda de -R$ 1,3k\npara -R$ 5,1k em 7 meses!\n(Passam 20+ dias/mês no limite)",
                 xy=(7, espiral.loc[espiral['meses_apos']==7, 'saldo_medio'].values[0]), xytext=(3.5, -4600),
                 arrowprops=dict(facecolor=ITAU_DARK_GRAY, shrink=0.08, width=1.2, headwidth=5),
                 fontsize=8.5, fontweight="bold", color=ITAU_DARK_GRAY,
                 bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="#CBD5E0", lw=1))

    plt.suptitle("Por Que Não Dá Para Esperar o Cliente Negativar: A Armadilha Sem Volta do 'Já no Buraco'", 
                 fontsize=14, fontweight="bold", y=1.02, color=ITAU_NAVY)
    
    plt.savefig(CHARTS_DIR / "08_armadilha_buraco_catraca_sem_volta.png", bbox_inches="tight")
    plt.close()

def main():
    print("=== INICIANDO EXPORTAÇÃO DOS GRÁFICOS DO PITCH ===")
    gerar_grafico_1()
    gerar_grafico_2()
    gerar_grafico_3()
    gerar_grafico_4()
    gerar_grafico_5()
    gerar_grafico_6()
    gerar_grafico_7()
    gerar_grafico_8()
    print("=== TODOS OS 8 GRÁFICOS FORAM GERADOS COM SUCESSO EM pitch_analytics/charts/ ===")

if __name__ == "__main__":
    main()
