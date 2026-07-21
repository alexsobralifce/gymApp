ar# GymApp Agent Instruction & Documentation Guidelines (AGENTS.md)

Este arquivo serve como base de conhecimento para qualquer assistente de IA/LLM operando neste repositório. Resume arquitetura, regras de negócio, modelo de dados, casos de uso e padrões de código do ecossistema **GymApp**.

---

## 0. Instrução Obrigatória

**Antes de executar qualquer comando, ler todas as skills dentro de `.agent/skills/`.** Só prossiga com comandos ou edições após carregar e considerar o conteúdo dessas skills.

---

## 1. Visão Geral do Sistema

O **GymApp** é uma plataforma multi-tenant de gerenciamento de academias, acompanhamento de treinos e análise evolutiva baseada em dados científicos para alunos e professores, contando também com rede social fitness (Mural, Feed, Amizades e Clubes).

### Tech Stack
- **Estrutura**: Monorepo NPM (`workspaces: ["apps/*", "packages/*"]`)
- **Backend (`apps/api`)**: Fastify (TypeScript) + Prisma ORM + PostgreSQL + Redis & BullMQ (Workers de segundo plano)
- **Frontend (`apps/web`)**: React 19 (TypeScript) + Vite 8 + Tailwind CSS v4 + Zustand 5 + React Router 7 + Recharts
- **Mobile**: Estrutura preparada para Capacitor (dentro de `apps/web`)

### Origem dos Dados de Exercícios
- **963 exercícios** sincronizados do site https://www.gifdotreino.com
- Script `apps/api/prisma/sync-gifdotreino.ts` — crawla API paginada, baixa descrições PT, faz upsert no banco
- Executado automaticamente no startup do Railway via `apps/api/railway-start.sh`
- Cada exercício tem: nome PT, GIF animado, thumbnail, descrição completa, passos de execução, grupo muscular e equipamento inferidos

---

## 2. Modelo de Dados (Prisma Schema)

### Enums
```
Role:             ROOT | ACADEMIA | PROFESSOR | ALUNO
AcademiaStatus:   PENDENTE | ATIVO | REJEITADO
Sexo:             MASCULINO | FEMININO
VinculoStatus:    PENDENTE_ACADEMIA | PENDENTE_ROOT | ATIVO | REJEITADO | REMOVIDO
TreinoStatus:     CADASTRADO | ENVIADO | ACEITO | RECUSADO | EM_ABERTO | EM_EXECUCAO | CONCLUIDO
TreinoAtor:       ALUNO | PROFESSOR | ACADEMIA | SISTEMA
NotificacaoTipo:  PROFESSOR_ATRIBUIDO | NOVO_TREINO
FriendshipStatus: PENDENTE | ACEITO | BLOQUEADO
PostTipo:         TREINO_INICIADO | TREINO_CONCLUIDO | RECORDE_PESSOAL | BADGE_CONQUISTADO | DESAFIO_COMPLETO
Visibilidade:     AMIGOS | PUBLICO | PRIVADO
ClubTipo:         ACADEMIA | TEMATICO
```

### Usuario (`usuarios`)
`id (cuid), email (unique), senha_hash, nome, role, telefone?, foto_url?, ativo, expo_push_token?, web_push_subscription?, criado_em, atualizado_em`

### Academia (`academias`)
`id (cuid), usuario_id (unique FK), nome, cnpj (unique), status, max_professores (default 20), rejeitado_motivo?, criado_em, atualizado_em`

### Professor (`professores`)
`id (cuid), usuario_id (unique FK), cref?, criado_em, atualizado_em`

