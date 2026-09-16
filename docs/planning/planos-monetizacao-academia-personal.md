# Planos por Quantidade de Alunos — Academias e Personal Trainers (ENDORFINAPP)

> Avaliação de infraestrutura (Railway) + modelo de monetização atual + pesquisa de mercado + proposta de tiers.
> Data: 2026-09-16 · Autor: Commander (sessão autônoma)

## 0. Escopo, método e limitações

**Foco:** responder "como estruturar planos para academias e personal trainers com base na quantidade de alunos".

**O que foi feito:**
- Levantamento da infraestrutura em produção no Railway (serviços, uso de recursos, domínios, variáveis) via MCP.
- Leitura do modelo de monetização no código (planos, assinaturas, gates, limites).
- Pesquisa de mercado (preços publicados de concorrentes BR e globais) com fontes e nível de confiança.

**Limitações/bloqueios encontrados (importante):**
1. **Railway MCP expirou a autenticação** durante a sessão (`Unauthorized` / "run `railway login`"). Não foi possível ler variáveis/volume/proxies após esse ponto.
2. **O proxy público do Postgres (`hayabusa.proxy.rlwy.net:43219`) está recusando conexões** (Connection refused) — provavelmente rotacionado/desabilitado. A API continua **saudável** e conectada ao banco internamente (`GET /health` → `database.connected: true`), então **a produção não está fora do ar**; apenas o acesso externo ao banco falhou.
3. Por causa de (2), **não foi possível coletar os números vivos** de alunos/professores/academias (a query `_tmp-scale.ts` não rodou). Onde isso importa, o texto indica "a coletar".

**Para destravar (1 ação):** rodar `railway login` e reabilitar/gerar o TCP Proxy público do Postgres. Com isso eu completo a tabela de escala da base.

---

## 1. Avaliação da infraestrutura no Railway

### 1.1 Inventário (produção — environment `production`)

| Serviço | ID | Status | Deploys ativos | Último deploy |
|---|---|---|---|---|
| `api` (Fastify) | `f94c779a…` | SUCCESS | 1 | 2026-09-16 |
| `web` (Vite/React) | `2a6ee050…` | SUCCESS | 1 | 2026-09-16 |
| `Postgres` | `0c3ee108…` | SUCCESS | 1 | 2026-08-22 |
| `Redis` (BullMQ) | `7148ae0c…` | SUCCESS | 1 | 2026-09-05 |

- **Projeto:** `gymApp` (`354a43f7-6e31-4152-939f-74b59ddc28eb`) · **Repo:** `alexsobralifce/gymApp` · **Builder:** RAILPACK
- **Domínios:** API `api-production-3360.up.railway.app`; Web `web-production-c2d3c.up.railway.app` + custom `endorfinapp.com.br` / `www.endorfinapp.com.br` (target port 8080, sync ACTIVE)
- **Ambientes:** **apenas `production`** (não há staging/homologação)

### 1.2 Uso real de recursos (média de 7 dias)

| Serviço | CPU médio | CPU pico | RAM média | RAM pico | Volume |
|---|---|---|---|---|---|
| api | ~0,001 vCPU | 0,14 | 134 MB | 388 MB | — |
| web | ~0,0001 vCPU | 0,09 | 192 MB | 454 MB | — |
| Postgres | ~0,0002 vCPU | 0,03 | 86 MB | 127 MB | 0,24 GB |
| Redis | ~0,003 vCPU | 0,008 | 17 MB | 24 MB | — |

**Leitura:** a stack está **praticamente ociosa** (CPU ~0,1–0,4% de um vCPU; ~430 MB de RAM total). Há **ordem de grandeza de folga** — o gargalo hoje não é infraestrutura.

### 1.3 Estimativa de custo (preços oficiais Railway, 2026)

Fonte: https://docs.railway.com/reference/pricing/plans (confiança ALTA)

