# Sessão 2026-09-27 — Integração do Juiz de Tom no Guardrails

## Pedido
Integrar o classificador de tom ao guardrails como validador de saída antes do envio da resposta ao usuário, garantindo que caiba no orçamento de latência síncrona.

## Decisões Técnicas
- **One-shot puro via Vertex AI**: Em vez de invocar o wrapper do Agent Engine ADK (cuja latência gira em torno de 2,4–2,8 s, excedendo o timeout síncrono de 1.200 ms), o `guardrails` utiliza um prompt one-shot direto com `gemini-2.5-flash-lite`, alcançando ~850–1.050 ms.
- **Fail-open seguro**: Caso a chamada ultrapasse o `timeout_semantico_ms` (1.200 ms) ou sofra falha de rede/API, o motor adota fail-open (`degradado=true`), preservando a disponibilidade do serviço.
- **Regra S10**: Adicionado código `S10` (`tom_inadequado`) ao catálogo de saída com decisão `reescrever` e severidade `media`.
- **Aquecimento prévio**: TLS e auth no Vertex AI foram incluídos na rotina `_aquecer()` no startup da aplicação FastAPI para eliminar o overhead de cold start (~1,5 s).
- **Endpoint dedicado de auditoria**: Criado `POST /v1/auditoria/tom` para permitir avaliações diretas e isoladas de tom por outros componentes ou testes.

## Resultados e Benchmark
- **Latência média (warm)**: ~850–1.050 ms no Vertex AI `us-central1`.
- **Teste com tom alarmista/hostil**: Reprovado com sucesso, gerando `S10`, `decisao='reescrever'` e justificativa em ~1.050 ms.
- **Teste com tom empático/acolhedor**: Aprovado com sucesso, `permitido=True` em ~920 ms.
- **Suíte de testes**: 73 testes passando com 100% de cobertura dos cenários de saída e integração.