### Aluno (`alunos`)
`id (cuid), usuario_id (unique FK), professor_id?, academia_id?, data_nascimento?, peso_kg?, altura_cm?, sexo (Sexo?), objetivo_treino?, nivel_treino?, restricoes (String[]), visibilidade_padrao (Visibilidade), permite_busca_email (Boolean), consentiu_feed_social_em?, criado_em, atualizado_em`
- `professor_id = null` → modo autogestão (alunos vinculados a professores também podem criar treinos de autogestão)
- `academia_id = null` → aluno sem vínculo com academia
- `sexo` → MASCULINO ou FEMININO, cadastrado no wizard de onboarding
- `objetivo_treino` / `nivel_treino` / `restricoes` → preferências de treino para recomendação e substituição automática de exercícios na biblioteca de planos/IA

### ProfessorAcademia (`professor_academia`) — Vínculo M:N
`id (cuid), professor_id, academia_id, status, criado_em, atualizado_em`
- `@@unique([professor_id, academia_id])`
- Status: `PENDENTE_ACADEMIA → PENDENTE_ROOT → ATIVO | REJEITADO | REMOVIDO`

### Treino (`treinos`)
`id (cuid), aluno_id, nome, dias_semana (Int[]), status, is_template (Boolean, default false), avaliacao_dificuldade?, iniciado_em?, finalizado_em?, criado_em, atualizado_em`
- **is_template**: treino marcado como template reutilizável pelo professor (flag toggle, não afeta FK aluno_id)
- **Máquina de estados**: CADASTRADO → ENVIADO → ACEITO → EM_ABERTO → EM_EXECUCAO → CONCLUIDO
- Toda transição inválida → `InvalidStateTransitionError`
- `exercicios[]`, `historico[]`, `execucoes[]`

### TreinoHistorico (`treino_historico`)
`id (cuid), treino_id, status_anterior, status_novo, ator_id, ator_tipo, timestamp`

### Notificacao (`notificacoes`)
`id (cuid), aluno_id, tipo, mensagem, dados?, lida (default false), criado_em`

### Exercicio (`exercicios`)
`id (cuid), nome, maquina?, dica? (@db.Text), imagem_url?, gif_url?, descricao_pt? (@db.Text), passos_pt? (String[]), musculo_alvo?, musculos_secundarios? (String[]), nivel?, grupo_muscular?, equipamento?, criado_em, atualizado_em`
- 963 exercícios do GifDoTreino com GIFs, descrições PT completas e passos de execução
- **Sexo não é filtrado** — homens e mulheres veem os mesmos exercícios

### TreinoExercicio (`treino_exercicios`)
`id (cuid), treino_id, exercicio_id, ordem, series, repeticoes, carga_sugerida_kg?`
- `@@unique([treino_id, ordem])`

### ExecucaoExercicio (`execucao_exercicios`)
`id (cuid), treino_id, exercicio_id, serie_numero, repeticoes, carga_kg, registrado_em`

### MedidaCorporal (`medidas_corporais`)
`id (cuid), aluno_id, peso_kg?, altura_cm?, percentual_bf?, massa_magra_kg?, imc? (calculado), data, observacao?`

### CorrelacaoDesempenho (`correlacoes_desempenho`)
`id (cuid), aluno_id (unique FK), peso_volume_r?, bf_volume_r?, massa_magra_volume_r?, volume_semanal (Json), pontos (Json), calculado_em`

### Modelos Sociais (`social_*`)
- **SocialFriendship (`social_friendships`)**: `id, aluno_id, amigo_id, status (FriendshipStatus), criado_em` — `@@unique([aluno_id, amigo_id])`
- **SocialPost (`social_posts`)**: `id, aluno_id, treino_id?, clube_id?, autor_nome, autor_foto_url?, grupo_muscular_resumo?, academia_nome?, tipo (PostTipo), visibilidade (Visibilidade), midia_url?, curtidas_count, comentarios_count, criado_em`
- **SocialLike (`social_likes`)**: `id, post_id, aluno_id` — `@@unique([post_id, aluno_id])`
- **SocialComment (`social_comments`)**: `id, post_id, aluno_id, autor_nome, texto (VarChar 280), criado_em`
- **SocialClub (`social_clubs`)**: `id, academia_id? (unique), nome, tipo (ClubTipo), criado_em`
- **SocialClubMember (`social_club_members`)**: `id, clube_id, aluno_id, xp_semana, criado_em` — `@@unique([clube_id, aluno_id])`

