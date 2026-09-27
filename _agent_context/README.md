# Repositório de Contexto para Agentes (`_agent_context`)

Esta pasta é destinada a centralizar e organizar documentos, anotações de sessões, especificações de escopo, regras de negócio e referências arquiteturais para que os agentes possam consultá-los e utilizá-los como contexto durante as tarefas.

## Estrutura

Os arquivos são organizados em subpastas correspondentes a cada serviço ou frente do projeto:

* **`data_manager/`**: Documentações, escopos e anotações de sessão referentes ao serviço de dados (`data_manager`).
* **`guardrails/`**: Documentações, testes de latência e anotações do serviço de Guardrails (`guardrails`).
* **`itau_app/`**: Decisões e anotações de sessão do front end da demo (`itau_app`, Cloud Run `itau-app`).
* **`pitch_analytics/`**: Storytelling de dados em 6 atos, gráficos executivos e exportações para o pitch (`pitch_analytics`).
* *(Novas pastas de outros serviços devem ser adicionadas aqui conforme forem criados).*

## Como Usar com o Agente

* **Mencione arquivos diretamente**: No chat do Antigravity, utilize `@` para referenciar arquivos específicos desta pasta (ex: `@_agent_context/data_manager/Escopo — Agente Otimizador.md`).
* **Instrução direta**: Solicite ao agente que leia os documentos de contexto relevantes antes de propor soluções arquiteturais ou implementar novos endpoints.
