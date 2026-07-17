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
  | `CONCLUIDO` | `ACEITO` | `SISTEMA` |
- Toda transição inválida lança `InvalidStateTransitionError`
- `exercicios[]` (TreinoExercicio), `historico[]`, `execucoes[]`

### TreinoHistorico (`treino_historico`) — Log imutável append-only
`id (cuid), treino_id (FK), status_anterior (TreinoStatus), status_novo (TreinoStatus), ator_id (String), ator_tipo (TreinoAtor), timestamp`
- Toda transição de estado do Treino deve ser registrada nesta tabela
- `TreinoAtor`: `ALUNO | PROFESSOR | ACADEMIA | SISTEMA`

### Notificacao (`notificacoes`)
`id (cuid), aluno_id (FK), tipo (NotificacaoTipo), mensagem (String), dados (Json?), lida (Boolean, default false), criado_em`
- Criada automaticamente ao enviar treino (`POST /treinos/:id/enviar`)
- `NotificacaoTipo`: `PROFESSOR_ATRIBUIDO | NOVO_TREINO`

### AvaliacaoDificuldade (não é enum no Prisma, é String?)
`FACIL | MODERADO | INTENSO | MUITO_INTENSO` — usado em `treinos.avaliacao_dificuldade` ao finalizar

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

## 3. Regras de Negócio Detalhadas

### 3.1 Treino — Máquina de Estados & Regras de Transição

#### Estados
`CADASTRADO → ENVIADO → ACEITO → EM_ABERTO → EM_EXECUCAO → CONCLUIDO`
`CADASTRADO → ACEITO` (autogestão)
`ENVIADO → RECUSADO` (terminal)
`CONCLUIDO → ACEITO` (reciclagem automática)

#### Transições Válidas
| De | Para | Ator | Condição |
|---|---|---|---|
| `CADASTRADO` | `ENVIADO` | `PROFESSOR`, `SISTEMA` | Professor envia treino ou migração automática |
| `CADASTRADO` | `ACEITO` | `ALUNO` | Autogestão apenas (`professor_id = null`) |
| `ENVIADO` | `ACEITO`, `RECUSADO` | `ALUNO` | Aluno responde ao treino recebido |
| `ACEITO` | `EM_EXECUCAO`, `EM_ABERTO` | `ALUNO`, `SISTEMA` | Aluno inicia ou worker marca como não iniciado |
| `EM_ABERTO` | `EM_EXECUCAO` | `ALUNO` | Aluno retoma treino pendente |
| `EM_EXECUCAO` | `CONCLUIDO` | `ALUNO` | Aluno finaliza treino |
| `CONCLUIDO` | `ACEITO` | `SISTEMA` | Reciclagem automática ao tentar iniciar treino concluído |

#### Regras de Transição
- **T1**: Toda transição deve ser validada por `assertTransicaoValida()` antes de executar.
- **T2**: Transição inválida → `InvalidStateTransitionError` (HTTP 422, code `INVALID_STATE_TRANSITION`).
- **T3**: Toda transição bem-sucedida DEVE ser registrada em `TreinoHistorico` (log imutável append-only com `status_anterior`, `status_novo`, `ator_id`, `ator_tipo`, `timestamp`).
- **T4**: `RECUSADO` é estado terminal — nenhuma transição adicional é permitida.

#### Reciclagem Automática (CONCLUIDO → ACEITO)
- **T5**: Ao chamar `POST /treinos/:id/iniciar`, se o treino estiver `CONCLUIDO`, o sistema recicla para `ACEITO` (reseta `iniciado_em` e `finalizado_em` para null) e imediatamente transiciona para `EM_EXECUCAO`.
- **T6**: Ambas as transições (CONCLUIDO→ACEITO e ACEITO→EM_EXECUCAO) são registradas no histórico.
- **T7**: No startup da API, todos os treinos `CONCLUIDO` existentes são migrados para `ACEITO`.

#### Migração Automática (CADASTRADO → ENVIADO)
- **T8**: No startup da API, todos os treinos `CADASTRADO` existentes são migrados para `ENVIADO`, com criação de notificação `NOVO_TREINO` para o aluno.

#### Criação de Treino (Professor)
- **T9**: Requer `alunoId`, `nome` (mín. 2 caracteres), `diasSemana` (array de 0-6, mínimo 1 dia), `exercicios` (mín. 1). Cada exercício: `exercicioId`, `ordem` (mín. 1), `series` (default 3, mín. 1), `repeticoes` (default 12, mín. 1).
- **T10**: Tenant check: `aluno.professor_id === professor.id`. Violação → `TenantAccessError` (403).

#### Autogestão (Aluno sem Professor)
- **T11**: Rota `/treinos/autogestao` — permitida apenas se `aluno.professor_id === null`.
- **T12**: Treino é criado com status `ACEITO` (pula fluxo de envio/aceite).

#### Envio de Treino (Professor → Aluno)
- **T13**: `POST /treinos/:id/enviar` — transiciona `CADASTRADO` → `ENVIADO`.
- **T14**: Após transição, notificação `NOVO_TREINO` é criada automaticamente para o aluno.

