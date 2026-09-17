# Integração de Pagamentos — Mercado Pago (Web + PWA)

> Decisão de produto: **Mercado Pago** é o gateway de cobrança para toda compra feita **fora da Play Store** — ou seja, pela versão **web** do sistema e pelo **PWA instalado via navegador** (Adicionar à tela inicial / instalação Chrome/Edge/Safari). O **Google Play Billing** (`usePlayBilling.ts`, `playBilling.ts`, RTDN) continua existindo **apenas** para compras feitas **dentro do app publicado na Play Store**, quando/se esse canal for usado — é exigência da política do Google, não escolha nossa.
> Complementa: `docs/planning/implementacao-tecnica-planos-billing.md` (schema/motor de faixas), `docs/planning/catalogo-de-precos.md` (preços), `docs/planning/planos-monetizacao-academia-personal.md` (mercado) e `docs/planning/plano-academia-limites-professores-alunos.md` (limites de academia). Este documento **substitui a menção a "Asaas"** pela escolha definitiva: **Mercado Pago**.
> Data: 2026-09-16 (revisado)

---

> ## ✅ Decisão de escopo (revisada em 2026-09-16)
>
> **Todos os três papéis pagam:** Aluno, Personal Trainer (Professor) e Academia — mantendo as **faixas por quantidade de alunos** já desenhadas em `catalogo-de-precos.md`/`implementacao-tecnica-planos-billing.md` (PT_FREE…PT_STUDIO, AC_ESSENCIAL…AC_ENTERPRISE, ALUNO_MENSAL).
>
> **A mudança em relação ao desenho B2B original: a cobrança roda "através de pessoa física".** Ou seja:
> - O **payer** de um plano de Academia/Personal é o `Usuario` dono da conta (o gestor da academia, o personal trainer) — ele assina e paga **com o CPF/cartão dele**, exatamente como um consumidor faria. Não modelamos "empresa paga empresa" nem coletamos CNPJ do cliente como requisito de checkout.
> - **Nós (ENDORFINAPP) também seguimos recebendo como pessoa física** no Mercado Pago (mesma decisão já tomada para o Aluno) — não é necessário abrir CNPJ agora só para vender para academia.
> - **Isso remove o NFS-e como bloqueador de lançamento.** NFS-e era exigência decorrente de tratar a venda como B2B formal (nota fiscal de serviço entre empresas). Tratando o checkout como pessoa física para pessoa física, o produto pode rodar sem NFS-e.
> - **Risco aceito, não escondido:** algumas academias mais burocráticas podem exigir nota fiscal para lançar a despesa na contabilidade delas e podem recusar pagar sem isso. É uma limitação comercial conhecida, não um bloqueador técnico — ver §9. Quando o volume justificar, formalizar (SLU + Simples Nacional, decisão já discutida) destrava vender para esse segmento sem precisar remodelar o sistema (os campos de NFS-e já ficam previstos e nulos no schema, §4).
>
> **Resultado prático:** um único motor de cobrança (schema + gateway) atende os três papéis. O que muda entre eles é só o **plano/faixa** escolhido no catálogo, não a arquitetura de pagamento.

---

## 1. Por que separar por canal (não por papel)

| Canal | Como o usuário chega | Gateway | Motivo |
|---|---|---|---|
| **App nativo (Play Store)** | instalado pela loja Android | **Google Play Billing** (já modelado: `Loja.GOOGLE_PLAY`, `google_purchase_token`, webhook RTDN) | Política do Google exige Play Billing para bens/assinaturas digitais compradas **dentro de um app distribuído pela Play Store** |
| **Web (navegador, sem instalar)** | acessa `endorfinapp.com.br` no browser | **Mercado Pago** | Fora da Play Store → sem restrição de billing da loja |
| **PWA instalado via navegador** | "Adicionar à tela inicial"/"Instalar app" (manifest do PWA, **não** passa pela Play Store) | **Mercado Pago** | Mesma app shell da web; instalação via navegador não é compra dentro de app de loja |

A separação por canal (não por papel) é o que permite usar **um único gateway para Aluno, Personal e Academia**: os três acessam por web/PWA, então os três passam pelo Mercado Pago. O Play Billing fica reservado para um eventual app nativo publicado na loja (código intacto, desligado).

---

## 2. Quem paga o quê (payer vs. tenant)

Reaproveita o modelo já especificado em `implementacao-tecnica-planos-billing.md §2.1`, sem mudança — só reforçando que o **payer é sempre uma pessoa física** no Mercado Pago, mesmo quando o tenant é uma Academia:

