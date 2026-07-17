# GymApp Agent Instruction & Documentation Guidelines (AGENTS.md)

Este arquivo serve como base de conhecimento para qualquer assistente de IA/LLM operando neste repositório. Resume arquitetura, regras de negócio, modelo de dados, casos de uso e padrões de código do ecossistema **GymApp**.

---

## 1. Visão Geral do Sistema

O **GymApp** é uma plataforma multi-tenant de gerenciamento de academias, acompanhamento de treinos e análise evolutiva baseada em dados científicos para alunos e professores.

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
Role:       ROOT | ACADEMIA | PROFESSOR | ALUNO
AcademiaStatus: PENDENTE | ATIVO | REJEITADO
Sexo:       MASCULINO | FEMININO
VinculoStatus: PENDENTE_ACADEMIA | PENDENTE_ROOT | ATIVO | REJEITADO | REMOVIDO
TreinoStatus: CADASTRADO | ENVIADO | ACEITO | RECUSADO | EM_ABERTO | EM_EXECUCAO | CONCLUIDO
TreinoAtor:  ALUNO | PROFESSOR | ACADEMIA | SISTEMA
NotificacaoTipo: PROFESSOR_ATRIBUIDO | NOVO_TREINO
```

### Usuario (`usuarios`)
`id (cuid), email (unique), senha_hash, nome, role, telefone?, foto_url?, expo_push_token?, web_push_subscription?, criado_em, atualizado_em`

### Academia (`academias`)
`id (cuid), usuario_id (unique FK), nome, cnpj (unique), status, max_professores (default 20), rejeitado_motivo?, criado_em, atualizado_em`

### Professor (`professores`)
`id (cuid), usuario_id (unique FK), cref?, criado_em, atualizado_em`

### Aluno (`alunos`)
`id (cuid), usuario_id (unique FK), professor_id?, academia_id?, data_nascimento?, peso_kg?, altura_cm?, sexo (Sexo?), criado_em, atualizado_em`
- `professor_id = null` → modo autogestão
- `academia_id = null` → aluno sem vínculo com academia
- `sexo` → MASCULINO ou FEMININO, cadastrado no wizard de onboarding

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
`id (cuid), nome, grupo_muscular?, equipamento?, nivel?, imagem_url?, gif_url?, dica? (@db.Text), musculo_alvo?, musculos_secundarios? (String[]), passos_pt? (String[]), descricao_pt? (@db.Text), criado_em, atualizado_em`
- 963 exercícios do GifDoTreino com GIFs, descrições PT completas e passos de execução
- **Sexo não é filtrado** — homens e mulheres veem os mesmos exercícios

### TreinoExercicio
`id (cuid), treino_id, exercicio_id, ordem, series, repeticoes, carga_sugerida_kg?`
- `@@unique([treino_id, ordem])`

### ExecucaoExercicio
`id (cuid), treino_id, exercicio_id, serie_numero, repeticoes, carga_kg, registrado_em`

### MedidaCorporal (`medidas_corporais`)
`id (cuid), aluno_id, peso_kg?, altura_cm?, percentual_bf?, massa_magra_kg?, imc? (calculado), data, observacao?`

### CorrelacaoDesempenho
`id (cuid), aluno_id (unique FK), dados (Json), calculado_em`

### RefreshToken
`token (String PK), usuario_id, expira_em, criado_em`

### MensagemMotivacional, MensagemMotivacionalEnviada

---

## 3. Regras de Negócio Detalhadas

### 3.1 Treino — Máquina de Estados

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

Regras: T1-T31 conforme documentação original. Destaques:

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

### 3.3 Professor — Regras de Negócio

#### Templates (novo)
- `GET /professores/templates?academiaId=` — lista templates do professor com exercícios
- Usado no dropdown "Criar a partir de Template" do `CriarTreino.tsx`

Restante (P1-P21) conforme documentação original: perfil, vínculo academia, alunos, dashboard, fichas, correlações, exercícios.

### 3.4 Academia (AC1-AC19)

Conforme documentação original: cadastro, aprovação, professores, alunos, fichas.

### 3.5 ROOT (R1-R13)

Conforme documentação original: aprovações, CRUD academias/professores/alunos.

### 3.6 Autenticação (AU1-AU15)

Conforme documentação original: registro, login, JWT, refresh token, middleware.

### 3.7 Workers (W1-W16)

Conforme documentação original: inatividade 30min, EM_ABERTO diário, mensagens motivacionais, correlações, push dual-channel.

### 3.8 Correlação de Desempenho (C1-C7)

Conforme documentação original: Pearson, volume semanal, cache 30 dias.

### 3.9 Sistema (S1-S14)

Conforme documentação original: vínculos, notificações, resolve helpers, mapa de erros, tenant isolation, race conditions, constraints.

---

## 4. Rotas da API (Fastify)

### Auth (`/auth`)
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/auth/register` | Criar usuário | - |
| POST | `/auth/login` | Login → tokens | - |
| POST | `/auth/refresh` | Renovar tokens | - |
| POST | `/auth/logout` | Invalidar refresh | auth |
| GET | `/auth/me` | Dados do usuário | auth |
| PATCH | `/auth/me` | Push tokens | auth |
| POST | `/auth/change-password` | Alterar senha | auth |

