# Plano — Frontend da Rede Social GymApp

## Objetivo

Construir a interface visual completa da rede social do GymApp, consumindo os endpoints ja implementados no backend. O frontend atual tem **zero** codigo social — e necessario criar API client, tipos, icones, paginas e componentes do zero.

---

## 1. O que ja existe (backend)

| Recurso | Endpoint | Status |
|---------|----------|--------|
| Feed/Mural | `GET /social/mural` (cursor pagination) | Pronto |
| Curtir post | `POST /social/mural/:id/curtir` | Pronto |
| Descurtir | `DELETE /social/mural/:id/curtir` | Pronto |
| Comentar | `POST /social/mural/:id/comentar` | Pronto |
| Ver comentarios | `GET /social/mural/:id/comentarios` | Pronto |
| Solicitar amizade | `POST /social/amizades/solicitar` | Pronto |
| Responder amizade | `PATCH /social/amizades/:id/responder` | Pronto |
| Listar amigos | `GET /social/amizades` | Pronto |
| Desfazer amizade | `DELETE /social/amizades/:id` | Pronto |
| Privacidade | `GET/PATCH /alunos/privacidade` | Pronto |
| Detalhe do clube | `GET /social/clubes/:id` | Pronto |
| Leaderboard | `GET /social/clubes/:id/leaderboard` | Pronto |

---

## 2. O que precisa ser criado

### 2.1 API Client (`src/api/client.ts`)

Adicionar metodos:

```ts
// Feed
getMural: (cursor?: string, limit?: number) =>
  api.get('/social/mural', { params: { cursor, limit } }),

// Posts
curtirPost: (postId: string) => api.post(`/social/mural/${postId}/curtir`),
descurtirPost: (postId: string) => api.delete(`/social/mural/${postId}/curtir`),
comentarPost: (postId: string, texto: string) => api.post(`/social/mural/${postId}/comentar`, { texto }),
getComentarios: (postId: string, cursor?: string, limit?: number) =>
  api.get(`/social/mural/${postId}/comentarios`, { params: { cursor, limit } }),

// Amizades
solicitarAmizade: (email: string) => api.post('/social/amizades/solicitar', { email }),
responderAmizade: (id: string, acao: 'ACEITAR' | 'RECUSAR') => api.patch(`/social/amizades/${id}/responder`, { acao }),
getAmizades: () => api.get('/social/amizades'),
desfazerAmizade: (id: string) => api.delete(`/social/amizades/${id}`),

// Privacidade
getPrivacidade: () => api.get('/alunos/privacidade'),
updatePrivacidade: (data: { visibilidadePadrao?: string; permiteBuscaEmail?: boolean }) =>
  api.patch('/alunos/privacidade', data),

// Clubes
getClube: (id: string) => api.get(`/social/clubes/${id}`),
getLeaderboard: (id: string) => api.get(`/social/clubes/${id}/leaderboard`),
```

### 2.2 Tipos (`src/types/api.ts`)

Adicionar:

```ts
type PostTipo = 'TREINO_INICIADO' | 'TREINO_CONCLUIDO' | 'RECORDE_PESSOAL' | 'BADGE_CONQUISTADO' | 'DESAFIO_COMPLETO'
type Visibilidade = 'AMIGOS' | 'PUBLICO' | 'PRIVADO'
type FriendshipStatus = 'PENDENTE' | 'ACEITO' | 'BLOQUEADO'

interface SocialPost {
  id: string
  alunoId: string
  treinoId?: string
  clubeId?: string
  autorNome: string
  autorFotoUrl?: string
  grupoMuscularResumo?: string
  tipo: PostTipo
  visibilidade: Visibilidade
  midiaUrl?: string
  curtidasCount: number
  comentariosCount: number
  criadoEm: string
  curtiu?: boolean  // adicionado pelo frontend
}

interface SocialComment {
  id: string
  postId: string
  alunoId: string
  autorNome: string
  texto: string
  criadoEm: string
}

interface MuralResponse {
  items: SocialPost[]
  nextCursor: string | null
}

interface Amizade {
  id: string
  nome: string
  fotoUrl?: string
}

interface AmizadePendente extends Amizade {
  status: FriendshipStatus
  solicitante: boolean  // true = eu solicitei, false = me solicitaram
}

interface PrivacidadeSettings {
  visibilidadePadrao: Visibilidade
  permiteBuscaEmail: boolean
  consentiuFeedSocialEm?: string
}

interface Clube {
  id: string
  nome: string
  tipo: 'ACADEMIA' | 'TEMATICO'
  totalMembros: number
}

interface LeaderboardEntry {
  alunoId: string
  nome: string
  fotoUrl?: string
  xpSemana: number
}
```

### 2.3 Icones (`src/components/icons/Icon.tsx`)

Adicionar 5 icones SVG:

