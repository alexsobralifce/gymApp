# Plano Mestre — Módulo Social (Fases 1 e 2)

**Data:** 2026-07-17
**Objetivo:** Implementar módulo social completo no GymApp (amizades, feed, privacidade, clubes, leaderboard) com desacoplamento total do core fitness via Event Bus + BullMQ idempotente.

---

## Arquitetura Geral

```
Core Fitness (Treino)           Módulo Social
┌─────────────────┐            ┌──────────────────────────┐
│ TreinoService    │──emit──→  │ EventBus (in-process)     │
│ (POST /iniciar,  │           │                           │
│  POST /finalizar)│           │ social-event-listeners    │
└─────────────────┘           │   ↓ enfileira job         │
                              │ BullMQ Queues:            │
                              │  ├─ socialFanoutQueue     │
                              │  ├─ socialNotifyQueue     │
                              │  ├─ socialLeaderboardQueue│
                              │  └─ socialBadgeQueue      │
                              │                           │
                              │ Workers:                  │
                              │  ├─ fanout-post (cria post)│
                              │  ├─ notify-friends        │
                              │  ├─ leaderboard (cron)    │
                              │  └─ award-badges          │
                              └──────────────────────────┘
```

**Princípio crítico:** Nenhuma falha no social pode afetar o fluxo do core fitness. O EventBus emite eventos em try-catch com log de warning no máximo. O BullMQ garante at-least-once delivery com jobId determinístico para idempotência.

---

## Dependências entre Prompts

| Prompt | Depende de | Descrição |
|--------|-----------|-----------|
| 1 | - | Schema + migrations (fundação) |
| 2 | 1 | Event Bus (desacoplamento) |
| 3 | 1, 2 | Filas BullMQ (idempotência) |
| 4 | 1 | Amizades (usa models do Prompt 1) |
| 5 | 1, 4 | Feed (usa friendships + posts) |
| 6 | 1 | Privacidade (usa campos do Prompt 1) |
| 7 | 1, 3 | Clubes + Leaderboard |

**Ordem de execução:** 1 → 2 → 3 → 4 → 5 → 6 → 7

---

## Estimativa por Prompt

| # | Nome | Arquivos | Esforço | Risco |
|---|------|----------|---------|-------|
| 1 | Schema + Migrations | `schema.prisma`, migration | 1h | Baixo — só adiciona tabelas |
| 2 | Event Bus | `event-bus.ts`, `social-event-listeners.ts`, `TreinoService.ts` | 1h | Médio — toca no core de treino |
| 3 | Filas BullMQ | `queues.ts`, 4 workers, `server.ts` | 2h | Alto — configuração de Redis/filas |
| 4 | Amizades | Routes + service + repository | 1h30 | Baixo — CRUD simples |
| 5 | Feed | Routes + cursor pagination + cache | 2h | Alto — performance/cache |
| 6 | Privacidade | Routes + RegisterWizard + config page | 1h30 | Baixo — UI + campos existentes |
| 7 | Clubes + Leaderboard | Hooks + workers cron + cache | 2h | Médio — workers cron |

**Total estimado:** ~11h

---

## Checklist de Execução (por prompt)

Cada prompt segue este ciclo:
1. Planejamento detalhado (documentar arquivos, decisões de design)
2. Implementação (criar/editar arquivos)
3. Build + typecheck (`npm run build`)
4. Testes manuais/unitários
5. Commit + push
6. Aguardar deploy Railway (`railway status` até Online)
7. Verificar logs (`railway logs --service api`)
8. ✅ Prompt concluído → próximo

---

## Resumo dos 7 Prompts

### Prompt 1 — Schema + Migrations
- 4 enums, 6 models (SocialFriendship, SocialPost, SocialLike, SocialComment, SocialClub, SocialClubMember)
- 3 novos campos em Aluno (visibilidadePadrao, permiteBuscaEmail, consentiuFeedSocialEm)
- Sem FK formal para tabelas fitness (referência lógica por String)
- **Meta:** `npx prisma migrate dev` + `prisma generate` sem erros

### Prompt 2 — Event Bus
- `apps/api/src/shared/events/event-bus.ts` — EventEmitter tipado
- Emitir `treino.iniciado` e `treino.concluido` após commit do TreinoService
- Try-catch na emissão (nunca afetar resposta HTTP)
- `social-event-listeners.ts` — escuta eventos e enfileira jobs
- Registro no bootstrap (`server.ts`)

### Prompt 3 — Filas BullMQ
- 4 filas: fanout, notify, leaderboard, badges
- jobId determinístico para idempotência
- Workers: fanout-post, notify-friends, award-badges
- Backoff exponencial (3 tentativas, 2s delay)
- Listener de `failed` para dead-letter log

### Prompt 4 — Amizades
- POST /social/amizades/solicitar (por email, anti-enumeração)
- PATCH /social/amizades/:id/responder
- GET /social/amizades (lista ACEITAS, sem email)
- DELETE /social/amizades/:id
- Cache Redis `social:friends:{alunoId}`

### Prompt 5 — Feed
- GET /social/mural (cursor pagination, cache Redis 5min)
- POST/DELETE /social/mural/:postId/curtir (contador atômico)
- POST /social/mural/:postId/comentar
- GET /social/mural/:postId/comentarios

### Prompt 6 — Privacidade
- PATCH /alunos/privacidade (visibilidadePadrao, permiteBuscaEmail)
- GET /alunos/privacidade
- Checkbox consentimento no RegisterWizard
- Tela /configuracoes/privacidade no frontend

### Prompt 7 — Clubes + Leaderboard
- Auto-criar clube ao aprovar academia
- Auto-vincular aluno ao clube da academia
- Worker cron leaderboard (15min)
- GET /social/clubes/:id/leaderboard (cache Redis)
- Reset xpSemana domingo meia-noite