#### Resposta do Aluno
- **T15**: `PATCH /treinos/:id/responder` com `acao: 'ACEITAR'` ou `'RECUSAR'`.
- **T16**: Apenas o aluno dono do treino pode responder.

#### Iniciar Treino
- **T17**: `POST /treinos/:id/iniciar` — apenas ALUNO. Status permitidos: `ACEITO`, `EM_ABERTO`.
- **T18**: Se já `EM_EXECUCAO`, retorna o treino atual sem erro (no-op).
- **T19**: Se `CONCLUIDO`, aplica reciclagem automática (T5).

#### Registrar Execução
- **T20**: `POST /treinos/:id/execucoes` — ALUNO. Campos: `exercicioId`, `serieNumero` (mín 1), `repeticoes` (mín 1), `cargaKg` (mín 0).
- **T21**: Não altera status do treino.

#### Finalizar Treino
- **T22**: `POST /treinos/:id/finalizar` — ALUNO. Transiciona `EM_EXECUCAO` → `CONCLUIDO`.
- **T23**: Opcional: `avaliacao` com valores `FACIL | MODERADO | INTENSO | MUITO_INTENSO`.
- **T24**: Após finalizar, o treino é automaticamente reciclado para `ACEITO` (T5) para reuso em novo dia.

#### Editar/Excluir Treino
- **T25**: `PATCH /treinos/:id` — apenas PROFESSOR ou ACADEMIA. Substitui exercícios completamente (delete all + recreate).
- **T26**: `DELETE /treinos/:id` — apenas PROFESSOR ou ACADEMIA. Cascade: execuções → histórico → treino_exercicios → treino.

#### Clonar Treino
- **T27**: `POST /treinos/:id/clonar` — apenas PROFESSOR ou ACADEMIA. Body: `{ alunoDestinoId }`.
- **T28**: Tenant check duplo: valida que o ator é dono tanto do treino fonte quanto do aluno destino.
- **T29**: Copia `nome`, `dias_semana` e `exercicios` (ordem, series, repeticoes, carga_sugerida_kg). Status sempre `CADASTRADO`.
- **T30**: Histórico registrado com ator `PROFESSOR` ou `ACADEMIA`. Execuções e histórico do treino fonte NÃO são copiados.
- **T31**: No frontend, após clonar, chama `POST /treinos/:id/enviar` automaticamente (auto-envio).

---

### 3.2 Aluno — Regras de Negócio

#### Perfil
- **A1**: `POST /alunos/perfil` — upsert por `usuario_id`. Campos: `dataNascimento`, `pesoKg` (positivo), `alturaCm` (positivo).
- **A2**: Na criação inicial com peso+altura, uma `MedidaCorporal` é criada automaticamente com IMC calculado.
- **A3**: Ao atualizar perfil com peso+altura, se nenhuma medida existir, faz auto-backfill da medida.
- **A4**: `GET /alunos/perfil` — retorna perfil com professor e academia vinculados.

#### Medidas Corporais
- **A5**: `POST /alunos/medidas` — campos: `pesoKg`, `alturaCm`, `percentualBf` (0-100), `massaMagraKg` (positivo), `observacao`. IMC calculado automaticamente.
- **A6**: `GET /alunos/medidas` — ordem crescente por data. Se não houver medidas mas perfil tiver peso+altura, auto-cria uma medida.
- **A7**: `PATCH /alunos/medidas/:id` — edita medida, recalcula IMC se peso/altura mudarem.
- **A8**: Escopo: apenas medidas do próprio aluno.

#### Cálculo do IMC
- **A9**: `IMC = pesoKg / (alturaCm / 100)²`, arredondado para 2 casas decimais.
- **A10**: Retorna `null` se `alturaCm <= 0` ou qualquer valor ausente.

#### Classificação IMC (OMS)
- **A11**:
  | Faixa | Classificação | Cor (Frontend) |
  |---|---|---|
  | < 18.5 | Abaixo do peso | Azul |
  | 18.5 – 24.9 | Peso normal | Verde |
  | 25 – 29.9 | Sobrepeso | Amarelo |
  | 30 – 34.9 | Obesidade grau I | Laranja |
  | 35 – 39.9 | Obesidade grau II | Vermelho |
  | ≥ 40 | Obesidade grau III | Vermelho escuro |

#### Academia
- **A12**: `PATCH /alunos/academia` — aluno pode auto-vincular-se a uma academia ativa.

#### Notificações
- **A13**: `GET /alunos/notificacoes` — retorna apenas notificações não lidas, ordenadas por criação decrescente.
- **A14**: `POST /alunos/notificacoes/visualizar` — marca TODAS como lidas.

#### Listagem de Treinos
- **A15**: `GET /alunos/treinos` — retorna TODOS os treinos (sem filtro de status). Filtro é feito no frontend.
- **A16**: `GET /alunos/treinos/historico-dias?mes=YYYY-MM` — calendário de execuções agrupado por dia, treino e grupos musculares.

