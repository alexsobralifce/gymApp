# Plano — Página de Planos (Preços) anexa ao sistema

> Objetivo: criar uma página de divulgação dos planos e das vantagens da ferramenta, **anexa ao sistema** (mesma SPA, rota pública), destacando **valores por aluno** para **personal trainers** e **academias**.
> Restrição: **não mencionar uso de IA** (nem "prescrição por IA") em nenhum texto, badge ou metadado.
> Paleta: **azul & navy** (cores de confiança) — já existentes no design system.
> Base de preços: `docs/planning/catalogo-de-precos.md`.
> Data: 2026-09-16

---

## 1. Princípios

1. **Confiança antes de conversão.** A página deve parecer institucional: preço claro, sem asteriscos escondidos, linguagem objetiva.
2. **Preço por aluno em evidência.** É o argumento mais forte para personal e academia ("cabe no orçamento").
3. **Mobile-first.** A maioria acessa pelo celular (PWA).
4. **Zero cor nova.** Reutilizar os tokens `--color-*` (tema azul) para consistência e acessibilidade.
5. **Nada de IA no texto.** Falar de resultado: avaliação física com laudo, evolução, retenção, gestão.

---

## 2. Onde a página vive (arquitetura)

| Item | Decisão | Detalhe técnico |
|---|---|---|
| Rota | **`/planos`** | Página **pública** (sem login), igual a `/login` e `/register` |
| Onde registrar | `apps/web/src/App.tsx` | Adicionar **fora** do `ProtectedRoute` (junto das rotas públicas `/login`, `/register` — hoje l. 99–100) |
| Arquivo | `apps/web/src/pages/planos/Planos.tsx` | Nova página (mobile-first) |
| Entrada no app | `apps/web/src/components/layout/AppShell.tsx` | Item de menu "**Planos**" para `ACADEMIA` e `PROFESSOR` (em `ALUNO`, dentro de "Meu Perfil"/rodapé) |
| Entrada externa | projeto `LandingPage/` | Botão "Ver planos" apontando para `…/planos` |
| URL pública | `https://endorfinapp.com.br/planos` | Servida pela SPA (rota client-side) |
| Pós-checkout (futuro) | `/billing` | A página mostra preço; a contratação virá depois (ver §10) |

> **Por que dentro do sistema e não só na Landing?** mantém um lugar único de verdade dos preços, reaproveita design system/componentes e permite o usuário logado (ex.: personal que cresceu e precisa subir de faixa) ver e comparar planos sem sair do app.

---

## 3. Estrutura da página (seções, na ordem)

1. **Hero** — título + subtítulo + 2 CTAs + selo de confiança.
2. **Segmented control**: `Sou Personal Trainer` | `Sou Academia` (troca o bloco de planos; padrão = Personal).
3. **Prova rápida (3–4 números)**.
4. **Planos de Personal** (cards com R$/aluno).
5. **Planos de Academia** (cards por porte, com R$/aluno).
6. **"Quanto custa por aluno?"** — tabela-resumo + mini calculadora (stepper de alunos).
7. **Comparativo de recursos** (tabela).
8. **Add-ons** (professor extra, +alunos, unidade).
9. **Vantagens da ferramenta** (blocos por benefício).
10. **Como funciona a contratação** (3 passos).
11. **FAQ** (8–10 perguntas).
12. **CTA final** + rodapé institucional.

### 3.1 Copy sugerida (headlines)

- Hero: **"Planos que cabem na sua Academia e no seu Personal."**
  - Sub: *"Pague por aluno ativo. Sem surpresa, sem taxa escondida. Do autônomo à rede."*
  - CTA primário: **Ver planos** · CTA secundário: **Falar com especialista**
  - Selo: *"15 dias grátis no Personal · 30 dias na Academia"*
- Bloco de preço: **"A partir de R$ 0,60 por aluno ativo/mês."**

---

## 4. Valores por aluno em DESTAQUE (conteúdo obrigatório)

### 4.1 Personal Trainer (o professor paga e patrocina os alunos)

