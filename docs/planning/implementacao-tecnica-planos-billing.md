# Implementação Técnica — Planos por Faixa de Alunos + Billing B2B

> Complementa `docs/planning/planos-monetizacao-academia-personal.md`.
> Objetivo: transformar o motor de assinaturas (hoje **desligado**) em cobrança **por faixa de alunos ativos**, com metering, entitlements e checkout B2B (PIX/boleto/cartão + NFS-e).
> Data: 2026-09-16

---

## 1. Princípios de projeto

1. **Reutilizar o que existe** — o motor (`PlanoAssinatura`, `Assinatura`, `AssinaturaEvento`, `ConviteAluno`, `AssinaturaPolicy/Service`, webhook RTDN, gates) já está modelado; só está comentado. Nada de reescrever do zero.
2. **Uma fonte de verdade para limite = faixa de "alunos ativos (30d)"** — não o cadastro.
3. **Cobrança fora das lojas para B2B** — Google Play só para o plano do ALUNO (in-app Android). Academia/Personal pagam por checkout web (PIX/boleto/cartão recorrente) + NFS-e.
4. **Idempotência em tudo que toca dinheiro** — webhooks com `evento_id` único, checkout com idempotency key, upserts transacionais.
5. **Soft-block antes de hard-block** — carência e avisos antes de bloquear features.
6. **Aditivo e reversível** — tudo atrás de feature flag `BILLING_ENABLED`; usuários atuais entram como *grandfathered*.

---

## 2. Modelo conceitual

### 2.1 Quem paga (payer) vs. quem consome (tenant)

| Caso | Payer (`usuario_id`) | Tenant (quem tem alunos) | Alunos contados |
|---|---|---|---|
| **Personal** | usuário role `PROFESSOR` | `professor` (por `usuario_id`) | `alunos.professor_id = professor.id` |
| **Academia** | usuário role `ACADEMIA` (dono) | `academia` | `alunos.academia_id = academia.id` |
| **Aluno B2C** | usuário role `ALUNO` | `aluno` | — (não há faixa) |

> A academia já tem `usuario_id @unique` (1:1) — então o "dono" da assinatura é o usuário da academia. Basta acrescentar `academia_id` na assinatura para amarrar o tenant.

### 2.2 Faixas (tiers)

Cada faixa é uma linha em `planos_assinatura` com `faixa_min_alunos`/`faixa_max_alunos`. O **preço efetivo** = `preco_mensal_cents` da faixa, ou (opcional) `preco_aluno_excedente_cents × (alunos_ativos − alunos_inclusos)`.

**Seed proposto (a validar com mercado):**

| `codigo` | `papel_alvo` | faixa min–max | preço/mês | professores incl. | storage GB |
|---|---|---|---|---|---|
| `PT_FREE` | PROFESSOR | 0–3 | R$ 0 | 1 | 0,5 |
| `PT_STARTER` | PROFESSOR | 4–10 | R$ 49 | 1 | 2 |
| `PT_PRO` | PROFESSOR | 11–30 | R$ 89 | 1 | 5 |
| `PT_PLUS` | PROFESSOR | 31–60 | R$ 149 | 2 | 10 |
| `PT_SCALE` | PROFESSOR | 61–120 | R$ 249 | 3 | 25 |
| `PT_STUDIO` | PROFESSOR | 121+ | R$ 349 + R$39/prof extra | 3 | 50 |
| `AC_STARTER` | ACADEMIA | 0–150 | R$ 199 | 5 | 25 |
| `AC_BUSINESS` | ACADEMIA | 151–400 | R$ 399 | 15 | 100 |
| `AC_PRO` | ACADEMIA | 401–1.000 | R$ 749 | 40 | 250 |
| `AC_ENTERPRISE` | ACADEMIA | 1.001+ | custom | ilimitado | negociado |
| `ALUNO_MENSAL` | ALUNO | — | R$ 12–14,90 | — | 0,5 |

