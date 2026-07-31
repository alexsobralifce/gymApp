# Self-Treino para Professor

## Funcionalidade

Professores agora podem criar, editar, executar e ver histórico dos **próprios treinos**, com a mesma experiência de um aluno em autogestão.

## Como funciona

- **Backend**: Ao acessar o fluxo de autogestão, um registro `alunos` self é criado sob demanda para o professor (chaveado por `usuario_id`, com `professor_id: null`). O modelo `treinos.aluno_id` permanece obrigatório — sem mudança de schema.
- **Frontend**: Menu do professor ganha a seção **"Meu Treino"** com "Meus Treinos" e "Criar Meu Treino", reutilizando as páginas do aluno (`MeusTreinos`, `CriarTreinoAluno`, `TreinoInicio`, `TreinoExecucao`, `TreinoConclusao`).

## Rotas liberadas para PROFESSOR

| Rota | Guard anterior | Guard novo |
|---|---|---|
| `POST /treinos/autogestao` | ALUNO | ALUNO, PROFESSOR |
| `POST /treinos/:id/iniciar` | ALUNO | ALUNO, PROFESSOR |
| `POST /treinos/:id/execucoes` | ALUNO | ALUNO, PROFESSOR |
| `POST /treinos/:id/finalizar` | ALUNO | ALUNO, PROFESSOR |
| `PATCH /treinos/:id` | PROF (students only) | PROF (students + self) |
| `DELETE /treinos/:id` | PROF (students only) | PROF (students + self) |
| `GET /treinos/:id` | PROF (students only) | PROF (students + self) |
| `GET /alunos/treinos` | ALUNO | ALUNO, PROFESSOR |
| `GET /alunos/treinos/historico-dias` | ALUNO | ALUNO, PROFESSOR |

## Efeitos colaterais

- **Feed social**: treinos próprios do professor geram posts no feed (fanout workers), com consentimento habilitado via `consentiu_feed_social_em` no self-aluno.
- **Lista de alunos**: o self-aluno tem `professor_id: null`, não polui a lista de alunos do professor no dashboard.
- **XP e badges**: funcionam via pipeline existente (self-aluno participa do sistema de gamificação).
- **Treino IA e Biblioteca de Planos**: permanecem ALUNO-only (não liberados para professor).
