# Plano — Root Master: CRUD completo + Social + Tabelas paginadas

## Diagnostico

| Aspecto | Situacao Atual |
|---------|---------------|
| **Root CRUD** | Read/Update/Delete existe. **Create nao existe.** |
| **Tabelas** | 5 endpoints `GET` listam TUDO sem paginacao, busca, filtro ou ordenacao |
| **Enable/Disable** | So academia tem toggle de status. Professor e Aluno nao tem. |
| **Social** | Root tem **zero** acesso. Todas as rotas sociais exigem `Role.ALUNO`. |
| **Frontend** | 3 paginas (Painel, Vinculos, Usuarios). Sem paginacao, busca, create ou social. |

---

## 1. Backend — Novos Endpoints e Ajustes

### 1.1 Paginacao, busca e ordenacao em todas as listas

Adicionar query params padrao a **todos** os `GET /root/*`:

```
?page=1&limit=20&search=&sortBy=nome&order=asc
```

**Response padrao:**

```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

**Endpoints afetados (5):**

| Endpoint | Busca por | Sort por |
|----------|-----------|----------|
| `GET /root/usuarios` | nome, email | nome, email, role, criado_em |
| `GET /root/academias` | nome, cnpj, email | nome, status, criado_em |
| `GET /root/professores` | nome, email, cref | nome, email, criado_em |
| `GET /root/alunos` | nome, email | nome, email, criado_em |
| `GET /root/vinculos` | nome professor, nome academia | criado_em, status |

### 1.2 Habilitar/Desabilitar usuario (toggle)

Adicionar a **todos** os perfis (nao so academia):

| Endpoint | Descricao |
|----------|-----------|
| `PATCH /root/academias/:id/status` | Ja existe — ATIVO/REJEITADO |
| `PATCH /root/professores/:id/status` | **Novo** — ATIVO/INATIVO (soft disable) |
| `PATCH /root/alunos/:id/status` | **Novo** — ATIVO/INATIVO (soft disable) |

Adicionar campo `status` (enum: `ATIVO`, `INATIVO`) ao modelo `Professor` e `Aluno` no Prisma schema.

### 1.3 CREATE endpoints

| Endpoint | Descricao |
|----------|-----------|
| `POST /root/academias` | Criar academia com usuario ACADEMIA automatico |
| `POST /root/professores` | Criar professor com usuario PROFESSOR automatico |
| `POST /root/alunos` | Criar aluno com usuario ALUNO automatico |

### 1.4 Social — Acesso do Root

Criar rotas de moderacao social acessiveis ao ROOT:

| Endpoint | Descricao |
|----------|-----------|
| `GET /root/social/mural` | Feed com paginacao — ve TODOS os posts (ignora visibilidade) |
| `DELETE /root/social/posts/:id` | Remover post inapropriado |
| `DELETE /root/social/comments/:id` | Remover comentario inapropriado |
| `GET /root/social/clubes` | Listar todos os clubes com contagem de membros |
| `GET /root/social/clubes/:id/mural` | Posts de um clube especifico |

### 1.5 Dashboard enriquecido

| Endpoint | Descricao |
|----------|-----------|
| `PATCH /root/painel` | Adicionar metricas: totalPosts, totalAmizades, totalClubes, academiasAtivas, usuariosAtivos |

---

## 2. Modelo de Dados (Schema)

### 2.1 Adicionar status a Professor e Aluno

```prisma
model Professor {
  // ... existing fields ...
  status String @default("ATIVO") // ATIVO | INATIVO
}