### Modelos da Biblioteca de Planos (`planos_*`)
- **PlanoBiblioteca (`planos_biblioteca`)**: `id (cuid), codigo (unique), nome, descricao?, objetivo, nivel, sexo_alvo (MASCULINO|FEMININO|AMBOS), dias_por_semana, split_tipo, ativo, criado_em`
- **PlanoSessao (`plano_sessoes`)**: `id (cuid), plano_id, nome, dia_label, ordem`
- **PlanoSessaoExercicio (`plano_sessao_exercicios`)**: `id (cuid), sessao_id, exercicio_id, ordem, tipo, series, repeticoes_min, repeticoes_max, carga_sugerida_kg?, restricoes_incompativeis (String[]), alternativo_id?`

---

## 3. Regras de Negócio Detalhadas

### 3.1 Treino — Máquina de Estados & Execução

Estados: `CADASTRADO → ENVIADO → ACEITO → EM_ABERTO → EM_EXECUCAO → CONCLUIDO`

| De | Para | Ator | Condição |
|---|---|---|---|
| `CADASTRADO` | `ENVIADO` | `PROFESSOR`, `SISTEMA` | Professor envia ou migração automática |
| `CADASTRADO` | `ACEITO` | `ALUNO` | Autogestão apenas |
| `ENVIADO` | `ACEITO`, `RECUSADO` | `ALUNO` | Aluno responde |
| `ACEITO` | `EM_EXECUCAO`, `EM_ABERTO` | `ALUNO`, `SISTEMA` | Inicia ou worker marca pendente |
| `EM_ABERTO` | `EM_EXECUCAO` | `ALUNO` | Retoma treino |
| `EM_EXECUCAO` | `CONCLUIDO` | `ALUNO` | Finaliza |
| `CONCLUIDO` | `ACEITO` | `SISTEMA` | Reciclagem automática |

#### Validações e Retomada de Sessão de Treino (novo)
- Registro de séries via `POST /treinos/:id/execucoes` é estritamente restrito a treinos com `status = EM_EXECUCAO`.
- Retomada de sessão de treino e isolamento de execuções por sessão (`TreinoService` + `useTrainingStore`).
- Botão "Voltar" em `TreinoInicio` e modal de confirmação `ConfirmModal` (`z-40`) ao clicar em "Sair" em `TreinoExecucao`.
- Filtro de biblioteca de exercícios com mapeamento de aliases para equipamentos (`apps/web/src/lib/exerciseFilters.ts`).

#### Clonar Treino (T27-T31)
- `POST /treinos/:id/clonar` — clone para 1 aluno. Copia nome (sem sufixo), dias_semana, exercícios. Status `CADASTRADO`.
- Tenant check duplo: fonte e destino.
- Auto-envio após clone no frontend.

#### Clonar em Lote (novo)
- `POST /treinos/:id/clonar-lote` — clone para múltiplos alunos (`{ alunoIds: string[] }`)
- Mesma validação de tenant do clone simples. Cria 1 treino por aluno em transação.
- Auto-envio via `Promise.all(treinos.map(t => api.enviarTreino(t.id)))` no frontend.

#### Template de Treino (novo)
- `POST /treinos/:id/marcar-template` — toggle `is_template` (PROFESSOR/ACADEMIA)
- `GET /professores/templates` — lista treinos com `is_template = true` do professor
- Templates são treinos normais com flag — aluno_id original é irrelevante na clonagem
- CriarTreino.tsx: dropdown "Criar a partir de Template" pré-popula exercícios, séries e reps
- Treinos.tsx: badge "Template" + botão toggle + modal "Clonar em Lote" com multi-seleção de alunos