| Caso | Payer (`usuario_id`) | Método de pagamento | Tenant (quem tem alunos) |
|---|---|---|---|
| **Aluno** | usuário role `ALUNO` | cartão/Pix/boleto do próprio aluno | `aluno` (sem faixa) |
| **Personal** | usuário role `PROFESSOR` | cartão/Pix/boleto do próprio professor (pessoa física) | `professor` (por `usuario_id`) — alunos = `alunos.professor_id = professor.id` |
| **Academia** | usuário role `ACADEMIA` (dono/gestor) | cartão/Pix/boleto do dono/gestor (**pessoa física**, não cartão corporativo/CNPJ) | `academia` — alunos = `alunos.academia_id = academia.id` |

Nenhuma coleta de CNPJ/razão social é obrigatória no checkout. Se, no futuro, quisermos oferecer nota fiscal para quem pedir, esses campos entram como **opcionais** em `Cobranca` (dados fiscais), sem mudar o fluxo de quem não precisa.

---

## 3. Faixas e catálogo (mantidos)

Sem mudança em relação ao já desenhado — ver `catalogo-de-precos.md` para os valores e `implementacao-tecnica-planos-billing.md §2.2` para a tabela completa de faixas:

- **Personal** (`PT_FREE` até `PT_STUDIO`): faixas por alunos ativos (30d), 0–3 grátis até ilimitado com add-on de professor extra.
- **Academia** (`AC_ESSENCIAL` até `AC_ENTERPRISE`): faixas por alunos ativos + professores inclusos + unidades.
- **Aluno** (`ALUNO_MENSAL`): plano único, sem faixa, com patrocínio (aluno de professor/academia pagante não paga).

**Auto-upgrade de faixa** na fatura seguinte, **downgrade só no fim do ciclo**, **carência de 10 dias** antes de bloquear — regras inalteradas (`implementacao-tecnica-planos-billing.md §5`).

---

## 4. O que o Mercado Pago cobre no nosso caso

| Necessidade | Produto do Mercado Pago | Observação |
|---|---|---|
| Cartão de crédito **recorrente** (assinatura mensal automática) | **Assinaturas** (API de Preapproval — `/preapproval`) | Cobra automaticamente todo mês; valor = preço da faixa vigente do tenant |
| **PIX** | API de Pagamentos (`/v1/payments`, `payment_method_id: "pix"`) | **Sem recorrência nativa** — o job de fechamento de competência (§5 do doc técnico) gera um novo QR/copia-e-cola por ciclo |
| **Boleto** | API de Pagamentos (`payment_method_id: "bolbradesco"` ou equivalente) | Também sem recorrência nativa — novo boleto por ciclo |
| Checkout embutido | **Checkout Bricks** (`Payment Brick`, `Status Brick`) via SDK JS | Cartão + Pix + boleto no mesmo componente, dentro do nosso design system |
| Checkout hospedado (redirect) — alternativa mais simples de implementar primeiro | **Checkout Pro** (`/checkout/preferences`) | Menos trabalho de PCI/compliance no nosso lado; leva o usuário para a página do MP |
| Notificação de pagamento/assinatura | **Webhooks** (tópicos `payment` e `subscription_preapproval`) | Mesmo papel do RTDN do Google Play |
| Guardar cartão para cobranças futuras | **Customers + Cards API** | Para o fluxo de "trocar cartão" em `/billing` |

> ⚠️ Taxas exatas (cartão %, Pix %, boleto R$ fixo) precisam ser confirmadas na documentação oficial do desenvolvedor (`https://www.mercadopago.com.br/developers/pt/docs`) e no painel de custos da conta antes de travar o catálogo de preços — a tentativa de consulta nesta sessão bateu em tela de login (ver `.opencode/docs/www_mercadopago_com_br_costs-section.md`).

---

## 5. Ajustes no schema

Volta a valer o schema completo do `implementacao-tecnica-planos-billing.md §3` (faixas, `UsoMensal`, `tenant_tipo`/`tenant_id`), com os campos específicos do Mercado Pago no lugar dos genéricos "Asaas":

### 5.1 `AssinaturaCanal`
```prisma
enum AssinaturaCanal {
  GOOGLE_PLAY        // reservado — app nativo futuro
  WEB_MERCADOPAGO    // canal ativo hoje (web + PWA) — Aluno, Personal e Academia
  MANUAL             // liberação manual (root)
}
```
(Remove `WEB_PIX`/`WEB_BOLETO`/`WEB_CARTAO` do rascunho anterior — o método fica em `Cobranca`/`PagamentoMetodo`, o canal só distingue loja vs. Mercado Pago.)

