# Catálogo de Preços — ENDORFINAPP

> ✅ **ATIVO (2026-09-16, atualizado):** Personal e Academia (§1 e §2) voltam ao escopo — cobrados via **Mercado Pago como pessoa física** (o dono/professor paga com seu CPF, sem exigir CNPJ/NFS-e da parte deles nem da nossa). Ver `docs/planning/integracao-mercado-pago.md` para o desenho de cobrança atualizado (faixas mantidas, gateway único).
>
> Documento de **preços** (sem implementação). Consolida os valores calculados em
> `planos-monetizacao-academia-personal.md`, `plano-academia-limites-professores-alunos.md` (§7)
> e `implementacao-tecnica-planos-billing.md`.
> Moeda: **BRL**. Preços **mensais**. **Sem uso de IA** na modelagem (custo variável de IA = R$ 0).
> Data: 2026-09-16

---

## 1. Personal Trainer (B2B — o professor paga e patrocina os alunos)

Cobrança **fora da loja** (checkout web: PIX/boleto/cartão). Contagem = **alunos ativos (30d)**.

| Código | Plano | Alunos ativos | Professores | Preço/mês | **R$/aluno (no teto)** | Trial |
|---|---|---|---|---|---|---|
| `PT_FREE` | Personal Free | até **3** | 1 | **R$ 0** | R$ 0 | — |
| `PT_STARTER` | Personal Starter | até **10** | 1 | **R$ 49** | **R$ 4,90** | 15 dias |
| `PT_PRO` | Personal Pro | até **30** | 1 | **R$ 89** | **R$ 2,97** | 15 dias |
| `PT_PLUS` | Personal Plus | até **60** | 2 | **R$ 149** | **R$ 2,48** | 15 dias |
| `PT_SCALE` | Personal Scale | até **120** | 3 | **R$ 249** | **R$ 2,08** | 15 dias |
| `PT_STUDIO` | Personal Studio | **ilimitado** (fair-use) | 3 | **R$ 349** | — | 15 dias |

**Add-on:** professor extra **R$ 39/mês** (PT_PLUS em diante).

---

## 2. Academia (B2B — paga por faixa de alunos + professores)

Cobrança **fora da loja** (checkout web: PIX/boleto/cartão + NFS-e).

| Código | Plano | Segmento | Alunos ativos | Professores | Unid. | Preço/mês | **R$/aluno (no teto)** |
|---|---|---|---|---|---|---|---|
| `AC_ESSENCIAL` | Academia Essencial | **Pequena** | até **150** | 5 | 1 | **R$ 199** | **R$ 1,33** |
| `AC_CRESCIMENTO` | Academia Crescimento | **Média** | até **400** | 15 | 1 | **R$ 399** | **R$ 1,00** |
| `AC_PERFORMANCE` | Academia Performance | **Grande** | até **1.000** | 40 | 1 | **R$ 749** | **R$ 0,75** |
| `AC_REDE` | Academia Rede | **Rede** | até **2.500** | 100 | 5 | **R$ 1.499** | **R$ 0,60** |
| `AC_ENTERPRISE` | Academia Enterprise | **Rede+** | ilimitado | ilimitado | ilimitado | **sob consulta** | negociado |

**Add-ons academia:**
| Add-on | Preço/mês |
|---|---|
| Professor extra | **R$ 29** |
| +100 alunos | **R$ 79** |
| Unidade extra | **R$ 199** |

---

## 3. Aluno (B2C)

Cobrança **in-app (Google Play)**, com **patrocínio grátis** quando o aluno tem professor/academia pagante.

| Código | Plano | Preço/mês | Trial | Produto (Play) |
|---|---|---|---|---|
| `ALUNO_MENSAL` | Aluno Premium | **R$ 12,00** (faixa sugerida até **R$ 14,90**) | 15 dias | `sub_aluno_mensal` |
| — | Aluno Patrocinado | **R$ 0** | — | — (paga o PT/academia) |

---

## 4. Resumo — preço por aluno (visão rápida)

| Plano | Preço/mês | Alunos (teto) | R$/aluno |
|---|---|---|---|
| PT_STARTER | R$ 49 | 10 | R$ 4,90 |
| PT_PRO | R$ 89 | 30 | R$ 2,97 |
| PT_PLUS | R$ 149 | 60 | R$ 2,48 |
| PT_SCALE | R$ 249 | 120 | R$ 2,08 |
| AC_ESSENCIAL | R$ 199 | 150 | R$ 1,33 |
| AC_CRESCIMENTO | R$ 399 | 400 | R$ 1,00 |
| AC_PERFORMANCE | R$ 749 | 1.000 | R$ 0,75 |
| AC_REDE | R$ 1.499 | 2.500 | R$ 0,60 |
| ALUNO_MENSAL (B2C) | R$ 12 | — | R$ 12 (avulso) |

---

## 5. Referência de mercado (âncora)

| Player | Preço | Modelo |
|---|---|---|
| **Tecnofit** (BR) | **R$ 269/mês** p/ 50 alunos = **R$ 1,65/aluno**; média citada **R$ 3,38/aluno/mês** | por alunos ativos + auto-upgrade de faixa |
| Everfit (global) | **US$ 3,80 → US$ 0,81/cliente** | por cliente (decrescente) |
| TrueCoach (global) | US$ 26,34 (5) · 57,99 (20) · 136,99 (50) | tiers por clientes |
| My PT Hub (global) | tiers + **"per additional trainer"** | tiers + seat extra |

**Posicionamento:** academias **R$ 0,60–1,33/aluno** (abaixo do Tecnofit) e personais **R$ 2,08–4,90/aluno** — com valor de *coaching/avaliação/social*, não só gestão.

---

## 6. Observações de precificação

1. **Base de contagem:** alunos com ≥1 treino concluído em 30 dias ("aluno ativo"); professores com vínculo **ATIVO**.
2. **Auto-upgrade de faixa** na fatura seguinte (padrão do mercado); downgrade só no fim do ciclo.
3. **Tolerância de 10%** antes de bloquear; **carência de 10 dias** antes de cortar acesso (retenção).
4. **Cobrança:** B2B fora da loja (PIX ~1% / boleto ~R$2 / cartão ~4%) — evita os **15%** do Google Play.
5. **NFS-e** é requisito para venda B2B (não add-on).
6. **Anual:** sugerido **2 meses grátis + faixa congelada** por 12 meses.
7. **Margem:** bruta **92–96%**; de contribuição **71–82%** (o custo real é suporte, não infra). Ver §7 do doc de academia.
8. **Valores "a confirmar":** taxas de gateway (páginas bloquearam consulta) e custo real de infra/aluno (proxy do Postgres indisponível nesta sessão).

---

## 7. Pendências para virar produto (NÃO implementado)

- Schema: `google_play_product_id` precisa virar **opcional** (planos B2B não têm produto na loja) + campos de `limite_professores`, `limite_unidades`, faixas, add-ons e recursos.
- Seed/catálogo em código e checkout B2B: **não criados** (aguardando decisão).