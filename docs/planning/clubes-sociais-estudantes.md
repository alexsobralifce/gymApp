# Plano: Clubes de Alunos — Criação, Seguimento e Feed Social

## Objetivo

Permitir que alunos criem clubes sociais dentro da plataforma, convidem amigos (ou colegas de academia), sigam-se mutuamente e vejam as postagens de cada membro no feed do clube — incluindo fotos, comentários e conquistas.

---

## 1. Diagnóstico: O Que Já Existe

### Infraestrutura Social Existente
| Componente | Status |
|---|---|
| `SocialClub` (modelo) | ✅ Tipo `ACADEMIA` (1:1 com academia) e `TEMATICO` |
| `SocialClubMember` (modelo) | ✅ Membro com `xp_semana`, `xp_reset_ano` |
| `SocialClub` rotas GET | ✅ `/social/clubes/:id`, `/social/clubes/:id/leaderboard` |
| Criação de clube (Root) | ✅ `POST /root/social/clubes` |
| Amizades (seguir/deixar de seguir) | ✅ Solicitação por email ou ID, aceite/recusa |
| Feed/Mural com posts, curtidas, comentários | ✅ Paginação cursor, polling 30s |
| Upload de foto no post | ✅ `POST /social/upload/foto`, `PATCH /social/mural/:postId/foto` |
| Fanout automático de treinos | ✅ Worker `social-fanout` cria posts de treino |
| Notificações push de atividade | ✅ Worker `social-notify` envia push para amigos |
| `AcademySidebar` (colegas da academia) | ✅ Painel lateral + drawer mobile |

### Gaps Identificados
| Gap | Impacto |
|---|---|
| ❌ Aluno não pode criar clubes | Clubes limitados a academias ou Root |
| ❌ Sem rota de convite para clube | Não há como entrar em clube temático |
| ❌ Feed não filtra por clube | Posts do clube se misturam no mural geral |
| ❌ Sem "feed do clube" no frontend | Não há página para ver só posts do clube |
| ❌ Dashboard não promove clubes | Aluno não é incentivado a criar/entrar em clubes |

---

## 2. Escopo da Feature

### 2.1 Backend — Novas Rotas

#### Clubes (`/social/clubes`)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/social/clubes` | Criar clube temático | ALUNO |
| `POST` | `/social/clubes/:id/entrar` | Entrar em clube público | ALUNO |
| `POST` | `/social/clubes/:id/sair` | Sair de um clube | ALUNO (membro) |
| `GET` | `/social/clubes` | Listar clubes públicos + meus clubes | ALUNO |
| `GET` | `/social/clubes/:id/mural` | Feed de posts do clube (cursor) | ALUNO (membro) |
| `GET` | `/social/clubes/:id/membros` | Listar membros do clube | ALUNO |

#### Detalhamento das Rotas

**POST `/social/clubes`** — Criar clube temático
```json
Request: { "nome": "string", "descricao?": "string" }
Response: { "id": "cuid", "nome": "string", "tipo": "TEMATICO", "codigoConvite": "string" }
```
- Cria clube com `tipo = TEMATICO`
- Gera `codigoConvite` único de 6 caracteres (ex: "ABC123")
- Criador vira membro automaticamente (`SocialClubMember`)
- Máximo de **5 clubes criados por aluno** (anti-spam)

**POST `/social/clubes/:id/entrar`**
```json
Request: { "codigoConvite?": "string" }
```
- Se clube for público (sem código), entra direto
- Se clube for privado, precisa do `codigoConvite`

**GET `/social/clubes`** — Listar clubes
```json
Response: {
  "meus": [ { clube com role "CRIADOR" | "MEMBRO" } ],
  "disponiveis": [ { clubes públicos que não sou membro } ]
}
```

**GET `/social/clubes/:id/mural`** — Feed do clube
- Mesma estrutura do `GET /social/mural` mas filtrando por `clube_id`
- Retorna posts de treino, badges e posts manuais dos membros
- Visibilidade: só membros do clube veem

**GET `/social/clubes/:id/membros`** — Lista de membros
```json
Response: [ { "id", "nome", "fotoUrl", "xpSemana", "role": "CRIADOR" | "MEMBRO" } ]
```

### 2.2 Backend — Novas Funcionalidades

#### Modelo: Role de Membro do Clube
Adicionar campo `role` a `SocialClubMember`:
```prisma
enum ClubMemberRole { CRIADOR MEMBRO }
model SocialClubMember {
  // ...existing fields...
  role ClubMemberRole @default(MEMBRO)
}
```

#### Modelo: Código de Convite
Adicionar ao `SocialClub`:
```prisma
model SocialClub {
  // ...existing fields...
  codigo_convite String? @unique
  descricao String?
}
```

#### Worker: Fanout para Clubes
No worker `fanout-post.worker.ts`, quando um post de treino for criado:
- Verificar se o aluno é membro de clubes
- Se sim, criar também uma cópia do post com `clube_id` para cada clube
- Ou: criar um post único com array de `clube_ids` (requer modelo junction)