#### Visibilidade no Frontend
- **A17**: **Dashboard** (`/`): `ENVIADO` → "Fichas Recebidas" (Aceitar/Recusar); `ACEITO`/`EM_ABERTO` → "Meus Treinos Ativos" (Iniciar).
- **A18**: **Meus Treinos** (`/meus-treinos`): `CADASTRADO` → "Em preparação"; `ENVIADO` → "Pendente" (Aceitar/Recusar); `ACEITO`/`EM_ABERTO`/`EM_EXECUCAO` → "Ativo" (Iniciar); `CONCLUIDO` → "Concluído" (Fazer Novamente).
- **A19**: `RECUSADO` não é exibido em nenhuma tela do aluno.
- **A20**: Treinos ordenados por nome (A, B, C) no Dashboard e Meus Treinos.

#### Fluxo de Cadastro
- **A21**: Register + Login → se ALUNO: `POST /alunos/perfil` com peso e altura obrigatórios.
- **A22**: Se `academiaId !== 'AUTOGESTAO'`: `PATCH /alunos/academia` para vincular.
- **A23**: Opções de academia: lista de academias ativas + "Autogestão (sem academia)".
- **A24**: Telefone usa máscara `(XX) XXXXX-XXXX`.

---

### 3.3 Professor — Regras de Negócio

#### Perfil
- **P1**: `POST /professores/perfil` — upsert por `usuario_id`. Campo opcional: `cref`.

#### Vínculo com Academia
- **P2**: `POST /professores/vincular/:academiaId` — cria vínculo `PENDENTE_ACADEMIA`.
- **P3**: Proteção race condition: verifica existência prévia; se P2002, retorna vínculo existente.
- **P4**: `GET /professores/vinculos` — lista todos os vínculos do professor.
- **P5**: `DELETE /professores/vinculos/:academiaId` — remove vínculo E desvincula todos os alunos daquela academia (`professor_id = null`).

#### Vincular Aluno
- **P6**: `POST /professores/alunos` — aceita `usuarioId` ou `email`.
- **P7**: Se por email: verifica se usuário existe e tem role `ALUNO`.
- **P8**: Se `academiaId` informado: verifica vínculo ATIVO do professor com a academia.
- **P9**: Usa `upsert` para criar/atualizar `professor_id` e `academia_id` do aluno.
- **P10**: Após vincular, cria notificação `PROFESSOR_ATRIBUIDO` para o aluno.

#### Dashboard
- **P11**: `GET /professores/dashboard` — retorna todos os alunos com treinos, ordenados por `atualizado_em` desc.
- **P12**: Filtro opcional por `academiaId`.

#### Fichas de Treino (Criação em Lote)
- **P13**: `POST /professores/fichas` — array de treinos para um aluno.
- **P14**: Validação: `nome`, `diasSemana` (0-6, mín 1), `exercicios` (cada: `exercicioId`, `ordem`, `series` mín 1, `repeticoes` mín 1).
- **P15**: Tenant check: `aluno.professor_id === professor.id`.
- **P16**: Exercícios com campo `nome` são auto-upsert na tabela `exercicios`.
- **P17**: Treinos criados com status `CADASTRADO`.
- **P18**: No frontend, após criar fichas, chama `POST /treinos/:id/enviar` para cada treino (auto-envio).

#### Correlações
- **P19**: `GET /professores/alunos/:alunoId/correlacoes` — professor visualiza correlações. Tenant check: `aluno.professor_id === professor.id`.

#### Exercícios
- **P20**: `GET /professores/exercicios` — lista com filtros opcionais (grupo muscular, nome, equipamento, nível).
- **P21**: `GET /professores/workoutx/exercicios?bodyPart=X` — busca externa. Traduz bodyPart EN → PT.

---

### 3.4 Academia — Regras de Negócio

#### Cadastro
- **AC1**: Única academia por usuário (`usuario_id` unique).
- **AC2**: CNPJ único. Validado como exatamente 14 dígitos (`/^\d{14}$/`).
- **AC3**: `nome` mínimo 2 caracteres.
- **AC4**: Criada com `status: PENDENTE`.

#### Máquina de Estados da Academia
- **AC5**: `PENDENTE → ATIVO | REJEITADO` (por ROOT).
- **AC6**: `REJEITADO` não pode ser reativado (apenas alteração manual de status).

#### Dashboard
- **AC7**: `GET /academias/dashboard` — retorna: nome, CNPJ, email, telefone, status, totalProfessores ATIVOS, totalAlunos, professoresPendentes (PENDENTE_ACADEMIA).

#### Autorização de Professor (1ª Camada)
- **AC8**: Academia deve estar `ATIVO` para autorizar.
- **AC9**: Limite: `_count.professores (ATIVO) >= max_professores` → `LimiteProfessoresExcedidoError` (422).
- **AC10**: Se vínculo já existe e é `ATIVO` → `ConflictError`.
- **AC11**: Se vínculo existe em outro status → atualiza para `PENDENTE_ROOT`.
- **AC12**: Se não existe → cria com `PENDENTE_ROOT`.

