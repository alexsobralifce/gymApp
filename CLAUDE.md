# GymApp

Monorepo de um sistema de gestão de academias com 4 papéis: Aluno, Professor, Academia e Root.

## Estrutura

```
gymApp/
├── apps/
│   ├── api/     # Backend: Fastify + TypeScript + Prisma + PostgreSQL
│   └── web/     # Frontend: React 19 + Vite + TailwindCSS + Zustand + React Router v7
├── packages/    # Pacotes compartilhados (se houver)
└── package.json # Workspaces npm
```

## Stack

- **Backend**: Node.js (>=20), Fastify, Prisma ORM, PostgreSQL, JWT auth, bcryptjs, zod
- **Frontend**: React 19, TypeScript 6, Vite 8, TailwindCSS 4, Zustand 5, React Router 7, Recharts

## Modelo de dados (Prisma)

### Usuario (base)
`id, email, senha_hash, nome, role (ROOT|ACADEMIA|PROFESSOR|ALUNO), telefone?, foto_url?, expo_push_token?, criado_em, atualizado_em`

### Aluno (perfil)
`id (cuid), usuario_id (unique FK), professor_id?, academia_id?, criado_em, atualizado_em`
- Relacionamentos: usuario, professor (Professor?), academia (Academia?), treinos[], medidas[], correlacao?

### Professor (perfil)
`id (cuid), usuario_id (unique FK), cref?, criado_em, atualizado_em`
- Relacionamentos: usuario, academias[] (ProfessorAcademia M:N), alunos[]

### Academia
`id (cuid), usuario_id (unique FK), nome, cnpj, status (PENDENTE|ATIVO|REJEITADO), max_professores, criado_em`
- Relacionamentos: usuario, professores[] (ProfessorAcademia M:N), alunos[]

### Treino
`id (cuid), aluno_id (FK), nome, dias_semana (Int[]), status (TreinoStatus), iniciado_em?, finalizado_em?, avaliacao_dificuldade?, criado_em, atualizado_em`
- Status: CADASTRADO → ENVIADO → ACEITO/RECUSADO → EM_ABERTO → EM_EXECUCAO → CONCLUIDO
- Relacionamentos: exercicios[] (TreinoExercicio), historico[], execucoes[]

### TreinoExercicio
`id, treino_id, exercicio_id, ordem, series, repeticoes, carga_sugerida_kg?`

### Exercicio
`id, nome, grupo_muscular?, equipamento?, nivel?, imagem_url?, dica?, musculo_alvo?, passos_pt?, descricao_pt?`

### MedidaCorporal
`id, aluno_id, peso_kg?, altura_cm?, percentual_bf?, massa_magra_kg?, data, observacao?`

## Autenticação

- JWT access token (15min) + refresh token (7d) rotacionado
- Tokens armazenados em localStorage no frontend
- Middleware `app.authenticate` verifica JWT; `app.requireRole(...roles)` verifica role
- Rota `POST /auth/refresh` para renovar tokens
- No frontend, `api/client.ts` intercepta 401 e tenta refresh automaticamente

## Arquitetura Clean (backend)

```
apps/api/src/
├── presentation/http/routes/  # Rotas Fastify (auth, aluno, professor, academia, treino, root)
├── presentation/middlewares/  # jwtAuth, errorHandler
├── application/usecases/      # Casos de uso (AuthService, TreinoService, CorrelacaoService, AcademiaService)
├── domain/                    # Entidades, erros customizados (AppError: NotFoundError, UnauthorizedError, etc.)
├── infrastructure/            # Prisma client, Redis, push notifications
└── shared/                    # Config (env), utilitários
```

## Convenções

- **Rotas backend**: arquivos em `presentation/http/routes/`, exportam função async que recebe `FastifyInstance`
- **API client frontend**: centralizado em `apps/web/src/api/client.ts`, exporta objeto `api` com métodos nomeados
- **Estado global**: Zustand stores em `apps/web/src/stores/`
- **Tipos**: definidos em `apps/web/src/types/api.ts`
- **Layout**: `AppShell.tsx` com sidebar desktop + navbar mobile por role
- **Estilos**: TailwindCSS com design system (cores: surface, surface-card, surface-input, primary, text, text-muted, success)
- **Nomes de colunas**: Prisma usa snake_case; zod/frontend usa camelCase

## Comandos

```bash
npm run dev:api          # Backend dev server
npm run dev:web          # Frontend dev server
npm run build            # Build todos os workspaces
npm run build --workspace=apps/web   # Build só do frontend
npm run lint --workspace=apps/web    # Lint frontend (oxlint)
```

## Padrões importantes

- **Isolamento de tenant**: Aluno.professor_id e Aluno.academia_id controlam acesso a dados
- **Registro de usuário**: cria apenas Usuario base; perfil (Aluno/Professor/Academia) é criado separadamente via endpoints específicos
- **Frontend `register()`**: após login, chama `criarPerfilAluno()` para criar perfil Aluno
- **Refresh automático**: `api/client.ts` linha 25-39 intercepta 401 e tenta refresh
- **Erro "Aluno não encontrado" (404)**: significa que o perfil Aluno não existe para o usuario_id do JWT — precisa criar via `POST /alunos/perfil`