\* "storage GB" é o espaço de uploads (avatars, fotos de avaliação/feed) — com fair-use por tenant.

---

## 3. Mudanças no schema Prisma

### 3.1 `PlanoAssinatura` (estender)

```prisma
model PlanoAssinatura {
  id                     String   @id @default(cuid())
  codigo                 String   @unique
  nome                   String
  descricao              String?
  papel_alvo             Role
  // ── NOVO: faixas e inclusos ──
  faixa_min_alunos       Int      @default(0)
  faixa_max_alunos       Int?                      // null = ilimitado
  alunos_inclusos        Int      @default(0)
  professores_inclusos   Int      @default(1)
  unidades_inclusas      Int      @default(1)
  storage_gb_incluso     Int      @default(1)
  preco_aluno_excedente_cents Int?                 // cobrança por aluno acima do teto
  recursos               Json     @default("{}")   // flags: white_label, multiumidade, nfse, bi...
  // ── cobrança ──
  canal_pagamento        AssinaturaCanal @default(WEB_PIX)
  gateway_product_id     String?                   // ex.: id do plano no gateway B2B
  preco_mensal_cents     Int
  moeda                  String   @default("BRL")
  google_play_product_id String?  @unique          // OPCIONAL agora (só B2C/Play)
  trial_dias             Int      @default(15)
  ativo                  Boolean  @default(true)
  ordem                  Int      @default(0)      // ordenação na página de preços
  criado_em              DateTime @default(now())
  assinaturas            Assinatura[]
  @@map("planos_assinatura")
}
```

### 3.2 Novos enums

```prisma
enum AssinaturaCanal {
  GOOGLE_PLAY
  APPLE_STORE
  WEB_PIX
  WEB_BOLETO
  WEB_CARTAO
  MANUAL
}

enum TenantTipo {
  PROFESSOR
  ACADEMIA
  ALUNO
}

enum CobrancaStatus {
  PENDENTE
  PAGA
  VENCIDA
  ESTORNADA
  CANCELADA
}

enum MetodoPagamentoTipo {
  CARTAO
  PIX
  BOLETO
}
```

### 3.3 `Assinatura` (estender o vínculo ao tenant + faixa)

```prisma
model Assinatura {
  id                          String   @id @default(cuid())
  usuario_id                  String                     // payer
  plano_id                    String
  // ── NOVO ──
  tenant_tipo                 TenantTipo @default(PROFESSOR)
  tenant_id                   String?                    // professor.id | academia.id | aluno.id
  canal                       AssinaturaCanal @default(WEB_PIX)
  faixa_alunos_inclusos       Int        @default(0)
  faixa_alunos_max            Int?
  valor_mensal_cents          Int        @default(0)     // preço congelado no ciclo
  alunos_excedentes           Int        @default(0)
  metodo_pagamento_id         String?
  gateway_customer_id         String?
  gateway_subscription_id     String?    @unique
  proxima_cobranca_em         DateTime?
  congelamento_ate            DateTime?                  // "faixa congelada" anual
  // ── existentes ──
  loja                        Loja @default(GOOGLE_PLAY)
  origem                      AssinaturaOrigem @default(PROPRIA)
  status                      AssinaturaStatus @default(ATIVA)
  google_purchase_token       String?  @unique
  google_order_id             String?
  inicio_em                   DateTime?
  expires_at                  DateTime?
  trial_iniciado_em           DateTime?
  trial_fim_em                DateTime?
  auto_renovating             Boolean  @default(true)
  cancelada_em                DateTime?
  motivo_revogacao            Json?
  patrocinada_por_usuario_id  String?
  criado_em                   DateTime @default(now())
  atualizado_em               DateTime @updatedAt
  usuario                     Usuario  @relation(fields: [usuario_id], references: [id], onDelete: Cascade)
  plano                       PlanoAssinatura @relation(fields: [plano_id], references: [id])
  eventos                     AssinaturaEvento[]
  cobrancas                   Cobranca[]
  metodoPagamento             PagamentoMetodo? @relation(fields: [metodo_pagamento_id], references: [id])
  @@index([usuario_id])
  @@index([tenant_tipo, tenant_id])
  @@index([status, expires_at])
  @@map("assinaturas")
}
```

