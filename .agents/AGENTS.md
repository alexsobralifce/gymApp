# GymApp Agent Instruction & Documentation Guidelines (AGENTS.md)

Este arquivo serve como base de conhecimento para qualquer assistente de IA/LLM operando neste repositório. Ele resume a arquitetura, regras de negócio, modelo de dados, casos de uso e padrões de código do ecossistema **GymApp**.

---

## 1. Visão Geral do Sistema
O **GymApp** é uma plataforma multi-tenant de gerenciamento de academias, acompanhamento de treinos e análise evolutiva baseada em dados científicos para alunos e professores.

### Pilhas de Tecnologia (Tech Stack)
* **Estrutura**: Monorepo NPM.
* **Backend (`apps/api`)**: Fastify (TypeScript) + Prisma ORM + PostgreSQL + Redis & BullMQ (Workers de segundo plano).
* **Frontend (`apps/web`)**: React (TypeScript) + Vite + Tailwind CSS v4 + Zustand.
* **Mobile / Embarcado**: Estrutura preparada para Capacitor (dentro de `apps/web` ou subpastas).

---

## 2. Modelo de Dados (Prisma Schema Key Entities)
* **Usuario**: Tabela unificada de autenticação. Papéis (`Role`): `ROOT`, `ACADEMIA`, `PROFESSOR`, `ALUNO`.
* **Academia (Tenant)**: Registrada por CNPJ. Possui limite máximo de professores (`max_professores`) e status (`PENDENTE`, `ATIVO`, `REJEITADO`).
* **Professor**: Possui número `cref` opcional. Vincula-se a múltiplas academias via tabela `ProfessorAcademia`.
* **Aluno**: Pode ter um `professor_id` (modo acompanhado) ou ser `null` (modo autogestão). Vincula-se a uma `academia_id`.
* **ProfessorAcademia (Vínculo M:N)**: Representa a associação com aprovação em duas camadas:
  1. Aprovado pela Academia (`status` = `PENDENTE_ROOT`)
  2. Aprovado pelo Root (`status` = `ATIVO`)
* **Treino**: Ficha de treino (ex: A/B/C) com dias da semana e status (`CADASTRADO`, `ENVIADO`, `ACEITO`, `RECUSADO`, `EM_ABERTO`, `EM_EXECUCAO`, `CONCLUIDO`).
* **ExecucaoExercicio**: Log de execução contendo `serie_numero`, `repeticoes` e `carga_kg`.
* **MedidaCorporal**: Peso, altura, %BF e massa magra registrados pelo aluno ao longo do tempo.

---

## 3. Fluxos de Negócio & Casos de Uso (UC)

### Usuário Administrador Global (ROOT)
* **UC-01**: Aprovar cadastro de nova academia.
* **UC-02**: Configurar limite máximo de professores (`max_professores`) de cada academia.
* **UC-03**: Aprovar vínculo de professores com academias (segunda camada de aprovação).
* **UC-04**: Monitorar plataforma global e gerenciar cadastros.

### Usuário Academia (Tenant)
* **UC-05**: Solicitar cadastro inicial (enviando Nome e CNPJ).
* **UC-06**: Autorizar solicitação de vínculo de professor (envia para aprovação final do Root).
* **UC-07**: Remover/revogar vínculo ativo de professor.
* **UC-08**: Visualizar painel agregado de alunos vinculados à academia.

### Usuário Professor
* **UC-09**: Solicitar vinculação a uma ou mais academias.
* **UC-10**: Cadastrar e gerenciar alunos associados.
* **UC-11**: Montar e editar fichas de treino (A/B/C) para alunos.
* **UC-12**: Cadastrar catálogo de exercícios personalizados (máquina, dicas, imagem).
* **UC-13**: Enviar ficha de treino para o aluno aceitar ou recusar.
* **UC-14**: Acompanhar o status atual de treino de seus alunos em tempo real.
* **UC-15**: Receber alerta quando um aluno não inicia um treino agendado para o dia.
* **UC-16**: Analisar gráficos de correlação de desempenho e medidas dos alunos.

