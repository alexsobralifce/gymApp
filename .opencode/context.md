# Project Context — GymApp (ENDORFINAPP)

## Environment
- **Language**: TypeScript (backend + frontend), Node >= 20
- **Stack**: Monorepo NPM workspaces (`apps/*`, `packages/*`)
- **Backend** (`apps/api`): Fastify 4 + Prisma 5 + PostgreSQL + Redis (BullMQ workers) + Zod
- **Frontend** (`apps/web`): React 19 + Vite 8 + Tailwind v4 + Zustand 5 + React Router 7 + Recharts + lucide-react
- **Test**: vitest (api `npm run test -w apps/api`, web `npm run test -w apps/web`), Playwright (web e2e), oxlint (web lint)
- **Build**: `npm run build` (workspaces) | api = `prisma generate && tsc` | web = `tsc -b && vite build`
- **Marca**: ENDORFINAPP — slogan "A Química do Crescimento"

## Project Type
- [x] Monorepo multi-tenant (aluno, professor, academia, root)
- [x] Application (PWA web + backend API) com Capacitor-ready

## Infrastructure
- **Container/Orquestração**: `docker-compose.yml`, `railway.json` (deploy Railway)
- **CI/CD**: Railway (push para main)
- **Cloud**: Railway (API `api-production-3360`, Web `web-production-c2d3c`)

## Structure
- **Source API**: `apps/api/src` (presentation/http/routes, application/usecases, domain, infrastructure, jobs/social, modules/social, shared)
- **Source Web**: `apps/web/src` (pages, components, hooks, stores, lib, api)
- **Prisma**: `apps/api/prisma/schema.prisma` (795 linhas)
- **Docs**: `docs/`, `AGENTS.md`, `RAILWAY.md`, `.opencode/instructions/orquestracao.md`

## Escala do Código
- API: 58 arquivos .ts | Web: 155 arquivos .ts/.tsx | ~144 rotas HTTP estimadas
- 28 modèles Prisma + enums (usuarios, treinos, social, assinaturas, avaliacoes, noticias, wearables)

## Frontend Pages por Role
- ALUNO: Dashboard, MeusTreinos, CriarTreino, IA, Execucao, Evolucao, Medidas, Mural, Amizades, Clubes, BibliotecaPlanos, Parceiros, Estudo, Noticias, Wearables, PreferenciasNotificacao, Privacidade, Beneficios
- PROFESSOR: Dashboard, Treinos, CriarTreino, Fichas, CriarExercicio, Academias, VincularAluno, AlunoCorrelacoes
- ACADEMIA: Dashboard, Professores, Alunos, Treinos, CriarTreino
- ROOT: Painel, Vinculos, Usuarios, Social, AvaliacoesSistema

## Backend Usecases
auth, aluno (ExportacaoService), academia, treino (TreinoService, PrescricaoIAService, GeradorTreinoService, HistoricoExercicioService), avaliacao (AvaliacaoService, AvaliacaoMatematicaService, AvaliacaoFotoService), correlacao, gamification, noticias, notificacoes (NotificacaoPreferencesService), planos (PlanoService), assinaturas (AssinaturaService, AssinaturaPolicy)

## Workers (BullMQ)
- gym: inatividade-30min, treino-em-aberto, mensagem-motivacional, correlacao-desempenho, news-fetch, news-push, resumo-diario, assinaturas-verificacao
- social: fanout-post, notify-friends, award-badges, update-xp

## State Git
- Últimos commits focam em: billing/Play Billing, LGPD/privacidade, TWA (package), deepwork orchestration
- Arquivos não rastreados: `.playconsole/`, `agent/`, `docs/informacoes-play-console.txt`

## Notas
- Workflow obrigatório de orquestração: `.opencode/instructions/orquestracao.md` (deepwork + gates Oracle)
- 100% PT-BR nos modelos de domínio; testes de linguagem didática garantem conformidade
