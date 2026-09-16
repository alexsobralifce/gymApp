# Plano Academia — Limites de Professores e Alunos (Pequena / Média / Grande / Rede)

> Objetivo: um plano de academia em que o **próprio gestor cadastra e gerencia os limites** de professores e alunos, com faixas para academia **pequena, média e grande** (e rede).
> Complementa `planos-monetizacao-academia-personal.md` (§4.2) e `implementacao-tecnica-planos-billing.md` (§2.2).
> Data: 2026-09-16 · **Sem IA** na modelagem.

---

## 1. O que já existe hoje (baseline real do código)

| Item | Situação | Referência |
|---|---|---|
| `Academia.max_professores` | ✅ existe (`Int @default(20)`) | `schema.prisma` — model `Academia` |
| Enforcement de **professores** | ✅ existe — bloqueia vínculo acima do limite | `AcademiaService.autorizarProfessorPrimeiraEtapa` → `LimiteProfessoresExcedidoError` |
| Definir limite de professores | ⚠️ **só o ROOT** pode (`PATCH /root/academias/:id/limite-professores`) | `root.routes.ts:97` |
| Limite de **alunos** | ❌ **não existe** (`Academia` não tem `max_alunos`) | — |
| Vínculo de aluno à academia | ❌ **sem nenhum limite** — o aluno se vincula sozinho | `aluno.routes.ts:163` (`PATCH /alunos/academia`) |
| Plano para ACADEMIA |  não existe (só ALUNO e PROFESSOR) | `seed-planos-assinatura.ts` |

**Conclusão:** falta (a) o campo/teto de **alunos**, (b) o **autosserviço** (o gestor editar os próprios limites em vez do Root), (c) o **plano de academia** e (d) o **enforcement de alunos**.

---

## 2. Segmentação das academias

> Base de contagem = **alunos ativos (30d)** e **professores ativos** (vínculo `ATIVO`), conforme metering já especificado.

| Segmento | Alunos ativos | Professores | Unidades | Perfil típico |
|---|---|---|---|---|
| **Pequena** | até **150** | até **5** | 1 | bairro, estúdio, box, personal-studio |
| **Média** | 151–**400** | até **15** | 1 | academia de bairro consolidada |
| **Grande** | 401–**1.000** | até **40** | 1 (opcional 2) | academia de porte, 2 turnos, várias modalidades |
| **Rede** | 1.001–**2.500** | até **100** | até **5** | redes regionais, franquias |
| **Enterprise** | **2.500+** | ilimitado | ilimitado | redes nacionais, white-label, SSO, SLA |

> Um **"estúdio de personal"** (1–3 professores) cai na Pequena; se for só 1 personal, ver o plano de **Personal Trainer** (outro doc) — evita canibalizar.

---

## 3. Tabela de planos (preço + limites)

| Plano | Segmento | **Limite alunos** | **Limite professores** | Unidades | Preço/mês | **R$/aluno** (no teto) | R$/professor |
|---|---|---|---|---|---|---|---|
| **Academia Essencial** | Pequena | **150** | **5** | 1 | **R$ 199** | **R$ 1,33** | R$ 39,80 |
| **Academia Crescimento** | Média | **400** | **15** | 1 | **R$ 399** | **R$ 1,00** | R$ 26,60 |
| **Academia Performance** | Grande | **1.000** | **40** | 1 | **R$ 749** | **R$ 0,75** | R$ 18,73 |
| **Academia Rede** | Rede | **2.500** | **100** | 5 | **R$ 1.499** | **R$ 0,60** | R$ 14,99 |
| **Academia Enterprise** | Rede+ | ilimitado | ilimitado | ilimitado | **custom** | negociado | — |

**Ancoragem de mercado:** Tecnofit cobra **R$ 1,65/aluno** (50 alunos) e cita média de **R$ 3,38/aluno/mês**. Nosso posicionamento (**R$ 0,60–1,33/aluno**) é **agressivo na entrada** e **escala bem**, porque o custo marginal de aluno é ~R$ 0,01–0,05 (infra) e o produto entrega *coaching + social + avaliação* (não só gestão).

**Add-ons** (qualquer plano):
| Add-on | Preço | Observação |
|---|---|---|
| Professor extra | **R$ 29/mês** | acima do limite do plano |
| +100 alunos | **R$ 79/mês** | alternativa ao upgrade de faixa |
| Unidade extra | **R$ 199/mês** | planos Grande/Rede |
| NFS-e | incluída (Média+) | exigida para B2B |
| White-label do app | add-on (Grande/Rede) | marca própria |
| BI/multiunidade | incluído em Performance+/Rede | comparativo entre unidades |