| Plano | Alunos ativos | Preço/mês | **Por aluno** |
|---|---|---|---|
| Personal Free | até 3 | **R$ 0** | R$ 0 |
| Personal Starter | até 10 | **R$ 49** | **R$ 4,90** |
| Personal Pro | até 30 | **R$ 89** | **R$ 2,97** |
| Personal Plus | até 60 | **R$ 149** | **R$ 2,48** |
| Personal Scale | até 120 | **R$ 249** | **R$ 2,08** |
| Personal Studio | ilimitado | **R$ 349** | — |

Mensagem de apoio: *"Até 30 alunos por menos de R$ 3 por aluno — e seus alunos usam o app completo, sem custo extra para eles."*

### 4.2 Academia (por porte)

| Plano | Porte | Alunos ativos | Professores | Preço/mês | **Por aluno** |
|---|---|---|---|---|---|
| Academia Essencial | **Pequena** | até 150 | 5 | **R$ 199** | **R$ 1,33** |
| Academia Crescimento | **Média** | até 400 | 15 | **R$ 399** | **R$ 1,00** |
| Academia Performance | **Grande** | até 1.000 | 40 | **R$ 749** | **R$ 0,75** |
| Academia Rede | **Rede** | até 2.500 | 100 | **R$ 1.499** | **R$ 0,60** |
| Academia Enterprise | Rede+ | ilimitado | ilimitado | sob consulta | negociado |

Mensagem de apoio: *"Menos de R$ 1,50 por aluno ativo — e sua academia ganha app próprio, avaliação física com laudo e retenção."*

> **Destaque visual:** badge **"R$ 1,33/aluno"** ao lado de cada card, em pílula azul.

---

## 5. Vantagens da ferramenta (sem IA)

Organizar em 6 blocos, cada um com ícone, título e 2–3 bullets:

| Bloco | Título | Bullets |
|---|---|---|
| 👥 | **Gestão de alunos e professores** | multi-aluno por tenant · fichas em lote · templates reutilizáveis · clonagem para vários alunos |
|  | **Avaliação física completa com laudo** | PAR-Q+, antropometria, composição corporal, VO₂máx, 1RM, flexibilidade · **laudo em PDF/markdown** · comparação entre avaliações |
|  | **Evolução e relatórios** | evolução mensal (frequência, volume, carga) · gráficos de peso/IMC · correlações de desempenho · histórico por aluno |
| 🔔 | **Engajamento e retenção** | app instalável (PWA) · notificações de treino e inatividade · gamificação (XP, badges, sequência) · feed social e clubes |
| 🏢 | **Feito para multi-tenant** | isolamento por academia/professor · vínculo em 2 camadas (academia → aprovação) · limites de alunos e professores por plano |
| 🧾 | **Gestão de cobrança** | fatura e **NFS-e** · PIX/boleto/cartão · auto-upgrade de faixa · carência antes de bloqueio |

**Regra de texto:** nenhuma menção a IA, "inteligência artificial", "gerado por IA" ou "prescrição inteligente". Substituir por *"monte treinos por objetivo, nível e dias em minutos"*.

---

## 6. Design — cores que transmitem confiança

### 6.1 Paleta (tokens existentes — tema azul)

| Papel | Token | Noite | Dia |
|---|---|---|---|
| Primária (confiança) | `--color-primary` | `#3B82F6` | `#2563EB` |
| Primária escura | `--color-primary-dark` | `#2563EB` | `#1D4ED8` |
| Fundo | `--color-surface` | `#0B1220` | `#FFFFFF` |
| Cartão | `--color-surface-card` | `#111C33` | `#F3F6FB` |
| Texto | `--color-text` | `#F5F8FF` | `#0B1220` |
| Texto suave | `--color-text-muted` | `#B8C5D9` | `#4A5A72` |
| Borda | `--color-border` | `#24365C` | `#DFE5EE` |
| Anel/foco | `--color-ring` | `#3B82F6` | `#2563EB` |
| Sucesso (check) | `--color-success` | `#34D399` | `#059669` |
| Destaque | `--color-warning` | `#FBBF24` | `#D97706` |

**Por que azul & navy:** azul é a cor universal de confiança/segurança/institucional; navy dá solidez. É também **a cor já vigente** do sistema (`stores/theme.ts` só tem `blue`) → **consistência total** com o app logado.

### 6.2 Regras de aplicação