### 3.2 Aluno — Regras de Negócio

#### Perfil (A1-A4)
- `POST /alunos/perfil` — upsert. Campos: `dataNascimento`, `pesoKg`, `alturaCm`, `sexo` (MASCULINO|FEMININO)
- Cria `MedidaCorporal` automática se peso+altura fornecidos
- `GET /alunos/perfil` retorna perfil com professor, academia e sexo

#### Cadastro (A21-A25, novo)
- **Wizard de 3 passos**: Dados Básicos → Perfil Físico → Academia/Autogestão
- Passo 1: nome, email, senha, WhatsApp, role
- Passo 2: data nascimento, peso (20-500kg), altura (50-250cm), sexo — **validação inline com debounce 400ms**
- Passo 3: dropdown academias ativas + "Autogestão (sem academia)"
- Barra de progresso visual (`StepIndicator`) com 3 círculos numerados
- Pós-cadastro: redireciona para `/welcome`

#### Onboarding / Boas-Vindas (novo)
- Rota `/welcome` — tela standalone (sem AppShell)
- 3 cards explicativos: Aceitar/Criar Treino, Registrar Execução, Ver Evolução
- Card 1 adapta texto: "Aceitar Treino" (aluno com professor) vs "Criar Treino" (autogestão)
- Botão "Começar" + link "Pular"
- Controlado por localStorage (`gymapp_welcome_seen`) — exibido apenas no primeiro login

#### Coach Marks na Execução (novo)
- 3 tooltips sequenciais na primeira execução de treino:
  1. Timer: "O timer registra quanto tempo você leva. Toque para expandir."
  2. Série: "Preencha a carga e repetições. Toque em ✓ para confirmar."
  3. Finalizar: "Ao concluir todas as séries, finalize o treino aqui."
- Overlay semi-transparente, tooltip com seta, botão "Próximo"/"Entendi"
- Controlado por localStorage (`gymapp_first_workout_done`) — nunca repete

#### Empty States (novo)
- Componente `EmptyState` reutilizável: ícone, título, descrição, CTA opcional
- `MeusTreinos.tsx`: 2 cenários — autogestão ("Crie seu primeiro treino") vs com professor ("Nenhum treino ativo")
- Ilustração via emoji grande + texto contextual + CTA diferente por cenário

#### Dados do Aluno, Upload de Avatar & Gestão de Vínculos (novo)
- Rota `/dados` (`DadosAluno.tsx`) para alteração de dados pessoais (nome, telefone via `PATCH /auth/me`), upload de foto de perfil (`POST /auth/avatar`), dados físicos (data nascimento, peso, altura, sexo com recálculo visual de IMC via `POST /alunos/perfil`), troca/remoção de academia (`DELETE /alunos/academia`) e gestão de professor/autogestão (`PATCH /alunos/professor`).

#### Gestão Própria & Edição de Treinos pelo Aluno (novo)
- Aluno pode criar treinos próprios (`/treino/novo` via `CriarTreinoAluno.tsx` ou `POST /treinos/autogestao`) mesmo se tiver professor vinculado.
- Permite editar e excluir treinos que possui (`PATCH /treinos/:id` e `DELETE /treinos/:id`), inclusive aqueles recebidos de professores.
- Botão `+ Criar Treino` visível no cabeçalho de `MeusTreinos.tsx` para todos os alunos.

#### Conclusão em Lote por Exercício na Execução (novo)
- Botão "✓ Concluir Exercício" no rodapé do card de cada exercício em `TreinoExecucao.tsx`.
- Registra de uma só vez todas as séries pendentes do exercício enviando os valores informados nos inputs ou os valores padrão (carga sugerida / repetições do treino).
- Ocultado automaticamente quando todas as séries do exercício forem concluídas.

### 3.3 Módulo Social, Amizades e Mídia (novo)

