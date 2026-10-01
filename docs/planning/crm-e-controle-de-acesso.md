# CRM e Controle de Acesso (Catraca) — Plano de Implementação

> Status: **planejamento** (nada implementado). Escopo pedido: incorporar **CRM** e **controle de catraca** ao ENDORFINAPP para o segmento **Academia**.
> Regra deste doc: separar **VERIFICADO no repo**, **REFERÊNCIA DE MERCADO** (pesquisa na internet, com link) e **A CONFIRMAR** (depende de doc oficial de fabricante, jurídico ou decisão de produto). Nada de endpoint, preço ou regra legal inventado.
> Data: 2026-10-01
> Documentos relacionados: `catalogo-de-precos.md`, `plano-academia-limites-professores-alunos.md`, `implementacao-tecnica-planos-billing.md`, `integracao-mercado-pago.md`.

---

## 1. Objetivo e escopo

Hoje o produto cobre **treino, avaliação física, social e planos**. Os concorrentes diretos de academia (Tecnofit, Next Fit, Pacto, EVO) vendem **gestão comercial e operacional**: funil de vendas, retenção, mensalidade e acesso. Esse é o motivo de eles cobrarem de R$ 300 a R$ 1.000/mês por unidade, enquanto nossos planos de academia custam de R$ 199 a R$ 749 (ver `catalogo-de-precos.md` §2).

**Objetivo:** fechar essa lacuna sem perder o diferencial atual (dados de treino e avaliação), usando esse diferencial para **retenção**, que é onde o CRM da concorrência é mais fraco por não ter dado de treino.

**Dentro do escopo**
- **CRM comercial:** leads, funil configurável, follow-up, conversão em aluno, métricas de conversão.
- **CRM de retenção:** alertas automáticos de evasão baseados em treino e acesso, régua de contato, NPS.
- **Check-in:** QR dinâmico no app do aluno (sem hardware proprietário).
- **Mensalidade do aluno:** planos e cobranças da academia para o aluno (pré-requisito para bloquear por inadimplência).
- **Catraca física:** agente local + integração com um fabricante (Control iD como primeiro alvo).
- **Fundação:** papel de recepção/comercial, `Unidade`, gating por plano, LGPD.

**Fora do escopo (agora)**
- Controle de acesso facial e biometria (entra só depois de parecer jurídico; ver §11).
- ERP completo (estoque, contas a pagar, DRE, comissão de vendedor).
- Emissão de NFS-e (já tratada em outro plano; ver `catalogo-de-precos.md`).
- Agendamento de aulas coletivas / reserva de vagas.
- App nativo da recepção. A recepção usa o web responsivo.
- Automação de WhatsApp via API oficial (decisão em aberto; ver §17, Q4).

---

## 2. Referências de mercado (pesquisa)

Fontes consultadas em 2026-10-01. Onde a página não detalhava, está marcado.

### 2.1 Funil de vendas e CRM