- **CTA primário:** fundo `--color-primary` **no modo dia (`#2563EB`)** para garantir contraste AA (≈5,2:1 com texto branco). No modo noite, usar `--color-primary` `#3B82F6` apenas em **textos grandes/ícones/bordas**; botão com texto pequeno usa `--color-primary-dark` (`#2563EB`).
- **Gradiente do hero:** reutilizar `gradient-primary`/`gradient-hero` (já existem como `@utility`).
- **Vidro/blur:** usar `glass` nos cards do hero (já existe).
- **Verde neon** da marca: **apenas no logo** (ECG + raio) — não usar como cor de preço/botão.
- **Superfícies:** cards com `--color-surface-card` e borda `--color-border`; nunca preto puro.
- **Badges de preço/aluno:** pílula com fundo `rgba(59,130,246,0.12)` + borda `rgba(59,130,246,0.35)` + texto `--color-primary`.
- **Tipografia:** títulos em **Barlow Condensed**, corpo em **DM Sans** (já no design system).
- **Animações:** usar `fade-in`, `slide-up`, `scale-in` já existentes — discretas (confiança não combina com movimento exagerado).

### 6.3 Acessibilidade
- Contraste mínimo AA (4,5:1) para texto pequeno — usar `#2563EB`/`#1D4ED8` sobre branco e `#F5F8FF` sobre navy.
- Foco visível com `--color-ring`.
- `aria-label` nos botões de plano e no segmented control.
- Tabelas com `<caption>` e cabeçalhos `<th scope>`.

---

## 7. Componentes

### 7.1 Reutilizar (já existem)
| Componente | Arquivo | Uso na página |
|---|---|---|
| `EndorfinappLogo` / `Wordmark` | `components/branding/*` | topo e rodapé |
| `Icon` | `components/icons/Icon.tsx` | ícones das vantagens/checkmarks |
| `StatusBadge` | `components/ui/StatusBadge.tsx` | pílulas "Mais popular", "Melhor custo/aluno" |
| `Toast` | `components/ui/Toast.tsx` | feedback de CTA |
| `LoadingSpinner`/`SkeletonCard` | `components/ui/LoadingSpinner.tsx` | estado de carregamento |
| `ConfirmModal` | `components/ui/ConfirmModal.tsx` | "Falar com especialista" (form) |
| utilitários | `glass`, `gradient-primary`, `gradient-hero`, `safe-bottom` | estética |

### 7.2 Criar (novos)
| Componente | Arquivo proposto | Função |
|---|---|---|
| `PlanosPage` | `pages/planos/Planos.tsx` | container da página |
| `PublicSegmentSwitch` | `pages/planos/PublicSegmentSwitch.tsx` | alterna Personal/Academia |
| `PlanCard` | `pages/planos/PlanCard.tsx` | card de plano com badge R$/aluno |
| `PlanComparisonTable` | `pages/planos/PlanComparisonTable.tsx` | comparativo de recursos |
| `PricePerStudentTable` | `pages/planos/PricePerStudentTable.tsx` | resumo R$/aluno |
| `StudentCountSimulator` | `pages/planos/StudentCountSimulator.tsx` | stepper "quantos alunos?" → sugere plano |
| `PlanFaq` | `pages/planos/PlanFaq.tsx` | acordeão de perguntas |
| `TrustBar` | `pages/planos/TrustBar.tsx` | selos/garantias |
| `plansData.ts` | `pages/planos/plansData.ts` | **dados estáticos** dos planos (mesmos valores de `catalogo-de-precos.md`) |

> **Nota:** `apps/web/src/pages/aluno/BibliotecaPlanos.tsx` é a biblioteca de **treinos** — **não** reutilizar/renomear; é outro domínio.

---

## 8. Funcionalidades da página

1. **Segmented control** Personal ↔ Academia (troca cards/tabela sem recarregar).
2. **Badge de preço por aluno** em cada card (pílula azul).
3. **Simulador**: "Quantos alunos você tem?" → stepper `[−][+]` → *"Seu plano: Academia Crescimento — R$ 399/mês (R$ 1,00/aluno)"*.
4. **Comparativo** com "—" e "✓" (cor de sucesso) por recurso.
5. **Add-ons** em bloco próprio (professor extra, +100 alunos, unidade extra).
6. **CTA por contexto**: "Começar 15 dias grátis" (Personal) / "Falar com especialista" (Academia, plano sob consulta) / "Criar conta" (visitante) / "Ajustar meu plano" (logado).
7. **FAQ** em acordeão (uma resposta aberta por vez).
8. **Deep-link por plano** (`/planos?plano=AC_CRESCIMENTO`) para o card ficar destacado.

