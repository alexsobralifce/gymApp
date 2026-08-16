# Better Harness — Relatório do GymApp (ENDORFINAPP)

> Gerado em: 2026-08-06 · Ferramenta: better-harness 0.5.0 (standalone CLI) · Escopo: repositório `gymApp`
> Modo: análise estática + evidência de sessão da orquestração. Sessões de agentes não são lidas (sem host plugin — rota `static-fallback` / `session-limited`).

## Resumo executivo

O harness do GymApp está **adequado na camada de contexto e execução** (AGENTS.md completo, scripts de build/test, workers BullMQ) e **frágil nas camadas de validação e entrega** (poucos testes, nenhum teste de frontend para componentes novos, sem verificação automática pré-deploy). Durante esta sessão de trabalho observamos 2 bugs de produção corrigidos (logout por corrida de refresh, overlay travado de coach marks) — o que indica **lacunas de validação que deixaram defeitos chegarem a produção**.

Fatos de evidência coletados pelo CLI:

| Dimensão | Evidência observada | Status |
|---|---|---|
| Task Understanding | 1 arquivo de instruções (AGENTS.md), 2 arquivos de arquitetura/readme | Adequado |
| Controlled Execution | 4 manifests, scripts run/build/test, 7 roots descobertos (5 habilitados) | Adequado |
| Change Validation | 10 arquivos de teste, 1 script de check, lint oxlint | **Insuficiente** |
| Reliable Delivery | 0 sinais observados (sem CI declarado no escopo analisado) | **Não observado** |
| Learning Capture | 0 episódios de sessão, 0 skills reutilizáveis detectadas no projeto | **Não observado** |

Evidências adicionais do CLI:
- **234 arquivos fonte** (135 tsx + 97 ts + 2 js), **10 arquivos de teste** (todos em `apps/api`/web test)
- **Worktree: 27 arquivos alterados, diff `critical`** (mudanças desta sessão ainda em andamento no fluxo de push/deploy)
- **4 candidatos de co-mudança fonte/teste** nos últimos 200 commits; 2 com correlação de caminho (ex.: `AppShell.tsx` ↔ `theme.test.ts`)
- **Escaneamento de config sensível: parcial** (17/18 arquivos, 1 pulado)
- **Testes backend: 45 passam, 4 pulados, 1 falha** (`VincularProfessor.test.ts` — timeout por Redis ausente no ambiente local, não é falha de código)

---

## Achados priorizados

### F1 — Cobertura de testes de frontend ~zero (Alto impacto)

**Impacto**: 2 bugs de produção em uma única sessão (logout por corrida de refresh token; overlay de coach marks re-exibido por observer vazando). Ambos eram regressões lógicas facilmente capturáveis por teste unitário. Componentes novos (`IncompleteWorkoutBanner`, `useIncompleteWorkoutReminder`, fluxo de permissão push, single-flight de refresh) não têm teste.

**Resultado esperado**: defeitos de lógica de estado (refresh, observers, máquinas de estado) são capturados antes do deploy, não por usuário em produção.

**Ação com escopo**:
1. Adicionar testes unitários para o single-flight do `refreshTokens()` em `apps/web/src/api/client.ts` (vitest + happy-dom já presente).
2. Testar `useCoachMark`/`useIncompleteWorkoutReminder` (observer desconectado após dismiss; debounce de 8s).
3. Testar `useNotifications` (não pede permissão no mount; `activatePush` só no gesto).

**Critérios de aceite**: `npm run test --workspace=apps/web` cobre pelo menos os 3 fluxos acima com `pass`; nenhuma regressão nos testes existentes.

---

### F2 — Nenhuma verificação obrigatória pré-deploy (Alto impacto)

**Impacto**: o push para `main` aciona deploy automático no Railway sem gate de testes/lint/build local. Um push quebrado derruba produção silenciosamente. É o que permitiu os bugs de sessão chegarem ao ar.

**Resultado esperado**: 0 deploys com teste quebrado.

**Ação com escopo**:
1. Criar script raiz `npm run verify` = `build (api+web) + lint + test (api+web)`.
2. Adicionar pre-push hook (ou etapa no Railway) que roda `verify`; falha bloqueia o push.

