---
description: Inicia o workflow deepwork (orquestração com Oracle, Designer, Librarian e Fixer) para uma solicitação de implementação.
agent: build
---

Ative o workflow de orquestração (skill deepwork) para o pedido a seguir.

$ARGUMENTS

Siga exatamente o fluxo: plano de fases registrado em `.slim/deepwork/`, gates Oracle após cada fase, Designer para mudanças visuais, Librarian para fatos, Fixer para remedições, e validação final (build + testes) antes do resumo.