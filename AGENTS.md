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

---

## 2. Modelo de Dados (Prisma Schema)

### Usuario (`usuarios`)
`id (uuid/cuid), email (unique), senha_hash, nome, role (ROOT|ACADEMIA|PROFESSOR|ALUNO), telefone?, foto_url?, expo_push_token?, web_push_subscription (Json?), criado_em, atualizado_em`

### Academia (`academias`)
`id (cuid), usuario_id (unique FK), nome, cnpj (unique), status (PENDENTE|ATIVO|REJEITADO), max_professores (default 20), rejeitado_motivo?, criado_em, atualizado_em`
- `usuario` (FK), `professores[]` (ProfessorAcademia), `alunos[]`

### Professor (`professores`)
`id (cuid), usuario_id (unique FK), cref?, criado_em, atualizado_em`
- `usuario` (FK), `academias[]` (ProfessorAcademia M:N), `alunos[]`

### Aluno (`alunos`)
`id (cuid), usuario_id (unique FK), professor_id? (FK), academia_id? (FK), data_nascimento? (DateTime), peso_kg? (Float), altura_cm? (Float), criado_em, atualizado_em`
- `usuario` (FK), `professor?` (FK), `academia?` (FK), `treinos[]`, `medidas[]`, `mensagensEnviadas[]`, `correlacao?`
- `professor_id = null` → modo autogestão
- `academia_id = null` → aluno sem vínculo com academia (autogestão)

### ProfessorAcademia (`professor_academia`) — Vínculo M:N
`id (cuid), professor_id (FK), academia_id (FK), status (VinculoStatus), criado_em, atualizado_em`
- `@@unique([professor_id, academia_id])`
- Status: `PENDENTE_ACADEMIA → PENDENTE_ROOT → ATIVO | REJEITADO | REMOVIDO` (aprovação em duas camadas)

### Treino (`treinos`)
`id (cuid), aluno_id (FK), nome, dias_semana (Int[]), status (TreinoStatus), iniciado_em?, finalizado_em?, avaliacao_dificuldade?, criado_em, atualizado_em`
- **Máquina de estados**:
  - `CADASTRADO`: professor criou, ainda não enviou
  - `ENVIADO`: professor enviou, aluno precisa aceitar/recusar
  - `ACEITO`: aluno aceitou, pronto para iniciar
  - `RECUSADO`: aluno recusou (terminal)
  - `EM_ABERTO`: aceito mas não iniciado no dia
  - `EM_EXECUCAO`: aluno iniciou a execução
  - `CONCLUIDO`: aluno finalizou (terminal)
- **Transições válidas**:
  | De | Para | Ator |
  |---|---|---|
  | `CADASTRADO` | `ENVIADO` | `PROFESSOR`, `SISTEMA` |
  | `CADASTRADO` | `ACEITO` | `ALUNO` (autogestão only) |
  | `ENVIADO` | `ACEITO`, `RECUSADO` | `ALUNO` |
  | `ACEITO` | `EM_EXECUCAO`, `EM_ABERTO` | `ALUNO`, `SISTEMA` |
  | `EM_ABERTO` | `EM_EXECUCAO` | `ALUNO` |
  | `EM_EXECUCAO` | `CONCLUIDO` | `ALUNO` |
- Toda transição inválida lança `InvalidStateTransitionError`
- `exercicios[]` (TreinoExercicio), `historico[]`, `execucoes[]`

### TreinoHistorico (`treino_historico`) — Log imutável append-only
`id (cuid), treino_id (FK), status_anterior (TreinoStatus), status_novo (TreinoStatus), ator_id (String), ator_tipo (TreinoAtor), timestamp`
- Toda transição de estado do Treino deve ser registrada nesta tabela
- `TreinoAtor`: `ALUNO | PROFESSOR | SISTEMA`

### Notificacao (`notificacoes`)
`id (cuid), aluno_id (FK), tipo (String — ex: NOVO_TREINO), mensagem (String), dados (Json), lida (Boolean, default false), criado_em`
- Criada automaticamente ao enviar treino (`POST /treinos/:id/enviar`)

### TreinoExercicio
`id (cuid), treino_id (FK), exercicio_id (FK), ordem, series, repeticoes, carga_sugerida_kg?`

### Exercicio
`id (cuid), nome, grupo_muscular?, equipamento?, nivel?, imagem_url?, gif_url?, dica?, musculo_alvo?, musculos_secundarios?, passos_pt? (String[]), descricao_pt?, criado_em, atualizado_em`

### ExecucaoExercicio
`id (cuid), treino_id (FK), exercicio_id (FK), serie_numero, repeticoes, carga_kg, registrado_em`