#### Remoção de Professor
- **AC13**: Remove apenas vínculos `ATIVO`. Status → `REMOVIDO`.
- **AC14**: Em transação: remove vínculo E atualiza alunos com `professor_id = null`.

#### Gerenciar Alunos
- **AC15**: `PATCH /academias/alunos/:alunoId/professor` — academia só pode alterar professor de alunos vinculados a ela.
- **AC16**: Se `professorId` informado, professor deve ter vínculo ATIVO com a academia.
- **AC17**: `professorId` pode ser null (desvincula professor do aluno).

#### Fichas (Academia)
- **AC18**: `POST /academias/fichas` — mesma validação do professor. Tenant check: `aluno.academia_id === academiaId`.

#### Listagem Pública
- **AC19**: `GET /academias` (sem auth) — retorna apenas academias com `status: ATIVO`.

---

### 3.5 ROOT — Regras Administrativas

#### Aprovação de Academia
- **R1**: Apenas academias `PENDENTE` podem ser aprovadas/rejeitadas.
- **R2**: `APROVAR` → status `ATIVO`; `REJEITAR` → status `REJEITADO` com `motivo` opcional.

#### Limite de Professores
- **R3**: Valor entre 1 e 500.

#### Aprovação de Vínculo (2ª Camada)
- **R4**: Apenas vínculos `PENDENTE_ROOT` podem ser aprovados/rejeitados.
- **R5**: `APROVAR` → `ATIVO`; `REJEITAR` → `REJEITADO`.

#### Reset de Senha
- **R6**: Não pode resetar senha de outro ROOT (`ForbiddenError`).
- **R7**: Nova senha mínimo 8 caracteres.

#### CRUD de Academia
- **R8**: `PUT /root/academias/:id` — atualiza nome, CNPJ, max_professores, status, email. Valida unicidade de email e CNPJ se alterados.
- **R9**: `DELETE /root/academias/:id` — cascade: remove vínculos de professor → alunos (academia_id = null) → academia → usuário.

#### CRUD de Professor
- **R10**: `PUT /root/professores/:id` — atualiza nome, email, cref, e substitui vínculos de academia (delete all + recreate ATIVO).
- **R11**: `DELETE /root/professores/:id` — cascade: alunos (professor_id = null) → professor_academia → professor → usuário.

#### CRUD de Aluno
- **R12**: `PUT /root/alunos/:id` — atualiza nome, email, telefone, data_nascimento, peso_kg, altura_cm, academia_id, professor_id.
- **R13**: `DELETE /root/alunos/:id` — cascade: execuções → treino_exercicios → treino_historico → treinos → medidas → notificações → mensagens_enviadas → correlações → aluno → usuário.

---

### 3.6 Autenticação — Regras

#### Registro
- **AU1**: `nome` (2-100 chars), `email` (válido), `senha` (mín 8 chars), `role` (`ACADEMIA|PROFESSOR|ALUNO` — ROOT não permitido).
- **AU2**: `telefone` opcional.
- **AU3**: Email único. Duplicidade → `ConflictError` (409).
- **AU4**: Senha hash com bcrypt, salt rounds = 12.

#### Login
- **AU5**: Email não encontrado → `UnauthorizedError` "E-mail ou senha inválidos" (genérico, sem vazamento de informação).
- **AU6**: Senha incorreta → mesma mensagem genérica.
- **AU7**: JWT payload: `sub` (usuario_id), `role`, `tenantId`.
- **AU8**: Refresh token persistido em DB, expira em 7 dias (configurável).
- **AU9**: Access token expira em 15 min (configurável via `JWT_EXPIRES_IN`).

#### Refresh Token
- **AU10**: Token inválido/expirado → `UnauthorizedError`.
- **AU11**: Rotação de token: refresh antigo é deletado, novo par é gerado.

#### Logout
- **AU12**: Invalida refresh token deletando do banco.

#### Middleware JWT
- **AU13**: `authenticate` — verifica Bearer token, injeta `currentUser`.
- **AU14**: `requireRole(...roles)` — verifica se role do usuário está na lista. Falha → `ForbiddenError`.
- **AU15**: Auto-refresh no frontend: em 401, tenta refresh; se falhar, redireciona para `/login`.

---

### 3.7 Workers (BullMQ) — Regras de Background

#### Inatividade 30min
- **W1**: Executa a cada 5 minutos.
- **W2**: Busca treinos `EM_EXECUCAO` com `iniciado_em >= 30min` e `finalizado_em = null`.
- **W3**: Envia push (Expo + WebPush) para o aluno: "Seu treino está parado há mais de 30 minutos."
- **W4**: Se aluno tem professor, também notifica o professor: "{nome} está com o treino parado há mais de 30 minutos."