### Aluno (`/alunos`) — role ALUNO
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/alunos/perfil` | Upsert perfil (dataNascimento?, pesoKg?, alturaCm?, sexo?) |
| GET | `/alunos/perfil` | Perfil com professor, academia e sexo |
| GET | `/alunos/treinos` | Todos os treinos (sem filtro) |
| GET | `/alunos/treinos/historico-dias?mes=` | Calendário mensal |
| GET/POST/PATCH | `/alunos/medidas[/:id]` | CRUD medidas |
| GET/POST | `/alunos/correlacoes` | Cache + recálculo |
| PATCH | `/alunos/academia` | Vincular a academia |
| GET/POST | `/alunos/notificacoes[/visualizar]` | Listar/marcar lidas |

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
| GET | `/professores/templates` | **Listar templates do professor** |
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
| PATCH | `/treinos/:id` | Editar | PROF/ACAD |
| DELETE | `/treinos/:id` | Remover | PROF/ACAD |
| POST | `/treinos/:id/clonar` | Clonar p/ 1 aluno | PROF/ACAD |
| POST | `/treinos/:id/clonar-lote` | **Clonar p/ múltiplos alunos** | PROF/ACAD |
| POST | `/treinos/:id/marcar-template` | **Toggle is_template** | PROF/ACAD |

### Root (`/root`) — role ROOT
Conforme documentação original: painel, CRUD academias/professores/alunos, aprovações, vínculos, reset senha.

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

### Componentes do Wizard de Cadastro
| Componente | Arquivo | Responsabilidade |
|------------|---------|-----------------|
| `RegisterWizard` | `pages/auth/RegisterWizard.tsx` | Container: estado `step`, navegação, submit |
| `StepIndicator` | `pages/auth/StepIndicator.tsx` | Barra de progresso com 3 círculos |
| `Step1Basics` | `pages/auth/Step1Basics.tsx` | Dados básicos (nome, email, senha, WhatsApp, role) |
| `Step2Profile` | `pages/auth/Step2Profile.tsx` | Perfil físico + validação inline peso/altura/sexo |
| `Step3Academia` | `pages/auth/Step3Academia.tsx` | Seleção academia/autogestão |

### Componentes Compartilhados (novos)
| Componente | Arquivo | Responsabilidade |
|------------|---------|-----------------|
| `EmptyState` | `components/ui/EmptyState.tsx` | Estado vazio reutilizável: ícone, título, descrição, CTA |
| `CoachMark` | `components/ui/CoachMark.tsx` | Tooltips de onboarding: hook `useCoachMark` + overlay `CoachMarkOverlay` |
| `AppShell` | `components/layout/AppShell.tsx` | Layout com sidebar desktop + bottom tabs mobile |
| `Toast` | `components/ui/Toast.tsx` | Feedback de sucesso/erro |
| `ConfirmModal` | `components/ui/ConfirmModal.tsx` | Modal de confirmação |
| `StatusBadge` | `components/ui/StatusBadge.tsx` | Badge com 7 variantes + helpers |
| `LoadingSpinner` | `components/ui/LoadingSpinner.tsx` | Spinner + SkeletonCard + SkeletonText |
| `Icon` | `components/icons/Icon.tsx` | 20+ ícones SVG inline |

### Stores (Zustand)
| Store | Arquivo | Responsabilidade |
|-------|---------|-----------------|
| `useAuthStore` | `stores/auth.ts` | Auth: login, register (aceita sexo), logout, fetchUser, push |
| `useTrainingStore` | `stores/training.ts` | Sessão de treino: iniciar, registrar, finalizar, timer |

### Design System (`index.css`)
- **Fonte**: Inter (UI sans-serif)
- **Paleta**: primary (#dc2626), surface (#18181b), surface-card (#27272a), surface-input (#3f3f46), text (#f4f4f5), text-muted (#a1a1aa), success, warning, info
- **Animações**: fade-in, slide-up, slide-down, modal-pop, pulse-soft, scale-in
- **Utilities**: glass, gradient-primary, scrollbar-hide

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
8. Delete cascade: ordem correta para evitar FK errors

### Frontend (`apps/web`)
1. API Client centralizado em `src/api/client.ts` com auto-refresh em 401
2. Zustand stores em `src/stores/`
3. Tipos em `src/types/api.ts`
4. TailwindCSS v4 com design system
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
- `railway-start.sh`: build → migrate → sync-gifdotreino → start
- API: `https://api-production-3360.up.railway.app`
- Web: `https://web-production-c2d3c.up.railway.app`
- 13 migrations aplicadas, incluindo `add_sexo_to_aluno`, `add_is_template_to_treinos`

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