---

## 4. Como a academia **cadastra e gerencia os limites** (autosserviço)

### 4.1 Conceito de dois níveis de limite
1. **Teto do plano (contratado):** definido pela faixa (150/400/1.000/2.500 alunos; 5/15/40/100 professores). **Não editável** pelo gestor — é o que ele compra.
2. **Limite operacional (internamente configurável):** o gestor **pode reduzir** dentro do teto, para controlar crescimento e custos internos. Ex.: contratou Crescimento (400), mas define limite interno de 350 alunos neste trimestre.

### 4.2 Tela "Limites e Equipe" (nova, role ACADEMIA)
Rota `Academia → /limites`:
- **Cards de uso**: `Alunos ativos 312/400` (barra), `Professores ativos 11/15`, `Unidades 1/1`.
- **Definir limite interno**: steppers `[−] [350] [+]` para alunos e `[−] [12] [+]` para professores (limitados ao teto do plano).
- **Limite por professor (opcional, recomendado)**: `Máx. alunos por professor: [40]` — evita que um professor concentre toda a base.
- **Avisos**: 80% → banner amarelo; 100% → banner vermelho + **bloqueia novas matrículas** + CTA "Aumentar limite".
- **Aumentar limite**: abre o fluxo de **upgrade de faixa** (cobrança na próxima fatura) ou compra de **add-on**.

### 4.3 Fluxo
```
ACADEMIA abre /limites
   → vê uso atual vs teto
   → (opcional) reduz limite interno (≤ teto)
   → ao atingir o teto: sistema bloqueia novas matrículas/vínculos
   → CTA "Aumentar": escolhe faixa superior ou add-on (+100 alunos / +professor)
   → novo limite vale imediatamente; cobrança ajustada na próxima fatura
```

### 4.4 Papel do ROOT
- Continua podendo **conceder limites especiais** (cortesia/negociação) via `PATCH /root/academias/:id/limites` — generaliza o endpoint atual.
- Aprova academias e vínculos (como já faz).

---

## 5. Regras de negócio

| # | Regra | Detalhe |
|---|---|---|
| R1 | **Contagem = ativos** | alunos ativos (30d) e professores `ATIVO` — não cadastro |
| R2 | **Bloqueio no teto** | novo aluno/professor acima do limite → erro `LimiteAlunosExcedidoError` / `LimiteProfessoresExcedidoError` |
| R3 | **Tolerância de 10%** | entre 100% e 110%: permite mas avisa (evita travar operação por 1 aluno) |
| R4 | **Auto-upgrade na fatura seguinte** | se exceder o teto do plano, sobe de faixa no próximo ciclo (igual Tecnofit) |
| R5 | **Downgrade** | só no fim do ciclo, com 1 ciclo de tolerância (evita ping-pong) |
| R6 | **Limite interno ≤ teto** | o gestor nunca define acima do que contratou |
| R7 | **Professor conta no tenant da academia** | aluno vinculado à academia consome o limite de alunos da academia |
| R8 | **Aluno com professor + academia** | consome 1 aluno da academia **e** 1 do professor (cada plano paga o seu acesso) |
| R9 | **Autorização do professor** | usa `professores_inclusos` do plano (hoje usa `max_professores`) |
| R10 | **Carência** | inadimplência não bloqueia imediatamente (D+10) — ver dunning do doc técnico |

### 5.1 Como resolver o conflito "aluno vinculado à academia E a um professor"
Recomendação: **o aluno consome o limite de quem paga o "patrocínio"**. Se a academia é pagante, o aluno é limite da academia; o professor vinculado à academia **não** consome o limite dele para alunos daquela academia (evita cobrança dupla). Se o professor for **autônomo** (sem academia), aí sim consome o limite do plano dele.

---

## 6. Mudanças necessárias (concretas)

### 6.1 Schema
```prisma
model Academia {
  // ...
  max_professores            Int  @default(5)    // alinhar default ao menor plano
  max_alunos                 Int  @default(150)  // NOVO
  max_alunos_por_professor   Int?                // NOVO (opcional)
  limite_alunos_interno      Int?                // NOVO (gestor reduz dentro do teto)
  limite_professores_interno Int?                // NOVO
  // ...
}

model PlanoAssinatura {
  // ...
  limite_alunos      Int?   // NOVO (teto de alunos do plano)
  limite_professores Int?   // NOVO (teto de professores)
  limite_unidades    Int    @default(1) // NOVO
  // ...
}
```
> Observação: `PlanoAssinatura.limite_alunos` já existe no modelo atual — reutilizar; adicionar `limite_professores`/`limite_unidades`.

