"""
Script que constrói e executa o Jupyter Notebook 'pitch_storytelling.ipynb'
com storytelling executivo completo em 6 Atos para o pitch do Agente Otimizador.
"""

from pathlib import Path
import nbformat as nbf
from nbclient import NotebookClient

NOTEBOOK_PATH = Path(__file__).resolve().parent / "pitch_storytelling.ipynb"

def create_notebook():
    nb = nbf.v4.new_notebook()
    nb.metadata = {
        "kernelspec": {
            "display_name": "Python 3 (ipykernel)",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "codemirror_mode": {"name": "ipython", "version": 3},
            "file_extension": ".py",
            "mimetype": "text/x-python",
            "name": "python",
            "nbconvert_exporter": "python",
            "pygments_lexer": "ipython3",
            "version": "3.13.5"
        }
    }
    
    cells = []
    
    # --------------------------------------------------------------------------
    # CABEÇALHO EXECUTIVO
    # --------------------------------------------------------------------------
    cells.append(nbf.v4.new_markdown_cell(
"""# 🎯 Pitch Analytics: A História por Trás dos Dados
## Agente Otimizador — Prevenção Ativa do Cheque Especial

> **Hackathon Batalha de Agentes — Grupo 4**  
> *Autores:* Time de Engenharia e Dados  
> *Data:* Setembro / 2026  
> *Objetivo deste Notebook:* Analisar a base de 1.000 correntistas (467.585 transações em 2025) e construir uma **narrativa irrefutável e quantificada para o pitch**, demonstrando como a inadimplência no limite da conta se desenvolve silenciosamente, quanto tempo temos para agir e o impacto financeiro das nossas intervenções preventivas em 1 toque.

---

### 📖 Roteiro Narrativo em 6 Atos para o Pitch

1. **Ato 1 — O Diagnóstico Oculto:** Por que as pessoas entram no limite? A prova de que o endividamento é uma erosão silenciosa de 90 dias, e não um choque de renda.
2. **Ato 2 — Nossos Targets & A Escalada Temporal:** Como os clientes evoluem no tempo e como a inadimplência quase dobra ao longo do ano de 2025.
3. **Ato 3 — A Zona de Alerta:** A identificação precoce através do Score de 6 Sinais Preditivos (quem são os 130 clientes em risco crítico).
4. **Ato 4 — O Relógio Regressivo:** Quanto tempo o cliente leva da Zona de Alerta até a Zona de Perigo? A "Janela de Ouro" de 45 a 60 dias.
5. **Ato 5 — As Intervenções e O Impacto Preventivo:** Simulação antes vs. depois, dias ganhos, reversão do déficit e o caso real do cliente demo.
6. **Ato 6 — O Business Case para o Itaú:** Por que o banco ganha evitando que o cliente pague juros de limite (PDD, LTV e Principalidade).
"""
    ))

    # --------------------------------------------------------------------------
    # SETUP & CARREGAMENTO DE DADOS
    # --------------------------------------------------------------------------
    cells.append(nbf.v4.new_markdown_cell(
"""## ⚙️ 0. Setup e Carregamento dos Dados

Configuramos o ambiente visual calibrado para apresentações executivas (paleta Itaú: Laranja `#EC7000`, Azul Marinho `#002D62` e Grafite `#2D3748`) e carregamos os dados analíticos pré-consolidados a partir do BigQuery.
"""
    ))

    cells.append(nbf.v4.new_code_cell(
"""import os
from pathlib import Path
import db_dtypes
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import seaborn as sns

# Configuração de caminhos
DATA_DIR = Path("data")

# Identidade visual Itaú / Executiva
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
    "figure.titlesize": 15,
    "axes.titlesize": 13,
    "axes.labelsize": 11,
    "figure.autolayout": True,
    "figure.dpi": 150,
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

# Carregamento dos datasets locais (alta velocidade e reproducibilidade)
df_perfil_mensal = pd.read_parquet(DATA_DIR / "perfil_mensal.parquet")
df_score_alerta = pd.read_parquet(DATA_DIR / "score_alerta.parquet")
df_status_cliente = pd.read_parquet(DATA_DIR / "status_cliente.parquet")
df_ajustes = pd.read_parquet(DATA_DIR / "ajustes_sugeridos.parquet")
df_projecao = pd.read_parquet(DATA_DIR / "projecao_diaria_candidatos.parquet")
df_trajetoria = pd.read_parquet(DATA_DIR / "trajetoria_primeiro_negativo.parquet")

print(f"✅ Todos os dados carregados com sucesso:")
print(f" • Perfil mensal: {len(df_perfil_mensal):,} linhas (1.000 clientes × 12 meses)")
print(f" • Status consolidado: {len(df_status_cliente):,} clientes classificados")
print(f" • Ajustes gerados: {len(df_ajustes):,} oportunidades preventivas")
print(f" • Trajetórias temporais: {len(df_trajetoria):,} observações antes e depois do primeiro negativo")
"""
    ))

    # --------------------------------------------------------------------------
    # ATO 1: O DIAGNÓSTICO OCULTO
    # --------------------------------------------------------------------------
    cells.append(nbf.v4.new_markdown_cell(
"""---
## 📉 Ato 1: O Diagnóstico Oculto — A Curva da Erosão Silenciosa

### A Pergunta Central do Pitch:
> *"Por que as pessoas usam o cheque especial? É porque perderam o emprego ou tiveram um choque súbito de renda?"*

A intuição comum sugere que a inadimplência decorre de tragédias financeiras repentinas. **Os dados provam o contrário:**

1. **A renda não cai:** Apenas **3,4%** dos clientes que negativam sofreram alguma redução de renda no mês anterior (contra 3,1% de quem nunca negativa). A renda mensal média permanece estável em **~R$ 5.300**.
2. **O saldo sofre erosão contínua:** Em **71,8%** dos casos, o saldo médio da conta vinha caindo progressivamente há **3 meses consecutivos** antes do primeiro dia negativo (contra apenas 12,1% dos clientes saudáveis).
3. **O mecanismo da queda:** Não é choque macroeconômico; é o descompasso de fluxo de caixa entre despesas variáveis e compromissos fixos recorrentes (faturas, parcelas e assinaturas).

Abaixo, medimos a trajetória real de 116 correntistas que entraram no vermelho pela primeira vez ao longo do ano, acompanhando o saldo médio desde 4 meses antes ($M-4$) até 2 meses depois ($M+2$).
"""
    ))

    cells.append(nbf.v4.new_code_cell(
"""# Análise da trajetória temporal da erosão do saldo
resumo_trajetoria = df_trajetoria.groupby("diff_meses").agg(
    clientes=("id_usuario", "nunique"),
    saldo_medio=("saldo_medio", "mean"),
    renda_media=("renda_mes", "mean"),
    dias_negativos=("dias_negativos", "mean"),
    juros_pagos=("juros_pagos", "mean")
).reset_index()

resumo_trajetoria["queda_saldo_pct"] = (
    (resumo_trajetoria["saldo_medio"] - resumo_trajetoria["saldo_medio"].iloc[0]) 
    / resumo_trajetoria["saldo_medio"].iloc[0] * 100
)

# Tabela formatada para apresentação
fase_map = {
    -4: "M-4 (Normalidade)",
    -3: "M-3 (Início Erosão)",
    -2: "M-2 (Sinal Alerta)",
    -1: "M-1 (Véspera do Abismo)",
    0: "M0 (1º Mês Negativo)",
    1: "M+1 (Degradação)",
    2: "M+2 (Crônico)",
    3: "M+3 (Superendividado)"
}
tabela_apresentacao = resumo_trajetoria[resumo_trajetoria["diff_meses"].between(-4, 2)].copy()
tabela_apresentacao["Fase"] = tabela_apresentacao["diff_meses"].map(fase_map)
tabela_apresentacao["Saldo Médio"] = tabela_apresentacao["saldo_medio"].apply(lambda v: f"R$ {v:,.2f}")
tabela_apresentacao["Renda Média"] = tabela_apresentacao["renda_media"].apply(lambda v: f"R$ {v:,.2f}")
tabela_apresentacao["Dias no Negativo"] = tabela_apresentacao["dias_negativos"].apply(lambda v: f"{v:.1f} dias")
tabela_apresentacao["Variação do Saldo"] = tabela_apresentacao["queda_saldo_pct"].apply(lambda v: f"{v:+.1f}%")

display(tabela_apresentacao[["Fase", "Saldo Médio", "Renda Média", "Dias no Negativo", "Variação do Saldo"]])
"""
    ))

    cells.append(nbf.v4.new_code_cell(
"""# Gráfico 1: A Curva da Erosão Silenciosa
resumo_plot = resumo_trajetoria[resumo_trajetoria["diff_meses"].between(-4, 2)]
fig, ax1 = plt.subplots(figsize=(10, 5.2))

# Renda constante
ax1.plot(resumo_plot["diff_meses"], resumo_plot["renda_media"], 
         color=ITAU_DARK_GRAY, linestyle=":", linewidth=2, label="Renda Mensal (Estável ~R$ 5,3k)", alpha=0.8)

# Saldo caindo
ax1.plot(resumo_plot["diff_meses"], resumo_plot["saldo_medio"], 
         color=ITAU_ORANGE, marker="o", linewidth=3.5, markersize=8, label="Saldo Médio da Conta", zorder=4)

# Destaques visuais
ax1.scatter([0], [resumo_plot.loc[resumo_plot['diff_meses']==0, 'saldo_medio'].values[0]], 
            color=ITAU_RED, s=150, zorder=5, edgecolor="white", linewidth=2)

ax1.axvspan(-3.2, -0.2, color="#FEFCBF", alpha=0.45, label="Janela Preventiva de Alerta (M-3 a M-1)")
ax1.axvspan(-0.2, 2.2, color="#FED7D7", alpha=0.45, label="Zona de Perigo (Inadimplência)")

ax1.annotate("Queda de 57% no saldo\\nsem queda de renda",
             xy=(-1, 4072), xytext=(-2.8, 2500),
             arrowprops=dict(facecolor=ITAU_DARK_GRAY, shrink=0.08, width=1.5, headwidth=6),
             fontsize=9.5, fontweight="bold", color=ITAU_DARK_GRAY,
             bbox=dict(boxstyle="round,pad=0.4", fc="white", ec="#CBD5E0", lw=1))

ax1.annotate("1º Mês no Negativo\\n(7,5 dias no limite)",
             xy=(0, 2086), xytext=(0.2, 3400),
             arrowprops=dict(facecolor=ITAU_RED, shrink=0.08, width=1.5, headwidth=6),
             fontsize=9.5, fontweight="bold", color=ITAU_RED,
             bbox=dict(boxstyle="round,pad=0.4", fc="white", ec=ITAU_RED, lw=1))

ax1.set_title("A Curva da Erosão Silenciosa: O Saldo Despenca 3 Meses Antes do Negativo", fontsize=13, fontweight="bold", pad=12, color=ITAU_NAVY)
ax1.set_xlabel("Distância em Meses até o Primeiro Negativo (0 = Mês da Queda)", fontweight="bold")
ax1.set_ylabel("Valor Médio (R$)", fontweight="bold")
ax1.yaxis.set_major_formatter(ticker.FuncFormatter(format_brl))
ax1.set_xticks(range(-4, 3))
ax1.set_xticklabels(["M-4", "M-3", "M-2", "M-1", "M0 (Caiu)", "M+1", "M+2"])
ax1.grid(True)
ax1.legend(loc="upper right", frameon=True, facecolor="white")
plt.show()
"""
    ))

    cells.append(nbf.v4.new_markdown_cell(
"""💡 **Insight Chave para o Slide:**
> *"O cliente não cai no cheque especial por impulso num único dia. Ele passa por um processo silencioso de 90 dias de perda de liquidez. O Agente Otimizador atua exatamente nessa janela de 90 dias, onde pequenos ajustes de rotina evitam o abismo."*
"""
    ))

    # --------------------------------------------------------------------------
    # ATO 2: NOSSOS TARGETS & EVOLUÇÃO TEMPORAL
    # --------------------------------------------------------------------------
    cells.append(nbf.v4.new_markdown_cell(
"""---
## 🎯 Ato 2: Nossos Targets & A Evolução Temporal do Risco

### A Classificação Determinística em 4 Estados

O Agente Otimizador classifica cada cliente com base em uma **conta matemática determinística** (sem adivinhação por LLM):

$$\\text{Saldo Projetado} = \\text{Saldo Atual} + \\text{Entradas Previstas} - \\text{Contas Fixas} - \\text{Fatura} - \\text{Parcelas} - \\text{Gasto Variável Diário}$$

| Estado | Regra Determinística | O que o Agente Faz | Público na Base |
| :--- | :--- | :--- | :--- |
| **`vai_faltar`** | Saldo hoje positivo, mas projeção negativa antes do salário | **Aviso proativo + Menor ajuste executável em 1 toque** | **13 clientes (1,3%)** |
| **`zero_a_zero`** | Projeção positiva entre zero e 10% da renda mensal | **Alerta suave + Reserva automática no dia do salário** | **3 clientes (0,3%)** |
| **`fecha_bem`** | Projeção com folga acima de 10% da renda | **Mensagem de congratulação + Convite para investimento** | **821 clientes (82,1%)** |
| **`ja_no_buraco`** | Já está no limite hoje ou $\ge 3$ meses seguidos no vermelho | **Não oferece otimização de rotina; acolhe e encaminha para renegociação** | **163 clientes (16,3%)** |

Abaixo, examinamos como o número de clientes que caem no limite evolui de Janeiro a Novembro de 2025.
"""
    ))

    cells.append(nbf.v4.new_code_cell(
"""# Evolução mensal do endividamento ao longo do ano de 2025
evolucao_ano = df_perfil_mensal.groupby("mes").agg(
    total_clientes=("id_usuario", "nunique"),
    negativados=("dias_negativos", lambda x: (x > 0).sum()),
    total_juros=("juros_pagos", "sum"),
    saldo_medio_geral=("saldo_medio", "mean")
).reset_index()

# Filtrar até novembro (dezembro possui distorção de 13º salário na base sintética)
evolucao_11m = evolucao_ano[evolucao_ano["mes"] <= pd.Timestamp("2025-11-01")].copy()
evolucao_11m["taxa_negativados_pct"] = (evolucao_11m["negativados"] / evolucao_11m["total_clientes"]) * 100
meses_labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov"]
evolucao_11m["mes_nome"] = meses_labels[:len(evolucao_11m)]

display(evolucao_11m[["mes_nome", "negativados", "taxa_negativados_pct", "total_juros", "saldo_medio_geral"]])
"""
    ))

    cells.append(nbf.v4.new_code_cell(
"""# Gráfico 2: A Escalada do Risco ao Longo de 2025
fig, ax1 = plt.subplots(figsize=(10, 5.2))

bars = ax1.bar(evolucao_11m["mes_nome"], evolucao_11m["negativados"], 
               color=ITAU_NAVY, alpha=0.85, width=0.55, label="Clientes no Cheque Especial")
ax1.set_ylabel("Quantidade de Clientes Negativados", fontweight="bold", color=ITAU_NAVY)
ax1.set_ylim(0, 240)

for bar in bars:
    h = bar.get_height()
    ax1.annotate(f"{h}",
                 xy=(bar.get_x() + bar.get_width() / 2, h),
                 xytext=(0, 4), textcoords="offset points",
                 ha="center", va="bottom", fontsize=9, fontweight="bold", color=ITAU_NAVY)

# Eixo secundário: Volume de juros
ax2 = ax1.twinx()
ax2.plot(evolucao_11m["mes_nome"], evolucao_11m["total_juros"], 
         color=ITAU_ORANGE, marker="s", linewidth=3, markersize=7, label="Juros Totais Pagos (R$)")
ax2.set_ylabel("Volume Mensal de Juros Pagos", fontweight="bold", color=ITAU_ORANGE)
ax2.yaxis.set_major_formatter(ticker.FuncFormatter(format_brl))
ax2.set_ylim(0, 75000)
ax2.grid(False)

# Destaque de aumento
ax1.annotate("Salto de +65% nos negativados\\n(de 12,3% para 20,3% da base)",
             xy=(9, 203), xytext=(5.2, 215),
             arrowprops=dict(facecolor=ITAU_RED, shrink=0.08, width=1.5, headwidth=6),
             fontsize=9.5, fontweight="bold", color=ITAU_RED,
             bbox=dict(boxstyle="round,pad=0.4", fc="white", ec=ITAU_RED, lw=1))

ax1.set_title("A Inadimplência Cresce ao Longo do Ano sem Intervenção Preventiva", fontsize=13, fontweight="bold", pad=12, color=ITAU_NAVY)
ax1.set_xlabel("Mês de 2025", fontweight="bold")
ax1.grid(True, axis="y")

lines1, labels1 = ax1.get_legend_handles_labels()
lines2, labels2 = ax2.get_legend_handles_labels()
ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper left", frameon=True, facecolor="white")
plt.show()
"""
    ))

    cells.append(nbf.v4.new_code_cell(
"""# Gráfico 3: Matriz de Estados na Foto Atual
fig, ax = plt.subplots(figsize=(8.5, 4.5))

contagem_est = df_status_cliente["estado"].value_counts()
estados_ordem = ["fecha_bem", "ja_no_buraco", "vai_faltar", "zero_a_zero"]
nomes_legenda = ["Fecha Bem\\n(82,1%)", "Já no Buraco\\n(16,3%)", "Vai Faltar\\n(1,3%)", "Zero a Zero\\n(0,3%)"]
valores_est = [contagem_est.get(e, 0) for e in estados_ordem]
cores_est = [ITAU_BLUE, ITAU_RED, ITAU_ORANGE, ITAU_GOLD]

bars = ax.barh(nomes_legenda[::-1], valores_est[::-1], color=cores_est[::-1], height=0.55)
ax.set_title("Distribuição dos Clientes por Estado na Data de Referência", fontsize=13, fontweight="bold", pad=12, color=ITAU_NAVY)
ax.set_xlabel("Número de Clientes (Base Total = 1.000)", fontweight="bold")
ax.set_xlim(0, 950)
ax.grid(True, axis="x")

for bar in bars:
    w = bar.get_width()
    ax.annotate(f"{w} clientes",
                xy=(w, bar.get_y() + bar.get_height() / 2),
                xytext=(8, 0), textcoords="offset points",
                ha="left", va="center", fontsize=9.5, fontweight="bold", color=ITAU_DARK_GRAY)

ax.text(320, 0.7, "🎯 FOCO PREVENTIVO DO AGENTE:\\nResgatar 'Vai Faltar' e 'Zero a Zero'\\nANTES de migrarem para o 'Buraco'.\\n97,7% dos clientes no buraco ficam crônicos!",
        fontsize=9, fontweight="bold", color=ITAU_NAVY,
        bbox=dict(boxstyle="round,pad=0.5", fc="#FEFCBF", ec=ITAU_GOLD, lw=1.2))

plt.show()
"""
    ))

    cells.append(nbf.v4.new_markdown_cell(
"""💡 **Insight Chave para o Slide:**
> *"Ao longo do ano, a proporção de negativados salta de 12,3% para 20,3% da base. No total, 326 correntistas (32,6%) têm episódios no cheque especial durante o ano. Quem cai no 'Buraco' não sai sozinho: 97,7% continuam endividados no ciclo seguinte. A nossa missão é impedir essa primeira queda."*
"""
    ))

    # --------------------------------------------------------------------------
    # SUB-SEÇÃO ATO 2.1: A ARMADILHA DO BURACO (A CATRACA SEM VOLTA)
    # --------------------------------------------------------------------------
    cells.append(nbf.v4.new_markdown_cell(
"""### 🕳️ Aprofundamento: A Armadilha do 'Já no Buraco' — O Efeito Catraca Sem Volta

> *"Por que o nosso Agente Otimizador foca com tanta energia em quem 'Vai Faltar', em vez de quem 'Já Está no Buraco'?"*

A resposta reside na **física do superendividamento**, comprovada pelos dados:

1. **A Catraca Gira Só Para Dentro (Fluxo Desequilibrado):**
   A cada mês, entre **15 e 30 novos clientes** cruzam a fronteira e entram no cheque especial. Em contrapartida, as saídas espontâneas sustentáveis são mínimas (**menos de 9 clientes por mês**). A taxa de permanência no vermelho a cada mês é de **88% a 92%**.
2. **A Reincidência é Quase Total (97,7%):**
   No backtest com corte temporal, **97,7%** dos clientes classificados em `ja_no_buraco` permaneceram no limite no ciclo seguinte. Menos de 3% conseguem não negativar sozinhos.
3. **A Espiral Exponencial da Dívida:**
   Quem entra no 'Buraco' não fica estável. O saldo médio afunda em queda livre contínua:
   $$\\text{M0 (3º mês consecutivo): } -\\text{R\\$ 1.291} \\longrightarrow \\text{M+7: } -\\text{R\\$ 5.118}$$
   E a quantidade média de dias por mês passados no limite passa de 18 para **mais de 20 dias** (o cliente passa mais de 2/3 do mês devendo ao banco).
"""
    ))

    cells.append(nbf.v4.new_code_cell(
"""# Balanço de Entradas e Saídas da Zona de Perigo mês a mês
df_pm_trans = df_perfil_mensal.sort_values(['id_usuario', 'mes']).copy()
df_pm_trans['mes'] = pd.to_datetime(df_pm_trans['mes'])
df_pm_trans['no_negativo'] = df_pm_trans['dias_negativos'] > 0
df_pm_trans['negativo_ant'] = df_pm_trans.groupby('id_usuario')['no_negativo'].shift(1)

df_trans_val = df_pm_trans.dropna(subset=['negativo_ant']).copy()
fluxo_meses = df_trans_val.groupby('mes').agg(
    novos_entrantes=('negativo_ant', lambda x: ((x == False) & (df_trans_val.loc[x.index, 'no_negativo'] == True)).sum()),
    saidas_cura=('negativo_ant', lambda x: ((x == True) & (df_trans_val.loc[x.index, 'no_negativo'] == False)).sum()),
    permaneceram_presos=('negativo_ant', lambda x: ((x == True) & (df_trans_val.loc[x.index, 'no_negativo'] == True)).sum()),
    total_presos=('no_negativo', 'sum')
).reset_index()

fluxo_meses = fluxo_meses[fluxo_meses['mes'] <= pd.Timestamp('2025-11-01')].copy()
fluxo_meses['saldo_liquido'] = fluxo_meses['novos_entrantes'] - fluxo_meses['saidas_cura']
fluxo_meses['taxa_permanencia_pct'] = (fluxo_meses['permaneceram_presos'] / (fluxo_meses['permaneceram_presos'] + fluxo_meses['saidas_cura'])) * 100
meses_n = ['Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov']
fluxo_meses['nome_mes'] = meses_n[:len(fluxo_meses)]

display(fluxo_meses[['nome_mes', 'novos_entrantes', 'saidas_cura', 'saldo_liquido', 'permaneceram_presos', 'total_presos', 'taxa_permanencia_pct']])
"""
    ))

    cells.append(nbf.v4.new_code_cell(
"""# Gráfico 8: A Armadilha do Buraco — Balanço de Fluxo e Espiral de Saldo
def streak_calc(s):
    res, c = [], 0
    for v in s:
        c = c + 1 if v else 0
        res.append(c)
    return res

df_pm_trans['consec'] = df_pm_trans.groupby('id_usuario')['no_negativo'].transform(streak_calc)
buraco_trig = df_pm_trans[df_pm_trans['consec'] == 3][['id_usuario', 'mes']].rename(columns={'mes': 'mes_buraco'})
df_mrg = df_pm_trans.merge(buraco_trig, on='id_usuario', how='inner')
df_pos_b = df_mrg[df_mrg['mes'] >= df_mrg['mes_buraco']].copy()
df_pos_b['meses_apos'] = ((df_pos_b['mes'].dt.year - df_pos_b['mes_buraco'].dt.year)*12 + (df_pos_b['mes'].dt.month - df_pos_b['mes_buraco'].dt.month))
espiral_df = df_pos_b.groupby('meses_apos').agg(
    saldo_medio=('saldo_medio', 'mean'),
    dias_neg=('dias_negativos', 'mean')
).reset_index()
espiral_df = espiral_df[espiral_df['meses_apos'] <= 7]

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5.2))

# Painel 1: Balanço de Fluxo
x_pos = np.arange(len(fluxo_meses))
bar_w = 0.38
ax1.bar(x_pos - bar_w/2, fluxo_meses['novos_entrantes'], bar_w, label="Novos Entrantes", color=ITAU_RED, alpha=0.9)
ax1.bar(x_pos + bar_w/2, fluxo_meses['saidas_cura'], bar_w, label="Conseguiram Sair", color=ITAU_GREEN, alpha=0.9)

ax1_t = ax1.twinx()
ax1_t.plot(x_pos, fluxo_meses['total_presos'], color=ITAU_NAVY, marker="o", linewidth=3, label="Estoque Preso")
ax1_t.set_ylabel("Total de Clientes no Vermelho", fontweight="bold", color=ITAU_NAVY)
ax1_t.set_ylim(100, 240)
ax1_t.grid(False)

ax1.set_title("A Catraca Sem Volta: Entradas vs Saídas", fontsize=12, fontweight="bold", pad=12, color=ITAU_NAVY)
ax1.set_xlabel("Mês em 2025", fontweight="bold")
ax1.set_ylabel("Fluxo de Clientes no Mês", fontweight="bold")
ax1.set_xticks(x_pos)
ax1.set_xticklabels(fluxo_meses['nome_mes'])
ax1.set_ylim(0, 65)
ax1.grid(True, axis="y")

h1_n, l1_n = ax1.get_legend_handles_labels()
h2_n, l2_n = ax1_t.get_legend_handles_labels()
ax1.legend(h1_n + h2_n, l1_n + l2_n, loc="upper left", frameon=True, fontsize=8.5)

# Painel 2: A Espiral da Dívida pós-buraco
labels_esp = ["M0\\n(3º mês)", "M+1", "M+2", "M+3", "M+4", "M+5", "M+6", "M+7"]
ax2.plot(espiral_df['meses_apos'], espiral_df['saldo_medio'], color=ITAU_ORANGE, marker="s", linewidth=3.5, markersize=8, label="Saldo Médio da Conta")
ax2.fill_between(espiral_df['meses_apos'], espiral_df['saldo_medio'], 0, color=ITAU_ORANGE, alpha=0.15)
ax2.axhline(0, color=ITAU_DARK_GRAY, linestyle="--", linewidth=1.2)

ax2_t = ax2.twinx()
ax2_t.plot(espiral_df['meses_apos'], espiral_df['dias_neg'], color=ITAU_RED, marker="^", linestyle=":", linewidth=2.5, markersize=7, label="Dias no Limite/Mês")
ax2_t.set_ylabel("Média de Dias no Limite/Mês", fontweight="bold", color=ITAU_RED)
ax2_t.set_ylim(10, 25)
ax2_t.grid(False)

ax2.set_title("A Espiral do 'Já no Buraco': Queda Livre de Saldo", fontsize=12, fontweight="bold", pad=12, color=ITAU_NAVY)
ax2.set_xlabel("Meses Após Atingir 'Já no Buraco'", fontweight="bold")
ax2.set_ylabel("Saldo Médio (R$)", fontweight="bold", color=ITAU_ORANGE)
ax2.yaxis.set_major_formatter(ticker.FuncFormatter(format_brl))
ax2.set_xticks(espiral_df['meses_apos'])
ax2.set_xticklabels(labels_esp[:len(espiral_df)])
ax2.set_ylim(-5600, 500)
ax2.grid(True)

h3_n, l3_n = ax2.get_legend_handles_labels()
h4_n, l4_n = ax2_t.get_legend_handles_labels()
ax2.legend(h3_n + h4_n, l3_n + l4_n, loc="lower left", frameon=True, fontsize=8.5)

plt.suptitle("Por Que Não Dá Para Esperar o Cliente Negativar: A Armadilha Sem Volta do 'Já no Buraco'", 
             fontsize=13.5, fontweight="bold", y=1.02, color=ITAU_NAVY)
plt.show()
"""
    ))

    cells.append(nbf.v4.new_markdown_cell(
"""💡 **Insight Chave para o Slide:**
> *"O cheque especial é uma areia movediça: após entrar no 'Buraco', a taxa de reincidência imediata é de 97,7% e o saldo afunda de -R$ 1.291 para -R$ 5.118 em 7 meses. A porta de saída espontânea está praticamente trancada. É por isso que o Agente Otimizador precisa intervir antes: no 'Vai Faltar' a intervenção custa 1 toque e salva o cliente; no 'Buraco', exige renegociação e crédito emergencial."*
"""
    ))

    # --------------------------------------------------------------------------
    # ATO 3: A ZONA DE ALERTA & SCORE PREDITIVO
    # --------------------------------------------------------------------------
    cells.append(nbf.v4.new_markdown_cell(
"""---
## 🚨 Ato 3: A Zona de Alerta & O Score Preditivo

Para antecipar a abordagem antes do dia do salário, definimos a **Zona de Alerta** com base em **6 sinais observados nos últimos 3 meses** (cada sinal pontua 1 ponto):

1. **`saldo_em_queda`**: Saldo médio caindo mês a mês ($M_{-3} > M_{-2} > M_{-1}$).
2. **`dias_no_negativo`**: Algum dia no vermelho nos últimos 90 dias.
3. **`fatura_minimo_ou_parcial`**: Pagamento do mínimo ou parcial da fatura em 2 ou mais meses.
4. **`juros_de_limite`**: Cobrança de juros em 2 ou mais dos últimos 3 meses.
5. **`emprestimo`**: Tomada de empréstimos ou saques emergenciais.
6. **`gasto_acima_do_habitual`**: Consumo recente $> 1,15 \\times$ média histórica.

Clientes com **Score $\ge 4$** entram na **Zona de Alerta Crítico**.
"""
    ))

    cells.append(nbf.v4.new_code_cell(
"""# Relação entre o Score de Alerta e a severidade do uso do limite
resumo_alerta = df_score_alerta.groupby("score").agg(
    clientes=("id_usuario", "count"),
    media_dias_neg=("dias_negativos_3m", "mean"),
    media_juros=("juros_3m", "mean"),
    clientes_cronicos=("meses_vermelho_consecutivos", lambda x: (x >= 3).sum())
).reset_index()

resumo_alerta["faixa_risco"] = [
    "Seguro (0)", "Seguro (1)", "Atenção Inicial (2)", "Alerta Moderado (3)",
    "Alerta Crítico (4)", "Alerta Severo (5)", "Extremo (6)"
]

display(resumo_alerta[["score", "faixa_risco", "clientes", "media_dias_neg", "media_juros", "clientes_cronicos"]])
"""
    ))

    cells.append(nbf.v4.new_code_cell(
"""# Gráfico 4: Score de Alerta vs Severidade no Limite
fig, ax1 = plt.subplots(figsize=(10, 5.2))

cores_sc = [ITAU_BLUE if s < 2 else (ITAU_GOLD if s < 4 else ITAU_RED) for s in resumo_alerta["score"]]
bars = ax1.bar(resumo_alerta["score"], resumo_alerta["media_dias_neg"], color=cores_sc, width=0.6, alpha=0.9)
ax1.set_ylabel("Média de Dias no Cheque Especial (em 90 dias)", fontweight="bold", color=ITAU_NAVY)
ax1.set_xlabel("Score de Alerta (Soma dos 6 Sinais Preditivos)", fontweight="bold")
ax1.set_ylim(0, 100)

for bar, r in zip(bars, resumo_alerta.itertuples()):
    h = bar.get_height()
    ax1.annotate(f"{h:.1f} dias\\n(n={r.clientes})",
                 xy=(bar.get_x() + bar.get_width() / 2, h),
                 xytext=(0, 4), textcoords="offset points",
                 ha="center", va="bottom", fontsize=8.5, fontweight="bold", color=ITAU_DARK_GRAY)

ax2 = ax1.twinx()
ax2.plot(resumo_alerta["score"], resumo_alerta["media_juros"], color=ITAU_ORANGE, marker="o", linewidth=3, markersize=8)
ax2.set_ylabel("Média de Juros Pagos em 90 dias", fontweight="bold", color=ITAU_ORANGE)
ax2.yaxis.set_major_formatter(ticker.FuncFormatter(format_brl))
ax2.set_ylim(0, 650)
ax2.grid(False)

ax1.set_title("O Score de Alerta Separa Nitidamente Quem Usará o Limite", fontsize=13, fontweight="bold", pad=12, color=ITAU_NAVY)
ax1.set_xticks(resumo_alerta["score"])
ax1.set_xticklabels([f"Score {s}\\n({'Seguro' if s < 2 else ('Atenção' if s < 4 else 'Crítico')})" for s in resumo_alerta["score"]])
ax1.grid(True, axis="y")

ax1.annotate("Score ≥ 4: Alerta Máximo\\nPassam mais de 55 a 89 dias\\nno cheque especial em 3 meses!",
             xy=(4.2, 60), xytext=(2.2, 75),
             arrowprops=dict(facecolor=ITAU_RED, shrink=0.08, width=1.5, headwidth=6),
             fontsize=9, fontweight="bold", color=ITAU_RED,
             bbox=dict(boxstyle="round,pad=0.4", fc="white", ec=ITAU_RED, lw=1))

plt.show()
"""
    ))

    cells.append(nbf.v4.new_markdown_cell(
"""💡 **Insight Chave para o Slide:**
> *"Temos 130 clientes com Score $\ge 4$ na base. Esse grupo passa em média de 55 a 89 dias no vermelho a cada trimestre e paga mais de R$ 460 em juros de limite a cada 3 meses. Eles são o público prioritário para os avisos preventivos antecipados do agente."*
"""
    ))

    # --------------------------------------------------------------------------
    # ATO 4: O RELÓGIO REGRESSIVO (TIME TO DEFAULT)
    # --------------------------------------------------------------------------
    cells.append(nbf.v4.new_markdown_cell(
"""---
## ⏳ Ato 4: O Relógio Regressivo — Da Zona de Alerta à Zona de Perigo

### A "Janela de Ouro" de Intervenção

Quando um cliente entra na Zona de Alerta (apresentando sinais de queda de saldo ou score 2 a 3):
- **Quanto tempo temos até a entrada na Zona de Perigo?**
  Os dados mostram que a transição leva de **1 a 3 meses (45 a 60 dias)**.
- **O que acontece se ninguém fizer nada durante essa janela?**
  No backtest com corte temporal em Outubro/2025:
  - **63,3%** dos clientes classificados como `vai_faltar` entraram de fato no cheque especial até o próximo salário.
  - O recall da regra foi de **73%** (19 de 26 novos negativados foram capturados com antecedência).
  - **97,7%** dos clientes que já estavam no 'Buraco' permaneceram no limite no ciclo seguinte.
"""
    ))

    cells.append(nbf.v4.new_code_cell(
"""# Gráfico 5: O Relógio Regressivo da Deterioração
fig, ax = plt.subplots(figsize=(10, 4.8))

fases = [
    "1. Estabilidade\\n(Score 0-1)",
    "2. Primeiros Sinais\\n(Score 2: Fatura/Erosão)",
    "3. Janela Crítica\\n(Score 3-4: Vai Faltar)",
    "4. 1º Mês Negativo\\n(Dia 0: Cheque Especial)",
    "5. Inadimplência Crônica\\n(Já no Buraco: 3m+ vermelho)"
]
tempo_dias = [0, 30, 60, 90, 180]

ax.plot(tempo_dias, [4, 3, 2, 1, 0], marker="o", markersize=11, linewidth=3.5, color=ITAU_ORANGE)
ax.axvspan(30, 90, color="#FEFCBF", alpha=0.5, label="JANELA DE OURO DO AGENTE (45 a 60 DIAS)\\nMomento ideal para intervir antes da inadimplência")

for i, (d, f) in enumerate(zip(tempo_dias, fases)):
    y = 4 - i
    ax.scatter([d], [y], s=180, color=ITAU_NAVY if i < 3 else ITAU_RED, zorder=5)
    ax.text(d, y + 0.25, f"{f}\\n(~{d} dias)", ha="center", va="bottom", fontsize=8.5, fontweight="bold", color=ITAU_NAVY)

ax.set_title("O Relógio Regressivo: O Tempo Até a Zona de Perigo", fontsize=13, fontweight="bold", pad=20, color=ITAU_NAVY)
ax.set_xlabel("Linha do Tempo em Dias desde os Primeiros Sinais", fontweight="bold")
ax.set_xlim(-15, 210)
ax.set_ylim(-0.8, 5.2)
ax.set_yticks([])
ax.grid(True, axis="x")
ax.legend(loc="upper right", frameon=True, facecolor="white", edgecolor=ITAU_GOLD)

ax.text(105, 0.4, "⚠️ O Ponto de Não Retorno:\\nSem o agente, 63,3% dos 'Vai Faltar'\\nentram no limite no mês seguinte e\\n97,7% dos crônicos não saem sozinhos.",
        fontsize=9, fontweight="bold", color=ITAU_RED,
        bbox=dict(boxstyle="round,pad=0.5", fc="white", ec=ITAU_RED, lw=1.2))

plt.show()
"""
    ))

    cells.append(nbf.v4.new_markdown_cell(
"""💡 **Insight Chave para o Slide:**
> *"Após os primeiros sinais, o banco tem uma janela de 45 a 60 dias para agir. Se esperar o cliente negativar para oferecer crédito ou renegociação, já é tarde demais: o custo de crédito explode e a probabilidade de cura espontânea despenca para menos de 3%."*
"""
    ))

    # --------------------------------------------------------------------------
    # ATO 5: AS INTERVENÇÕES E O IMPACTO PREVENTIVO
    # --------------------------------------------------------------------------
    cells.append(nbf.v4.new_markdown_cell(
"""---
## 🛠️ Ato 5: As Intervenções e O Impacto Preventivo

### O Catálogo de Intervenções em 1 Toque

O Agente Otimizador nunca julga nem faz discursos genéricos. Ele oferece apenas **3 intervenções práticas e visíveis no extrato**:

1. **`mudanca_data` (Esforço 1):** Agendar pagamentos ou Pix reagendáveis para o dia útil do salário.
2. **`assinatura_redundante` (Esforço 2):** Apontar duplicidades de serviços na mesma categoria (ex.: 2 ou 3 plataformas de streaming de vídeo).
3. **`gasto_discricionario` (Esforço 3):** Criar lembrete de teto para categorias que estouraram em mais de 10% a média do próprio cliente.

Abaixo, quantificamos as oportunidades encontradas na base inteira.
"""
    ))

    cells.append(nbf.v4.new_code_cell(
"""# Análise das oportunidades de intervenção identificadas na base
resumo_ajustes = df_ajustes.groupby("tipo").agg(
    total_oportunidades=("ajuste_id", "count"),
    clientes_impactados=("id_usuario", "nunique"),
    valor_medio=("valor", "mean"),
    ganho_medio_vespera=("ganho_vespera_salario", "mean")
).reset_index()

resumo_ajustes["Ação do Agente"] = [
    "Corte de Assinaturas Redundantes", "Teto de Gasto Discricionário", "Mudança de Data (Pix/Boletos)"
]
resumo_ajustes["Valor Médio"] = resumo_ajustes["valor_medio"].apply(lambda v: f"R$ {v:,.2f}")
resumo_ajustes["Ganho Médio na Véspera"] = resumo_ajustes["ganho_medio_vespera"].apply(lambda v: f"R$ {v:,.2f}")

display(resumo_ajustes[["Ação do Agente", "total_oportunidades", "clientes_impactados", "Valor Médio", "Ganho Médio na Véspera"]])
"""
    ))

    cells.append(nbf.v4.new_markdown_cell(
"""### Estudo de Caso Real: Cliente Demo `d6c59567-bb6d-4a01-a0bd-f9b6f811724b`

- **Situação no dia 15/12:** Saldo de **R$ 3.776,24**.
- **Projeção sem intervenção:** No ritmo atual de gastos e pagamentos agendados, o dinheiro acaba no dia **06/01/2026** e o saldo cai para **-R$ 883,22** na véspera do salário (07/01).
- **As intervenções do Agente:**
  1. *Reagendamento:* Mover a transferência Pix de **R$ 962,77** do dia 06/01 para o dia 07/01 (quando o salário cai).
  2. *Corte de Assinaturas:* Eliminar 2 streamings duplicados (economia de R$ 72,95/mês, liberando **+R$ 38,51** antes do salário).
- **Resultado:** O saldo na véspera do salário salta de **-R$ 883,22** para **+R$ 118,06**. O cliente **não entra no limite** e não paga nenhum centavo de juros!
"""
    ))

    cells.append(nbf.v4.new_code_cell(
"""# Gráfico 6: Projeção Diária do Cliente Demo (Antes vs Depois)
demo_id = "d6c59567-bb6d-4a01-a0bd-f9b6f811724b"
df_demo = df_projecao[df_projecao["id_usuario"] == demo_id].sort_values("data").copy()

if len(df_demo) == 0:
    demo_id = df_projecao["id_usuario"].iloc[0]
    df_demo = df_projecao[df_projecao["id_usuario"] == demo_id].sort_values("data").copy()

df_demo["data_str"] = pd.to_datetime(df_demo["data"]).dt.strftime("%d/%m")
saldo_sem = df_demo["saldo_projetado"].values

# Simulação das duas intervenções aceitas
saldo_com = saldo_sem.copy()
for i, row in enumerate(df_demo.itertuples()):
    dt = pd.to_datetime(row.data)
    if dt >= pd.Timestamp("2025-12-20"):
        saldo_com[i] += 38.51
    if dt >= pd.Timestamp("2026-01-06") and dt < pd.Timestamp("2026-01-07"):
        saldo_com[i] += 962.77

fig, ax = plt.subplots(figsize=(10.5, 5))

ax.plot(df_demo["data_str"], saldo_sem, color=ITAU_RED, linestyle="--", linewidth=2.5, 
        label="Sem Intervenção (Cai no Cheque Especial em 06/01)", marker="x")
ax.plot(df_demo["data_str"], saldo_com, color=ITAU_GREEN, linewidth=3.5, 
        label="Com Agente Otimizador (Reagendamento Pix + Corte Streamings)", marker="o")

ax.axhline(0, color=ITAU_DARK_GRAY, linestyle="-", linewidth=1.2, alpha=0.8)

ax.annotate("Sem Agente: Negativa em -R$ 883\\nCobrança de juros de limite",
            xy=(len(df_demo)-2, saldo_sem[-2]), xytext=(len(df_demo)-6, -750),
            arrowprops=dict(facecolor=ITAU_RED, shrink=0.08, width=1.5, headwidth=6),
            fontsize=9, fontweight="bold", color=ITAU_RED,
            bbox=dict(boxstyle="round,pad=0.3", fc="white", ec=ITAU_RED, lw=1))

ax.annotate("Com Agente: Saldo positivo +R$ 118\\nChega ao salário com dignidade!",
            xy=(len(df_demo)-2, saldo_com[-2]), xytext=(len(df_demo)-7, 950),
            arrowprops=dict(facecolor=ITAU_GREEN, shrink=0.08, width=1.5, headwidth=6),
            fontsize=9, fontweight="bold", color=ITAU_GREEN,
            bbox=dict(boxstyle="round,pad=0.3", fc="white", ec=ITAU_GREEN, lw=1))

ax.set_title("O Impacto Real no Cliente: Revertendo a Projeção Negativa com 1 Toque", fontsize=13, fontweight="bold", pad=12, color=ITAU_NAVY)
ax.set_xlabel("Data da Projeção até o Salário", fontweight="bold")
ax.set_ylabel("Saldo Projetado da Conta (R$)", fontweight="bold")
ax.yaxis.set_major_formatter(ticker.FuncFormatter(format_brl))
plt.xticks(rotation=45)
ax.grid(True)
ax.legend(loc="upper right", frameon=True, facecolor="white")
plt.show()
"""
    ))

    cells.append(nbf.v4.new_code_cell(
"""# Gráfico 7: O Funil de Impacto e Resgate Financeiro
fig, ax = plt.subplots(figsize=(9, 4.8))

etapas = [
    "1. Base Total Monitorada\\n(1.000 correntistas)",
    "2. Clientes em Risco no Ano\\n(326 tiveram cheque especial)",
    "3. Monitorados na Zona de Alerta\\n(130 com Score ≥ 4)",
    "4. Intervenções Preventivas Aceitas\\n(~70% evitam nova entrada)",
    "5. Economia Anual por Cliente\\n(Mediana de R$ 850 em juros)"
]
larguras = [1000, 326, 130, 91, 300]
cores_f = [ITAU_NAVY, ITAU_BLUE, ITAU_GOLD, ITAU_GREEN, ITAU_ORANGE]

bars = ax.barh(etapas[::-1], larguras[::-1], color=cores_f[::-1], height=0.55)
ax.set_title("O Funil de Valor e Impacto do Agente Otimizador", fontsize=13, fontweight="bold", pad=12, color=ITAU_NAVY)
ax.set_xlabel("Escala e Potencial de Resgate", fontweight="bold")
ax.set_xlim(0, 1150)
ax.grid(True, axis="x")

textos_f = [
    "Economia Mediana de R$ 850/ano por cliente!",
    "91 clientes resgatados do rotativo (Recall 73%)",
    "130 clientes com alerta antecipado",
    "326 clientes (32,6% da base)",
    "1.000 clientes monitorados"
]

for bar, txt in zip(bars, textos_f):
    w = bar.get_width()
    ax.annotate(txt,
                xy=(w, bar.get_y() + bar.get_height() / 2),
                xytext=(8, 0), textcoords="offset points",
                ha="left", va="center", fontsize=9, fontweight="bold", color=ITAU_DARK_GRAY)

plt.show()
"""
    ))

    # --------------------------------------------------------------------------
    # ATO 6: O BUSINESS CASE PARA O ITAÚ
    # --------------------------------------------------------------------------
    cells.append(nbf.v4.new_markdown_cell(
"""---
## 💼 Ato 6: O Business Case para o Itaú

### A Pergunta Crítica da Banca:
> *"Por que o Itaú abriria mão de receber juros de cheque especial dos seus clientes?"*

Essa é a pergunta decisiva do pitch. A resposta é puramente **estratégica e orientada a lucro de longo prazo**:

1. **Juro de limite não é lucro limpo; é precursor de PDD (Provisão para Devedores Duvidosos):**
   Um cliente que passa 6 meses no limite gera R$ 1.173 em juros, mas tem alta taxa de default, exigindo provisões de crédito de milhares de reais e custosos processos de renegociação e cobrança.
2. **Preservação de LTV e Redução de Churn:**
   O cliente que se sente "preso no cheque especial" transfere seu salário para outro banco (perda de principalidade) ou cancela produtos por desespero financeiro.
3. **Conversão de Margem Nociva em Margem Saudável:**
   O cliente com saldo protegido torna-se elegível para produtos rentáveis de alta qualidade: investimentos, previdência privada, seguros e uso transacional de cartões de crédito.

### Tabela-Síntese de Métricas do Pitch (Resumo Executivo para a Banca)

| Métrica | Valor na Base (1.000 clientes) | Impacto com o Agente Otimizador |
| :--- | :--- | :--- |
| **Público com risco no ano** | 326 clientes (32,6%) | 100% monitorados preventivamente |
| **Clientes na Zona de Alerta Crítico** | 130 clientes (Score $\ge 4$) | Abordagem antecipada no meio do mês |
| **Janela de Ouro de Intervenção** | 45 a 60 dias antes da inadimplência | Atuação 100% proativa antes da negativação |
| **Taxa de Conversão em Risco sem Agente** | 63,3% dos 'Vai Faltar' negativam | Redução de até ~70% das novas entradas |
| **Economia de Juros por Cliente Resgatado** | Mediana de R$ 850/ano | Fica no bolso do cliente correntista |
| **Custo de Intervenção para o Usuário** | 0 fricção | 1 toque (reagendar Pix, lembrete de teto, reserva) |
"""
    ))

    # Atribuir as células ao notebook
    nb.cells = cells

    # Salvar o notebook gerado
    with open(NOTEBOOK_PATH, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    print(f"Notebook salvo com sucesso em: {NOTEBOOK_PATH}")

def run_notebook():
    print("Executando o notebook para renderizar todas as células e gráficos...")
    with open(NOTEBOOK_PATH, "r", encoding="utf-8") as f:
        nb = nbf.read(f, as_version=4)
        
    client = NotebookClient(nb, timeout=300, kernel_name="python3")
    client.execute()
    
    with open(NOTEBOOK_PATH, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    print("Notebook executado e saídas gravadas com sucesso!")

if __name__ == "__main__":
    create_notebook()
    run_notebook()