### MedidaCorporal (`medidas_corporais`)
`id (cuid), aluno_id (FK), peso_kg?, altura_cm?, percentual_bf?, massa_magra_kg?, imc? (Float, calculado automaticamente), data, observacao?`

### CorrelacaoDesempenho
`id (cuid), aluno_id (unique FK), dados (Json), calculado_em`

### RefreshToken
`token (String PK), usuario_id (FK), expira_em, criado_em`

### MensagemMotivacional, MensagemMotivacionalEnviada — (mensagens científicas rotativas)

---

## 3. Fluxos de Negócio & Casos de Uso (UC)

### Usuário ROOT
- **UC-01** Aprovar/rejeitar academia
- **UC-02** Configurar limite de professores
- **UC-03** Aprovar vínculo professor-academia (2ª camada)
- **UC-04** Painel global
- **UC-04b** Gerenciar alunos (editar nome, email, telefone, data nascimento, peso, altura, academia, professor)

### Usuário Academia
- **UC-05** Cadastrar academia (nome + CNPJ)
- **UC-06** Autorizar professor (1ª camada)
- **UC-07** Remover vínculo ativo de professor
- **UC-08** Dashboard com alunos da academia
- **UC-08b** Gerenciar alunos (vincular professor)
- **UC-08c** Criar treinos para alunos da academia

### Usuário Professor
- **UC-09** Vincular-se a academia
- **UC-10** Vincular alunos ao perfil
- **UC-11** Criar fichas de treino (A/B/C)
- **UC-12** Cadastrar exercícios personalizados
- **UC-13** Enviar treino para aceite do aluno
- **UC-14** Dashboard com status dos alunos
- **UC-15** Alerta de inatividade (worker)
- **UC-16** Correlações de desempenho

### Usuário Aluno
- **UC-17** Cadastro (cria Usuario + Aluno via register, com peso e altura obrigatórios, academia ou autogestão)
- **UC-18** Autogestão de treinos
- **UC-19** Aceitar/recusar treino do professor
- **UC-20** Iniciar execução do treino
- **UC-21** Ver instruções do exercício
- **UC-22** Registrar execução por série
- **UC-23** Finalizar treino
- **UC-24** Registrar medidas corporais (peso, altura, %BF, massa magra) com cálculo automático do IMC e preenchimento automático do peso/altura do perfil
- **UC-24b** Visualizar classificação IMC (OMS) com barra de escala colorida e destaque da categoria atual do aluno
- **UC-25** Gráficos de evolução
- **UC-26** Push notifications motivacionais
- **UC-27** Ler resumos científicos

### Workers BullMQ (Background)
- **UC-28** Push notifications motivacionais rotativas
- **UC-29** Monitorar treinos abandonados (>30min)
- **UC-30** Alertar professor sobre inatividade
- **UC-31** Marcar treinos não iniciados como "em aberto"
- **UC-32** Calcular correlações volume vs evolução
- **UC-33** Resetar ciclo de mensagens motivacionais

---

## 4. Rotas da API (Fastify)

### Auth (`/auth`)
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/auth/register` | Criar usuário base (nome, email, senha, role, telefone?) | - |
| POST | `/auth/login` | Login (email, senha) → accessToken + refreshToken | - |
| POST | `/auth/refresh` | Renovar tokens (refreshToken) | - |
| POST | `/auth/logout` | Invalidar refresh token | auth |
| GET | `/auth/me` | Dados do usuário logado (id, nome, email, role, tenantId, expoPushToken) | auth |
| PATCH | `/auth/me` | Atualizar push tokens | auth |
| POST | `/auth/change-password` | Alterar senha | auth |

### Aluno (`/alunos`) — role ALUNO
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/alunos/perfil` | Criar/atualizar perfil Aluno (body: dataNascimento?, pesoKg?, alturaCm?). Update parcial permitido. |
| GET | `/alunos/perfil` | Perfil do aluno com professor e academia |
| GET | `/alunos/treinos` | Listar treinos do aluno |
| GET | `/alunos/medidas` | Listar medidas (auto-backfill do perfil se nenhuma existir) |
| POST | `/alunos/medidas` | Registrar medida com cálculo automático de IMC |
| PATCH | `/alunos/medidas/:id` | Editar medida existente (recalcula IMC) |
| GET | `/alunos/correlacoes` | Correlações em cache |
| POST | `/alunos/correlacoes` | Recalcular correlações |
| PATCH | `/alunos/academia` | Vincular aluno a academia |