| Recurso | Preço |
|---|---|
| Assinatura Hobby | US$ 5/mês (inclui US$ 5 de uso) |
| Assinatura Pro | US$ 20/mês (inclui US$ 20 de uso) |
| RAM | US$ 10 / GB / mês |
| CPU | US$ 20 / vCPU / mês |
| Egress | US$ 0,05 / GB |
| Volume | US$ 0,15 / GB / mês |

**Cálculo aproximado (média 7d):**
- RAM: ~0,43 GB × US$10 = **~US$ 4,30**
- CPU: ~0,004 vCPU × US$20 = **~US$ 0,08**
- Volume: 0,24 GB × US$0,15 = **~US$ 0,04**
- **Uso total ≈ US$ 4,4/mês** → dentro do crédito do plano Hobby ⇒ **~US$ 5–6/mês (~R$ 27–33/mês)**.

> **Implicação estratégica:** o custo de infra é **irrelevante** frente à receita. Isso significa que **a precificação deve ser por valor (por aluno), não por custo**. A margem bruta de qualquer tier proposto será >95% (o único custo relevante é a taxa de gateway (§3.4) — **IA descartada** da modelagem (custo ~0: algoritmo determinístico de scoring, não LLM)).

### 1.4 Riscos técnicos para escalar como SaaS pago (multi-tenant)

| # | Risco | Evidência | Impacto | Recomendação |
|---|---|---|---|---|
| R1 | **Start command roda sincronização pesada a cada boot** | `RAILPACK_START_CMD` executa `sync-gifdotreino.ts && translate-exercises.ts && seed-planos.ts` em background (`&`) antes de subir o server | Cold start longo, concorrência/race com o banco, **não é seguro com múltiplas réplicas** | Mover para **serviço de Cron/Job** separado; no start, apenas `migrate deploy + server` |
| R2 | **Sem ambiente de staging** | só `production` | Deploy arriscado em runtime real | Criar environment `staging` (fork) |
| R3 | **Postgres único, sem HA/réplicas** | 1 deploy ativo | Perda de dados = perda de clientes pagantes | Ativar **backups/PITR** no volume + política de restore testada |
| R4 | **Pool de conexões** | Prisma direto no Postgres | Esgotamento de conexões ao crescer tenants | `pgBouncer` ou `connection_limit` + `pool_timeout` no Prisma |
| R5 | **Todo o push/worker no mesmo processo/Redis** | BullMQ + workers no `api` | Picos de CPU competem com HTTP | Separar serviço `worker` quando o volume subir |
| R6 | **Observabilidade mínima** | `/health` existe (bom), mas sem métricas/alertas | Incidentes detectados por cliente | Alertas de CPU/RAM/erro + uptime |
| R7 | **Sem metering de uso** | não há contagem de "alunos ativos" nem de alunos ativos por tenant (professor/academia) | Impossível cobrar por faixa | Implementar eventos de uso (ver §5) |
| R8 | **Sem cobrança B2B nem NFS-e** | cobrança só existia via Google Play (B2C) | Bloqueia venda para academia/PT | Checkout web + NFS-e (doc técnico) |

**Ponto positivo relevante:** o multi-tenant já é resolvido no domínio (`professor_id`, `academia_id`) e há `max_professores` por academia (default 20) — ou seja, a base para **limites por plano já existe no schema**.

---

## 2. Estado atual da monetização no código

> **Achado crítico:** **toda a cobrança está DESLIGADA** — arquivos comentados com `/* DESATIVADO: cobrança — acesso livre. Reativar: descomentar. */`. Ou seja, **hoje o produto é 100% gratuito**.

**O que já existe (pronto para religar):**

| Camada | Arquivo/estrutura | Estado |
|---|---|---|
| Política de acesso | `AssinaturaPolicy.ts` (`hasActiveAccess`, `canAddStudent`, `TRIAL_DIAS=15`, `LIMITE_ALUNOS_PROFESSOR=10`, `CONVITE_VALIDADE_DIAS=7`) | comentado |
| Serviço | `AssinaturaService.ts` (licença, importar token, convites, patrocínio) | comentado |
| Rotas | `assinatura.routes.ts` (`/assinaturas`, `/convites`, `/root/premium`) | registro comentado em `app.ts` |
| Planos (seed) | `ALUNO_MENSAL` R$ 12,00 / `PROFESSOR_STARTER` R$ 50,00 (10 alunos) | comentado |
| Frontend | `Paywall.tsx`, `PremiumWrapper`, `useSubscription`, `usePlayBilling` | comentado |
| Features gateadas | Biblioteca de Planos, Evolução Avançada, Clubes, Avaliações | comentado |