#### Marcar como EM_ABERTO
- **W5**: Executa diariamente às 23:30 (cron: `30 23 * * *`).
- **W6**: Busca treinos `ACEITO` cujo `dias_semana` inclui o dia atual e `iniciado_em = null`.
- **W7**: Transiciona cada um para `EM_ABERTO` (ator SISTEMA) com registro no histórico.
- **W8**: Se aluno tem professor, notifica: "{nome} não iniciou o treino programado para hoje."

#### Mensagens Motivacionais
- **W9**: Job com `{ alunoId }`. Seleciona mensagem aleatória não enviada ao aluno.
- **W10**: Se todas já foram enviadas, reseta o ciclo (deleta todos os registros de envio do aluno).
- **W11**: Cria registro de envio e dispara push dual-channel com `url_estudo` nos dados.

#### Correlação de Desempenho
- **W12**: Job com `{ alunoId }`. Chama `calcularEAtualizar()` com Pearson.
- **W13**: Dados insuficientes (< 2 medidas ou < 2 semanas de volume) → salva apenas volume_semanal.

#### Push Notification Dual-Channel
- **W14**: Expo + WebPush em paralelo (`Promise.allSettled`). Erros isolados por canal.
- **W15**: Expo: verifica `Expo.isExpoPushToken()` antes de enviar. Tokens inválidos são ignorados (log warning).
- **W16**: Web Push: 410/404 → subscription expirada, ignorado silenciosamente. Se VAPID não configurado, pulado.

---

### 3.8 Correlação de Desempenho — Regras de Cálculo

- **C1**: Pearson calculado para 3 pares: `peso_volume_r`, `bf_volume_r`, `massa_magra_volume_r`.
- **C2**: Volume semanal = soma de `carga_kg * repeticoes` agregado por ISO week.
- **C3**: Mínimo: 2 medidas + 2 semanas de volume. Senão, apenas volume_semanal é salvo.
- **C4**: Pearson requer n ≥ 2 e denominador ≠ 0; senão retorna `null`.
- **C5**: Resultados cacheados em `CorrelacaoDesempenho` (único por aluno).
- **C6**: Cache expira após 30 dias (flag `sugerirAtualizacao`).
- **C7**: Interpretação do r de Pearson:
  | r | ≥ 0.7 | ≥ 0.5 | ≥ 0.3 | < 0.3 |
  |---|---|---|---|---|
  | Positivo | Forte | Moderada | Fraca | Desprezível |
  | Negativo | Forte (neg) | Moderada (neg) | Fraca (neg) | Desprezível |

---

### 3.9 Sistema — Regras Transversais

#### Vínculo Professor-Academia
- **S1**: Fluxo: `PENDENTE_ACADEMIA → (Academia aprova) → PENDENTE_ROOT → (Root aprova) → ATIVO`.
- **S2**: Estados terminais: `REJEITADO`, `REMOVIDO`.

#### Tipos de Notificação
- **S3**: `PROFESSOR_ATRIBUIDO` — quando professor vincula aluno.
- **S4**: `NOVO_TREINO` — quando treino é enviado ao aluno.

#### Resolve Helpers (Autoresolução)
- **S5**: `resolveProfessor()` — upsert para evitar 404 em contas órfãs.
- **S6**: `resolveAluno()` — upsert para evitar 404 em contas órfãs.

#### Mapa de Erros
| Erro | HTTP | Code |
|---|---|---|
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `TenantAccessError` | 403 | `TENANT_ACCESS_DENIED` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |
| `InvalidStateTransitionError` | 422 | `INVALID_STATE_TRANSITION` |
| `LimiteProfessoresExcedidoError` | 422 | `LIMITE_PROFESSORES_EXCEDIDO` |
| `ZodError` | 422 | `VALIDATION_ERROR` (com detalhes) |
| Erros não mapeados | 500 | (detalhes ocultos em produção) |

#### Isolamento de Tenant
- **S7**: Toda query deve filtrar por `professor_id`, `academia_id` ou `tenantId` do JWT.
- **S8**: Violação → `TenantAccessError` (403).

#### Race Conditions
- **S9**: Operações de criação com verificação prévia devem usar `upsert` ou `try-catch` com tratamento de P2002.

#### Constraint de Unique (Schema)
- **S10**: `usuario.email`, `academia.cnpj`, `academia.usuario_id`, `professor.usuario_id`, `aluno.usuario_id`, `professor_academia.[professor_id, academia_id]`, `treino_exercicios.[treino_id, ordem]`, `correlacao_desempenho.aluno_id`, `refresh_token.token`.

#### Default Values (Schema)
- **S11**: `academia.max_professores = 20`, `academia.status = PENDENTE`, `treino.status = CADASTRADO`, `notificacao.lida = false`.

#### Ciclo de Mensagens Motivacionais
- **S12**: Rotativo circular: cada aluno tem registro das mensagens já recebidas.
- **S13**: Quando todas as mensagens foram enviadas, o ciclo reseta (deleta todos os registros do aluno).