model Aluno {
  // ... existing fields ...
  status String @default("ATIVO") // ATIVO | INATIVO
}
```

---

## 3. Frontend — Novas Paginas e Componentes

### 3.1 Componentes reutilizaveis

| Componente | Descricao |
|-----------|-----------|
| `DataTable.tsx` | Tabela com paginacao, busca, ordenacao, loading skeleton |
| `SearchInput.tsx` | Campo de busca com debounce 300ms e icone de lupa |
| `Pagination.tsx` | Controles: anterior, proximo, numeros de pagina, "X de Y resultados" |
| `StatusToggle.tsx` | Switch toggle para habilitar/desabilitar com ConfirmModal |

### 3.2 Pagina Root Usuarios (`/usuarios`) — Refatorar

**3 abas mantidas: Academias | Professores | Alunos**

Adicionar a cada aba:
- **SearchInput** no topo (busca por nome/email/CNPJ)
- **Dropdown de ordenacao** (Nome A-Z, Nome Z-A, Mais recente, Mais antigo)
- **DataTable** com paginacao (20 por pagina)
- **Botao "+ Criar"** no canto superior direito
- **StatusToggle** em cada linha (habilitar/desabilitar)
- Botoes Editar / Excluir mantidos
- **Loading skeleton** (SkeletonCard) durante carregamento

**Modal de Criacao** (novo):
- `CreateAcademiaModal` — nome, CNPJ, email, senha, max_professores
- `CreateProfessorModal` — nome, email, senha, CREF, academias (multi-select)
- `CreateAlunoModal` — nome, email, senha, telefone, peso, altura, data nascimento, sexo, academia, professor

### 3.3 Nova Pagina: Root Social (`/social`)

Aba unica ou pagina com 2 secoes:

**Secao 1 — Mural Global:**
- Feed com paginacao mostrando TODOS os posts
- Filtro por tipo (TREINO_INICIADO, TREINO_CONCLUIDO, etc.)
- Cada post mostra: autor, tipo, data, curtidas, comentarios
- Botao "Excluir post" com ConfirmModal

**Secao 2 — Clubes:**
- Lista de todos os clubes com nome, academia, total membros
- Clique em um clube abre modal com:
  - Posts daquele clube (paginado)
  - Leaderboard do clube

### 3.4 Atualizar Rotas (`App.tsx`)

```tsx
{user?.role === 'ROOT' && (
  <Route element={<AppShell />}>
    <Route index element={<RootPainel />} />
    <Route path="vinculos" element={<RootVinculos />} />
    <Route path="usuarios" element={<RootUsuarios />} />
    <Route path="social" element={<RootSocial />} />  {/* NOVA */}
    <Route path="*" element={<Navigate to="/" />} />
  </Route>
)}
```

### 3.5 Atualizar Navegacao (`AppShell.tsx`)

Adicionar ao `getNavItems('ROOT')`:
```tsx
{ to: '/social', label: 'Social', icon: <MessageCircleIcon /> },
```

---

## 4. Prioridade de Execucao (4 fases)

### Fase 1 — Backend: Toggle Status + Paginacao (2h)
- Adicionar `status` ao schema Professor/Aluno + migration
- Refatorar 5 endpoints GET com paginacao/busca/ordenacao
- Criar 2 novos endpoints `PATCH .../status`
- Testar com seed

### Fase 2 — Backend: CREATE + Social Root (1h30)
- Criar 3 endpoints POST (academias, professores, alunos)
- Criar 5 endpoints sociais para Root
- Adicionar metricas sociais ao GET /root/painel

### Fase 3 — Frontend: Tabelas refatoradas (2h)
- Criar DataTable, SearchInput, Pagination, StatusToggle
- Refatorar RootUsuarios com paginacao/busca/ordenacao/create
- Atualizar RootPainel com metricas enriquecidas
- Atualizar RootVinculos com paginacao

### Fase 4 — Frontend: Social Root (1h)
- Criar pagina RootSocial com mural global e clubes
- Adicionar rota e navegacao
- Conectar API client com novos endpoints

---

## 5. Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `apps/api/prisma/schema.prisma` | Adicionar `status` a Professor e Aluno |
| `apps/api/prisma/migrations/` | Nova migration |
| `apps/api/src/presentation/http/routes/root.routes.ts` | +8 endpoints, +5 refatorados |
| `apps/api/src/modules/social/` | Novas rotas de moderacao social |
| `apps/web/src/types/api.ts` | Novos tipos (paginated response, create payloads) |
| `apps/web/src/api/client.ts` | +12 novos metodos |
| `apps/web/src/components/ui/DataTable.tsx` | **Novo** |
| `apps/web/src/components/ui/Pagination.tsx` | **Novo** |
| `apps/web/src/components/ui/SearchInput.tsx` | **Novo** |
| `apps/web/src/components/ui/StatusToggle.tsx` | **Novo** |
| `apps/web/src/pages/root/Usuarios.tsx` | Refatorado (paginacao, busca, create) |
| `apps/web/src/pages/root/Painel.tsx` | Atualizado (metricas sociais) |
| `apps/web/src/pages/root/Vinculos.tsx` | Atualizado (paginacao) |
| `apps/web/src/pages/root/Social.tsx` | **Novo** |
| `apps/web/src/App.tsx` | +1 rota |
| `apps/web/src/components/layout/AppShell.tsx` | +1 item nav |

**Total: 6 arquivos novos, 10 modificados. ~6h30 de trabalho.**