**Modelo de dados (schema, já migrado):** `planos_assinatura` (com `preco_mensal_cents`, `trial_dias`, `limite_alunos`, `google_play_product_id`), `assinaturas` (status/origem/loja/expiração/trial), `assinatura_eventos` (log de webhook RTDN), `convites_aluno`, e campos de premium manual no `usuario`.

**Lacunas do modelo atual para B2B:**
1. **Não existe plano para ACADEMIA** (o enum de papel-alvo cobre ALUNO e PROFESSOR, mas não há tier de academia/multiunidade).
2. **`limite_alunos` é um inteiro estático no plano** — não há **faixas** nem metering de alunos ativos.
3. **Cobrança só via Google Play Billing** (in-app). Para B2B (academia/personal pagando por cartão/PIX/boleto com NFS-e) isso é inadequado e caro (15% de taxa).
4. **Não há add-ons** (professor extra, unidade extra, white-label, storage de mídia, NFS-e).

---

## 3. Pesquisa de mercado

### 3.1 Gestão de academia no Brasil

| Concorrente | Segmento | Preço publicado | Modelo | Fonte | Confiança |
|---|---|---|---|---|---|
| **Tecnofit** | Academia/box/estúdio/PT | **R$ 269/mês para 50 alunos ativos (R$ 1,65/aluno)**; média citada **R$ 3,38/aluno/mês** | Por **nº de alunos ativos**, com **auto-upgrade de faixa**; planos Starter/Business/Pro por features | https://www.tecnofit.com.br/precos/ | ALTA |
| Tecnofit (faixas) | — | Até 20 · 21–50 · 51–150 · 151–250 · 251–350 · 351–500 · 501–700 · 700+ alunos | Faixas de matrícula | idem (formulário) | ALTA |
| Evo | Academia | preço não publicado (site migrou p/ serviços financeiros) | por academia | https://evo.com.br/ | BAIXA |
| Next Fit | Academia/estúdio | não publicado na home | por academia | https://www.nextfit.com.br/ | BAIXA |
| Pacto | Academia | não publicado (page vazia) | — | https://www.pactosolucoes.com.br/ | BAIXA |

**Modelo de features do Tecnofit (referência de gatilhos de upgrade):** agenda/presença, controle de acesso, WOD/check-in, ficha de treino, **app do aluno**, **integração Wellhub/TotalPass/ClassPass**, financeiro, marketing, **multigateways**, **multiunidades + BI**, **NFS-e (adicional)**, **app/site personalizados (adicional)**, **WhatsApp (adicional)**, NPS (adicional).

### 3.2 Ferramentas de personal trainer (globais, convertidas)

| Concorrente | Faixa | Preço | Equivalente BRL* | Modelo | Fonte | Confiança |
|---|---|---|---|---|---|---|
| **TrueCoach** | Starter | US$ 26,34/mês | ~R$ 142 | **até 5 clientes** | https://truecoach.co/pricing | ALTA |
| TrueCoach | Standard | US$ 57,99/mês | ~R$ 313 | até 20 clientes | idem | ALTA |
| TrueCoach | Pro | US$ 136,99/mês | ~R$ 740 | até 50 clientes | idem | ALTA |
| **Everfit** | por cliente | **US$ 3,80/cliente** (5 cl.) → **US$ 0,81/cliente** (300 cl.) | R$ 20,5 → R$ 4,4 por cliente | **preço por cliente decrescente** | https://everfit.io/pricing | ALTA |
| **My PT Hub** | Starter → Unlimited | Starter com **3 clientes**; tiers com clientes ilimitados; **"per additional trainer"** | — | tiers + **seat extra** | https://www.mypthub.net/pricing/ | MÉDIA |
| ABC Trainerize | Basic+ | página não renderizou valores | — | tiers por clientes | https://www.trainerize.com/pricing/ | BAIXA |