### 3.4 Novos modelos: metering, faturas, método de pagamento

```prisma
/// Snapshot mensal de uso por tenant (base da faixa e da fatura)
model UsoMensal {
  id                  String   @id @default(cuid())
  tenant_tipo         TenantTipo
  tenant_id           String
  competencia         String              // "2026-09"
  alunos_ativos       Int      @default(0)
  alunos_vinculados   Int      @default(0)
  professores_ativos  Int      @default(0)
  unidades            Int      @default(1)
  storage_bytes       BigInt   @default(0)
  faixa_plano_codigo  String?
  valor_cents         Int      @default(0)
  calculado_em        DateTime @default(now())
  @@unique([tenant_tipo, tenant_id, competencia])
  @@index([competencia])
  @@map("uso_mensal")
}

/// Fatura/cobrança de um ciclo
model Cobranca {
  id                String   @id @default(cuid())
  assinatura_id     String
  competencia       String
  valor_cents       Int
  status            CobrancaStatus @default(PENDENTE)
  vencimento        DateTime
  pago_em           DateTime?
  gateway           String?
  gateway_charge_id String?  @unique
  pix_copia_cola    String?  @db.Text
  boleto_url        String?
  linha_digitavel   String?
  nfse_numero       String?
  nfse_url          String?
  tentativas        Int      @default(0)
  criado_em         DateTime @default(now())
  atualizado_em     DateTime @updatedAt
  assinatura        Assinatura @relation(fields: [assinatura_id], references: [id], onDelete: Cascade)
  @@index([assinatura_id, competencia])
  @@index([status, vencimento])
  @@map("cobrancas")
}

/// Método de pagamento tokenizado (nunca guardar PAN)
model PagamentoMetodo {
  id                 String   @id @default(cuid())
  usuario_id         String
  gateway            String
  gateway_customer_id String?
  tipo               MetodoPagamentoTipo
  cartao_ultimos4    String?
  cartao_bandeira    String?
  token              String?               // token do gateway
  padrao             Boolean  @default(true)
  criado_em          DateTime @default(now())
  assinaturas        Assinatura[]
  @@index([usuario_id])
  @@map("pagamentos_metodo")
}
```

> **`AssinaturaEvento`**: adicionar `gateway String?`, `evento_externo_id String? @unique` (idempotência de webhooks de gateway).

---

## 4. Metering — "aluno ativo (30d)"

### 4.1 Definição
**Aluno ativo** = aluno **vinculado** ao tenant (`professor_id`/`academia_id`) **que concluiu ≥1 treino nos últimos 30 dias**.

Proxy de "concluiu treino" (mais robusto que `treinos.status`, que recicla `CONCLUIDO→ACEITO`):
`treino_historico` com `status_novo = 'CONCLUIDO'` para um `treino.aluno_id` do aluno.
Fallback/alternativa: `execucao_exercicios.registrado_em >= now() - 30d`.

### 4.2 SQL (Postgres)

```sql
-- Alunos ativos (30d) por PROFESSOR
SELECT a.professor_id AS tenant_id, COUNT(DISTINCT a.id) AS alunos_ativos
FROM alunos a
JOIN treinos t  ON t.aluno_id = a.id
JOIN treino_historico h ON h.treino_id = t.id
WHERE a.professor_id IS NOT NULL
  AND h.status_novo = 'CONCLUIDO'
  AND h."timestamp" >= now() - interval '30 days'
GROUP BY a.professor_id;

-- Alunos ativos (30d) por ACADEMIA
SELECT a.academia_id AS tenant_id, COUNT(DISTINCT a.id) AS alunos_ativos
FROM alunos a
JOIN treinos t  ON t.aluno_id = a.id
JOIN treino_historico h ON h.treino_id = t.id
WHERE a.academia_id IS NOT NULL
  AND h.status_novo = 'CONCLUIDO'
  AND h."timestamp" >= now() - interval '30 days'
GROUP BY a.academia_id;
```

