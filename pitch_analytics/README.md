# 🎯 Pitch Analytics — Storytelling & Métricas do Agente Otimizador

Este diretório contém a análise exploratória, o modelo de transição temporal e os dados visuais que fundamentam o **Pitch do Agente Otimizador** para a banca avaliadora do Itaú.

---

## 📁 Estrutura do Diretório

```
pitch_analytics/
├── README.md                   # Este guia executivo e mapeamento de slides
├── pyproject.toml              # Dependências isoladas (pandas, matplotlib, seaborn, ipykernel, db-dtypes)
├── pitch_storytelling.ipynb    # Jupyter Notebook executado com todos os gráficos e storytelling dos 6 Atos
├── build_notebook.py           # Script construtor e executor do notebook
├── export_charts.py            # Gerador de gráficos executivos de alta resolução (300 DPI)
├── charts/                     # Gráficos prontos em PNG para inclusão direta nos slides
│   ├── 01_curva_erosao_silenciosa.png
│   ├── 02_escalada_risco_2025.png
│   ├── 03_matriz_estados_base.png
│   ├── 04_score_alerta_vs_severidade.png
│   ├── 05_relogio_regressivo_transicao.png
│   ├── 06_impacto_intervencao_saldo_projetado.png
│   ├── 07_funil_impacto_resgate.png
│   └── 08_armadilha_buraco_catraca_sem_volta.png
└── data/                       # Caches em parquet para execução ultrarrápida offline
    ├── perfil_mensal.parquet
    ├── score_alerta.parquet
    ├── status_cliente.parquet
    ├── ajustes_sugeridos.parquet
    ├── projecao_diaria_candidatos.parquet
    └── trajetoria_primeiro_negativo.parquet
```

---

## 🎬 Mapeamento dos 6 Atos para os Slides do Pitch

| Ato / Slide | Título Narrativo | Gráfico em `charts/` | Mensagem-Núcleo para a Apresentação |
| :--- | :--- | :--- | :--- |
| **Slide 1 / Ato 1** | **A Anatomia do Endividamento** | `01_curva_erosao_silenciosa.png` | O cheque especial não vem de choque de renda (renda estável em R$ 5,3k). Vem de uma **erosão silenciosa de saldo ao longo de 90 dias** (-57% antes do 1º negativo). |
| **Slide 2 / Ato 2** | **A Escalada do Risco** | `02_escalada_risco_2025.png` e `03_matriz_estados_base.png` | A taxa de negativados salta de 12,3% para 20,3% no ano (+65%). São 326 correntistas (32,6%) em risco no ano. |
| **Slide 3 / Destaque** | **A Armadilha do Buraco (A Catraca Sem Volta)** | `08_armadilha_buraco_catraca_sem_volta.png` | **Por que agir antes?** O fluxo de entrada no vermelho (15 a 30 novos/mês) supera em 3x as saídas (<9/mês). No buraco, 97,7% reincidem e o saldo afunda de -R$ 1,3k para -R$ 5,1k em 7 meses! |
| **Slide 4 / Ato 3** | **A Zona de Alerta Preditiva** | `04_score_alerta_vs_severidade.png` | 6 sinais determinísticos separam quem vai estourar. Clientes com **Score $\ge 4$** passam de 55 a 89 dias no vermelho e pagam mais de R$ 460 em juros a cada trimestre. |
| **Slide 5 / Ato 4** | **O Relógio Regressivo** | `05_relogio_regressivo_transicao.png` | Existe uma **"Janela de Ouro" de 45 a 60 dias** entre o sinal e a inadimplência. Esperar o cliente negativar para oferecer crédito custa caro e não resolve. |
| **Slide 6 / Ato 5** | **A Solução: Intervenção em 1 Toque** | `06_impacto_intervencao_saldo_projetado.png` | Ajustes simples no extrato (reagendar Pix, cortar streamings duplicados, teto de gasto) revertem a projeção negativa do cliente demo de -R$ 883 para +R$ 118. |
| **Slide 7 / Ato 6** | **O Business Case do Itaú** | `07_funil_impacto_resgate.png` | Menos cheque especial = **Menos PDD**, menos churn para fintechs, retenção da principalidade da conta e clientes poupando uma **mediana de R$ 850/ano** em juros abusivos. |

---

## 🚀 Como Executar

### 1. Sincronizar Dependências com o `uv`
```bash
cd pitch_analytics
uv sync
```

### 2. Abrir o Notebook Interativo
Você pode abrir o notebook diretamente no VS Code (selecionando o Python do ambiente `.venv`) ou iniciando o Jupyter:
```bash
uv run jupyter lab pitch_storytelling.ipynb
```
> O arquivo `pitch_storytelling.ipynb` já está **completamente pré-executado**, com todas as tabelas e gráficos embutidos e visíveis mesmo sem rodar novamente.

### 3. Re-exportar Todos os Gráficos em PNG
```bash
uv run python export_charts.py
```
Os arquivos serão atualizados na pasta `charts/` em resolução 300 DPI.

### 4. Exportar o Notebook para PDF
```bash
uv run python export_pdf.py
```
Isso gera automaticamente dois PDFs de alta resolução em `pitch_analytics/`:
- `pitch_storytelling.pdf`: Versão completa técnica (código Python + outputs).
- `pitch_storytelling_executivo.pdf`: Versão executiva limpa para apresentação/banca (apenas narrativa, tabelas e gráficos, sem células de código e sem warnings).