### 5.2 `Cobranca` (campos do Mercado Pago)
```prisma
model Cobranca {
  id                String   @id @default(cuid())
  assinatura_id     String
  competencia       String
  valor_cents       Int
  status            CobrancaStatus @default(PENDENTE)
  vencimento        DateTime
  pago_em           DateTime?
  gateway           String?  @default("mercadopago")
  gateway_charge_id String?  @unique   // payment_id do Mercado Pago
  mp_preapproval_id String?            // se a cobrança veio de uma assinatura (cartão)
  pix_copia_cola    String?  @db.Text
  pix_qr_base64     String?  @db.Text
  boleto_url        String?
  linha_digitavel   String?
  // ── fiscal, opcional (não bloqueia o fluxo padrão) ──
  nfse_numero       String?
  nfse_url          String?
  cliente_cnpj      String?            // só se o tenant pedir nota fiscal (fluxo futuro)
  criado_em         DateTime @default(now())
  atualizado_em     DateTime @updatedAt
  assinatura        Assinatura @relation(fields: [assinatura_id], references: [id], onDelete: Cascade)
  @@index([assinatura_id, competencia])
  @@index([status, vencimento])
  @@map("cobrancas")
}
```

### 5.3 `PagamentoMetodo`
```prisma
model PagamentoMetodo {
  id                  String   @id @default(cuid())
  usuario_id          String
  gateway             String   @default("mercadopago")
  gateway_customer_id String?
  cartao_ultimos4     String?
  cartao_bandeira     String?
  token               String?               // card_id do Mercado Pago
  padrao              Boolean  @default(true)
  criado_em           DateTime @default(now())
  assinaturas         Assinatura[]
  @@index([usuario_id])
  @@map("pagamentos_metodo")
}
```

### 5.4 `Assinatura` / `UsoMensal` / `PlanoAssinatura`
Sem mudança em relação ao `implementacao-tecnica-planos-billing.md §3.1/§3.3/§3.4` — só troca o nome do gateway nos comentários (Asaas → Mercado Pago) e mantém `google_play_product_id` opcional.

> `AssinaturaEvento`: `gateway String?` + `evento_externo_id String? @unique` (dedupe de reentrega do webhook do MP).

---

## 6. `MercadoPagoGateway.ts`

Implementa a mesma interface `PaymentGateway` já especificada no doc técnico (`infrastructure/payments/PaymentGateway.ts`), sem mudar o contrato — só a implementação:

```ts
export class MercadoPagoGateway implements PaymentGateway {
  criarCliente(dados: ClienteInput) { /* POST /v1/customers */ }
  criarAssinatura(input: AssinaturaInput) { /* POST /preapproval */ }
  criarCobranca(input: CobrancaInput) { /* POST /v1/payments (pix/boleto) */ }
  cancelarAssinatura(id: string) { /* PUT /preapproval/{id} status: cancelled */ }
  validarWebhook(headers, rawBody) { /* HMAC-SHA256 do manifest vs. x-signature */ }
}
```

**Pontos específicos por método:**

- **`criarAssinatura`** (cartão): `POST /preapproval` com `card_token_id` (gerado no frontend, nunca o PAN passa pelo backend), `auto_recurring.transaction_amount` = **preço da faixa vigente do tenant** (recalculado a cada upgrade/downgrade de faixa), `external_reference` = `assinatura.id`.
- **`criarCobranca`** (Pix/boleto avulso por ciclo): `POST /v1/payments`, `external_reference` = `cobranca.id`, header `X-Idempotency-Key` = `cobranca.id`.
- **`validarWebhook`**: sempre buscar o recurso completo via `GET /v1/payments/{id}` ou `GET /preapproval/{id}` — o payload da notificação não traz o objeto inteiro.

---

## 7. Rotas (reaproveitadas de `implementacao-tecnica-planos-billing.md §7.2`, sem mudança de contrato)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/billing/planos` | Catálogo completo — Aluno, Personal (faixas), Academia (faixas) |
| POST | `/billing/checkout` | `{ plano_codigo, metodo, card_token_id? }` — funciona igual para os 3 papéis |
| GET | `/billing/me` | Entitlements + faixa atual + uso (alunos ativos, se aplicável) |
| GET | `/billing/faturas` | Lista de `Cobranca` |
| PUT | `/billing/metodo-pagamento` | Troca cartão |
| POST | `/billing/cancelar` / `/billing/reativar` | Cancela/reativa |
| POST | `/webhooks/billing/mercadopago` | Webhook público, idempotente |
| POST | `/root/billing/liberar-manual` | Já existe (`rootPremiumRoutes`) |

