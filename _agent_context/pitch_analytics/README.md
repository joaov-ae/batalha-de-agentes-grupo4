# Central de Contexto: Pitch Analytics & Storytelling

Este diretório documenta a estratégia quantitativa, storytelling em 6 atos e artefatos de dados para a apresentação da banca avaliadora do Itaú (Hackathon Batalha de Agentes - Grupo 4).

---

## 🎯 Objetivos de Negócio

1. **Narrativa Incontestável**: Provar quantitativamente que a inadimplência no cheque especial é um processo contínuo de erosão silenciosa (90 dias) e não um choque de renda repentino.
2. **Janela de Ouro**: Demonstrar que existe uma janela de 45 a 60 dias para intervir antes da entrada no limite da conta.
3. **Efeito Catraca Sem Volta**: Mostrar que 97,7% dos clientes no "Buraco" não saem espontaneamente e afundam de -R$ 1,3k para -R$ 5,1k em 7 meses.
4. **Intervenção em 1 Toque**: Validar que intervenções leves (reagendar Pix, corte de assinaturas duplicadas) revertem o saldo de negativo para positivo.
5. **Business Case para o Itaú**: Explicar por que o banco se beneficia evitando o juro de cheque especial (redução drástica de PDD, retenção de LTV e principalidade da conta corrente).

---

## 📂 Artefatos Gerados

- **`pitch_analytics/pitch_storytelling.ipynb`**: Notebook pré-executado com análise estatística completa.
- **`pitch_analytics/pitch_storytelling.pdf`**: Exportação em alta resolução completa (código + saídas visuais).
- **`pitch_analytics/pitch_storytelling_executivo.pdf`**: Versão executiva limpa (apenas narrativa, tabelas e gráficos, sem código).
- **`pitch_analytics/charts/`**: 8 gráficos executivos a 300 DPI na identidade visual do Itaú.
- **`pitch_analytics/export_pdf.py`**: Script reprodutível de exportação para PDF via Chromium headless.
- **`pitch_analytics/export_charts.py`**: Script de geração dos gráficos.
- **`pitch_analytics/data/`**: Caches Parquet para permitir execução e validação offline.