#### Roles no Cadastro
- **S14**: ROOT não pode ser cadastrado via registro público. Apenas via seed ou diretamente no banco.

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
| GET | `/alunos/treinos` | Listar treinos do aluno (todos os status, sem filtro no backend) |
| GET | `/alunos/treinos/historico-dias` | Calendário de dias treinados no mês (query: mes=YYYY-MM) |
| GET | `/alunos/medidas` | Listar medidas (auto-backfill do perfil se nenhuma existir) |
| POST | `/alunos/medidas` | Registrar medida com cálculo automático de IMC |
| PATCH | `/alunos/medidas/:id` | Editar medida existente (recalcula IMC) |
| GET | `/alunos/correlacoes` | Correlações em cache |
| POST | `/alunos/correlacoes` | Recalcular correlações |
| PATCH | `/alunos/academia` | Vincular aluno a academia |
| GET | `/alunos/notificacoes` | Listar notificações não lidas do aluno |
| POST | `/alunos/notificacoes/visualizar` | Marcar todas as notificações como lidas |

### Professor (`/professores`) — role PROFESSOR
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/professores/perfil` | Criar/atualizar perfil Professor (cref?) |
| POST | `/professores/vincular/:academiaId` | Solicitar vínculo (com proteção race condition) |
| GET | `/professores/vinculos` | Listar vínculos |
| DELETE | `/professores/vinculos/:academiaId` | Desvincular-se |
| POST | `/professores/alunos` | Vincular aluno ao professor |
| GET | `/professores/alunos` | Lista leve de alunos (id, nome, email), opcional `?academiaId` |
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
| GET | `/academias/alunos` | Listar alunos com treinos. Query `?resumo=true` retorna apenas id + nome + email |
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
| POST | `/treinos/:id/clonar` | Clonar treino para outro aluno | PROFESSOR/ACADEMIA |

### Root (`/root`) — role ROOT
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/root/painel` | Painel global |
| GET | `/root/academias` | Listar todas as academias (CRUD) |
| PUT | `/root/academias/:id` | Atualizar academia (nome, cnpj, max_professores, status, email) |
| DELETE | `/root/academias/:id` | Excluir academia e usuário associado |
| PATCH | `/root/academias/:id/aprovacao` | Aprovar/rejeitar academia |
| PATCH | `/root/academias/:id/limite-professores` | Definir limite |
| PATCH | `/root/academias/:id/status` | Alterar status |
| GET | `/root/vinculos` | Vínculos pendentes |
| PATCH | `/root/vinculos/:id/aprovacao` | Aprovar/rejeitar vínculo |
| GET | `/root/usuarios` | Listar usuários |
| POST | `/root/usuarios/:id/reset-password` | Resetar senha |
| GET | `/root/professores` | Listar todos os professores |
| PUT | `/root/professores/:id` | Atualizar professor (nome, email, cref, academias_ids) |
| DELETE | `/root/professores/:id` | Excluir professor e usuário associado |
| GET | `/root/alunos` | Listar todos os alunos (inclui telefone, data_nascimento, peso_kg, altura_cm) |
| PUT | `/root/alunos/:id` | Atualizar aluno (nome, email, telefone, data_nascimento, peso_kg, altura_cm, academia_id, professor_id) |
| DELETE | `/root/alunos/:id` | Excluir aluno e todos os dados relacionados (cascade) |

---

## 5. Estrutura do Frontend (`apps/web/src`)

### Páginas por Role
| Role | Página | Rota | Arquivo |
|------|--------|------|---------|
| `ALUNO` | Dashboard | `/` | `pages/aluno/Dashboard.tsx` |
| `ALUNO` | Meus Treinos | `/meus-treinos` | `pages/aluno/MeusTreinos.tsx` |
| `ALUNO` | Início do Treino | `/treino/:id/inicio` | `pages/aluno/TreinoInicio.tsx` |
| `ALUNO` | Execução | `/treino/:id/execucao` | `pages/aluno/TreinoExecucao.tsx` |
| `ALUNO` | Conclusão | `/treino/:id/conclusao` | `pages/aluno/TreinoConclusao.tsx` |
| `ALUNO` | Medidas | `/medidas` | `pages/aluno/Medidas.tsx` |
| `ALUNO` | Evolução | `/evolucao` | `pages/aluno/Evolucao.tsx` |
| `PROFESSOR` | Dashboard | `/` | `pages/professor/Dashboard.tsx` |
| `PROFESSOR` | Treinos (listagem) | `/treinos` | `pages/professor/Treinos.tsx` |
| `PROFESSOR` | Criar Treino | `/treinos/criar` | `pages/professor/CriarTreino.tsx` |
| `PROFESSOR` | Fichas (enviar) | `/fichas` | `pages/professor/Fichas.tsx` |
| `PROFESSOR` | Criar Exercício | `/exercicios/criar` | `pages/professor/CriarExercicio.tsx` |
| `PROFESSOR` | Academias | `/academias` | `pages/professor/Academias.tsx` |
| `PROFESSOR` | Vincular Aluno | `/alunos/vincular` | `pages/professor/VincularAluno.tsx` |
| `PROFESSOR` | Correlações Aluno | `/alunos/:alunoId/correlacoes` | `pages/professor/AlunoCorrelacoes.tsx` |
| `ACADEMIA` | Dashboard | `/` | `pages/academia/Dashboard.tsx` |
| `ACADEMIA` | Professores | `/professores` | `pages/academia/Professores.tsx` |
| `ACADEMIA` | Alunos | `/alunos` | `pages/academia/Alunos.tsx` |
| `ACADEMIA` | Treinos | `/treinos` | `pages/academia/Treinos.tsx` |
| `ACADEMIA` | Criar Treino | `/treinos/criar` | `pages/academia/CriarTreinoAcademia.tsx` |
| `ROOT` | Painel | `/` | `pages/root/Painel.tsx` |
| `ROOT` | Vínculos | `/vinculos` | `pages/root/Vinculos.tsx` |
| `ROOT` | Usuários | `/usuarios` | `pages/root/Usuarios.tsx` |
| `*` | Login | `/login` | `pages/auth/Login.tsx` |
| `*` | Registro | `/register` | `pages/auth/Register.tsx` |
| `*` | Alterar Senha | `/alterar-senha` | `pages/auth/AlterarSenha.tsx` |

