# Diretrizes para Agentes de IA (`AGENTS.md`)

Este arquivo define os padrões de comportamento, comunicação e arquitetura para qualquer agente (incluindo o Antigravity) atuando neste repositório.

---

## 1. Comunicação, Transparência e Responsividade

Para garantir uma colaboração eficiente e evitar execuções em "caixa preta":

1. **Raciocínio Aberto e Visível**:
   * Sempre explique seu raciocínio e intenção no **corpo da resposta em texto visível**, e não apenas em pensamentos internos ocultos.
   * Ao planejar uma intervenção, explique brevemente *o que* pretende fazer e *por que*.

2. **Evite Ações Longas e Silenciosas (Loops Ocultos)**:
   * Em vez de executar dezenas de ferramentas silenciosamente antes de responder, divida tarefas maiores em etapas ou marcos lógicos.
   * Em tarefas de arquitetura, refatoração ampla ou decisões ambíguas: **pare, apresente a proposta e peça confirmação do usuário** antes de aplicar alterações extensas.

3. **Feedback Pós-Ação Detalhado**:
   * Após concluir modificações ou execuções, resuma claramente:
     - Quais arquivos foram alterados (sempre usando links markdown `file://`).
     - Quais testes ou verificações foram executados.
     - Próximos passos recomendados ou pontos de atenção.

---

## 2. Contexto do Repositório e Documentação (`_agent_context/`)

1. **Central de Contexto**:
   * O diretório `_agent_context/` contém documentos de escopo, regras de negócio, registros de sessões e especificações técnicas de cada serviço (ex: `_agent_context/data_manager/`).
   * Antes de propor ou implementar mudanças estruturais em um serviço, consulte os arquivos correspondentes em `_agent_context/` para manter a consistência com os acordos e decisões anteriores.

2. **Organização Multisserviço**:
   * Cada serviço do **Grupo 4** fica encapsulado em sua própria pasta raiz (ex: `data_manager/`).
   * Não misture dependências, testes ou arquivos de configuração entre serviços distintos.

---

## 3. Práticas Técnicas

* **Links Clicáveis**: Sempre crie links markdown no formato `[arquivo](file:///caminho/absoluto)` para arquivos e símbolos referenciados.
* **Testes e Validação**: Sempre valide alterações rodando a suíte de testes do serviço afetado antes de finalizar a resposta.
* **Preservação de Código**: Mantenha comentários existentes, docstrings e contratos de API que não estejam no escopo explícito da modificação.