\* câmbio aproximado US$ 1 ≈ R$ 5,40 (ajustar na decisão final).

**Referência B2B2C (wellness corporativo):** TotalPass — planos por colaborador/mês com serviços (personal online, nutrição, terapia), negociados por empresa — https://totalpass.com.br/ (confiança MÉDIA). Útil como **canal de distribuição** para academias parceiras.

### 3.3 Modelos de cobrança (prós/contras)

| Modelo | Como funciona | Prós | Contras | Exemplos |
|---|---|---|---|---|
| **Por aluno ativo (faixas)** | preço muda conforme nº de alunos ativos | alinha valor↔preço, upgrade natural, "cabe no bolso" | exige **metering** confiável; sazonalidade | **Tecnofit** |
| **Por cliente (per-seat decrescente)** | preço por cliente cai conforme volume | simples, escalável | sem teto; pode ficar caro p/ PT pequeno | **Everfit** |
| **Tiers por nº de clientes** | pacotes (5/20/50) | âncoras claras de upgrade | degraus rígidos | **TrueCoach** |
| **Flat + seat extra** | base + "por treinador adicional" | previsível p/ B2B | pouco alinhado ao valor | **My PT Hub**, academias |
| **Flat por unidade** | preço por academia/unidade | fácil de vender p/ rede | não escala com uso | mercado BR |
| **Add-ons** | white-label, NFS-e, WhatsApp, BI, seats extras | aumenta ARPU sem trocar tier | complexidade de catálogo | **Tecnofit** |
| **Free tier / freemium** | grátis até N alunos | aquisição/land-grab | canibaliza se N for alto | comum em PT tools |

### 3.4 Taxas de plataforma e gateways

| Canal | Taxa | Observação | Fonte | Confiança |
|---|---|---|---|---|
| **Google Play Billing — assinaturas** | **15%** (mercados remanescentes, inclui Brasil) | modelo novo EEA/UK/US: 10% + 5% de billing fee | https://support.google.com/googleplay/android-developer/answer/112622 | ALTA |
| Google Play — outras transações | 15% (<US$1M/ano) / 30% (acima) | — | idem | ALTA |
| Stripe BR | ~3,99% + R$ 0,39 (cartão) | página não renderizou no fetch | https://stripe.com/br/pricing | **a confirmar** |
| PIX/boleto (Asaas, Pagar.me, Mercado Pago, Iugu) | tipicamente **~1–2% (PIX)** / boleto taxa fixa | páginas com login/paywall | https://www.asaas.com/tarifas | **a confirmar** |

> **Conclusão de cobrança:** para **B2C (aluno)** o Google Play a 15% é aceitável (e obrigatório se a compra ocorrer no app Android). Para **B2B (PT e academia)**, cobrar **fora da loja** (checkout web com cartão recorrente/PIX/boleto + NFS-e) — economiza ~13 pontos percentuais e viabiliza fatura/contrato.

---

## 4. Proposta de arquitetura de planos (por quantidade de alunos)

### 4.1 Personal Trainer (foco: coaching, não gestão)

| Tier | Alunos ativos | Preço/mês | ≈ R$/aluno | Inclui | Gatilho de upgrade |
|---|---|---|---|---|---|
| **Free (aquisição)** | até **3** | R$ 0 | — | treinos, execução, perfil | quer mais alunos |
| **Personal Starter** | até **10** | **R$ 49** | R$ 4,90 | + avaliação física, 20 convites | passa de 10 alunos |
| **Personal Pro** | até **30** | **R$ 89** | R$ 2,97 | + relatórios/laudos, correlações, clubes | passa de 30 |
| **Personal Plus** | até **60** | **R$ 149** | R$ 2,48 | + templates ilimitados, marca no app | passa de 60 |
| **Personal Scale** | até **120** | **R$ 249** | R$ 2,08 | + importação de alunos, suporte prioritário | passa de 120 |
| **Studio (multi-professor)** | ilimitado | **R$ 349** + **R$ 39/professor extra** | — | + workspace com 3 professores, white-label básico | contrata mais professores |