#### Upload e Mídia de Fotos
- `POST /auth/avatar` — faz upload da imagem do usuário para `public/uploads/avatars/`.
- `GET /uploads/avatars/:filename` e `GET /uploads/feed/:year/:month/:filename` — rotas dedicadas para servir mídia com headers corretos e cache `public, max-age=86400`.
- URLs de imagem retornam caminho absoluto (`API_BASE_URL`). O helper `resolveMediaUrl()` em `src/lib/media.ts` normaliza e garante exibição correta no frontend.
- Fotos de perfil exibidas no Header (`AppShell`), menu do usuário, `DadosAluno`, `PostCard` e `AcademySidebar`.

#### Feed / Mural Social & Notificação de Atividades
- Notificação de novidades no menu Mural: endpoint `GET /social/mural/atividade` com polling de 30s exibe um indicador/badge colorido no menu quando há novos posts.
- Paginação do feed via cursor composto `data+id` com inclusão de posts próprios no feed do aluno.
- Notificação de treino concluído em `notify-friends.worker.ts` e `PostCard` desnormaliza o nome da academia ("concluiu o treino na XYZ").

#### Colegas da Academia (`AcademySidebar`)
- `GET /alunos/academia/colegas` — retorna lista de alunos da mesma academia que o aluno ainda não segue.
- `POST /social/amizades/solicitar-por-id` — permite seguir um colega diretamente por `alunoId`.
- Componente `AcademySidebar` exibido no painel direito fixo (`w-56`) em telas XL+ (`>=1280px`) ao lado do conteúdo principal e no drawer mobile.

### 3.4 Design System & Temas Dinâmicos (novo)

- **3 Temas de Cores Selecionáveis**:
  1. `Vermelho & Preto` (padrão)
  2. `Lima & Navy`
  3. `Violeta & Preto`
- Estado global gerenciado por `useThemeStore` (`src/stores/theme.ts`) e alterado dinamicamente via `AppShell.tsx`, persistido em `localStorage` (`gymapp_theme`).
- `src/index.css` configurado com variáveis CSS dinâmicas (`--color-primary`, `--color-primary-rgb`, `--color-primary-dark`, `--color-surface`, etc.), mantendo isolamento de temas para componentes, glassmorphism e gradientes.

---

## 4. Rotas da API (Fastify)