### 6.2 Rotas
| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/academias/limites` | ACADEMIA | Uso atual + teto + limite interno |
| PATCH | `/academias/limites` | ACADEMIA | Define limite **interno** (≤ teto) |
| PATCH | `/root/academias/:id/limites` | ROOT | Generaliza `limite-professores` (adiciona alunos/unidades/cortesia) |
| POST | `/billing/upgrade` | ACADEMIA | Upgrade de faixa / add-on |
| POST | `/academias/alunos/:id/aprovar` | ACADEMIA | *(opcional)* aprovar entrada de aluno |

### 6.3 Pontos de enforcement (patcher)
| Fluxo | Arquivo atual | O que adicionar |
|---|---|---|
| Aluno entra na academia | `aluno.routes.ts:163` (`PATCH /alunos/academia`) | **contar alunos ativos e bloquear no teto** |
| Professor entra na academia | `AcademiaService.autorizarProfessorPrimeiraEtapa` | usar `limite_professores` do plano |
| Academia atribui professor ao aluno | `PATCH /academias/alunos/:alunoId/professor` | validar `max_alunos_por_professor` |
| Gate de plano | `PremiumWrapper`/entitlements | expor `limites` para a tela `/limites` |

---

## 7. Margem e simulações (unit economics)

### 7.1 Premissas
| Item | Valor usado | Observação |
|---|---|---|
| Infra marginal / aluno ativo | **R$ 0,02/mês** (sensibilidade 0,01–0,05) | derivado das medições de 7d — proxy do Postgres caiu, então é **estimativa** |
| E-mail + push + storage/egress / aluno | **R$ 0,02/mês** | push grátis; SendGrid ~US$0,002/e-mail |
| Gateway (PIX) | **1%** | boleto ~R$2 fixo; cartão ~4% — taxas **a confirmar** |
| IA/LLM | **R$ 0** | descartada (algoritmo determinístico de scoring) |
| Suporte/CS | R$ 50/h | 0,75–3 h/mês por academia, conforme porte |

### 7.2 Margem bruta por plano (no **teto de alunos** = pior caso)
| Plano | Preço | Alunos (teto) | Infra | E-mail/mídia | PIX | COGS | Margem bruta |
|---|---|---|---|---|---|---|---|
| Essencial | R$ 199 | 150 | R$ 3,00 | R$ 3,00 | R$ 1,99 | **R$ 7,99** | **96,0%** |
| Crescimento | R$ 399 | 400 | R$ 8,00 | R$ 8,00 | R$ 3,99 | **R$ 19,99** | **95,0%** |
| Performance | R$ 749 | 1.000 | R$ 20,00 | R$ 20,00 | R$ 7,49 | **R$ 47,49** | **93,7%** |
| Rede | R$ 1.499 | 2.500 | R$ 50,00 | R$ 50,00 | R$ 14,99 | **R$ 114,99** | **92,3%** |

### 7.3 Sensibilidade da infra (R$/aluno ativo)
| Plano | 0,01 | **0,02** | 0,05 |
|---|---|---|---|
| Essencial | 96,7% | **96,0%** | 93,7% |
| Crescimento | 96,0% | **95,0%** | 92,0% |
| Performance | 95,0% | **93,7%** | 89,7% |
| Rede | 94,0% | **92,3%** | 87,3% |

### 7.4 Margem de contribuição (após suporte)
| Plano | Preço | COGS | Suporte/mês | Contribuição | % |
|---|---|---|---|---|---|
| Essencial | R$ 199 | R$ 8 | 1 h (R$ 50) | R$ 141 | **70,9%** |
| Crescimento | R$ 399 | R$ 20 | 1,5 h (R$ 75) | R$ 304 | **76,2%** |
| Performance | R$ 749 | R$ 47 | 2 h (R$ 100) | R$ 602 | **80,4%** |
| Rede | R$ 1.499 | R$ 115 | 3 h (R$ 150) | R$ 1.234 | **82,3%** |

### 7.5 Simulação da carteira

| Cenário | Clientes | MRR | Custo direto | Margem |
|---|---|---|---|---|
| 1 Pequena (150 alunos, 5 prof.) | 1 | R$ 199 | ~R$ 8 | ~96% |
| 1 Média (400 alunos, 15 prof.) | 1 | R$ 399 | ~R$ 21 | ~95% |
| 1 Grande (1.000 alunos, 40 prof.) | 1 | R$ 749 | ~R$ 52 | ~93% |
| **Carteira exemplo** | 60 Peq. + 25 Méd. + 10 Gr. + 3 Rede | **R$ 33.902** | ~R$ 1.799 | **~94,7%** |

**Leitura:** MRR R$ 33.902 · 36.500 alunos ativos (no teto) · COGS ≈ R$ 1.799 → **margem bruta 94,7%** (91,5% se infra a R$0,05/aluno). Após suporte (~R$ 4.700/mês) → **margem de contribuição ~80,8%**. Toda a infra roda hoje em ~US$ 5/mês (Railway é cobrança por uso).

### 7.6 Add-ons (margem ainda maior)
| Add-on | Preço | Custo | Margem |
|---|---|---|---|
| Professor extra | R$ 29 | ~R$ 0 | **~99,5%** |
| +100 alunos | R$ 79 | ~R$ 4 | **~95%** |
| Unidade extra | R$ 199 | ~R$ 5 | **~97%** |

### 7.7 Custos fixos e break-even
| Cenário | Fixo/mês | Break-even (MRR) | Equivale a |
|---|---|---|---|
| Sem folha (infra + ferramentas) | ~R$ 300 | ~R$ 317 | **2 academias Essencial** |
| Com 1 pessoa (R$ 8.000) | ~R$ 8.300 | ~R$ 8.764 | **~22 Crescimento** (ou 44 Essencial) |

### 7.8 Observações
1. **Teto = pior caso.** Academias raramente ficam 100% ocupadas; com 60–70% de uso, a margem bruta beira **97–98%**.
2. **Cartão encarece.** PIX (1%) → cartão (~4% + R$0,39) reduz a margem bruta em ~3 p.p. (Essencial 96% → ~93%). Boleto (~R$2 fixo) é irrelevante nesses tickets.
3. **B2C é pior.** Google Play leva **15%** (margem bruta ~85%) — reforça cobrar o B2B **fora da loja**.
4. **O risco de margem é operacional (suporte), não técnico.** Quanto maior a academia, melhor a contribuição.
5. **Caveats:** taxas de gateway **a confirmar**; o custo de infra/aluno é **estimativa** (base real não acessível nesta sessão).

---

## 8. Comparativo de mercado (posicionamento)

| Player | Modelo | Preço | Nosso diferencial vs. ele |
|---|---|---|---|
| **Tecnofit** | por alunos ativos + features | R$ 1,65–3,38/aluno | nós: **R$ 0,60–1,33/aluno** + *coaching/avaliação/social* (não só check-in/financeiro) |
| Evo / Next Fit / Pacto | por academia (preço não publicado) | — | transparência + autosserviço de limites |
| Wellhub/TotalPass | B2B2C por colaborador | — | **integração** como canal da academia (receita), não concorrente |

> **Posicionamento:** entrar **abaixo** do Tecnofit em preço, mas com proposta de **retenção/experiência do aluno** (app, treino, avaliação, clube social), que é justamente o que faz a academia não perder matrícula.

---

## 9. UI/UX resumida

- **Banner de uso** no Dashboard da academia: "alunos ativos 312/400".
- **/limites**: cards + steppers + CTA de upgrade (descrito em §4.2).
- **Avisos proativos**: push/e-mail ao gestor em 80%, 100% e na virada de faixa.
- **Root**: tela de academias com colunas `alunos / teto`, `professores / teto`, botão "editar limites".

---

## 10. Rollout

| Etapa | Entrega | Risco |
|---|---|---|
| A1 | `Academia.max_alunos` + enforcement no vínculo de aluno | baixo |
| A2 | `GET/PATCH /academias/limites` (autosserviço ≤ teto) | baixo |
| A3 | Tela `/limites` + banners de uso | baixo |
| A4 | Planos de academia no `seed` + checkout B2B | médio |
| A5 | Auto-upgrade de faixa + add-ons | médio |
| A6 | Rede/Enterprise (multiunidade, white-label, BI) | alto |

---

## 11. Recomendações

1. **Começar por A1+A2** (barato e já destrava o discurso comercial: "a academia controla os próprios limites").
2. **Default de `max_professores` cai de 20 → 5** para alinhar ao plano Pequena (hoje 20 é generoso demais e não sustenta o tier).
3. **Vincular aluno à academia hoje é livre** — sem enforcement, o limite de alunos é puramente cosmético. Corrigir isso é o item mais crítico.
4. **Add-on de professor é o pulo do gato**: academias crescem em professores antes de crescer em alunos → ARPU sobe sem trocar de tier.
5. **Não bloquear com carência** (retenção); bloquear apenas o *excedente* acima do teto+10%.
6. Manter **Rede/Enterprise** com preço "sob consulta" (>R$ 1.499) para não ancorar barato redes grandes.