### 4.3 Serviço + cron
- Novo `application/usecases/billing/MeteringService.ts` → `calcularUso(competencia)` (upsert em `uso_mensal`).
- Novo worker `metering-uso` (padrão idêntico aos de `gymWorkers.ts`): `repeat: { pattern: '0 2 * * *' }` (diário 02:00) recalcula **mês corrente**; no dia 1, também **fecha a competência anterior**.
- Índice recomendado: `treino_historico(status_novo, timestamp)` para performance do agregado (hoje não existe).

---

## 5. Motor de faixas e faturamento

### 5.1 Fluxo mensal
```
Dia 1 03:00  fechar-competencia:
  1. snapshot do mês anterior (uso_mensal)
  2. resolve faixa (planos_assinatura pela faixa de alunos_ativos)
  3. se congelamento_ate > hoje → mantém preço antigo (faixa congelada)
  4. cria Cobranca (vencimento D+5) no gateway escolhido
  5. emite PIX/boleto (ou cobra cartão) → grava dados na Cobranca
  6. dispara e-mail/push "sua fatura chegou"
```

### 5.2 Regras
- **Auto-upgrade**: se `alunos_ativos` exceder `faixa_max_alunos`, sobe para a próxima faixa **na fatura seguinte** (igual Tecnofit).
- **Auto-downgrade**: permitido apenas no fim do ciclo, com 1 ciclo de tolerância (evita ping-pong).
- **Proração**: upgrade no meio do ciclo → opcional. Recomendo **não** prorar no v1 (simples, previsível).
- **Congelamento anual**: plano anual trava a faixa por 12 meses (mesmo se crescer).
- **Excedente**: se preferir linearidade, `preco_aluno_excedente_cents × alunos_acima_do_teto` em vez de saltar de faixa.

### 5.3 Seed dos planos
Script idempotente `prisma/seed-planos-assinatura.ts` (já existe, hoje comentado) → reescrever com a tabela do §2.2 (upsert por `codigo`).

---

## 6. Entitlements / enforcement

### 6.1 Serviço
`application/usecases/billing/EntitlementsService.ts`:
```ts
type Entitlements = {
  hasAccess: boolean
  isTrial: boolean
  origem: 'PROPRIA'|'PATROCINADA'|'MANUAL'|null
  plano: string | null
  limiteAlunos: number | null       // null = ilimitado
  alunosAtivos: number
  professoresInclusos: number
  recursos: Record<string, boolean> // white_label, multiunidade, nfse, bi
  statusAssinatura: AssinaturaStatus
}
```
- Reaproveita `hasActiveAccess`/`canAddStudent` de `AssinaturaPolicy.ts` (só descomentar e evoluir para leitura de faixa/uso).

### 6.2 Onde aplicar (pontos de enforcement)

| Ponto | Arquivo/hook atual | Comportamento |
|---|---|---|
| Vincular aluno (personal) | `POST /professores/alunos` | bloquear se `alunos_vinculados >= limite` → `LimiteAlunosExcedidoError` (já existe `LimiteProfessoresExcedidoError` como padrão) |
| Consumir convite | `vincularConvite` (AssinaturaService) | valida `canAddStudent` (já implementado, comentado) |
| Vincular professor (academia) | `autorizarProfessorPrimeiraEtapa` | usa `professores_inclusos` do plano (hoje usa `academia.max_professores`) |
| Laudos/relatórios | `POST /avaliacoes/:id/laudo` | exige `recursos.relatorios` |
| Features premium | `PremiumWrapper` (web) | usa `entitlements.recursos` |
| Upload de mídia | `POST /auth/avatar`, `/social/upload/foto` | limite por `storage_gb_incluso` |