### Auth & Uploads (`/auth` & `/uploads`)
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/auth/register` | Criar usuário | - |
| POST | `/auth/login` | Login → tokens | - |
| POST | `/auth/refresh` | Renovar tokens | - |
| POST | `/auth/logout` | Invalidar refresh | auth |
| GET | `/auth/me` | Dados do usuário (inclui telefone e fotoUrl) | auth |
| PATCH | `/auth/me` | Atualizar nome, telefone, fotoUrl, push tokens | auth |
| POST | `/auth/avatar` | **Upload de foto de avatar** | auth |
| POST | `/auth/change-password` | Alterar senha | auth |
| GET | `/uploads/avatars/:filename` | **Servir foto de perfil (estático)** | - |
| GET | `/uploads/feed/*` | **Servir imagens do feed (estático)** | - |

### Aluno (`/alunos`) — role ALUNO
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/alunos/perfil` | Upsert perfil (dataNascimento?, pesoKg?, alturaCm?, sexo?) |
| GET | `/alunos/perfil` | Perfil com professor, academia, sexo e usuario (nome, email, telefone, fotoUrl) |
| GET | `/alunos/treinos` | Todos os treinos (sem filtro) |
| GET | `/alunos/treinos/historico-dias?mes=` | Calendário mensal |
| GET/POST/PATCH | `/alunos/medidas[/:id]` | CRUD medidas |
| GET/POST | `/alunos/correlacoes` | Cache + recálculo |
| PATCH | `/alunos/academia` | Vincular a academia |
| DELETE | `/alunos/academia` | Desvincular da academia atual |
| PATCH | `/alunos/professor` | Vincular ou desvincular (null) professor |
| GET | `/alunos/academia/colegas` | **Listar colegas da mesma academia** |
| GET/POST | `/alunos/notificacoes[/visualizar]` | Listar/marcar lidas |

### Social (`/social`)
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/social/mural` | Feed social paginado | auth |
| GET | `/social/mural/atividade` | **Verificar atividade recente no feed (badge)** | auth |
| POST | `/social/amizades/solicitar-por-id` | **Seguir colega por alunoId** | auth |

### Professor (`/professores`) — role PROFESSOR
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/professores/perfil` | Upsert perfil |
| POST/GET/DELETE | `/professores/vincular[/:academiaId]` | Vínculo academia |
| GET/DELETE | `/professores/vinculos[/:academiaId]` | Listar/remover vínculos |
| POST/GET | `/professores/alunos` | Vincular/listar alunos |
| GET | `/professores/dashboard` | Dashboard alunos + treinos |
| GET/POST | `/professores/fichas` | Listar/criar fichas em lote |
| GET | `/professores/exercicios` | Listar com filtros |
| GET | `/professores/templates` | Listar templates do professor |
| GET | `/professores/workoutx/exercicios` | Busca externa |
| GET | `/professores/alunos/:alunoId/correlacoes` | Correlações de aluno |

### Academia (`/academias`) — role ACADEMIA
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/academias` | Lista pública (ATIVO) |
| POST | `/academias` | Cadastrar |
| GET | `/academias/dashboard` | Dashboard |
| GET/POST/DELETE | `/academias/professores[/:id]` | Gestão professores |
| GET | `/academias/alunos` | Listar (?resumo=true) |
| PATCH | `/academias/alunos/:id/professor` | Atribuir professor |
| POST | `/academias/fichas` | Criar fichas |

### Treino (`/treinos`)
| Método | Rota | Descrição | Role |
|--------|------|-----------|------|
| POST | `/treinos` | Criar | PROFESSOR |
| POST | `/treinos/autogestao` | Criar (autogestão) | ALUNO |
| GET/POST | `/treinos/exercicios` | Listar/criar exercício | auth/PROFESSOR |
| POST | `/treinos/:id/enviar` | Enviar ao aluno | PROFESSOR |
| PATCH | `/treinos/:id/responder` | Aceitar/recusar | ALUNO |
| POST | `/treinos/:id/iniciar` | Iniciar | ALUNO |
| POST | `/treinos/:id/execucoes` | Registrar execução | ALUNO |
| POST | `/treinos/:id/finalizar` | Finalizar | ALUNO |
| GET | `/treinos/:id` | Detalhe | auth |
| PATCH | `/treinos/:id` | Editar | PROF / ACAD / ALUNO |
| DELETE | `/treinos/:id` | Remover | PROF / ACAD / ALUNO |
| POST | `/treinos/:id/clonar` | Clonar p/ 1 aluno | PROF/ACAD |
| POST | `/treinos/:id/clonar-lote` | Clonar p/ múltiplos alunos | PROF/ACAD |
| POST | `/treinos/:id/marcar-template` | Toggle is_template | PROF/ACAD |

---

## 5. Estrutura do Frontend (`apps/web/src`)

### Páginas por Role
| Role | Página | Rota | Arquivo |
|------|--------|------|---------|
| `*` | Login | `/login` | `pages/auth/Login.tsx` |
| `*` | Registro (wizard) | `/register` | `pages/auth/Register.tsx` → `RegisterWizard.tsx` |
| `*` | Alterar Senha | `/alterar-senha` | `pages/auth/AlterarSenha.tsx` |
| `ALUNO` | Boas-Vindas | `/welcome` | `pages/aluno/WelcomeCards.tsx` |
| `ALUNO` | Dashboard | `/` | `pages/aluno/Dashboard.tsx` |
| `ALUNO` | Meus Treinos | `/meus-treinos` | `pages/aluno/MeusTreinos.tsx` |
| `ALUNO` | Criar Treino Aluno | `/treino/novo` | `pages/aluno/CriarTreinoAluno.tsx` |
| `ALUNO` | Dados do Aluno | `/dados` | `pages/aluno/DadosAluno.tsx` |
| `ALUNO` | Início do Treino | `/treino/:id/inicio` | `pages/aluno/TreinoInicio.tsx` |
| `ALUNO` | Execução | `/treino/:id/execucao` | `pages/aluno/TreinoExecucao.tsx` |
| `ALUNO` | Conclusão | `/treino/:id/conclusao` | `pages/aluno/TreinoConclusao.tsx` |
| `ALUNO` | Medidas | `/medidas` | `pages/aluno/Medidas.tsx` |
| `ALUNO` | Evolução | `/evolucao` | `pages/aluno/Evolucao.tsx` |
| `PROFESSOR` | Dashboard | `/` | `pages/professor/Dashboard.tsx` |
| `PROFESSOR` | Treinos | `/treinos` | `pages/professor/Treinos.tsx` |
| `PROFESSOR` | Criar Treino | `/treinos/criar` | `pages/professor/CriarTreino.tsx` |
| `PROFESSOR` | Fichas | `/fichas` | `pages/professor/Fichas.tsx` |
| `PROFESSOR` | Criar Exercício | `/exercicios/criar` | `pages/professor/CriarExercicio.tsx` |
| `PROFESSOR` | Academias | `/academias` | `pages/professor/Academias.tsx` |
| `PROFESSOR` | Vincular Aluno | `/alunos/vincular` | `pages/professor/VincularAluno.tsx` |
| `PROFESSOR` | Correlações | `/alunos/:alunoId/correlacoes` | `pages/professor/AlunoCorrelacoes.tsx` |
| `ACADEMIA` | Dashboard | `/` | `pages/academia/Dashboard.tsx` |
| `ACADEMIA` | Professores | `/professores` | `pages/academia/Professores.tsx` |
| `ACADEMIA` | Alunos | `/alunos` | `pages/academia/Alunos.tsx` |
| `ACADEMIA` | Treinos | `/treinos` | `pages/academia/Treinos.tsx` |
| `ACADEMIA` | Criar Treino | `/treinos/criar` | `pages/academia/CriarTreinoAcademia.tsx` |
| `ROOT` | Painel/Vínculos/Usuários | `/`, `/vinculos`, `/usuarios` | `pages/root/` |

### Componentes Compartilhados
| Componente | Arquivo | Responsabilidade |
|------------|---------|-----------------|
| `AcademySidebar` | `components/social/AcademySidebar.tsx` | Lista de colegas de academia com botão Seguir |
| `PostCard` | `components/social/PostCard.tsx` | Card de postagem social com curtir, comentar e foto |
| `EmptyState` | `components/ui/EmptyState.tsx` | Estado vazio reutilizável: ícone, título, descrição, CTA |
| `CoachMark` | `components/ui/CoachMark.tsx` | Tooltips de onboarding: hook `useCoachMark` + overlay `CoachMarkOverlay` |
| `AppShell` | `components/layout/AppShell.tsx` | Layout com sidebar desktop, seletor de tema, drawer mobile e painel direito `AcademySidebar` |
| `Toast` | `components/ui/Toast.tsx` | Feedback de sucesso/erro |
| `ConfirmModal` | `components/ui/ConfirmModal.tsx` | Modal de confirmação |
| `StatusBadge` | `components/ui/StatusBadge.tsx` | Badge com 7 variantes + helpers |
| `LoadingSpinner` | `components/ui/LoadingSpinner.tsx` | Spinner + SkeletonCard + SkeletonText |
| `Icon` | `components/icons/Icon.tsx` | 20+ ícones SVG inline |

### Stores (Zustand)
| Store | Arquivo | Responsabilidade |
|-------|---------|-----------------|
| `useAuthStore` | `stores/auth.ts` | Auth: login, register, logout, fetchUser, avatar, push |
| `useTrainingStore` | `stores/training.ts` | Sessão de treino: iniciar, registrar, finalizar, timer |
| `useThemeStore` | `stores/theme.ts` | Tema visual: alternância entre 3 paletas de cores |

### Helpers & Utilities (`apps/web/src/lib`)
- `media.ts`: `resolveMediaUrl()` para formar URLs absolutas de uploads
- `exerciseFilters.ts`: Normalização e equivalência de aliases para filtros de equipamentos

---

## 6. Diretrizes e Padrões de Código

### Backend (`apps/api`)
1. TypeScript compilado para `dist` — nunca `tsc` em runtime
2. Prisma Client em `node_modules/@prisma/client`, schema em `apps/api/prisma/schema.prisma`
3. Erros: `AppError` + subclasses (`NotFoundError`, `ForbiddenError`, `TenantAccessError`, `ConflictError`, `InvalidStateTransitionError`)
4. Isolamento de tenant: toda query filtra por `professor_id`, `academia_id` ou `tenantId`
5. Autoresolução: `resolveProfessor()` e `resolveAluno()` com upsert
6. Race conditions: upsert ou try-catch P2002
7. Zod em todas as rotas para body/query/params
8. Uploads de imagem em `public/uploads/avatars` e `public/uploads/feed`, servidos via rotas dedicadas Fastify

### Frontend (`apps/web`)
1. API Client centralizado em `src/api/client.ts` com auto-refresh em 401
2. Zustand stores em `src/stores/`
3. Tipos em `src/types/api.ts`
4. TailwindCSS v4 com design system via variáveis CSS
5. React Router v7 com rotas aninhadas por role
6. `ConfirmModal` para ações destrutivas, `Toast` para feedback
7. `formatPhone()` para máscara de telefone
8. `StatusBadge` para badges de status
9. `SkeletonCard`/`SkeletonText` para loading
10. `Icon` para ícones SVG
11. `EmptyState` para estados vazios reutilizáveis
12. `CoachMark` para tooltips de onboarding (localStorage controla one-time)

### localStorage Keys
| Key | Uso |
|-----|-----|
| `gymapp_welcome_seen` | Tela de boas-vindas já foi exibida |
| `gymapp_first_workout_done` | Coach marks da execução já foram exibidos |
| `gymapp_theme` | Tema de cores selecionado (vermelho, lima, violeta) |

---

## 7. Scripts e Sincronização

### Sincronização de Exercícios (`sync-gifdotreino.ts`)
- Crawla `GET /search_gifs.php` (963 exercícios, 49 páginas)
- Baixa descrições de `GET /Descrição/{nome}.txt`
- Faz parsing HTML → texto limpo, extrai passos de execução
- Infere `grupo_muscular` (16 pastas mapeadas), `equipamento`, `musculo_alvo`
- Upsert por nome no banco
- Executa no startup Railway e sob demanda: `npx tsx apps/api/prisma/sync-gifdotreino.ts`

### Deploy (Railway)
- Push para `origin/main` aciona deploy automático
- `railway-start.sh`: cria diretórios de upload `uploads/avatars` e `uploads/feed` → build → migrate → sync-gifdotreino → start
- API: `https://api-production-3360.up.railway.app`
- Web: `https://web-production-c2d3c.up.railway.app`

---

## 8. Comandos Úteis

```bash
npm run dev:api                        # Backend dev
npm run dev:web                        # Frontend dev
npm run build                          # Build todos workspaces
npm run lint --workspace=apps/web      # Lint (oxlint)
npx prisma generate --schema=apps/api/prisma/schema.prisma
npx prisma migrate dev --name <nome> --schema=apps/api/prisma/schema.prisma
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
npx tsx apps/api/prisma/sync-gifdotreino.ts  # Sincronizar exercícios
```
