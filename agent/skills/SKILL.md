
Qualquer tentativa de transição fora dessa tabela deve lançar uma
exceção de domínio (`InvalidStateTransitionError`), nunca ser ignorada
silenciosamente. Toda transição deve ser registrada na tabela
`treino_historico` com: treino_id, status_anterior, status_novo,
timestamp, ator_id (quem disparou a ação — aluno, professor ou sistema).

## Regra 4 — Workers e jobs assíncronos

- Jobs agendados (BullMQ/Celery) vivem em uma camada separada de
  "Workers", que consomem Services existentes — nunca reimplementam
  lógica de negócio duplicada.
- O timer de inatividade de 30 minutos é calculado a partir de
  `started_at` (não do último exercício concluído). Job roda em
  intervalo curto (ex.: a cada 5 minutos) verificando
  `started_at + 30min < now() AND finished_at IS NULL`.
- Ao disparar o alerta de inatividade, o Worker deve notificar tanto o
  Aluno quanto o Professor responsável (dois eventos separados).
- A rotação de mensagens motivacionais usa fila circular por aluno:
  Service seleciona aleatoriamente entre mensagens não presentes em
  `mensagem_motivacional_enviada` para aquele aluno; se todas já foram
  usadas, reseta o ciclo antes de selecionar.

## Regra 5 — Testes obrigatórios

- Toda função de Service nova exige teste unitário cobrindo: caso de
  sucesso, e ao menos uma transição de estado inválida esperada como erro.
- Testes de timer/inatividade devem usar mock de tempo (ex.: `jest.useFakeTimers`
  ou `freezegun` em Python), nunca sleep real.
- Repository deve ser testado com filtro de tenant_id, garantindo que
  dados de outro tenant nunca sejam retornados.

## Regra 6 — Convenções de nomenclatura

- Entidades de domínio do negócio em português: `Treino`, `Exercicio`,
  `MedidaCorporal`, `Academia`, `Professor`, `Aluno`.
- Termos técnicos de infraestrutura em inglês: `Repository`, `Service`,
  `Controller`, `middleware`, `tenant_id`.
- Nomes de tabelas em snake_case; nomes de classes em PascalCase;
  métodos em camelCase (Node) ou snake_case (Python), conforme a stack
  escolhida no projeto.

## Checklist antes de finalizar qualquer entrega de backend

- [ ] Controller não contém lógica de negócio.
- [ ] Toda query passa por filtro de tenant_id.
- [ ] Transições de estado do Treino seguem exatamente a tabela definida.
- [ ] Mudança de estado registrada em treino_historico.
- [ ] Testes unitários cobrindo sucesso e falha de transição.
- [ ] Jobs assíncronos reutilizam Services existentes, sem lógica duplicada.