### 6.3 Política de bloqueio (dunning)
```
ATIVA ──vencimento──▶ EM_CARENCIA (D+0 .. D+10, acesso mantido, avisos)
EM_CARENCIA ──D+10──▶ EXPIRADA (bloqueia writes; leitura bloqueada conforme plano)
EXPIRADA ──pagamento──▶ ATIVA
```
Avisos: D-3 (e-mail), D0 (e-mail+push), D+3, D+7. Na carência, **não** bloquear (retenção).

---

## 7. Checkout B2B (PIX / boleto / cartão)

### 7.1 Abstração de gateway
`infrastructure/payments/PaymentGateway.ts`:
```ts
export interface PaymentGateway {
  criarCliente(dados: ClienteInput): Promise<{ gatewayCustomerId: string }>
  criarAssinatura(input: AssinaturaInput): Promise<{ gatewaySubscriptionId: string; proximaCobrancaEm: Date }>
  criarCobranca(input: CobrancaInput): Promise<{ chargeId: string; pixCopiaECola?: string; boletoUrl?: string; linhaDigitavel?: string }>
  cancelarAssinatura(id: string): Promise<void>
  validarWebhook(headers: Record<string,string>, rawBody: string): boolean
}
```
Implementações: `AsaasGateway.ts` (PIX + boleto + cartão recorrente + NFS-e), com possibilidade de `PagarMeGateway`/`MercadoPagoGateway`. Config por env:
```
BILLING_ENABLED=false
BILLING_PROVIDER=asaas
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3   # validar na doc oficial
ASAAS_API_KEY=
ASAAS_WEBHOOK_SECRET=
NFSE_MUNICIPIO=            # dados p/ emissão
```
> ⚠️ Endpoints/contratos do gateway **devem ser validados na documentação oficial** antes de codar (não assumir aqui).

### 7.2 Rotas novas (`/billing`)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/billing/planos` | Catálogo de planos/faixas (público) |
| POST | `/billing/checkout` | Inicia assinatura (plano + tenant + método) → retorna PIX/boleto/intent |
| GET | `/billing/me` | Entitlements + uso + faixa atual + próxima cobrança |
| GET | `/billing/faturas` | Lista de `Cobranca` |
| PUT | `/billing/metodo-pagamento` | Atualiza cartão (tokenização no gateway) |
| POST | `/billing/cancelar` | Cancela (fim do ciclo) |
| POST | `/billing/reativar` | Reativa assinatura |
| POST | `/webhooks/billing/:provider` | Webhook público (idempotente) |
| POST | `/root/billing/liberar-manual` | Já existe (`rootPremiumRoutes`) |

> Todas as rotas de escrita com `{ preHandler: [app.authenticate] }` e validação zod (padrão do projeto).

### 7.3 Frontend
- `/planos` — página de preços (faixas PT e Academia) com CTA de checkout.
- `/billing` — "Minha assinatura": faixa, uso (alunos ativos), faturas, método, cancelar.
- Banners de carência/uso (ex.: "18/30 alunos ativos — upgrade para o Pro").
- Reabilitar `Paywall.tsx` para o **ALUNO** (B2C) e `PremiumWrapper` para gates.

---

## 8. NFS-e
- Emissão via gateway (Asaas emite NFS-e em municípios integrados) ou integração municipal própria.
- Guardar `nfse_numero`/`nfse_url` em `Cobranca`; disponibilizar download em `/billing/faturas`.
- Necessário **para vender para academia** (compra B2B exige nota). É bloqueador comercial.

---

## 9. Reativar o motor existente (B2C Google Play)

1. Descomentar (nesta ordem): `AssinaturaPolicy.ts` → `AssinaturaService.ts` → `assinatura.routes.ts` → registrar em `app.ts` → worker `assinaturas-verificacao` (já esboçado em `gymWorkers.ts`) → web no `App.tsx`/stores.
2. Ajustar `google_play_product_id` para opcional (planos B2B não têm).
3. Manter `importar-token` + webhook RTDN como estão (funcionais).
4. `limite_alunos` migra de int estático → derivado de faixa (manter coluna como fallback/deprecada).