### Stores (Zustand)
| Store | Arquivo | Responsabilidade |
|-------|---------|-----------------|
| `useAuthStore` | `stores/auth.ts` | Autenticação: login, register, logout, fetchUser, updatePushSubscription |
| `useTrainingStore` | `stores/training.ts` | Sessão ativa de treino: iniciarTreino, registrarExecucao, finalizarTreino, timer, exercicioAtual |

### Hooks
| Hook | Arquivo | Responsabilidade |
|------|---------|-----------------|
| `useNotifications` | `hooks/useNotifications.ts` | Gerenciamento de push notifications (expo/web) |
| `useToast` | (via contexto/componente) | Feedback de sucesso/erro |

### Componentes Compartilhados
| Componente | Arquivo |
|------------|---------|
| `AppShell` | `components/layout/AppShell.tsx` |
| `Toast` | `components/ui/Toast.tsx` |
| `ConfirmModal` | `components/ui/ConfirmModal.tsx` |
| `StatusBadge` | `components/ui/StatusBadge.tsx` — badge reutilizável com 7 variantes (pending/active/success/danger/warning/info/neutral) + helpers `getTreinoStatusVariant()` e `getTreinoStatusLabel()` |
| `LoadingSpinner` | `components/ui/LoadingSpinner.tsx` — spinner animado + `SkeletonCard` + `SkeletonText` para skeleton loading |
| `Icon` | `components/icons/Icon.tsx` — 20+ ícones SVG inline (Home, Dumbbell, Ruler, ChartLine, Menu, Users, etc.) |