| Referência | O que tem de útil para nós |
|---|---|
| [Next Fit — Como criar um funil no CRM](https://ajuda.nextfit.com.br/support/solutions/articles/69000850882-como-criar-um-funil-no-crm-) | Funil configurável (criar, renomear, reordenar etapas). Exemplo: **Primeiro contato → Aula experimental → Compra do contrato → Ganhou/Perdeu**. Oportunidade ligada a **lead ou cliente**, com **múltiplas oportunidades por contato**. A página não detalha automações, tarefas nem motivos de perda. |
| [Tecnofit — CRM para academias](https://www.tecnofit.com.br/blog/importancia-crm-para-academias/) e [Tecnofit — Soluções](https://www.tecnofit.com.br/solucoes-tecnofit/) | CRM com **funil personalizado**, campanhas por e-mail/SMS, **sequências de boas-vindas**, follow-up de leads e **campanhas de reativação de ex-alunos** sem intervenção manual. |
| [Tecnofit — Funil de vendas de academia](https://www.tecnofit.com.br/blog/funil-de-vendas-de-academia/) · [Pacto — Funil de vendas](https://blog.sistemapacto.com.br/funil-de-vendas-para-academia/) | Funil de 4 etapas (atrair, converter, fechar, reter). **A CONFIRMAR:** as páginas não carregaram por completo na pesquisa; usar só como referência de conceito. |
| [Sults — Sistemas para redes de academias](https://www.sults.com.br/solucoes/gestao/5-melhores-sistemas-redes-academias) | Referência para o requisito de **multiunidade** em redes. |

### 2.2 Retenção e churn

Fonte principal: [Pacto — Framework de 4 fases para reduzir churn](https://blog.sistemapacto.com.br/como-reduzir-churn-em-academia-framework-4-fases/).

- **Churn mensal** = cancelamentos ÷ alunos ativos no início do mês. **Benchmark Brasil: 4–7% ao mês.**
- **72% dos cancelamentos ocorrem nos primeiros 90 dias.**
- Aluno que **não volta até o 5º dia** tem **4x mais chance de cancelar**.
- Gatilho clássico: **queda de 50% na frequência semanal** frente às 4 semanas anteriores. Meta de frequência: **3+ vezes por semana**; abaixo de 2 é alerta vermelho.
- **NPS mensal:** detratores (0–6) recebem contato em até 24h; antecipam o cancelamento em 30–45 dias.
- **Win back:** contato nos dias **30, 60 e 90** após o cancelamento, segmentado por motivo.
- Reduzir 1 ponto de churn mensal aumenta o LTV em 18–25%.

Régua por dias sem treinar, citada em [Pacto](https://blog.sistemapacto.com.br/como-reduzir-churn-em-academia-framework-4-fases/) e [Tecnofit — Retenção](https://www.tecnofit.com.br/blog/retencao-de-alunos-em-cross-training/): **7 dias** mensagem automática; **14 dias** ligação da recepção ou instrutor; **21 dias** oferta personalizada; **30 dias** contato do gestor com proposta de renegociação.

> Os números acima vêm de blogs de fornecedores (interesse comercial). Usar como **valores padrão configuráveis**, não como verdade absoluta. Calibrar com os dados reais das primeiras academias.

### 2.3 Catraca e controle de acesso

| Referência | O que tem de útil para nós |
|---|---|
| [Control iD — API Linha de Acesso (iDBlock Next)](https://www.controlid.com.br/docs/access-api-pt/particularidade-dos-produtos/idblock-next/) | Dispositivos com arquitetura **primário/secundário**: o primário decide o acesso de todos os secundários. Eventos em tempo real pelo **endpoint de monitor** (`catra_event`: giro à direita, giro à esquerda, desistência) e por **notificações push** do modo online. Parâmetros no módulo `sec_box` (`catra_role`, `catra_timeout`, `catra_sync_period`). Identificação por **biometria, cartão, senha ou facial**. |
| [Control iD — iDBlock QR Code](https://www.controlid.com.br/controle-de-acesso/idblock-qr/) | Catraca com leitor de **QR Code** e software de gestão web. Caminho natural para o nosso QR dinâmico. |
| [Tecnofit — Catracas compatíveis](https://ajuda.tecnofit.com.br/pt-BR/support/solutions/articles/67000673159-quais-catracas-s%C3%A3o-compat%C3%ADveis-com-o-sistema-tecnofit-) · [Pacto — Catraca Control iD iDFlex](https://sistemapacto.zendesk.com/hc/pt-br/articles/49275468136595-Catraca-ControliD-IdFlex) | Mostram o **modelo de mercado**: o sistema de gestão mantém **lista de fabricantes homologados**. Integração por TCP/IP em rede local, com leitura de digital, código de barras e RFID. |

**Conclusão de arquitetura:** a catraca fica **na rede local da academia**. A nuvem não alcança o dispositivo. Todo concorrente resolve isso com um **componente local** (serviço/gateway) que faz a ponte. Vamos seguir o mesmo modelo (§10).

### 2.4 LGPD e biometria

Fontes: [Pacto — LGPD em academia](https://blog.sistemapacto.com.br/lgpd-tudo-o-que-voce-precisa-saber-para-nao-ser-pego-de-surpresa/), [Certponto — Controle de acesso facial e LGPD](https://certponto.com.br/controle-de-acesso-facial-e-lgpd/), [Confidata — LGPD e dados biométricos](https://confidata.com.br/blog/lgpd-dados-biometricos-reconhecimento-facial-digital), [IDEC — Biometria facial](https://idec.org.br/sites/default/files/nt_biometria_facial_no_setor_de_saude_-_idec.pdf), [ANPD — Nota Técnica 5/2025](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos/nota-tecnia-5_2025_fis_cgf_versao-publica_ocultado.pdf/@@display-file/file).

- Biometria facial e digital é **dado pessoal sensível** (LGPD, Lei 13.709/2018).
- Em academia, a base costuma ser **consentimento específico e destacado**, separado do contrato, com finalidade explícita (ex.: "controle de acesso e frequência").
- É preciso oferecer **alternativa sem biometria** (QR ou cartão). A ANPD reforça a **não obrigatoriedade** quando há meio razoável de identificação.
- **Eliminação ao cancelar o plano** e armazenamento seguro.
- **A CONFIRMAR com advogado:** papéis de controlador e operador entre nós e a academia, prazo de retenção, e se a biometria fica no dispositivo ou na nuvem. Isso muda o risco.

### 2.5 Faixas de preço de mercado (já analisadas)

Ver pesquisa anterior (Pacto: [Quanto custa um sistema para academia](https://blog.sistemapacto.com.br/quanto-custa-sistema-para-academia/)): até 100 alunos R$ 150–300; 100–300 alunos R$ 300–600; 300–800 alunos R$ 600–1.000; rede R$ 1.000+ por unidade. Custos extras no mercado: **MDR de 1,8% a 3,5%**, hardware de R$ 0 a R$ 6.000, implantação e treinamento.

---

## 3. O que JÁ existe no repo (verificado)

| Peça | Evidência | Como reaproveitar |
|---|---|---|
| Papéis `ROOT, ACADEMIA, PROFESSOR, ALUNO` | `apps/api/prisma/schema.prisma` (`enum Role`) | Falta um papel de recepção/comercial (§5.1). |
| Tenant por academia | `Academia` (`schema.prisma:65`), `Aluno.academia_id` (`:112`), `ProfessorAcademia` (`:98`) | Todo modelo novo carrega `academia_id`. |
| Convite de professor para aluno | `ConviteAluno` (`schema.prisma:908`) | Base do fluxo "lead vira aluno". |
| Planos com flags de recurso | `PlanoAssinatura.recursos Json` (`schema.prisma:747-773`): "flags de feature: relatorios, white_label, multiunidade..." | **Gating dos módulos novos sem migration**: basta novas chaves em `recursos`. |
| Limite por faixa de aluno ativo | `application/usecases/billing/LimiteAlunosService.ts` | Mesmo padrão para limites de leads/catracas, se necessário. |
| Fila e workers | `bullmq` + `ioredis` (`apps/api/package.json`), `jobs/social/queues.ts` (padrão: `attempts: 3`, backoff exponencial) | Jobs de retenção seguem o mesmo padrão. |
| Notificações | `Notificacao`, `NotificacaoTipo`, `infrastructure/push`, `infrastructure/email` | Canal de mensagem automática (push e e-mail) já disponível. |
| Integração externa com token criptografado | `WearableIntegracao` + `shared/crypto.ts` (`encryptSecret`) | Padrão para guardar segredo do dispositivo. |
| Instagram | `infrastructure/instagram`, `routes/instagram.routes.ts` | Possível origem de lead (§6.9). |
| Dados de treino | `Treino`, `TreinoHistorico`, `ExecucaoExercicio` | Fonte da "última atividade" para retenção. |
| Pagamento da **plataforma** | `Cobranca`, `PagamentoMetodo`, `infrastructure/payments`, `integracao-mercado-pago.md` | Cobra a academia pelo nosso SaaS. **Não** cobra a mensalidade do aluno (§7). |

### Lacunas (verificado: não existe nada)
- Busca por `checkin`, `catraca`, `lead` em `apps/api/src` e no `schema.prisma`: **sem resultado de domínio** (só jobs/health sem relação).
- Não existe entidade `Unidade`. Multiunidade é só promessa de plano (`AC_REDE`).
- Não existe papel de equipe da academia além do próprio dono.
- Não existe cobrança de aluno pela academia.

---

## 4. Decisões de arquitetura

| # | Decisão | Motivo | Alternativa descartada |
|---|---|---|---|
| D1 | **Módulos novos em `apps/api/src/modules/crm`, `modules/acesso`, `modules/financeiro-aluno`**, cada um com suas rotas, serviços e repositórios | `modules/social` já mostra o padrão de módulo autocontido; evita inflar `usecases/` | Colocar tudo em `presentation/http/routes` + `usecases` (mistura domínios) |
| D2 | **Funil como tabela** (`EtapaFunil`), não enum | Cada academia quer nomes e quantidades próprios (Next Fit e Tecnofit fazem assim) | Enum fixo |
| D3 | **Status do lead separado da etapa** (`ABERTO/GANHO/PERDIDO`) | Simplifica relatórios e permite reabrir lead perdido | Só etapa |
| D4 | **Um lead = uma oportunidade** na v1 | Next Fit permite várias, mas é complexidade que o público pequeno não pede | Entidade `Oportunidade` separada (revisitar na v2) |
| D5 | **Automação por regras no código, com parâmetros por academia** | Regras fixas e testáveis; só limiares (dias) variam por academia | Motor de regras genérico (caro e difícil de depurar) |
| D6 | **Check-in por QR assinado com chave assimétrica (Ed25519)** | O agente local valida **offline** só com a chave pública e a expiração | JWT HS256 (obriga o agente a guardar o segredo) ou consulta online a cada giro |
| D7 | **Agente local é a única ponta que fala com a catraca** | Catraca está na LAN; padrão de mercado | Chamar a catraca direto da nuvem (inviável) |
| D8 | **Decisão de acesso fica na regra do nosso backend, replicada no agente em cache** | Uma fonte de verdade; agente só aplica | Regras duplicadas no firmware da catraca |
| D9 | **Gating por `PlanoAssinatura.recursos`** | Já existe e não exige migration | Tabela nova de entitlements |
| D10 | **Biometria fora da v1** | Risco jurídico alto; QR e cartão resolvem a maioria dos casos | Facial já na v1 |

### Visão geral

```
                           ┌──────────────────────────────┐
  Recepção/Comercial ───▶  │  Web (React)                 │
  Dono da academia   ───▶  │  /crm  /acesso  /financeiro  │
  Aluno (app)        ───▶  │  QR de acesso                │
                           └──────────────┬───────────────┘
                                          │ HTTPS + JWT
                           ┌──────────────▼───────────────┐
                           │ API Fastify (apps/api)       │
                           │  modules/crm                 │
                           │  modules/acesso              │
                           │  modules/financeiro-aluno    │
                           │  jobs/retencao (BullMQ)      │
                           └───┬───────────────┬──────────┘
                      Postgres │               │ HTTPS + token de dispositivo
                               │      ┌────────▼─────────┐  LAN  ┌──────────────┐
                               │      │ Agente local     │◀────▶ │ Catraca      │
                               │      │ (na academia)    │       │ Control iD   │
                               │      │ cache + fila     │       └──────────────┘
                               │      └──────────────────┘
```

---

## 5. Fase 0 — Fundação

Pré-requisito de todas as outras. Sem isso, o CRM nasce sem dono e a catraca sem unidade.

### 5.1 Papel de equipe da academia

- **Novo valor no `enum Role`: `RECEPCAO`.** Migration própria, porque alterar enum no PostgreSQL é delicado (não usar o valor novo na mesma transação em que ele é criado).
- Novo modelo `FuncionarioAcademia`: liga `Usuario` à `Academia` (e opcionalmente a uma `Unidade`), com `cargo` (`RECEPCAO`, `COMERCIAL`, `GERENTE`).
- Permissões por papel (resumo):

| Ação | ACADEMIA (dono) | RECEPCAO | PROFESSOR | ALUNO |
|---|---|---|---|---|
| Ver/editar leads e funil | sim | sim | só os seus, se habilitado | não |
| Configurar etapas, regras, catracas | sim | não | não | não |
| Ver financeiro do aluno | sim | só status (em dia/atrasado) | não | só o próprio |
| Ver log de acessos | sim | sim | só dos seus alunos | só o próprio |
| Liberar acesso manual (catraca) | sim | sim | não | não |

- **Guarda no backend:** `app.requireRole(Role.ACADEMIA, Role.RECEPCAO)` (`presentation/middlewares/jwtAuth.ts`). Um helper `resolveAcademiaDoUsuario(userId)` retorna o `academia_id` do dono **ou** do funcionário. **Nunca** aceitar `academia_id` vindo do body/query: sempre derivar do JWT (padrão de isolamento de tenant do projeto).

### 5.2 `Unidade`

```prisma
model Unidade {
  id            String   @id @default(cuid())
  academia_id   String
  nome          String
  endereco      String?
  ativa         Boolean  @default(true)
  criado_em     DateTime @default(now())
  atualizado_em DateTime @updatedAt
  academia      Academia @relation(fields: [academia_id], references: [id], onDelete: Cascade)

  @@index([academia_id])
  @@map("unidades")
}
```

- **Backfill:** a migration cria **uma unidade "Principal" por academia existente**.
- Modelos novos (`Lead`, `Catraca`, `Acesso`, `Tarefa`) recebem `unidade_id` **opcional**. Academia de uma unidade só nunca vê a palavra "unidade" na UI.
- **Decisão a confirmar (§17, Q1):** criar já agora ou adiar. Recomendação: **criar agora**, porque adicionar depois, com dados em produção, custa muito mais.

### 5.3 Gating por plano

Novas chaves em `PlanoAssinatura.recursos` (JSON, sem migration de schema; só `seed` e leitura):

```json
{ "crm": true, "retencao": true, "checkin_qr": true, "mensalidade_aluno": true, "catraca": true, "max_catracas": 2 }
```

- Helper `exigeRecurso('crm')` como `preHandler` Fastify. Resposta padrão `403` com código `RECURSO_NAO_DISPONIVEL_NO_PLANO` e o plano mínimo sugerido, para a UI mostrar o upsell.
- A distribuição por plano é decisão de produto (§12).

### 5.4 Critérios de aceite da Fase 0
- Usuário `RECEPCAO` consegue logar e só acessa rotas liberadas.
- Toda academia existente tem uma `Unidade` "Principal".
- Rota protegida por `exigeRecurso` retorna 403 em plano sem a flag e 200 em plano com ela (teste de integração).

---

## 6. Fase 1 — CRM comercial

### 6.1 Modelo de dados

Convenções do `schema.prisma`: ids `cuid()`, colunas `snake_case`, `criado_em`/`atualizado_em`, `@@map` plural.

```prisma
enum LeadOrigem   { INSTAGRAM INDICACAO SITE WHATSAPP PASSAGEM CONVITE_ALUNO OUTRO }
enum LeadStatus   { ABERTO GANHO PERDIDO }
enum MotivoPerda  { PRECO SEM_TEMPO LOCALIZACAO CONCORRENTE SEM_RESPOSTA OUTRO }
enum InteracaoTipo { LIGACAO WHATSAPP EMAIL VISITA AULA_EXPERIMENTAL NOTA MUDANCA_ETAPA }
enum TarefaStatus { PENDENTE CONCLUIDA CANCELADA }
enum TarefaOrigem { MANUAL AUTOMACAO }

model EtapaFunil {
  id            String      @id @default(cuid())
  academia_id   String
  nome          String
  ordem         Int
  /// Etapa terminal: GANHO fecha como matriculado, PERDIDO como perdido. Null = etapa intermediária.
  tipo_final    LeadStatus?
  cor           String?
  criado_em     DateTime    @default(now())
  atualizado_em DateTime    @updatedAt
  academia      Academia    @relation(fields: [academia_id], references: [id], onDelete: Cascade)
  leads         Lead[]

  @@unique([academia_id, ordem])
  @@index([academia_id])
  @@map("etapas_funil")
}

model Lead {
  id                   String       @id @default(cuid())
  academia_id          String
  unidade_id           String?
  etapa_id             String
  responsavel_id       String?
  nome                 String
  telefone             String?
  /// Somente dígitos, com DDI (ex.: 5585999999999). Usado para deduplicar.
  telefone_norm        String?
  email                String?
  data_nascimento      DateTime?
  objetivo             String?
  origem               LeadOrigem   @default(OUTRO)
  origem_detalhe       String?
  status               LeadStatus   @default(ABERTO)
  motivo_perda         MotivoPerda?
  motivo_perda_texto   String?
  valor_estimado       Decimal?     @db.Decimal(10, 2)
  /// Preenchido na conversão. @unique impede converter o mesmo lead duas vezes.
  aluno_id             String?      @unique
  /// Base legal LGPD para contato comercial
  consentiu_contato_em DateTime?
  ultimo_contato_em    DateTime?
  fechado_em           DateTime?
  criado_em            DateTime     @default(now())
  atualizado_em        DateTime     @updatedAt
  academia             Academia     @relation(fields: [academia_id], references: [id], onDelete: Cascade)
  etapa                EtapaFunil   @relation(fields: [etapa_id], references: [id])
  responsavel          Usuario?     @relation("LeadsResponsavel", fields: [responsavel_id], references: [id])
  aluno                Aluno?       @relation(fields: [aluno_id], references: [id])
  interacoes           LeadInteracao[]
  tarefas              Tarefa[]
  tags                 LeadTag[]

  @@unique([academia_id, telefone_norm])
  @@index([academia_id, status, etapa_id])
  @@index([academia_id, responsavel_id])
  @@map("leads")
}

model LeadInteracao {
  id            String        @id @default(cuid())
  lead_id       String
  autor_id      String?       // null = gerada pelo sistema
  tipo          InteracaoTipo
  descricao     String?
  etapa_de_id   String?       // preenchidos quando tipo = MUDANCA_ETAPA
  etapa_para_id String?
  ocorrida_em   DateTime      @default(now())
  criado_em     DateTime      @default(now())
  lead          Lead          @relation(fields: [lead_id], references: [id], onDelete: Cascade)
  autor         Usuario?      @relation("InteracoesAutor", fields: [autor_id], references: [id])

  @@index([lead_id, ocorrida_em])
  @@map("lead_interacoes")
}

/// Follow-up. Atende lead (comercial) e aluno (retenção).
model Tarefa {
  id             String       @id @default(cuid())
  academia_id    String
  unidade_id     String?
  lead_id        String?
  aluno_id       String?
  responsavel_id String?
  titulo         String
  descricao      String?
  vence_em       DateTime
  status         TarefaStatus @default(PENDENTE)
  origem         TarefaOrigem @default(MANUAL)
  /// Chave da regra de retenção que gerou a tarefa. Evita duplicar o mesmo alerta.
  regra_chave    String?
  concluida_em   DateTime?
  criado_em      DateTime     @default(now())
  atualizado_em  DateTime     @updatedAt
  academia       Academia     @relation(fields: [academia_id], references: [id], onDelete: Cascade)
  lead           Lead?        @relation(fields: [lead_id], references: [id], onDelete: Cascade)
  aluno          Aluno?       @relation(fields: [aluno_id], references: [id], onDelete: Cascade)
  responsavel    Usuario?     @relation("TarefasResponsavel", fields: [responsavel_id], references: [id])

  @@unique([aluno_id, regra_chave, vence_em])
  @@index([academia_id, status, vence_em])
  @@index([responsavel_id, status])
  @@map("tarefas")
}

model Tag     { id String @id @default(cuid())
                academia_id String
                nome String
                cor String?
                academia Academia @relation(fields: [academia_id], references: [id], onDelete: Cascade)
                leads LeadTag[]
                @@unique([academia_id, nome])
                @@map("tags") }

model LeadTag { lead_id String
                tag_id String
                lead Lead @relation(fields: [lead_id], references: [id], onDelete: Cascade)
                tag  Tag  @relation(fields: [tag_id], references: [id], onDelete: Cascade)
                @@id([lead_id, tag_id])
                @@map("lead_tags") }
```

Relações inversas a adicionar: `Academia` (`etapas`, `leads`, `tarefas`, `tags`, `unidades`), `Aluno` (`leadOrigem`, `tarefas`), `Usuario` (`LeadsResponsavel`, `InteracoesAutor`, `TarefasResponsavel`).

**Notas de modelagem**
- `@@unique([academia_id, telefone_norm])`: no PostgreSQL, vários `NULL` são permitidos, então lead sem telefone não colide. Cadastro com telefone já existente **não duplica**: devolve o lead existente e registra uma `LeadInteracao` ("nova tentativa de contato").
- Validar no service que `Tarefa` tem `lead_id` **ou** `aluno_id` (o Prisma não expressa essa regra).
- Dinheiro em `Decimal`, nunca `Float`.
- `Tarefa` com `aluno_id` nulo ignora o `@@unique` (NULL não colide); a deduplicação de alerta só vale para retenção, que sempre tem `aluno_id`.

### 6.2 Etapas padrão (seed por academia)

Baseadas no exemplo da [Next Fit](https://ajuda.nextfit.com.br/support/solutions/articles/69000850882-como-criar-um-funil-no-crm-):

| Ordem | Etapa | `tipo_final` |
|---|---|---|
| 1 | Novo contato | — |
| 2 | Contatado | — |
| 3 | Aula experimental | — |
| 4 | Proposta | — |
| 5 | Matriculado | `GANHO` |
| 6 | Perdido | `PERDIDO` |

Criadas quando a academia é aprovada (`AcademiaStatus.ATIVO`) e, para academias existentes, na migration de dados.

### 6.3 Regras de negócio

1. **Criar lead:** exige `nome` e (`telefone` ou `email`). Normaliza o telefone (só dígitos, DDI 55 se ausente). Cai na primeira etapa.
2. **Mover etapa:** registra `LeadInteracao` tipo `MUDANCA_ETAPA` com `etapa_de_id`/`etapa_para_id`. Mover para etapa `GANHO` **só via conversão** (§6.4); mover para `PERDIDO` **exige `motivo_perda`**.
3. **Reabrir lead perdido:** volta a `ABERTO`, limpa `motivo_perda` e `fechado_em`, registra interação.
4. **Atualizar `ultimo_contato_em`** a cada interação que não seja `MUDANCA_ETAPA` nem `NOTA`.
5. **Lead parado:** tarefa automática se `ABERTO` sem interação há N dias (padrão 3, configurável).
6. **Exclusão:** só `soft delete` lógico via status; exclusão física apenas a pedido de titular (LGPD, §11).

### 6.4 Conversão de lead em aluno

Em **uma transação**:
1. Reaproveita `Usuario` pelo e-mail, ou cria um novo (senha provisória por convite, mesmo fluxo de `ConviteAluno`).
2. Cria `Aluno` com `academia_id` da academia e `professor_id` opcional.
3. Grava `Lead.aluno_id`, `status = GANHO`, `fechado_em`, etapa `GANHO`.
4. Registra `LeadInteracao` de conversão.
5. Se `mensalidade_aluno` estiver ativa, abre o fluxo de matrícula (§7).

Idempotência: `Lead.aluno_id @unique` + checagem de status impedem converter duas vezes (clique duplo, retry de rede).

### 6.5 API (rotas)

Arquivo `modules/crm/crm.routes.ts`, registrado com prefixo `/crm`. Guarda: `[app.authenticate, app.requireRole(Role.ACADEMIA, Role.RECEPCAO), exigeRecurso('crm')]`. Validação com **zod**; `academia_id` sempre do JWT.

| Método e rota | Função |
|---|---|
| `GET /crm/funil` | Etapas e leads agrupados (kanban), com filtros |
| `POST /crm/etapas` · `PATCH /crm/etapas/:id` · `DELETE /crm/etapas/:id` | Gerenciar etapas (só `ACADEMIA`; não apagar etapa com leads) |
| `PATCH /crm/etapas/reordenar` | Reordenar em lote |
| `GET /crm/leads` · `POST /crm/leads` | Listar (paginado, busca) e criar |
| `GET /crm/leads/:id` | Detalhe com linha do tempo |
| `PATCH /crm/leads/:id` | Editar dados |
| `POST /crm/leads/:id/mover` | Mudar etapa (`{ etapaId, motivoPerda? }`) |
| `POST /crm/leads/:id/interacoes` | Registrar contato/nota |
| `POST /crm/leads/:id/converter` | Converter em aluno (§6.4) |
| `POST /crm/leads/:id/reabrir` | Reabrir lead perdido |
| `GET /crm/tarefas` · `POST /crm/tarefas` · `PATCH /crm/tarefas/:id` | Follow-ups (hoje, atrasadas, minhas) |
| `GET /crm/metricas` | Conversão por etapa, origem, tempo médio, perdas por motivo |
| `POST /public/leads/:academiaSlug` | Captura pública (§6.9), rate limit + captcha |

### 6.6 Métricas (relatório)

| Métrica | Cálculo |
|---|---|
| Leads novos | `COUNT(Lead)` no período |
| Conversão geral | `GANHO ÷ (GANHO + PERDIDO)` do período |
| Conversão por etapa | leads que passaram pela etapa N e chegaram à N+1, via `MUDANCA_ETAPA` |
| Tempo médio de fechamento | `AVG(fechado_em - criado_em)` dos `GANHO` |
| Tempo parado por etapa | diferença entre `MUDANCA_ETAPA` consecutivas |
| Perdas por motivo | `GROUP BY motivo_perda` |
| Origem que mais converte | `GROUP BY origem` com taxa de ganho |
| Previsão de receita | `SUM(valor_estimado)` dos `ABERTO` em etapas avançadas |

### 6.7 Interface (web)

- Nova área `apps/web/src/pages/academia/crm/`: `Funil.tsx` (kanban, arrastar e soltar), `LeadDetalhe.tsx` (drawer com linha do tempo e ações), `Tarefas.tsx`, `CrmMetricas.tsx`, `ConfigEtapas.tsx`.
- Tipos em `apps/web/src/types/api.ts`; métodos nomeados em `api/client.ts` (padrão do projeto); estado em Zustand `stores/crmStore.ts`.
- Item "CRM" no `AppShell.tsx` para `ACADEMIA` e `RECEPCAO`, escondido se o plano não tem a flag (mostrar com cadeado e CTA de upgrade).
- **Padrões de UI:** seguir a skill `ui-ux-padrao` (botão primário/secundário, formulários, foco visível, contraste WCAG 2.2 AA). Kanban com alternativa por teclado e por lista no celular.
- **Mobile:** a recepção usa celular no balcão. No telefone o funil vira **lista agrupada por etapa**, não colunas.

### 6.8 Ações de contato (v1 sem WhatsApp oficial)

- Botão "Chamar no WhatsApp" abre `https://wa.me/<telefone_norm>?text=<modelo>` **no aparelho da recepção**. Sem custo, sem API, e a interação é registrada manualmente com um toque.
- Modelos de mensagem editáveis por academia (boas-vindas, confirmação de aula experimental, follow-up).
- E-mail e push usam `infrastructure/email` e `infrastructure/push` já existentes (push só vale para quem já é aluno).

### 6.9 Captura de leads

- **Formulário público** embutível (iframe/link) por academia: `POST /public/leads/:slug`. Exige **consentimento explícito** (checkbox, grava `consentiu_contato_em`), honeypot e rate limit por IP.
- **Instagram:** `infrastructure/instagram` já existe; avaliar captura de mensagem direta como origem `INSTAGRAM` (**A CONFIRMAR** no escopo atual da integração antes de prometer).
- **Importação CSV** de contatos existentes (com mapeamento de colunas e relatório de duplicados).
- **Indicação por aluno:** link no app do aluno com `origem = INDICACAO` e `origem_detalhe = aluno_id`. Alimenta também o feed/gamificação existentes.

### 6.10 Critérios de aceite da Fase 1
- Recepcionista cria lead, move no funil, registra contato e converte em aluno em menos de 1 minuto, sem sair da tela.
- Conversão repetida do mesmo lead não cria segundo aluno.
- Lead com mesmo telefone não duplica.
- Isolamento: usuário da academia A nunca lê, edita ou move lead da academia B (teste automatizado de IDOR).
- Mover para `PERDIDO` sem motivo retorna 422.

---

## 7. Fase 4 (financeiro do aluno) — adiantando o desenho

Vem antes da catraca física na dependência, por causa do bloqueio por inadimplência. Detalhado aqui porque afeta o modelo do CRM (a conversão abre matrícula).

### 7.1 Problema

O `billing` atual cobra a **academia** pelo SaaS. Para bloquear acesso por inadimplência, e para competir com Tecnofit/Pacto, a academia precisa **cobrar a mensalidade do aluno** dentro do sistema.

### 7.2 Modelo mínimo

```prisma
enum MatriculaStatus   { ATIVA TRANCADA CANCELADA }
enum MensalidadeStatus { PENDENTE PAGA ATRASADA CANCELADA }

model PlanoAcademia {          // plano que a academia vende ao aluno
  id              String   @id @default(cuid())
  academia_id     String
  nome            String
  preco_cents     Int
  periodicidade   Int      @default(1)   // meses
  ativo           Boolean  @default(true)
  academia        Academia @relation(fields: [academia_id], references: [id], onDelete: Cascade)
  matriculas      Matricula[]
  @@index([academia_id])
  @@map("planos_academia")
}

model Matricula {
  id             String          @id @default(cuid())
  academia_id    String
  aluno_id       String
  plano_id       String
  status         MatriculaStatus @default(ATIVA)
  inicio_em      DateTime
  fim_em         DateTime?
  dia_vencimento Int
  mensalidades   Mensalidade[]
  @@index([academia_id, status])
  @@map("matriculas")
}

model Mensalidade {
  id            String            @id @default(cuid())
  matricula_id  String
  academia_id   String
  vence_em      DateTime
  valor_cents   Int
  status        MensalidadeStatus @default(PENDENTE)
  paga_em       DateTime?
  gateway_ref   String?
  @@index([academia_id, status, vence_em])
  @@map("mensalidades")
}
```

(Relações inversas omitidas por brevidade.)

### 7.3 Decisão em aberto: quem recebe o dinheiro

| Opção | Prós | Contras |
|---|---|---|
| **A. Conta de cada academia** (OAuth do gateway, ex.: Mercado Pago, na conta da academia) | Não custodiamos dinheiro; sem risco regulatório de intermediação | Onboarding mais longo por academia |
| **B. Split/marketplace** (gateway repassa para a academia) | Podemos cobrar taxa por transação | Exige cadastro KYC e contrato de subcredenciamento (**A CONFIRMAR** com o gateway) |
| **C. Só controle manual** (recepção marca "pago") | Rápido, sem integração | Não concorre com os sistemas de cobrança recorrente |

**Recomendação:** começar por **C + A** (registro manual e cobrança via conta da própria academia), sem intermediar dinheiro. Dá o bloqueio por inadimplência sem risco regulatório. **A CONFIRMAR** a viabilidade técnica do OAuth por academia em `integracao-mercado-pago.md` antes de comprometer prazo.

### 7.4 Regra de inadimplência
Mensalidade passa a `ATRASADA` por job diário quando `vence_em < hoje` e não paga. A academia define **tolerância em dias** antes de bloquear acesso (padrão 5). O estado "em dia/atrasado" é consumido pelo `AcessoService` (§9.3).

---

## 8. Fase 2 — Retenção automática

Maior diferencial competitivo: **usamos dados de treino**, que os CRMs de gestão não têm.

### 8.1 Fonte de dados

`ultima_atividade_em` do aluno = o maior entre:
- Última conclusão de treino (`Treino.finalizado_em` / `TreinoHistorico`; **confirmar campo exato na implementação**).
- Último `Acesso` liberado (após a Fase 3).

Frequência semanal = dias distintos com atividade nos últimos 7 dias.

### 8.2 Regras (valores padrão, configuráveis por academia)

Referências: [Pacto — framework de churn](https://blog.sistemapacto.com.br/como-reduzir-churn-em-academia-framework-4-fases/) e [Tecnofit — retenção](https://www.tecnofit.com.br/blog/retencao-de-alunos-em-cross-training/).

| `regra_chave` | Gatilho | Ação padrão | Fundamento |
|---|---|---|---|
| `ONBOARDING_SEM_RETORNO` | Aluno novo (<14 dias) sem atividade após o 5º dia | Push + tarefa para a recepção | Quem não volta até o 5º dia tem 4x mais chance de cancelar |
| `INATIVO_7` | 7 dias sem atividade | Push automático de reengajamento | Régua do mercado |
| `INATIVO_14` | 14 dias sem atividade | **Tarefa** de ligação para recepção/professor | idem |
| `INATIVO_21` | 21 dias sem atividade | Tarefa de oferta personalizada | idem |
| `INATIVO_30` | 30 dias sem atividade | Tarefa para o gestor, proposta de renegociação | idem |
| `QUEDA_FREQUENCIA` | Frequência da semana ≤ 50% da média das 4 semanas anteriores | Tarefa para o professor | Gatilho clássico do Pacto |
| `ANIVERSARIO` | Aniversário do aluno | Push de parabéns | Engajamento |
| `MENSALIDADE_VENCENDO` | Vence em 3 dias (se Fase 4 ativa) | Push/e-mail lembrete | Cobrança preventiva |
| `NPS_DETRATOR` | Resposta de NPS ≤ 6 | Tarefa com prazo de 24h | Detratores antecipam cancelamento em 30–45 dias |
| `WINBACK_30/60/90` | Aluno cancelado há 30/60/90 dias | Mensagem de reativação | Win back do mercado |

### 8.3 Execução

- Job **diário** `retencao-diaria` (BullMQ), em `jobs/retencao/`, seguindo o padrão de `jobs/social/queues.ts` (`attempts: 3`, backoff exponencial).
- Processa **por academia, em lotes**, só as que têm a flag `retencao`. Cada tarefa é gravada com `regra_chave`; o `@@unique([aluno_id, regra_chave, vence_em])` garante **idempotência** (reexecutar o job não duplica).
- Não gerar tarefa se já existe uma `PENDENTE` da mesma regra para o aluno.
- Mensagens automáticas passam pela fila `retencao-notify` e pelo `infrastructure/push`. Respeitam: horário comercial (8h–20h, fuso da academia), limite de **1 mensagem automática por aluno a cada 3 dias**, e opt-out do aluno.

### 8.4 Painel de retenção

- **Lista "em risco"** ordenada por dias sem atividade e queda de frequência, com ação de um toque (ligar, WhatsApp, concluir tarefa).
- **Churn mensal** = cancelamentos ÷ ativos no início do mês, comparado ao benchmark de 4–7%.
- **Coorte dos primeiros 90 dias:** % de alunos novos que continuam ativos aos 30/60/90 dias.
- **NPS mensal** (pergunta única no app, 0–10) com lista de detratores.

### 8.5 Critérios de aceite da Fase 2
- Aluno sem atividade há 14 dias gera exatamente **uma** tarefa `INATIVO_14`, mesmo com o job rodando duas vezes.
- Nenhuma mensagem automática fora do horário permitido nem acima do limite de frequência.
- Painel "em risco" bate com o cálculo manual em uma academia de teste.

---

## 9. Fase 3 — Check-in por QR no app

Entrega presença sem hardware e valida a demanda antes de investir em catraca.

### 9.1 Modelo de dados

```prisma
enum AcessoResultado { LIBERADO NEGADO }
enum AcessoMotivo    { OK INADIMPLENTE VINCULO_INATIVO FORA_DO_HORARIO JA_DENTRO QR_EXPIRADO QR_INVALIDO MANUAL }
enum AcessoDirecao   { ENTRADA SAIDA }
enum AcessoOrigem    { QR_APP RECEPCAO CATRACA }

model Acesso {
  id          String          @id @default(cuid())
  academia_id String
  unidade_id  String?
  aluno_id    String?
  catraca_id  String?
  origem      AcessoOrigem
  direcao     AcessoDirecao   @default(ENTRADA)
  resultado   AcessoResultado
  motivo      AcessoMotivo
  ocorrido_em DateTime
  /// Id gerado no agente/dispositivo. Idempotência no reenvio após queda de rede.
  evento_ext_id String?
  criado_em   DateTime        @default(now())

  @@unique([catraca_id, evento_ext_id])
  @@index([academia_id, ocorrido_em])
  @@index([aluno_id, ocorrido_em])
  @@map("acessos")
}
```

### 9.2 QR dinâmico

- O app do aluno pede `GET /alunos/me/qr-acesso`. O backend devolve um token **assinado com Ed25519**, com `{ sub: aluno_id, aid: academia_id, exp: now+60s, jti }`.
- O app renderiza o QR e **renova a cada ~45s** (e ao reabrir a tela).
- **Por que assimétrica (D6):** o leitor/agente valida só com a **chave pública**, inclusive **offline**. A chave privada fica só no backend. **Rotação de chaves** com campo `kid` no token e lista de chaves públicas ativas.
- **Anti-reuso:** `jti` guardado em Redis por 90s. Mesmo QR não passa duas vezes (anti-print/compartilhamento).
- Print de tela perde a validade em 60s; compartilhar o QR com outra pessoa só dá certo se a outra pessoa chegar na catraca nesse intervalo, e o anti-passback (§9.3) barra a segunda entrada.

### 9.3 Regras de acesso (`AcessoService.decidir`)

Ordem de avaliação, parando na primeira negativa:
1. Token válido (assinatura, `exp`, `jti` não usado).
2. Aluno com vínculo ativo na academia/unidade.
3. Situação financeira: se Fase 4 ativa, `Mensalidade` atrasada além da tolerância → `INADIMPLENTE`.
4. Janela de horário do plano (se configurada).
5. **Anti-passback:** aluno já com `ENTRADA` sem `SAIDA` nas últimas N horas (padrão 4) → `JA_DENTRO`. Configurável por academia, pois sem saída registrada gera falsos bloqueios.
6. Registra `Acesso` (liberado ou negado, **sempre** registra).

**Liberação manual** pela recepção: `POST /acesso/liberacao-manual`, motivo obrigatório, grava `origem = RECEPCAO`, `motivo = MANUAL` e o autor. Aparece no relatório (controle de abuso).

### 9.4 Interface

- **Aluno:** tela "Meu acesso" com QR em tela cheia, brilho máximo automático, indicador de renovação e fallback para código numérico de 6 dígitos.
- **Recepção:** leitor de QR na própria câmera do celular/tablet (modo "Check-in"), resposta em verde/vermelho com nome e foto do aluno, motivo da negação em texto claro.
- **Painel de frequência** (dono): acessos em tempo real, pico por horário/dia da semana, frequência por aluno, ocupação atual.

### 9.5 Critérios de aceite da Fase 3
- QR expira em ≤ 60s e não passa duas vezes.
- Aluno de outra academia é negado com `VINCULO_INATIVO`.
- Toda tentativa, liberada ou negada, gera `Acesso`.
- Resposta do `decidir` em p95 < 300 ms (medido em teste de carga leve).

---

## 10. Fase 5 — Catraca física

### 10.1 Arquitetura

Padrão de mercado ([Tecnofit](https://ajuda.tecnofit.com.br/pt-BR/support/solutions/articles/67000673159-quais-catracas-s%C3%A3o-compat%C3%ADveis-com-o-sistema-tecnofit-), [Pacto](https://sistemapacto.zendesk.com/hc/pt-br/articles/49275468136595-Catraca-ControliD-IdFlex)): software de gestão na nuvem + componente local na LAN da academia.

**Agente local (`apps/agente-acesso/`, novo workspace)**
- Processo Node.js (>=20) distribuído como serviço (Windows primeiro: é o que academia tem na recepção; Linux/ARM depois).
- Conecta **de dentro para fora** (HTTPS/WSS para a API): **sem abrir porta no roteador da academia**.
- Autentica com **token de dispositivo** (§10.4), não com JWT de usuário.
- Mantém **cache local** (SQLite) de: chave pública, lista de alunos liberados, lista de bloqueados, regras. Sincroniza a cada 1–5 min e por push da API.
- Quando a catraca pergunta "pode entrar?", o agente decide **localmente** com o cache e, se houver internet, confirma/registra na API de forma assíncrona. **Sem internet, a academia continua funcionando.**
- Fila de **acessos pendentes** (idempotente por `evento_ext_id`) reenviada quando a conexão volta.

**Driver por fabricante**: interface `DriverCatraca` com `liberar()`, `negar()`, `escutarEventos()`, `sincronizarUsuarios()`. Implementação inicial: **Control iD**. Outros fabricantes depois, sem tocar o resto.

### 10.2 Primeiro fabricante: Control iD

Fundamento verificado em [Control iD — iDBlock Next](https://www.controlid.com.br/docs/access-api-pt/particularidade-dos-produtos/idblock-next/): eventos de giro por **monitor** (`catra_event`), **push** de identificação no modo online, modo **primário/secundário**, parâmetros `catra_timeout` (tempo de liberação em ms) e `catra_sync_period` (sincronização entre dispositivos).

**A CONFIRMAR antes de codar (ler a doc oficial completa e testar com um equipamento real):**
- Endpoint e payload exatos para **liberar o giro** remotamente.
- Formato de cadastro de usuário/cartão/QR no dispositivo.
- Como o modelo **online** pede decisão ao servidor (push de identificação) e o tempo limite de resposta antes de o equipamento cair no modo offline.
- Autenticação do dispositivo (sessão/login) e certificados na rede local.
- Quais modelos suportam leitura de **QR** (o **iDBlock QR** é citado na linha do fabricante).

> **Pré-requisito prático:** comprar ou ganhar emprestado **um equipamento de bancada** para desenvolver e testar. Integração de catraca sem hardware real não é confiável.

### 10.3 Modelo de dados

```prisma
enum CatracaStatus  { ONLINE OFFLINE DESATIVADA }
enum CredencialTipo { CARTAO_RFID QR_APP CODIGO }

model AgenteAcesso {
  id             String   @id @default(cuid())
  academia_id    String
  unidade_id     String?
  nome           String
  /// Hash (SHA-256) do token de dispositivo. O token em claro é mostrado uma única vez.
  token_hash     String   @unique
  versao         String?
  ultimo_ping_em DateTime?
  ativo          Boolean  @default(true)
  criado_em      DateTime @default(now())
  catracas       Catraca[]
  @@index([academia_id])
  @@map("agentes_acesso")
}

model Catraca {
  id            String        @id @default(cuid())
  academia_id   String
  unidade_id    String?
  agente_id     String
  nome          String        // "Entrada principal"
  fabricante    String        // "controlid"
  modelo        String?
  /// Endereço na LAN (IP:porta), usado só pelo agente
  endereco_lan  String?
  status        CatracaStatus @default(OFFLINE)
  ultimo_evento_em DateTime?
  criado_em     DateTime      @default(now())
  agente        AgenteAcesso  @relation(fields: [agente_id], references: [id])
  @@index([academia_id])
  @@map("catracas")
}

model CredencialAcesso {
  id          String         @id @default(cuid())
  aluno_id    String
  academia_id String
  tipo        CredencialTipo
  /// Para CARTAO_RFID: hash do número do cartão. Nunca guardar biometria aqui.
  valor_hash  String
  ativa       Boolean        @default(true)
  criado_em   DateTime       @default(now())
  @@unique([academia_id, tipo, valor_hash])
  @@index([aluno_id])
  @@map("credenciais_acesso")
}
```

`Acesso.catraca_id` (§9.1) passa a ser FK para `Catraca`.

### 10.4 Segurança do agente e da API de dispositivo

- **Token de dispositivo** gerado no painel (mostrado uma vez), guardado como **hash**, revogável. Rotas `/dispositivo/*` com rate limit próprio e **sem** acesso a nada além do necessário (sincronizar, registrar acessos, ping).
- Comunicação sempre **TLS**. O agente não aceita comandos de entrada de rede externa.
- Segredos locais (token) protegidos no armazenamento do SO (DPAPI no Windows, **A CONFIRMAR** na implementação).
- **Atualização automática** do agente com binário assinado (pendência de desenho; sem isso, correção de bug vira visita técnica).
- Log de auditoria de **toda** liberação manual e de toda alteração de catraca.

### 10.5 Rotas

| Rota | Quem chama | Função |
|---|---|---|
| `POST /dispositivo/ping` | agente | Heartbeat e versão |
| `GET /dispositivo/sincronizar?desde=` | agente | Alunos liberados/bloqueados, chaves públicas, regras (delta) |
| `POST /dispositivo/acessos` | agente | Envio em lote de eventos (idempotente) |
| `POST /acesso/validar` | agente/leitores online | Decisão online (usa `AcessoService.decidir`) |
| `GET/POST/PATCH /acesso/catracas` | painel | CRUD de catracas e agentes |
| `GET /acesso/log` | painel | Log filtrável e exportável |
| `POST /acesso/liberacao-manual` | recepção | §9.3 |

### 10.6 Critérios de aceite da Fase 5
- Aluno em dia entra na catraca real com QR do app em menos de 2 s.
- Com a internet da academia derrubada, aluno **com QR válido** ainda entra, e o acesso aparece no painel quando a rede volta, **sem duplicar**.
- Aluno inadimplente (além da tolerância) é barrado e o motivo aparece na tela da recepção.
- Revogar o token do agente derruba a sincronização imediatamente.

---

## 11. LGPD, privacidade e segurança (transversal)

Referências em §2.4. Pontos obrigatórios; o parecer jurídico final é **A CONFIRMAR**.

1. **Papéis:** a academia é a **controladora** dos dados dos seus alunos/leads; nós somos **operadores**. Formalizar no **contrato/termos** da academia (A CONFIRMAR com advogado).
2. **Consentimento de contato comercial** no lead (`consentiu_contato_em`). Sem ele, sem mensagem automática. Toda mensagem traz **opt-out**.
3. **Biometria fora da v1** (D10). Se entrar: consentimento **separado e destacado**, alternativa sem biometria, **template (hash) e não a imagem**, preferencialmente **armazenado no dispositivo**, e eliminação ao cancelar. Exige RIPD (Relatório de Impacto) antes.
4. **Direitos do titular:** rota para exportar e **anonimizar/excluir** lead e aluno a pedido. Anonimização mantém agregados (métricas) e apaga identificadores.
5. **Retenção:** leads `PERDIDO` sem interação por 12 meses são anonimizados (**prazo A CONFIRMAR** com jurídico). Logs de acesso: prazo definido por academia, padrão 6 meses.
6. **Minimização:** não coletar CPF no lead; só quando virar matrícula.
7. **Segurança:** sempre `academia_id` do JWT (anti-IDOR), rate limit nas rotas públicas, captcha no formulário público, logs de auditoria, credenciais de dispositivo em hash, segredos em `shared/crypto.ts`.
8. **Foto do aluno na tela da recepção** é dado pessoal; exibir só para quem tem papel de recepção/dono.

---

## 12. Impacto em planos e preços

> Proposta para discussão. **Não alterar** `catalogo-de-precos.md` nem o seed sem decisão do dono do produto.

Hoje o plano mais barato de academia (R$ 199, até 150 alunos) está **abaixo da faixa de mercado** (R$ 300–600 para 100–300 alunos). Com CRM e acesso, o produto passa a disputar a **mesma faixa** de Tecnofit e Pacto. Duas formas de monetizar:

| Modelo | Como | Prós | Contras |
|---|---|---|---|
| **Módulos por plano** | `CRM + retenção` a partir do Crescimento; `catraca + mensalidade` a partir do Performance | Simples, preserva a imagem de preço baixo no Essencial | Quem tem 1 catraca e 100 alunos é empurrado para plano caro |
| **Add-ons** | "Módulo Comercial" e "Módulo Acesso" por unidade | Flexível; o Essencial continua barato | Mais itens na página de preços |

Sugestão para validar com 3–5 academias-piloto: **CRM básico (funil e tarefas) incluso a partir do Crescimento**, **retenção automática como diferencial de venda**, e **catraca como add-on por unidade** (porque tem custo de suporte e implantação). Reajuste de 20–30% nos planos Crescimento e Performance é defensável pelo mercado, mas é decisão comercial.

Implementação técnica: só chaves em `PlanoAssinatura.recursos` (§5.3) e ajustes em `pages/planos/plansData.ts` e no seed. **Sem** mudar o schema de planos.

---

## 13. Estratégia de testes

| Camada | O que cobrir |
|---|---|
| Unidade (Vitest) | Normalização de telefone, regras de mover etapa, `AcessoService.decidir` (todas as ramificações), cálculo de métricas, regras de retenção (tabela de casos) |
| Integração (API + Postgres de teste) | Conversão de lead idempotente; unicidade por telefone; **IDOR entre academias** em todas as rotas novas; gating por `recursos`; job de retenção reexecutado sem duplicar tarefa |
| Contrato (agente ↔ API) | Esquemas zod compartilhados em `packages/` (hoje vazio) para o agente e a API não divergirem |
| Hardware | Roteiro manual com a catraca de bancada: liberar, negar, queda de rede, reconexão, evento duplicado |
| UI | Kanban com teclado; QR com brilho/contraste; formulário público com e sem consentimento |
| Carga leve | `POST /acesso/validar` e `/dispositivo/sincronizar` com 1.000 alunos |

Cobertura mínima: **toda regra de negócio nova tem teste**. O IDOR é item de bloqueio de merge.

---

## 14. Observabilidade e operação

- Logs estruturados com `academia_id`, `agente_id`, `catraca_id`.
- Métricas: latência de `/acesso/validar`, taxa de negação por motivo, agentes offline > 5 min, fila de retenção (atraso/falhas).
- **Alerta** quando o agente de uma academia fica offline (a catraca continua funcionando, mas o dono precisa saber).
- Painel de saúde do agente no web (último ping, versão, fila pendente).
- Runbook curto para suporte: "catraca não libera" (checar agente, token, cache, regra, mensalidade).
- Deploy: API segue o fluxo atual (Railway; ver `RAILWAY.md`). O agente é distribuído à parte, versionado e assinado.

---

## 15. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Integração de catraca mais difícil que o previsto (API do fabricante, firmware, modos) | Atraso grande na Fase 5 | Hardware de bancada **antes** de prometer prazo; Fase 3 (QR no app) entrega valor sem hardware |
| Agente instalado em PC da recepção (instável, desligado, sem rede) | Suporte pesado | Cache offline, auto-reinício, alerta de offline, instalador simples, doc ilustrada |
| LGPD (biometria, contato comercial sem consentimento) | Multa e dano reputacional | Biometria fora da v1, consentimento no lead, parecer jurídico antes de lançar |
| Regulação/risco de cobrar mensalidade de terceiros | Bloqueio do gateway ou problema legal | Começar sem intermediar dinheiro (§7.3 opção C+A) |
| Escopo cresce até virar ERP | Nunca termina | Fora do escopo explícito (§1); fases com critério de aceite |
| Concorrentes têm anos de maturidade | Paridade lenta | Foco em **retenção por dado de treino** e preço, não em paridade total |
| Dado de mercado vem de blogs de fornecedor | Benchmarks otimistas | Regras com valores **configuráveis**; calibrar com dados reais |
| Enum `Role` com novo valor em produção | Migration travar | Migration isolada, testada em cópia do banco, sem uso do valor na mesma transação |

---

## 16. Roadmap, dependências e estimativa

```
Fase 0 Fundação ─┬─▶ Fase 1 CRM ─▶ Fase 2 Retenção ──────────────┐
                 │                                                ▼
                 └─▶ Fase 3 Check-in QR ─▶ Fase 4 Mensalidade ─▶ Fase 5 Catraca
```

- Fase 1 e Fase 3 podem andar em paralelo após a Fase 0.
- Fase 2 melhora quando a Fase 3 existe (acesso como sinal de presença), mas **não depende** dela (usa dados de treino).
- Fase 5 depende de 3 (QR) e idealmente de 4 (inadimplência).

| Fase | Entrega | Tamanho relativo | Risco |
|---|---|---|---|
| 0 | `RECEPCAO`, `Unidade`, gating, seeds | P | Baixo (migration de enum) |
| 1 | CRM comercial completo | G | Baixo |
| 2 | Retenção + painel + NPS | M | Médio (calibragem das regras) |
| 3 | Check-in por QR, painel de frequência | M | Baixo |
| 4 | Mensalidade do aluno | G | **Alto** (gateway, decisão de quem recebe) |
| 5 | Agente + Control iD | G | **Alto** (hardware, suporte) |

> **Tamanho relativo, não prazo.** P ≈ 1 semana, M ≈ 2–3, G ≈ 4+ para uma pessoa; valores indicativos, a refinar após o spike da Fase 5 e a decisão da Fase 4. Prazo real depende da equipe disponível.

### Marcos de validação (portões de decisão)
1. **Fim da Fase 1:** 2–3 academias-piloto usam o funil por 30 dias. Métrica: ≥ 70% dos leads novos registrados no sistema.
2. **Fim da Fase 3:** ≥ 40% dos alunos de uma academia-piloto usam o QR em 30 dias. Se não, **não** investir em catraca física.
3. **Antes da Fase 5:** pelo menos uma academia-piloto com catraca Control iD disposta a testar e equipamento de bancada em mãos.

---

## 17. Decisões em aberto (precisam de resposta antes de começar)

| # | Pergunta | Recomendação | Impacto |
|---|---|---|---|
| Q1 | Criar `Unidade` já na Fase 0? | **Sim** | Evita migração com dados em produção |
| Q2 | Criar o papel `RECEPCAO` no `enum Role`? | **Sim** | Sem ele, a recepção usaria o login do dono |
| Q3 | Regras de retenção configuráveis por academia ou fixas? | **Limiares configuráveis, regras fixas** (D5) | Uma tabela `ConfigRetencao` simples |
| Q4 | WhatsApp: só `wa.me` (v1) ou API oficial desde já? | **`wa.me` na v1**, API oficial depois | API oficial exige BSP, custo por conversa e templates aprovados |
| Q5 | Mensalidade do aluno: qual opção (§7.3)? | **C + A** | Define risco regulatório e prazo da Fase 4 |
| Q6 | Fabricante inicial de catraca? | **Control iD** | Depende de equipamento de bancada |
| Q7 | Como cobrar (módulos por plano ou add-on)? | **CRM por plano, catraca como add-on** | Ver §12 |
| Q8 | Quem é o advogado/consultor de LGPD? | Definir antes da Fase 5 | Parecer sobre papéis e retenção |
| Q9 | Linha de frente de suporte do agente na academia? | Definir antes do primeiro piloto | Custo operacional da Fase 5 |

---

## 18. Checklist de implementação (resumo)

**Fase 0**
- [ ] Migration: `RECEPCAO` no `Role` (isolada)
- [ ] `FuncionarioAcademia`, `Unidade` + backfill "Principal"
- [ ] `resolveAcademiaDoUsuario`, `exigeRecurso`
- [ ] Chaves em `recursos` no seed de planos

**Fase 1**
- [ ] Migration: modelos do CRM (§6.1) + seed de etapas padrão
- [ ] `modules/crm` (routes, service, repository, schemas zod)
- [ ] Conversão idempotente em transação
- [ ] Páginas `crm/*`, `crmStore`, tipos e `api/client.ts`
- [ ] Teste de IDOR em todas as rotas
- [ ] Formulário público com consentimento e rate limit

**Fase 2**
- [ ] `ConfigRetencao` (limiares) e `jobs/retencao`
- [ ] Regras da §8.2 com testes por tabela
- [ ] Painel "em risco", churn, coorte 90 dias, NPS

**Fase 3**
- [ ] `Acesso` + chaves Ed25519 (com `kid` e rotação)
- [ ] `GET /alunos/me/qr-acesso`, `AcessoService.decidir`, anti-reuso em Redis
- [ ] Telas: QR do aluno, check-in da recepção, painel de frequência

**Fase 4**
- [ ] `PlanoAcademia`, `Matricula`, `Mensalidade`
- [ ] Baixa manual + job diário de atraso + tolerância
- [ ] Decisão Q5 e integração de cobrança escolhida

**Fase 5**
- [ ] Spike com equipamento de bancada (fecha os itens "A CONFIRMAR" da §10.2)
- [ ] `apps/agente-acesso` (cache SQLite, fila offline, driver Control iD)
- [ ] `AgenteAcesso`, `Catraca`, `CredencialAcesso` e rotas `/dispositivo/*`
- [ ] Assinatura e atualização automática do agente
- [ ] Parecer jurídico (LGPD) e termos atualizados

---

## 19. Referências

**Mercado e produto**
- [Next Fit — Como criar um funil no CRM](https://ajuda.nextfit.com.br/support/solutions/articles/69000850882-como-criar-um-funil-no-crm-)
- [Tecnofit — CRM para academias](https://www.tecnofit.com.br/blog/importancia-crm-para-academias/)
- [Tecnofit — Soluções](https://www.tecnofit.com.br/solucoes-tecnofit/)
- [Tecnofit — Funil de vendas de academia](https://www.tecnofit.com.br/blog/funil-de-vendas-de-academia/)
- [Pacto — Funil de vendas para academia](https://blog.sistemapacto.com.br/funil-de-vendas-para-academia/)
- [Sults — 5 melhores sistemas para redes de academias](https://www.sults.com.br/solucoes/gestao/5-melhores-sistemas-redes-academias)
- [Pacto — Quanto custa um sistema para academia](https://blog.sistemapacto.com.br/quanto-custa-sistema-para-academia/)

**Retenção**
- [Pacto — Como reduzir churn em academia (4 fases)](https://blog.sistemapacto.com.br/como-reduzir-churn-em-academia-framework-4-fases/)
- [Tecnofit — Retenção de alunos](https://www.tecnofit.com.br/blog/retencao-de-alunos-em-cross-training/)
- [TotalPass — Jornada do aluno](https://totalpass.com/br/blog/para-academias/jornada-do-aluno-na-academia/)

**Catraca**
- [Control iD — API Linha de Acesso, iDBlock Next](https://www.controlid.com.br/docs/access-api-pt/particularidade-dos-produtos/idblock-next/)
- [Control iD — iDBlock QR Code](https://www.controlid.com.br/controle-de-acesso/idblock-qr/)
- [Control iD — Particularidades dos terminais](https://www.controlid.com.br/docs/access-api-pt/particularidade-dos-produtos/particulariade-terminais-control-id/)
- [Tecnofit — Catracas compatíveis](https://ajuda.tecnofit.com.br/pt-BR/support/solutions/articles/67000673159-quais-catracas-s%C3%A3o-compat%C3%ADveis-com-o-sistema-tecnofit-)
- [Pacto — Catraca Control iD iDFlex](https://sistemapacto.zendesk.com/hc/pt-br/articles/49275468136595-Catraca-ControliD-IdFlex)

**LGPD**
- [Pacto — LGPD em academia](https://blog.sistemapacto.com.br/lgpd-tudo-o-que-voce-precisa-saber-para-nao-ser-pego-de-surpresa/)
- [Certponto — Controle de acesso facial e LGPD](https://certponto.com.br/controle-de-acesso-facial-e-lgpd/)
- [Confidata — LGPD e dados biométricos](https://confidata.com.br/blog/lgpd-dados-biometricos-reconhecimento-facial-digital)
- [IDEC — Nota técnica sobre biometria facial](https://idec.org.br/sites/default/files/nt_biometria_facial_no_setor_de_saude_-_idec.pdf)
- [ANPD — Nota Técnica 5/2025](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos/nota-tecnia-5_2025_fis_cgf_versao-publica_ocultado.pdf/@@display-file/file)