---

## 10. Segurança, idempotência e LGPD

- **Webhooks**: validar assinatura do gateway; persistir `evento_externo_id` **único** (dedupe); processar em transação; retornar 200 mesmo em erro tratado (padrão já usado no RTDN).
- **Nunca** guardar dados de cartão — só token + últimos 4.
- **Segredos** em variáveis do Railway (nunca no repo). Chaves já presentes no serviço `api`.
- **LGPD**: base legal = execução de contrato; registrar consentimento de cobrança; dados de fatura retidos pelo prazo fiscal.
- **Rate limit** nas rotas de checkout (padrão `@fastify/rate-limit`).
- **Auditoria**: toda mudança de status de assinatura gera `AssinaturaEvento`.

---

## 11. Migração e rollout (feature-flagged)

| Etapa | O que | Risco |
|---|---|---|
| E0 | Schema + seed de planos + `BILLING_ENABLED=false` | baixo (aditivo) |
| E1 | Metering (`uso_mensal`) rodando "à toa" por 2–4 semanas (só mede, não cobra) | valida a definição de "ativo" |
| E2 | `/billing/me` + página de preços (somente leitura) | transparência |
| E3 | Checkout + faturas + NFS-e em **sandbox** | médio |
| E4 | Piloto com N clientes reais (desconto fundador) | médio |
| E5 | Ligar gates para novos usuários; **grandfather** os atuais | alto (comunicar) |

---

## 12. Testes

- **Unit**: `resolverFaixa(alunosAtivos)`, `calcularUso`, `EntitlementsService`, `canAddStudent` por faixa, cálculo de excedente/congelamento.
- **Integração** (padrão do projeto, vitest + Prisma): metering contra DB de teste; webhook idempotente (mesmo evento 2× → 1 efeito); checkout cria `cobranca` + `assinatura`.
- **Contrato**: sandbox do gateway.
- **E2E**: bloquear ao exceder limite; upgrade de faixa na fatura seguinte; carência → expiração → reativação.

---

## 13. Observabilidade (métricas de negócio)

- MRR, ARPU por tier, **nº de tenants por faixa**, % trial→pago, churn, inadimplência (VENCIDA).
- Uso: alunos ativos por tenant, professores ativos, storage consumido.
- Alertas: picos de erro em webhook, faturas VENCIDAS acima de X%.

---

## 14. Estimativa de esforço (ordem de grandeza)

| Fase | Escopo | Estimativa |
|---|---|---|
| E0 | Schema + seed + Entitlements básico | 2–4 dias |
| E1 | Metering + cron + índices | 2–3 dias |
| E2/E3 | Checkout + faturas + webhook + NFS-e (sandbox) | 6–10 dias |
| E4 | Frontend `/planos` + `/billing` + banners | 4–6 dias |
| E5 | Reativar gates + grandfather + comunicação | 2–3 dias |
| — | Testes + ajustes de infra (staging, backups, pgBouncer) | 3–5 dias |
| **Total** | | **~19–31 dias** (1 dev) |

---

## 15. Dependências e riscos

- **Depende** de: `railway login` (para eu validar números reais da base) + proxy público do Postgres (para medir faixas reais) + decisão de gateway (Asaas vs. Pagar.me).
- **Risco comercial**: preço por faixa pode gerar "degrau" mal dimensionado → mitigar com telemetria de E1 (medir 2–4 semanas antes de cobrar).
- **Custo variável ~0** (sem LLM): o único custo relevante é a **taxa de gateway** → margem ~95-99%.
- **Risco fiscal**: NFS-e é obrigatória para B2B → tratar como requisito, não add-on.
- **Risco de infra**: mover `sync/translate/seed` do start command para Cron antes de escalar (ver R1 do doc de monetização).