### Professor (`/professores`) — role PROFESSOR
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/professores/perfil` | Criar/atualizar perfil Professor (cref?) |
| POST | `/professores/vincular/:academiaId` | Solicitar vínculo (com proteção race condition) |
| GET | `/professores/vinculos` | Listar vínculos |
| DELETE | `/professores/vinculos/:academiaId` | Desvincular-se |
| POST | `/professores/alunos` | Vincular aluno ao professor |
| GET | `/professores/dashboard` | Dashboard alunos + treinos |
| GET | `/professores/fichas` | Fichas de treino por aluno |
| POST | `/professores/fichas` | Criar fichas em lote |
| GET | `/professores/exercicios` | Listar exercícios com filtros |
| GET | `/professores/workoutx/exercicios` | Busca exercícios por bodyPart |
| GET | `/professores/alunos/:alunoId/correlacoes` | Correlações de um aluno |

### Academia (`/academias`) — role ACADEMIA
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/academias` | Lista academias ativas (público) |
| POST | `/academias` | Cadastrar academia |
| GET | `/academias/dashboard` | Dashboard: nome, CNPJ, email, telefone, status, totalProfessores, totalAlunos, professoresPendentes |
| GET | `/academias/professores` | Listar professores com status |
| POST | `/academias/professores/:id/autorizar` | Autorizar professor (1ª camada) |
| DELETE | `/academias/professores/:id` | Remover professor |
| GET | `/academias/alunos` | Listar alunos com treinos |
| PATCH | `/academias/alunos/:id/professor` | Atribuir professor ao aluno |
| POST | `/academias/fichas` | Criar fichas em lote (academia) |

### Treino (`/treinos`)
| Método | Rota | Descrição | Role |
|--------|------|-----------|------|
| POST | `/treinos` | Criar treino | PROFESSOR |
| POST | `/treinos/autogestao` | Criar treino (autogestão) | ALUNO |
| GET | `/treinos/exercicios` | Listar exercícios | auth |
| POST | `/treinos/exercicios` | Criar exercício | PROFESSOR |
| POST | `/treinos/:id/enviar` | Enviar treino para aluno | PROFESSOR |
| PATCH | `/treinos/:id/responder` | Aceitar/recusar treino | ALUNO |
| POST | `/treinos/:id/iniciar` | Iniciar treino | ALUNO |
| POST | `/treinos/:id/execucoes` | Registrar execução | ALUNO |
| POST | `/treinos/:id/finalizar` | Finalizar treino | ALUNO |
| GET | `/treinos/:id` | Detalhe do treino | auth |
| PATCH | `/treinos/:id` | Editar treino (nome, dias_semana, exercicios) | PROFESSOR/ACADEMIA |
| DELETE | `/treinos/:id` | Remover treino + execuções + histórico | PROFESSOR/ACADEMIA |

### Root (`/root`) — role ROOT
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/root/painel` | Painel global |
| PATCH | `/root/academias/:id/aprovacao` | Aprovar/rejeitar academia |
| PATCH | `/root/academias/:id/limite-professores` | Definir limite |
| PATCH | `/root/academias/:id/status` | Alterar status |
| GET | `/root/vinculos` | Vínculos pendentes |
| PATCH | `/root/vinculos/:id/aprovacao` | Aprovar/rejeitar vínculo |
| GET | `/root/usuarios` | Listar usuários |
| POST | `/root/usuarios/:id/reset-password` | Resetar senha |
| GET | `/root/alunos` | Listar todos os alunos (inclui telefone, data_nascimento, peso_kg, altura_cm) |
| PUT | `/root/alunos/:id` | Atualizar aluno (nome, email, telefone, data_nascimento, peso_kg, altura_cm, academia_id, professor_id) |
| DELETE | `/root/alunos/:id` | Excluir aluno e todos os dados relacionados (cascade) |

---

## 5. Diretrizes e Padrões de Código

### Backend (`apps/api`)
1. **Compilação**: TypeScript compilado para `dist`. Nunca execute `tsc` em runtime.
2. **Prisma Client**: Gerado em `node_modules/@prisma/client`, schema em `apps/api/prisma/schema.prisma`
3. **Erros**: Use `AppError` ou subclasses (`NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `ConflictError`, `TenantAccessError`)
4. **Isolamento de tenant**: Toda query de aluno/professor/academia deve filtrar por `professor_id`, `academia_id` ou `tenantId` do JWT
5. **Autoresolução**: Use `resolveProfessor()` e `resolveAluno()` com upsert para evitar 404 em contas órfãs
6. **Race conditions**: Operações de criação com verificação + criação devem usar `upsert` ou `try-catch` com tratamento de `P2002`
7. **Fastify body parsing**: POST/PATCH sem corpo não devem ter `Content-Type: application/json`
8. **Zod**: Validação de body/query/params com zod em todas as rotas