### Design System (`index.css`)
- **Fonte**: Inter (UI sans-serif)
- **Paleta**: primary (vermelho #dc2626), surface (#18181b), surface-card (#27272a), surface-input (#3f3f46), text (#f4f4f5), text-muted (#a1a1aa), success (verde), warning (amarelo), info (azul)
- **Animações globais**: `fade-in`, `slide-up`, `slide-down`, `slide-right`, `modal-pop`, `pulse-soft`, `scale-in`
- **Utilities**: `glass` (backdrop-blur + fundo semi-transparente), `gradient-primary` (gradiente vermelho), `scrollbar-hide`
- **Ring colors por role**: ALUNO=verde, PROFESSOR=azul, ACADEMIA=amber, ROOT=vermelho

### Navegação (App.tsx)
- Rotas aninhadas por role com `<AppShell>` como wrapper
- ALUNO: Dashboard, Meus Treinos, Início/Execução/Conclusão Treino, Medidas, Evolução, Alterar Senha
- PROFESSOR: Dashboard, Treinos, Criar Treino, Exercícios, Academias, Vincular Aluno, Fichas, Correlações, Alterar Senha
- ACADEMIA: Dashboard, Professores, Alunos, Treinos, Criar Treino, Alterar Senha
- ROOT: Painel, Vínculos, Usuários
- Login/Register redirecionam para `/` se já autenticado
- Catch-all `*` redireciona para `/` (autenticado) ou `/login` (não autenticado)

### Visibilidade dos Treinos para o Aluno (Frontend)
- **Dashboard** (`/`): mostra treinos `ENVIADO` como "Fichas de Treino Recebidas" com botões Aceitar/Recusar, e `ACEITO`/`EM_ABERTO` como "Meus Treinos Ativos" com botão Iniciar
- **Meus Treinos** (`/meus-treinos`): mostra `ENVIADO` (badge azul "Pendente" + Aceitar/Recusar), `CADASTRADO` (badge amarelo "Em preparação" + mensagem), e `ACEITO`/`EM_ABERTO`/`EM_EXECUCAO` (badge verde "Ativo" + Iniciar), `CONCLUIDO` (badge verde "Concluído" + "Fazer Novamente")
- **Importante**: `GET /alunos/treinos` retorna TODOS os status sem filtro. O filtro é feito no frontend para controlar o que cada tela exibe.
- Status não exibidos em nenhuma tela do aluno: `RECUSADO`

### Fluxo de Criação de Treino (Professor/Academia)
1. Professor acessa Dashboard → "Montar Treino" → `CriarTreino.tsx`
2. Monta as fichas de treino (A/B/C) com exercícios e dias da semana
3. Clica "Salvar Treino Completo" → `POST /professores/fichas` (cria com status `CADASTRADO`)
4. **Auto-envio**: o frontend chama `POST /treinos/:id/enviar` para cada ficha criada, transicionando para `ENVIADO` e gerando notificação
5. Aluno vê na Dashboard como "Ficha de Treino Recebida" e pode Aceitar ou Recusar
6. Ao aceitar: status vai para `ACEITO`, treino aparece em Meus Treinos como disponível para iniciar

### Fluxo de Clonagem de Treino (Professor/Academia)
1. Na tela Treinos, clica em "Ver treinos" → lista os treinos do aluno
2. Clica em "Clonar" ao lado do treino desejado
3. Modal abre com dropdown de alunos destino (via `GET /professores/alunos` ou `GET /academias/alunos?resumo=true`)
4. Confirma → `POST /treinos/:id/clonar` + `POST /treinos/:id/enviar` (auto-envio)

### Arquivos Não Utilizados (Dead Code)
- `pages/aluno/Estudo.tsx` — arquivo existe no disco mas não está mapeado em nenhuma rota do `App.tsx`
- `components/ProtectedRoute.tsx` — não é importado ou usado em nenhum lugar; proteção de rota é feita diretamente via condicionais no `App.tsx`

---

## 6. Diretrizes e Padrões de Código

### Backend (`apps/api`)
1. **Compilação**: TypeScript compilado para `dist`. Nunca execute `tsc` em runtime.
2. **Prisma Client**: Gerado em `node_modules/@prisma/client`, schema em `apps/api/prisma/schema.prisma`
3. **Erros**: Use `AppError` ou subclasses (`NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `ConflictError`, `TenantAccessError`)
4. **Isolamento de tenant**: Toda query de aluno/professor/academia deve filtrar por `professor_id`, `academia_id` ou `tenantId` do JWT
5. **Autoresolução**: Use `resolveProfessor()` e `resolveAluno()` com upsert para evitar 404 em contas órfãs
6. **Race conditions**: Operações de criação com verificação + criação devem usar `upsert` ou `try-catch` com tratamento de `P2002`
7. **Fastify body parsing**: POST/PATCH sem corpo não devem ter `Content-Type: application/json`
8. **Zod**: Validação de body/query/params com zod em todas as rotas
9. **Delete aluno cascade**: Ao excluir aluno via ROOT, deletar notificações → mensagens enviadas → correlações → medidas → aluno (nesta ordem) para evitar erro de FK

### Frontend (`apps/web`)
1. **API Client**: Centralizado em `src/api/client.ts` — objeto `api` com métodos nomeados, auto-refresh em 401
2. **Estado**: Zustand stores em `src/stores/`
3. **Tipos**: `src/types/api.ts` — interfaces para todas as respostas da API
4. **Layout**: `AppShell.tsx` — sidebar desktop com seções colapsáveis + barra superior com avatar dropdown (Dados do Aluno + Sair) + drawer lateral mobile para PROFESSOR/ACADEMIA/ROOT + bottom tabs mobile para ALUNO com indicador ativo
5. **Avatar dropdown**: Avatar no canto direito da barra superior com menu contendo nome, email, "Dados do Aluno" e "Sair". Fecha ao clicar fora.
6. **Estilos**: TailwindCSS v4 com design system (cores: surface, surface-card, surface-input, primary, text, text-muted, success)
7. **Navegação**: React Router v7 com rotas aninhadas por role
8. **Confirmação**: Use `ConfirmModal` para ações destrutivas (delete)
9. **Toast**: Use `useToast()` hook para feedback de sucesso/erro
10. **Phone mask**: Use `formatPhone()` de `src/lib/phone.ts` (máscara (XX) XXXXX-XXXX). Aplicar em todo input de telefone.
11. **Utilitários compartilhados**: `src/lib/` — helpers reutilizáveis (ex: formatPhone)
12. **StatusBadge**: Use `getTreinoStatusVariant(status)` para obter a variante correta de badge por status do treino. Use `getTreinoStatusLabel(status)` para o label em português.
13. **Skeleton loading**: Use `SkeletonCard` e `SkeletonText` de `LoadingSpinner.tsx` para estados de carregamento.
14. **Ícones**: Use `Icon` de `components/icons/Icon.tsx` com nome do ícone (ex: `<Icon name="home" />`).

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

## 7. Skills do Projeto (`.agent/skills/`)

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

## 8. Instruções de Deploy (Railway)

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

## 9. Comandos Úteis

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