#### Modelo Alternativo: Post Multi-Clube
Para não duplicar posts, criar tabela junction:
```prisma
model SocialPostClub {
  post_id String
  clube_id String
  @@id([post_id, clube_id])
}
```

### 2.3 Frontend — Novas Páginas

#### Página: Meus Clubes (`/clubes`)
- **Tela remodelada** (substituir a atual `Clubes.tsx`)
- Abas: "Meus Clubes" | "Descobrir" | "Criar Clube"
- Cada clube mostra: nome, descrição, total de membros, seu rank
- Botão "Sair" se for membro, "Entrar" se não for

#### Modal: Criar Clube
- Nome (obrigatório)
- Descrição (opcional)
- Tipo: Público (entrada livre) ou Privado (código de convite)
- Botão "Criar Clube" → redireciona para página do clube

#### Página: Feed do Clube (`/clubes/:id`)
- Header do clube: nome, descrição, código de convite (se for criador), total de membros
- Botão "Compartilhar Código" (copia código para área de transferência)
- **Feed de posts** igual ao Mural, mas filtrando só posts do clube
- Botão "Membros" → bottom sheet/overlay com lista de membros
- Botão "Sair do Clube" com confirmação

#### Componente: MembroCard
- Foto, nome, XP semanal, badge de criador
- Botão "Seguir" (se não for amigo ainda)
- Usa a rota `POST /social/amizades/solicitar-por-id`

### 2.4 Dashboard — Seção de Marketing Mobile

Adicionar ao `Dashboard.tsx` uma seção de **"Comunidade"** ou **"Clubes"** com:

```
┌─────────────────────────────┐
│  🤝 Sua Comunidade          │
│                             │
│  ┌───────┐ ┌───────┐       │
│  │ 👥    │ │ 🏆    │       │
│  │ Amigos│ │Clubes │       │
│  │ 12    │ │ 2     │       │
│  └───────┘ └───────┘       │
│                             │
│  ┌─ Feed Recente ─────────┐ │
│  │ 🏋️ João iniciou treino │ │
│  │ 💪 Maria bateu recorde │ │
│  └────────────────────────┘ │
│                             │
│  [Ver Mural →]              │
│  [Ver Clubes →]             │
└─────────────────────────────┘
```

**Cards de Ação no Dashboard:**
1. **Card "Amigos"** — contagem de amigos, link para Amizades
2. **Card "Clubes"** — contagem de clubes que participa, link para Clubes
3. **Card "Mural"** — preview com últimos 2 posts do feed, link para Mural
4. **Card "Convidar"** — "Convide amigos para treinar com você!" com input de email e botão "Convidar"

### 2.5 Fluxo Mobile Completo

**Descoberta:**
1. Aluno abre Dashboard → vê seção "Sua Comunidade"
2. Clica em "Clubes" → vê aba "Descobrir" com clubes públicos
3. Entra em clube de interesse com 1 clique

**Criação:**
1. Aluno clica "Criar Clube"
2. Preenche nome e descrição
3. Define como público ou privado
4. Pronto! Já pode convidar amigos compartilhando o código

**Feed do Clube:**
1. Posts de treino dos membros aparecem automaticamente
2. Membros podem postar fotos (via `POST /social/upload/foto`)
3. Curtidas e comentários funcionam igual ao Mural
4. Badges de conquista dos membros também aparecem

---

## 3. Priorização por MVP

### Fase 1 — Core (Prioridade Alta)
| Item | Esforço | Dependência |
|------|---------|-------------|
| Backend: POST /social/clubes | Médio | Prisma migration |
| Backend: POST /social/clubes/:id/entrar | Pequeno | Fase 1 |
| Backend: GET /social/clubes | Médio | Fase 1 |
| Frontend: Modal "Criar Clube" | Médio | Fase 1 |
| Frontend: Página "Meus Clubes" remodelada | Médio | Fase 1 |
| Frontend: Seção "Comunidade" no Dashboard | Médio | — |

### Fase 2 — Feed do Clube (Prioridade Média)
| Item | Esforço | Dependência |
|------|---------|-------------|
| Backend: GET /social/clubes/:id/mural | Médio | Fase 1 |
| Backend: POST /social/clubes/:id/sair | Pequeno | Fase 1 |
| Backend: Fanout para clubes no worker | Médio | Fase 1 |
| Frontend: Página Feed do Clube | Grande | Fase 2 |
| Modelo junction SocialPostClub | Pequeno | Fase 2 |

### Fase 3 — Membros e Gamificação (Prioridade Baixa)
| Item | Esforço | Dependência |
|------|---------|-------------|
| Backend: GET /social/clubes/:id/membros | Pequeno | Fase 1 |
| Frontend: Lista de membros com seguir | Médio | Fase 3 |
| XP do clube no leaderboard | Pequeno | — |
| Badge "Membro do Clube" | Pequeno | — |

---

## 4. Regras de Negócio