| Icone | Uso |
|-------|-----|
| `HeartIcon` | Botao curtir, contador de curtidas |
| `MessageCircleIcon` | Botao comentar, contador de comentarios |
| `ShareIcon` | (futuro) compartilhar |
| `UserSearchIcon` | Buscar amigos por email |
| `ShieldIcon` | Configuracoes de privacidade |

### 2.4 Componentes

#### `PostCard.tsx`
- Card com cabecalho (foto + nome do autor + tempo relativo + badge do tipo)
- Tipo de post com icone e cor:
  - `TREINO_INICIADO` → icone play + text-accent
  - `TREINO_CONCLUIDO` → icone check + text-success
  - `RECORDE_PESSOAL` → icone trophy + text-primary
  - `BADGE_CONQUISTADO` → icone award + text-accent
- Grupo muscular resumo (se existir)
- Link para o treino (se `treinoId` existir)
- Rodape: botao curtir (com contador e estado ativo), botao comentar (com contador)
- Lista de comentarios expansivel (via sub-componente)
- Animacao de fade-in ao scroll

#### `CommentList.tsx`
- Lista de comentarios com paginacao "Ver mais"
- Cada comentario: nome do autor + texto + tempo relativo
- Campo de input para novo comentario (max 280 chars, botao enviar)
- Loading skeleton enquanto carrega

#### `FriendCard.tsx`
- Avatar circular com iniciais
- Nome do amigo
- Botao "Desfazer amizade" (com ConfirmModal)
- Usado na lista de amigos

#### `FriendRequestCard.tsx`
- Mostra se foi voce que solicitou ou se recebeu
- Botoes: Aceitar / Recusar (se recebida)
- Badge "Pendente" se foi voce que enviou

#### `AddFriendModal.tsx`
- Modal com campo de email
- Botao "Solicitar Amizade"
- Feedback de envio (sempre retorna "solicitacao enviada")

### 2.5 Paginas

#### `pages/aluno/Mural.tsx` — rota `/mural`
- **Feed infinito** com scroll (cursor pagination)
- Cada post renderizado via `PostCard`
- Intersection Observer para carregar mais posts ao chegar no final
- EmptyState quando nao ha posts ("Siga amigos para ver o feed")
- Pull-to-refresh (opcional mobile)
- Barra superior: titulo "Mural" + botao "Amigos" (link para `/amizades`)

#### `pages/aluno/Amizades.tsx` — rota `/amizades`
- **Abas**: "Amigos" (lista) | "Solicitacoes" (pendentes) | "Adicionar" (busca por email)
- Aba Amigos: lista de `FriendCard` com busca local
- Aba Solicitacoes: `FriendRequestCard` com botoes aceitar/recusar
- Aba Adicionar: input email + botao enviar
- Contador de solicitacoes pendentes na aba

#### `pages/aluno/Privacidade.tsx` — rota `/privacidade`
- Radio buttons: visibilidade padrao (AMIGOS | PUBLICO | PRIVADO)
- Toggle: permitir busca por email
- Explicacao de cada opcao
- Botao salvar com feedback Toast

#### `pages/aluno/Clubes.tsx` — rota `/clubes`
- Card do clube da academia do aluno (se vinculado)
- Leaderboard semanal: top 20 com posicao, nome, foto, XP
- Badge "Voce" destacando a posicao do aluno logado

### 2.6 Rotas (`App.tsx`)

Adicionar dentro do bloco `ALUNO`, dentro do `<Route element={<AppShell />}>`:

```tsx
<Route path="mural" element={<AlunoMural />} />
<Route path="amizades" element={<AlunoAmizades />} />
<Route path="privacidade" element={<AlunoPrivacidade />} />
<Route path="clubes" element={<AlunoClubes />} />
```

### 2.7 Navegacao (`AppShell.tsx`)

**Bottom tabs mobile (ALUNO):**
- Inicio, Treinos, **Mural**, Evolucao

**Sidebar desktop (ALUNO) — `getNavItems`:**
```tsx
{ to: '/mural', icon: <MessageCircleIcon />, label: 'Mural' },
{ to: '/amizades', icon: <UserSearchIcon />, label: 'Amigos' },
```

**Dropdown perfil:** adicionar link "Privacidade" → `/privacidade`

---

## 3. Ordem de Implementacao (5 passos)

### Passo 1 — Base (API + Tipos + Icones)
- Adicionar metodos no `api/client.ts`
- Adicionar tipos no `types/api.ts`
- Adicionar 5 icones no `Icon.tsx`
- **Estimativa**: 30 min

### Passo 2 — Feed/Mural (`/mural`)
- Criar `PostCard.tsx`, `CommentList.tsx`
- Criar `pages/aluno/Mural.tsx` com scroll infinito
- Registrar rota e navegacao
- **Estimativa**: 1h30

### Passo 3 — Amizades (`/amizades`)
- Criar `FriendCard.tsx`, `FriendRequestCard.tsx`, `AddFriendModal.tsx`
- Criar `pages/aluno/Amizades.tsx` com 3 abas
- Registrar rota e navegacao
- **Estimativa**: 1h