**Racional:** posiciona **R$ 2,0–5,0/aluno**, dentro/abaixo do benchmark BR (Tecnofit R$1,65–3,38/aluno) mas com valor de *coaching* (avaliação física + relatórios + social), e **muito abaixo** das ferramentas USD (Everfit ≈ R$4,4–20/aluno; TrueCoach ≈ R$14/aluno a 5 clientes).

### 4.2 Academia (multi-tenant, por matrículas)

| Tier | Alunos ativos | Preço/mês | ≈ R$/aluno | Professores inclusos | Extras |
|---|---|---|---|---|---|
| **Academy Starter** | até **150** | **R$ 199** | R$ 1,33 | 5 | gestão de alunos/professores, ficha em lote, clube da academia |
| **Academy Business** | até **400** | **R$ 399** | R$ 1,00 | 15 | + relatórios, avaliação física, integração de check-in |
| **Academy Pro** | até **1.000** | **R$ 749** | R$ 0,75 | 40 | + BI/multiunidade, NFS-e, app com marca da academia |
| **Academy Enterprise** | 1.000+ | **custom** (R$ 0,60–0,80/aluno) | negoc. | ilimitado | multiunidade, SLA, white-label, SSO, treinamento |

**Add-ons academia:** professor extra **R$ 29–39/mês**; unidade extra **R$ 199–299/mês**; NFS-e; WhatsApp automatizado; storage de mídia; BI/multiunidade.

### 4.3 Aluno (B2C) — manter e ajustar

| Tier | Preço | Observação |
|---|---|---|
| **Aluno Free** | R$ 0 | treino, execução, gamificação básica, feed |
| **Aluno Premium** | **R$ 12–14,90/mês** (15 dias de trial) | biblioteca de planos, evolução avançada, clubes, relatórios |
| **Patrocinado** | R$ 0 (paga o PT/academia) | aluno de professor/academia pagante — **mantém o motor de aquisição** |

> A regra de **patrocínio** (aluno de PT pagante não paga) é o maior diferencial de aquisição: não quebrar. Ela transforma cada personal/academia pagante em **canal de aquisição de alunos**.

---

## 5. O que cada limite deve controlar (para os planos serem "à prova de abuso")

| Métrica | Definição sugerida | Por quê |
|---|---|---|
| **Alunos ativos** | aluno que **executou ao menos 1 treino em 30 dias** (não o cadastrado) | alinha preço↔uso e não penaliza base dormante; permite auto-upgrade de faixa como Tecnofit |
| **Professores/seats** | professores **ATIVOS** vinculados à academia | evita cobrar por ex-professor |
| **Unidades** | nº de academias no tenant | destrava Enterprise |
| **Laudos/relatórios** | laudos de avaliação física gerados/mês | feature premium que justifica tier |
| **Storage de mídia** | GB de fotos/vídeos de avaliação | add-on natural |
| **White-label** | ícone/domínio próprios | só tiers altos |

**Implementação mínima:** tabela de eventos de uso (`tenant_id`, `tipo`, `quantidade`, `competencia`) + job mensal que calcula a faixa e atualiza o plano/cobrança. Reaproveita o padrão de rotação/cron já existente (BullMQ).

---

## 6. Ideias adicionais (novas linhas de receita e diferenciais)