1. **Limite de criação**: Máximo 5 clubes criados por aluno (evita spam)
2. **Privacidade**: Clubes públicos podem ser descobertos por qualquer aluno. Clubes privados exigem código de convite
3. **Código de convite**: Gerado automaticamente na criação. Apenas o criador pode regenerar
4. **Entrada automática**: Alunos vinculados a academias entram automaticamente no clube da academia (comportamento existente)
5. **Visibilidade de posts**: Posts no feed do clube são visíveis apenas para membros do clube
6. **Moderação**: Criador do clube pode remover membros. Root pode remover qualquer clube (já existe via `/root/social/clubes`)
7. **Notificações**: Quando um membro posta no clube, push notification para os outros membros (reutilizar worker `social-notify`)
8. **XP**: Atualização de XP do clube via worker `social-leaderboard` (já existe)

---

## 5. Migração de Dados (Prisma)

```prisma
// Adições ao schema existente

enum ClubMemberRole {
  CRIADOR
  MEMBRO
}

model SocialClub {
  // ...campos existentes...
  codigo_convite String? @unique
  descricao      String?
}

model SocialClubMember {
  // ...campos existentes...
  role ClubMemberRole @default(MEMBRO)
}

model SocialPostClub {
  post_id  String
  clube_id String
  post     SocialPost @relation(fields: [post_id], references: [id], onDelete: Cascade)
  clube    SocialClub @relation(fields: [clube_id], references: [id], onDelete: Cascade)

  @@id([post_id, clube_id])
  @@map("social_post_clubes")
}
```

---

## 6. Sugestão de Copy para o Dashboard Mobile

**Título da Seção:** "Sua Comunidade"

**Cards:**
```
👥 Amigos · 12 amigos
   "Treine junto, evolua junto"

🏆 Clubes · 2 clubes
   "Entre em clubes e compita no ranking"

📸 Mural
   [Preview do último post]
   "Veja o que seus amigos estão fazendo"
```

**CTA / Empty State (se não tiver amigos):**
```
🤝 Nenhum amigo ainda?
Convide seus amigos da academia para treinar com você!
[Convidar por Email] [Ver Alunos da Academia]
```

**CTA / Empty State (se não tiver clubes):**
```
🏆 Nenhum clube ainda?
Crie um clube com seus amigos ou entre em um clube público!
[Criar Clube] [Descobrir Clubes]
```

---

## 7. Resumo de Arquivos a Modificar/Criar

### Backend
| Arquivo | Ação |
|---------|------|
| `prisma/schema.prisma` | Adicionar `codigo_convite`, `descricao`, `role` em ClubMember, `SocialPostClub` |
| `src/modules/social/clubs/club.routes.ts` | Adicionar POST criar, POST entrar, POST sair, GET listar, GET mural, GET membros |
| `src/modules/social/clubs/club.service.ts` | **NOVO** — Lógica de criação, validação de limite, código de convite |
| `src/jobs/social/fanout-post.worker.ts` | Adicionar fanout para clubes |
| `src/presentation/http/routes/root.routes.ts` | Já existe moderação de clubes via Root |

### Frontend
| Arquivo | Ação |
|---------|------|
| `pages/aluno/Clubes.tsx` | Reescrever com abas Meus Clubes, Descobrir, Criar |
| `pages/aluno/ClubeFeed.tsx` | **NOVO** — Feed do clube |
| `components/social/ClubeCard.tsx` | **NOVO** — Card de clube na listagem |
| `components/social/CriarClubeModal.tsx` | **NOVO** — Modal/modal sheet de criação |
| `components/social/MembrosSheet.tsx` | **NOVO** — Bottom sheet de membros |
| `pages/aluno/Dashboard.tsx` | Adicionar seção "Sua Comunidade" |
| `components/layout/AppShell.tsx` | Adicionar badge de atividade nos clubes |
| `api/client.ts` | Adicionar métodos de clube |
| `types/api.ts` | Adicionar tipos de clube |
| `App.tsx` | Adicionar rota `/clubes/:id` |

---

## 8. Considerações de UX Mobile

- **Bottom sheets** para criar clube e ver membros (consistente com o padrão existente de `moreSheetOpen` e `colegasSheetOpen`)
- **Animação** de confetes ao criar clube com sucesso
- **Código de convite** com botão "Copiar" que usa `navigator.clipboard.writeText()`
- **Toast** de feedback para ações (entrar, sair, convidar)
- **Skeleton** loading para feed do clube
- **Pull-to-refresh** no feed do clube
- **Badge** de atividade no ícone Clubes da navbar

---

## 9. Estimativa de Esforço

| Fase | Tamanho | Dias Estimados |
|------|---------|----------------|
| Fase 1 — Core | 5-7 arquivos | 2-3 dias |
| Fase 2 — Feed do Clube | 4-6 arquivos | 2-3 dias |
| Fase 3 — Membros | 3-4 arquivos | 1-2 dias |
| **Total** | **12-17 arquivos** | **5-8 dias** |

---

*Documento gerado em 30/07/2026. Baseado no estado atual do sistema descrito em `AGENTS.md`.*