---

## 9. Requisitos técnicos

- **Rota pública:** declarar `/planos` no `App.tsx` **antes** do bloco de rotas protegidas (padrão das l. 99–100).
- **Layout próprio:** a página pública **não** usa `AppShell` (sem sidebar) — como `/login`. Se aberta por usuário logado, mostrar botão "Voltar ao app".
- **Sem dependência de API:** dados estáticos em `plansData.ts` (a página não pode quebrar se o backend estiver fora).
- **SEO/meta:** `<title>Planos e Preços — ENDORFINAPP</title>`, meta description, `og:image`; semântica HTML5 (`<h1>` único, `<section>` por bloco).
- **PWA-safe:** `overscroll-behavior: none` e demais regras globais já aplicadas; nenhuma rolagem horizontal nas tabelas (usar scroll interno com `scrollbar-hide`).
- **Performance:** sem imagens pesadas; ícones SVG inline; lazy-load dos blocos abaixo da dobra.
- **i18n:** textos 100% PT-BR (padrão do projeto).

---

## 10. Analytics (para medir conversão depois)

| Evento | Quando |
|---|---|
| `planos_view` | abertura da página (+ `origem`: landing/app) |
| `planos_segment_switch` | troca Personal/Academia |
| `planos_plan_click` | clique em um card (+ `codigo` do plano) |
| `planos_simulator_use` | uso do stepper (+ `alunos`) |
| `planos_cta_click` | clique em CTA (+ `tipo`) |

---

## 11. Roadmap de implementação

| Fase | Entrega | Depende de |
|---|---|---|
| **P1** | Rota pública `/planos` + Hero + Segmented control + cards com R$/aluno (Personal e Academia) | nada |
| **P2** | Tabela-resumo R$/aluno + comparativo de recursos + add-ons | P1 |
| **P3** | Vantagens (6 blocos) + FAQ + CTA final + rodapé | P1 |
| **P4** | Simulador de alunos + deep-link por plano | P2 |
| **P5** | Link no `AppShell` (Academia/Professor) + botão na `LandingPage/` | P1 |
| **P6** | Analytics + SEO/meta + auditoria de contraste AA | P3 |
| **P7** *(futuro)* | Botão "Contratar" → checkout (`/billing`) | billing B2B |

---

## 12. Critérios de aceite (QA)

- [ ] `/planos` abre **sem login** e sem `AppShell`.
- [ ] Nenhuma ocorrência de "IA"/"inteligência artificial" no texto, metadados ou `alt`.
- [ ] Todos os **valores por aluno** conferem com `catalogo-de-precos.md` (PT: 4,90/2,97/2,48/2,08 · AC: 1,33/1,00/0,75/0,60).
- [ ] Segmented control alterna os dois blocos; estado mantido ao voltar.
- [ ] Simulador sugere o plano correto para 10/30/60/120 (Personal) e 150/400/1000/2500 (Academia).
- [ ] Contraste AA em botões, badges e textos pequenos (dia e noite).
- [ ] Sem rolagem horizontal em 360px de largura.
- [ ] Tabelas com `<caption>`/`<th scope>`; botões com `aria-label`.
- [ ] Nenhuma cor fora dos tokens do tema azul (exceto o logo).

---

## 13. Pendências / decisões

1. **Confirmar valores** do catálogo (o `docs/planning/catalogo-de-precos.md` traz alguns "a confirmar": taxas de gateway e infra).
2. **Definir CTA de contratação**: nesta fase a página **só divulga**; o botão "Contratar" depende do billing B2B (P7).
3. **Preço do Aluno (B2C)**: decidir exibir R$ 12,00 ou R$ 14,90 (hoje o catálogo indica R$ 12,00 com faixa até R$ 14,90).
4. **Canonical/URL**: decidir se `/planos` será o endereço oficial (vs. uma seção na Landing externa).