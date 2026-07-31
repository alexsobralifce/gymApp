# Planejamento: Mural pós-treino, Avatar e Documentação de Uso

## Contexto

Três frentes solicitadas pelo usuário:

1. **Mural não atualiza após cada treino** — debug e correção.
2. **Foto de perfil não aparece no avatar do Dashboard** — correção.
3. **Menu de documentação** — explicar ao usuário onde alterar dados, cadastrar treinos, encontrar amigos por email (mural) e, para o perfil Professor, montar/enviar treino ao aluno. Incluir a sequência no menu.

---

## 1. Mural pós-treino — Diagnóstico (concluído)

### Fluxo atual
`POST /treinos/:id/finalizar` (`treino.routes.ts:180`)
→ `finalizarTreino()` recicla o treino `CONCLUIDO → ACEITO` mantendo o **mesmo `treino_id`**
→ `eventBus.emit('treino.concluido')` (`treino.routes.ts:188`)
→ listener `social-event-listeners.ts:22` enfileira `social-fanout` com `jobId: fanout:{treinoId}:concluido`
→ worker `fanout-post.worker.ts` faz `upsert` em `social_posts` na chave unique `(treino_id, aluno_id, tipo)`.

### Causa raiz
- Migration `20260728010000_add_social_post_unique` criou **unique partial index** `(treino_id, aluno_id, tipo)`.
- Como o treino é **reciclado** (mesmo id), a segunda conclusão do mesmo treino faz o `upsert` **atualizar o post antigo** (mesmo `criado_em`), em vez de criar um novo.
- Resultado: mural não mostra os treinos de hoje para quem já tinha treinado naquele mesmo treino antes.
- O `jobId` fixo (`fanout:{treinoId}:concluido`) também impede o re-enfileiramento enquanto o job antigo ainda existe no Redis.

### Correção planejada
1. **Migration nova** removendo o unique index `social_posts_treino_id_aluno_id_tipo_key`.
2. **Worker**: substituir `upsert` por `create` (um post novo por conclusão), mantendo a soma de `criado_em` correta.
3. **jobId único por sessão**: incluir `timestamp` no jobId (`fanout:{treinoId}:{timestamp}:concluido`) para permitir novo job a cada sessão.
4. **Backfill**: script `prisma/backfill-mural.ts` que identifica treinos concluídos hoje (via `treino_historico` com `status_novo=CONCLUIDO` e `timestamp` de hoje) sem post correspondente, e cria os posts faltantes — mantendo visibilidade/privacidade.

### Verificação
- `npx tsx apps/api/prisma/backfill-mural.ts --dry-run` lista o que seria criado.
- Execução real cria posts para treinos de hoje sem post.
- Teste unitário do fluxo de criação de post (worker).

---

## 2. Avatar no Dashboard — Diagnóstico (concluído)

- `pages/aluno/Dashboard.tsx` Hero Card (linhas ~163-170) sempre renderiza `getInitials(user.nome)` em um div `gradient-primary`.
- **Não** usa `user.fotoUrl`/`resolveMediaUrl`.
- `UserAvatar` no AppShell **já** trata foto — apenas o Dashboard não.

### Correção
- No Hero Card: se `user.fotoUrl` existir, renderizar `<img>` com `resolveMediaUrl(user.fotoUrl)`, senão initials.

---

## 3. Menu de Documentação

### Página
- Nova rota `/documentacao` (todas as roles) com conteúdo por papel (Aluno / Professor / Academia / Root).
- Conteúdo: onde alterar dados, cadastrar treinos, encontrar amigos por email, montar/enviar treino (Professor), e sequência recomendada no menu.

### Navegação
- Item "Documentação" adicionado em `getNavItems` para todas as roles em `AppShell.tsx`.
- Ícone `BookOpenIcon` (já importado).

### Docs em /docs
- `docs/planning/documentacao-uso-menu.md` — planejamento detalhado desta entrega.
- Atualização de `docs/FUNCIONALIDADES.md` e `docs/user-guide.md` com o novo item de menu.

---

## Ordem de execução

1. Migration (drop unique) + schema.
2. Worker fanout: create + jobId por sessão.
3. Backfill script.
4. Avatar Dashboard.
5. Página de documentação + rotas + menu.
6. Docs /docs + AGENTS.md.
7. Testes (vitest + build) + push Railway.