### Usuário Aluno
* **UC-17**: Cadastrar-se na plataforma (perfil inicial).
* **UC-18**: Autogerenciar treinos (criar e gerenciar suas próprias fichas no modo autogestão).
* **UC-19**: Aceitar ou recusar treinos enviados pelo professor.
* **UC-20**: Iniciar execução do treino programado para o dia (iniciando o temporizador de atividade).
* **UC-21**: Visualizar instruções de execução do exercício (imagem, dicas).
* **UC-22**: Registrar o volume executado (carga e repetições) por série.
* **UC-23**: Finalizar treino, encerrando o temporizador.
* **UC-24**: Registrar medidas corporais (peso, altura, %BF, etc.).
* **UC-25**: Visualizar gráficos de evolução pessoal de carga e medidas corporais.
* **UC-26**: Receber push notification motivacional com embasamento científico em dias de treino.
* **UC-27**: Acessar e ler resumos/estudos científicos associados à mensagem motivacional.

### Processamento em Background (Workers BullMQ)
* **UC-28**: Disparar push notifications motivacionais rotativas (banco de 30+ estudos científicos).
* **UC-29**: Monitorar treinos abandonados (em execução por mais de 30 minutos sem conclusão) e notificar o aluno.
* **UC-30**: Alertar o professor sobre inatividade/abandono de treino pelo aluno.
* **UC-31**: Rotular treinos agendados e não iniciados até o final do dia como "em aberto".
* **UC-32**: Processar e calcular matrizes de correlação estatística entre volume de treino e evolução física.
* **UC-33**: Resetar ciclo de mensagens motivacionais após todas serem enviadas.

---

## 4. Diretrizes e Padrões de Código Importantes

### Backend (`apps/api`)
1. **Compilação**: O TypeScript é compilado para a pasta `dist` na fase de Build. Nunca execute compilação (`tsc`) em runtime/inicialização em produção.
2. **Prisma Client**: É gerado na raiz em `node_modules/@prisma/client`. Em monorepos, use o schema path explícito se estiver fora da pasta da API: `--schema=apps/api/prisma/schema.prisma`.
3. **Erros**: Retorne instâncias de `AppError` ou suas subclasses (`NotFoundError`, `ForbiddenError`, `UnauthorizedError`) para validações de regra de negócio, garantindo que o middleware de erros envie as mensagens e o status HTTP adequados.
4. **Fastify JSON Body Parsing**: Fastify lança HTTP 400 se o cabeçalho `Content-Type: application/json` for enviado em um request com corpo vazio. Para chamadas POST/PATCH sem corpo, garanta que o frontend não envie esse cabeçalho ou envie um JSON vazio `{}`.
5. **Autoresoluções**: Rotas de alunos e professores devem usar helpers de auto-upsert (ex: `resolveAluno` / `resolveProfessor`) para evitar falhas de 404 em contas órfãs de registros de perfil específicos.

### Frontend (`apps/web`)
1. **Cliente de API (`apps/web/src/api/client.ts`)**: Encapsula chamadas ao backend usando `fetch`. Ele lida automaticamente com interceptação de tokens expirados (refresh tokens) e redirecionamento de expiração de sessão.
2. **Estilização**: Use classes nativas do Tailwind CSS v4. Os tokens de cores principais estão em `index.css` (`--color-primary`, `--color-success`, `--color-surface-card`, etc.).
3. **CORS**: Certifique-se de configurar `API_BASE_URL` (URL pública da API) e `WEB_BASE_URL` (URL pública do Frontend Web) no ambiente de produção para que o CORS do backend funcione adequadamente.

---

## 5. Instruções de Deploy (Railway)
* O deploy é baseado em **Railpack** no monorepo root.
* O build e inicialização de cada serviço devem ser configurados por variáveis de ambiente de controle do Railpack:
  * **API (Backend)**:
    - `RAILPACK_BUILD_CMD` = `npm run build --workspace=apps/api`
    - `RAILPACK_START_CMD` = `npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && node apps/api/dist/server.js`
  * **Web (Frontend)**:
    - `RAILPACK_BUILD_CMD` = `npm run build --workspace=apps/web`
    - `RAILPACK_START_CMD` = `npm run start --workspace=apps/web`