---

## 8. Frontend

- `/planos` — já desenhado em `docs/planning/pagina-de-planos.md`, com segmented control Personal/Academia + card do Aluno.
- `/billing/checkout` — Checkout Bricks (`Payment Brick`) reaproveitável para os três papéis; só muda `plano_codigo`/valor.
- `/billing` — "Minha assinatura": faixa, uso, faturas, método, cancelar — igual para os 3 papéis.
- Banners de uso/carência (ex.: "18/30 alunos ativos — upgrade para o Pro").
- `MP_PUBLIC_KEY` no frontend (`VITE_MP_PUBLIC_KEY`); `ACCESS_TOKEN` só no backend.

---

## 9. Riscos e pendências (honestos, não escondidos)

1. **Academias que exigem nota fiscal** podem recusar assinar sem NFS-e — é uma perda de mercado conhecida no B2B mais formal/burocrático (redes, franquias). Mitigação: oferecer nota fiscal **sob demanda** quando/se formalizarmos CNPJ (o schema já tem os campos prontos e nulos, §5.2), sem precisar remodelar nada.
2. **CNPJ segue não sendo bloqueador imediato** — mas formalizar (SLU + Simples Nacional, decisão já discutida) é o que destrava o segmento do item 1 e melhora a carga tributária conforme o faturamento cresce.
3. **Recorrência de Pix/boleto** — sem recorrência nativa no MP; o job mensal de faturamento (`implementacao-tecnica-planos-billing.md §5.1`) gera nova cobrança por ciclo.
4. **Confirmação de taxas** — cartão/Pix/boleto do Mercado Pago, a validar na documentação oficial antes de travar preço final.
5. **Metering** (`alunos ativos 30d`) continua necessário para Personal e Academia (faixas) — não é necessário para Aluno. Ver `implementacao-tecnica-planos-billing.md §4`.
6. **Compliance de cobrar pessoa física de um "negócio"**: tecnicamente o dono da academia está pagando uma ferramenta de trabalho com o CPF dele — isso é comum (MEI/autônomo também fazem isso o tempo todo com assinaturas de software), mas vale reforçar nos Termos de Uso que a responsabilidade fiscal de lançar essa despesa como custo do negócio dele é do próprio assinante.

---

## 10. Rollout

| Etapa | O que |
|---|---|
| E0 | Schema completo (faixas, `UsoMensal`, `Cobranca`, `PagamentoMetodo`, `AssinaturaCanal.WEB_MERCADOPAGO`) + `BILLING_ENABLED=false` |
| E1 | Metering (`uso_mensal`) rodando "à toa" por 2–4 semanas para Personal/Academia (só mede, não cobra) — valida a definição de "aluno ativo" |
| E2 | `/billing/me` (somente leitura) + página `/planos` completa (3 blocos) |
| E3 | `MercadoPagoGateway` em **sandbox**: assinatura cartão (Preapproval) + Pix/boleto avulso + webhook + dedupe, para os 3 papéis |
| E4 | Piloto em produção com clientes reais (desconto fundador), `MP_ENV=production` |
| E5 | Ligar gates para novos usuários; grandfather dos atuais |

**Pré-requisito antes de codar:** criar aplicação no Mercado Pago Developers, habilitar Assinaturas e Checkout Bricks, gerar credenciais de teste, e validar na documentação oficial atualizada os contratos de `/preapproval`, `/v1/payments` e Webhooks no momento da implementação.

---

## 11. Resumo da decisão

- **Aluno, Personal e Academia pagam** — faixas mantidas conforme `catalogo-de-precos.md`.
- **Um único gateway (Mercado Pago)** para os três, via web/PWA — Google Play Billing reservado para um eventual app nativo.
- **Cobrança "através de pessoa física"**: o payer é sempre o CPF do usuário dono da conta (aluno, personal ou gestor da academia), e nós seguimos recebendo como pessoa física — **sem exigir CNPJ/NFS-e de ninguém para lançar**.
- **Risco aceito**: perder academias que exigem nota fiscal formal — mitigável depois, sem remodelar o schema, quando/se formalizarmos CNPJ.