1. **Taxa de implantação + migração assistida de dados** (como o Tecnofit): receita one-off e barreira de saída.
2. **Anual com faixa congelada** (2 meses grátis + preço travado por 12 meses): melhora caixa e retenção.
3. **Laudos/relatórios com marca da academia** (add-on) — retém aluno e academia.
4. **White-label do app para academias** (ícone/domínio/cores) — principal driver de tier Enterprise.
5. **Integração de check-in Wellhub/TotalPass/ClassPass** — habilitador de receita para a academia (paridade com Tecnofit).
6. **Marketplace de parceiros** (RF24 já existe) com **comissão/afiliação**.
7. **Programa de indicação** PT→PT e academia→academia (1 mês grátis).
8. **Venda de consultoria/treino online pelo PT** com **split de pagamento** (nosso take rate) — o PT vira loja dentro do app.
9. **BI/Benchmark de unidade** para redes (comparação entre unidades) — tier Pro/Enterprise.
10. **NFS-e e contrato/fatura** para B2B — requisito de compra de academia.
11. **Assinatura de academia como "convênio" para alunos** (academia paga plano premium para todos os alunos) — upsell de alto ARPU.
12. **Dados/produto**: relatório de evolução com marca da academia (retém aluno → retém academia).

---

## 7. Unit economics (sanidade)

| Cenário | Receita/mês | Custo direto estimado | Margem bruta |
|---|---|---|---|
| 1 personal Pro (30 alunos) | R$ 89 | Infra marginal ~R$ 0,10–0,50 | **~99%** |
| 1 academia Business (400 alunos) | R$ 399 | Infra ~R$ 1–3 + pushes | **~99%** |
| Aluno Premium (B2C) | R$ 12 | 15% Google Play (R$ 1,80) | **~85%** |

**Break-even de infra:** com ~US$5/mês de custo, o produto cobre a infra com **um único personal no tier Starter**.

---

## 8. Recomendações priorizadas (roadmap sugerido)

**Fase 1 — Habilitar cobrança B2B (destrava receita)**
1. Reativar `AssinaturaPolicy/Service/routes` **para B2B** com checkout web (cartão recorrente + PIX/boleto + NFS-e), **não** Google Play.
2. Adicionar planos de **ACADEMIA** (1–2 tiers iniciais) ao `planos_assinatura`.
3. Criar **tiers por faixa de alunos** para PROFESSOR (Starter/Pro/Plus/Scale).
4. Migrar a cobrança do aluno (B2C) para habilitar Google Play apenas no app; oferecer checkout web.

**Fase 2 — Metering e automação**
5. Implementar contagem de **alunos ativos (30d)** e **auto-upgrade de faixa** na fatura seguinte.
6. Add-ons (professor extra, unidade extra, storage, NFS-e).
7. Stripes de trial (15 dias PT, 30 dias academia) e régua de cobrança/retenção.

**Fase 3 — Infra para SaaS pago**
8. **Staging environment** + **backups/PITR** do Postgres + **pgBouncer/connection_limit**.
9. Mover `sync/translate/seed` do start command para **Cron service** (R1).
10. Alertas de CPU/RAM/erro e uptime.

**Fase 4 — Diferenciais premium**
11. White-label, integração Wellhub/TotalPass, BI multiunidade, NFS-e, marketplace.

---

## 9. Anexo — fontes consultadas (cache local em `.opencode/docs/`)

| Tema | Fonte | Confiança |
|---|---|---|
| Railway — planos e preços | https://docs.railway.com/reference/pricing/plans | ALTA |
| Google Play — service fees | https://support.google.com/googleplay/android-developer/answer/112622 | ALTA |
| Tecnofit — preços por faixa de alunos | https://www.tecnofit.com.br/precos/ | ALTA |
| Tecnofit — home/features | https://www.tecnofit.com.br/ | MÉDIA |
| TrueCoach — pricing (USD, por clientes) | https://truecoach.co/pricing | ALTA |
| Everfit — pricing (USD, por cliente) | https://everfit.io/pricing | ALTA |
| My PT Hub — pricing (tiers + seat extra) | https://www.mypthub.net/pricing/ | MÉDIA |
| TotalPass — planos B2B2C | https://totalpass.com.br/ | MÉDIA |
| Stripe BR / Asaas / Mercado Pago (taxas) | https://stripe.com/br/pricing · https://www.asaas.com/tarifas | **a confirmar** (páginas bloqueadas) |