### Passo 4 — Privacidade + Clubes
- Criar `pages/aluno/Privacidade.tsx`
- Criar `pages/aluno/Clubes.tsx`
- Registrar rotas
- **Estimativa**: 45 min

### Passo 5 — Ajustes finais
- Badge de notificacao no icone do Mural (solicitacoes pendentes)
- Contador de solicitacoes no menu
- Testes de integracao com os seeds do Railway
- **Estimativa**: 30 min

---

## 4. Design Visual (paleta GymApp)

| Elemento | Cor |
|----------|-----|
| Card de post | `bg-surface-card`, borda `border-surface-input` |
| Post hover | `border-primary/20` |
| Botao curtir ativo | `text-primary` |
| Botao comentar | `text-text-muted`, hover `text-text` |
| Badge TREINO_INICIADO | `text-accent` (gold) |
| Badge TREINO_CONCLUIDO | `text-success` (green) |
| Badge BADGE_CONQUISTADO | `text-accent` |
| Badge RECORDE_PESSOAL | `text-primary` (red) |
| Avatar fallback | `gradient-primary` com iniciais brancas |
| Botao aceitar amizade | `bg-success`, texto `text-white` |
| Botao recusar | `border border-primary/20`, texto `text-primary-light` |
| Input comentario | `bg-surface-input`, focus `border-primary` |
| Skeleton loading | `SkeletonCard` existente |
| Leaderboard top 3 | `text-accent` (ouro), `text-text-muted` (prata), `text-primary-light` (bronze) |

---

## 5. Estados e Edge Cases

| Estado | Tratamento |
|--------|-----------|
| Feed vazio (sem amigos/posts) | `EmptyState` com icone de feed + "Siga amigos para ver o feed" + CTA "Encontrar Amigos" |
| Nenhum amigo | `EmptyState` com "Voce ainda nao tem amigos. Encontre pessoas pelo email." |
| Nenhuma solicitacao pendente | Texto "Nenhuma solicitacao pendente" |
| Comentario vazio | Placeholder "Escreva um comentario..." + botao desabilitado ate ter texto |
| Erro de rede | Toast de erro + botao "Tentar novamente" |
| Loading inicial | `SkeletonCard` (3-4 skeletons) |
| Loading mais posts | Spinner no final da lista |
| Post PRIVADO | Nao aparece no feed (filtrado pelo backend) |
| Amizade duplicada | Backend retorna P2002 → ignorado silenciosamente |

---

## 6. Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/api/client.ts` | Adicionar 12 metodos |
| `src/types/api.ts` | Adicionar 10 interfaces |
| `src/components/icons/Icon.tsx` | Adicionar 5 icones SVG |
| `src/components/social/PostCard.tsx` | **Criar** |
| `src/components/social/CommentList.tsx` | **Criar** |
| `src/components/social/FriendCard.tsx` | **Criar** |
| `src/components/social/FriendRequestCard.tsx` | **Criar** |
| `src/components/social/AddFriendModal.tsx` | **Criar** |
| `src/pages/aluno/Mural.tsx` | **Criar** |
| `src/pages/aluno/Amizades.tsx` | **Criar** |
| `src/pages/aluno/Privacidade.tsx` | **Criar** |
| `src/pages/aluno/Clubes.tsx` | **Criar** |
| `src/App.tsx` | Adicionar 4 rotas + imports |
| `src/components/layout/AppShell.tsx` | Adicionar itens de navegacao |

**Total: 8 arquivos novos, 4 modificados**

---

## 7. Payload de Props dos Componentes

### PostCard
```ts
interface PostCardProps {
  post: SocialPost
  onCurtir: (postId: string) => void
  onDescurtir: (postId: string) => void
  onComentar: (postId: string, texto: string) => Promise<void>
  onCarregarComentarios: (postId: string, cursor?: string) => Promise<{ items: SocialComment[]; nextCursor: string | null }>
}
```

### CommentList
```ts
interface CommentListProps {
  postId: string
  comentariosIniciais: SocialComment[]
  totalComentarios: number
  onCarregar: (postId: string, cursor?: string) => Promise<{ items: SocialComment[]; nextCursor: string | null }>
  onComentar: (postId: string, texto: string) => Promise<void>
}
```

### FriendCard
```ts
interface FriendCardProps {
  amigo: Amizade
  onDesfazer: (id: string) => void
}
```

### FriendRequestCard
```ts
interface FriendRequestCardProps {
  amizade: AmizadePendente
  onResponder: (id: string, acao: 'ACEITAR' | 'RECUSAR') => void
}
```

### AddFriendModal
```ts
interface AddFriendModalProps {
  isOpen: boolean
  onClose: () => void
  onSolicitar: (email: string) => Promise<void>
}
```

---

*Plano gerado em 17/07/2026. Backend social 100% implementado, frontend a construir.*