### Frontend (`apps/web`)
1. **API Client**: Centralizado em `src/api/client.ts` — objeto `api` com métodos nomeados, auto-refresh em 401
2. **Estado**: Zustand stores em `src/stores/`
3. **Tipos**: `src/types/api.ts` — interfaces para todas as respostas da API
4. **Layout**: `AppShell.tsx` — sidebar desktop com seções colapsáveis + barra superior com avatar dropdown (Dados do Aluno + Sair) + bottom tabs mobile para ALUNO
5. **Avatar dropdown**: Avatar no canto direito da barra superior com menu contendo nome, email, "Dados do Aluno" e "Sair". Fecha ao clicar fora.
6. **Estilos**: TailwindCSS v4 com design system (cores: surface, surface-card, surface-input, primary, text, text-muted, success)
7. **Navegação**: React Router v7 com rotas aninhadas por role
8. **Confirmação**: Use `ConfirmModal` para ações destrutivas (delete)
9. **Toast**: Use `useToast()` hook para feedback de sucesso/erro
10. **Phone mask**: Use `formatPhone()` de `src/lib/phone.ts` (máscara (XX) XXXXX-XXXX). Aplicar em todo input de telefone.
11. **Utilitários compartilhados**: `src/lib/` — helpers reutilizáveis (ex: formatPhone)

### Registro de Usuário (Fluxo)
1. `POST /auth/register` → cria Usuario (base)
2. `POST /auth/login` → obtém tokens
3. Se role=ALUNO:
   - `POST /alunos/perfil` com **pesoKg e alturaCm obrigatórios** + dataNascimento opcional
   - Se `academiaId` !== `'AUTOGESTAO'`: `PATCH /alunos/academia` para vincular à academia
   - Opções de academia no cadastro: lista de academias ativas + "Autogestão (sem academia)"
4. Se role=PROFESSOR: `POST /professores/perfil`
5. Se role=ACADEMIA: usuário cadastra academia via formulário separado

### IMC (Índice de Massa Corporal)
- Cálculo automático no backend sempre que peso e altura são fornecidos: `imc = peso / (altura/100)²`
- Classificação OMS exibida no frontend com 6 faixas:
  - Abaixo do peso: < 18.5 (azul)
  - Peso normal: 18.5 – 24.9 (verde)
  - Sobrepeso: 25 – 29.9 (amarelo)
  - Obesidade grau I: 30 – 34.9 (laranja)
  - Obesidade grau II: 35 – 39.9 (vermelho)
  - Obesidade grau III: ≥ 40 (vermelho escuro)
- Barra de escala visual com indicador da posição atual do aluno
- Badges coloridos por categoria em cada registro da tabela de medidas
- Card de resumo exibindo IMC, peso, altura e classificação atual

---

## 6. Skills do Projeto (`.agent/skills/`)

### SKILL.md
- Regras de transição de estado do Treino (máquina de estados)
- Workers BullMQ para jobs assíncronos (timer 30min, notificações)
- Testes obrigatórios: Service + transições inválidas
- Convenções: entidades em português, infra em inglês, snake_case tabelas, PascalCase classes, camelCase métodos

### SKILL_clean_code.md
- Clean Code (Robert Martin) completo para TypeScript
- Máximo 3 args por função
- Sem argumentos flag
- DRY, sem código morto, sem magic numbers
- Nomes descritivos
- Sem comentários redundantes
- Testes: tudo que pode quebrar, boundaries, <100ms

### programacaoSkill.md
- Web Artifacts Builder (React + Tailwind + shadcn/ui) — não aplicável diretamente ao GymApp

### design_pattern.md
- MVC/MVVM para separação de concerns
- Facade para simplificar APIs complexas
- Observer (Zustand) para estado reativo
- KISS, Clean Code, Mobile First responsivo

---

## 7. Instruções de Deploy (Railway)

```bash
# API
RAILPACK_BUILD_CMD = npm run build --workspace=apps/api
RAILPACK_START_CMD = npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && node apps/api/dist/server.js

# Web
RAILPACK_BUILD_CMD = npm run build --workspace=apps/web
RAILPACK_START_CMD = npm run start --workspace=apps/web
```

- Deploy baseado em Railpack no monorepo root
- Push para `origin/main` aciona deploy automático
- Migrações rodam via `prisma migrate deploy` no startup da API

---

## 8. Comandos Úteis

```bash
npm run dev:api          # Backend dev (Fastify com hot-reload)
npm run dev:web          # Frontend dev (Vite)
npm run build            # Build todos os workspaces
npm run build --workspace=apps/web   # Build frontend
npm run lint --workspace=apps/web    # Lint frontend (oxlint)
npx prisma generate --schema=apps/api/prisma/schema.prisma  # Gerar Prisma Client
npx prisma migrate dev --name <nome> --schema=apps/api/prisma/schema.prisma  # Criar migration
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma  # Aplicar migrations em produção
```