**Critérios de aceite**: `npm run verify` passa de ponta a ponta localmente; um push com teste quebrado é rejeitado (hook) ou o deploy falha visivelmente antes de servir tráfego.

---

### F3 — Falha de teste conhecida e não tratada no ambiente (Médio impacto)

**Impacto**: `VincularProfessor.test.ts` falha por Redis ausente, tornando o resultado de `npm test` ambíguo (1 vermelho = sinal de alerta permanente). Mascara regressões reais.

**Resultado esperado**: suíte de teste verde e determinística.

**Ação com escopo**:
1. Documentar e padronizar Redis local (ou `docker compose up -d redis` no repo).
2. Marcar o teste como `describe.skipIf` quando Redis não disponível, ou iniciar Redis no `pretest`.

**Critérios de aceite**: `npm run test --workspace=apps/api` termina **sem falhas** em ambiente sem Redis (skip explícito, não timeout).

---

### F4 — Config sensível com cobertura parcial e segredo exposto (Médio impacto)

**Impacto**: o escaneamento achou 17/18 arquivos (1 pulado). Em produção, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` não foram confirmados como configurados — causou (e possivelmente ainda causa) silêncio total de push. Adicionalmente, a chave de API do OpenRouter está em texto plano em `~/.config/opencode/opencode.json`.

**Resultado esperado**: nenhuma chave secreta em arquivos versionados/compartilhados; env do Railway verificado.

**Ação com escopo**:
1. Confirmar no Railway: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` na API; `VITE_VAPID_PUBLIC_KEY` no web.
2. Adicionar os 3 testes de integração de push no worker (scan → ocioso → envio) com env fake.
3. Revisar o arquivo de config global do OpenCode para não versionar/chavear a API key (usar env var).

**Critérios de aceite**: push de treino ocioso confirmado de ponta a ponta (log `[WebPush] Enviando para endpoint` no Railway); API key removida de arquivo de config.

---

### F5 — Sessão e aprendizado não capturados (Médio impacto, estrutural)

**Impacto**: o CLI reporta 0 sessões analisadas, 0 skills reutilizáveis no projeto, 0 episódios de aprendizado. Sem captura, padrões repetidos (ex.: "deslogou", "push não chegou") reaparecem em cada sessão.

**Resultado esperado**: decisões repetidas viram ativos reutilizáveis; a equipe mede melhoria.

**Ação com escopo**:
1. Registrar o comando `/better-harness` como o gatilho padrão de review pós-sessão significativa.
2. Adicionar skill de "debug de push" e "debug de sessão" no `.opencode/skills/` do projeto (temos a receita pronta desta sessão: card de permissão → single-flight → logs `[Push]`).

**Critérios de aceite**: 2 skills reutilizáveis no projeto; `/better-harness` roda sem `session-limited` (evidência de sessão disponível).

---

## Lacunas de evidência (explicitamente não observado)

- **Sessões de agentes**: rota `static-fallback` — o CLI não lê transcrições do OpenCode (sem plugin host). Nenhuma alegação de comportamento de sessão foi inferida; os insights vêm do trabalho real desta sessão.
- **Reliable Delivery**: 0 sinais de CI no escopo analisado — o deploy é Railway-only, sem pipeline declarado no repo.
- **Learning Capture**: `not-evaluable-missing-normalized-events` — não há episódios capturados para avaliar rotas de aprendizado.
- **Validação pós-edição**: não observada em sessões (não há sessões analisadas) — mitigado manualmente nesta sessão com build/lint/test a cada mudança.
- **Config sensível**: 1 arquivo candidato não escaneado (17/18).

## Próximos passos verificáveis

1. **Imediato**: verificar as 3 vars VAPID no Railway (API) e `VITE_VAPID_PUBLIC_KEY` (web) — desbloqueia push de ponta a ponta.
2. **Curto prazo**: `npm run verify` + pre-push hook (F2); testar single-flight e hooks (F1).
3. **Médio prazo**: Redis determinístico nos testes (F3); confirmar env de produção sem segredos (F4).
4. **Contínuo**: rodar `/better-harness` após sessões com mudanças estruturais e registrar as 2 skills de debug (F5).

---

*Relatório baseado em evidência coletada pelo better-harness CLI + observações diretas da sessão de orquestração. Achados de sessão são derivados de trabalho real executado, não de transcrições (indisponíveis sem host plugin).*
