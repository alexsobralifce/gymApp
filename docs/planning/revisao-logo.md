# Revisão do LOGO — ENDORFINAPP

> Escopo: revisar os assets de marca usados no app (e que irão para a página de planos), com foco em **consistência de cor**, **geometria** e **acessibilidade (contraste)**.
> Somente **revisão** — nenhum arquivo de código foi alterado.
> Data: 2026-09-16

---

## 1. Inventário dos assets

| Asset | Arquivo | Descrição |
|---|---|---|
| Símbolo (componente) | `apps/web/src/components/branding/EndorfinappIcon.tsx` | SVG inline, `viewBox="0 0 220 120"`, ECG + raio, cor = `var(--color-primary, #FF4D4D)` |
| Logotipo (texto) | `EndorfinappWordmark.tsx` | "ENDORFIN" + **"APP"** em `var(--color-primary)`; slogan "A Química do Crescimento" |
| Composer | `EndorfinappLogo.tsx` | variantes `full` / `icon` / `wordmark` / `horizontal`; `onBackground` → texto branco |
| Ícone do app/PWA | `apps/web/public/app-icon.svg` | 512×512, `#76FF03` sobre `#0A0A0A`, glow |

**Usos atuais:** `App.tsx:89` (splash, `size=48`), `AppShell` (l.488/554/600), `Login.tsx:157`, `RegisterWizard.tsx:275`, `GoogleCallback.tsx:81`, `OnboardingPermissionsModal.tsx:107`, `PoliticaPrivacidade.tsx:33`.

---

## 2. Achados por severidade

###  P0 — Cor de fallback errada no símbolo
`EndorfinappIcon.tsx:22`
```tsx
const activeColor = color || 'var(--color-primary, #FF4D4D)'
```
O **fallback é vermelho** (`#FF4D4D` — sobra do tema "Vermelho & Carvão"). Se `--color-primary` não estiver definido (ex.: render fora do `<html data-theme>`, SSR/print, HTML de e-mail), **o logo aparece vermelho**. → Trocar o fallback para a cor da marca/azul (`#3B82F6`).

### 🔴 P0 — Verde neon é ilegível em fundo claro
`#76FF03` sobre branco = **1,21:1** (reprova em qualquer critério). Como o sistema tem **modo dia (fundo branco)**, o símbolo **não pode** ser verde neon no claro.

**Tabela de contraste (calculada):**

| Cor | sobre branco `#FFFFFF` | sobre navy `#0B1220` |
|---|---|---|
| `#76FF03` (neon) | **1,21:1** ❌ | **15,5:1** ✅ |
| `#3B82F6` (azul noite) | 3,68:1 ️ (só texto grande/ícone) | **5,13:1** ✅ |
| `#2563EB` (azul dia) | **5,17:1** ✅ | 3,65:1 ️ (só texto grande) |
| `#0B1220` (navy) | 18,9:1 ✅ | — |

**Recomendação:** o **símbolo no app** usa `var(--color-primary)` (azul) → dia `#2563EB` (5,17:1 ✅) e noite `#3B82F6` (5,13:1 ✅). O **verde neon fica reservado** ao ícone de loja/PWA (fundo escuro, 15,5:1) como identidade de marca — ou seja, **duas versões com papéis distintos**, documentadas.

###  P0 — Fundo do ícone do app diverge do manifest
- `apps/web/public/app-icon.svg` → fundo `#0A0A0A`
- `apps/web/public/manifest.json` → `background_color`/`theme_color` = `#0B1220`
- `AGENTS.md` cita `#0A0A0A`

São **três fontes** para a mesma decisão. → Escolher **uma** (sugestão: `#0B1220`, alinhado ao navy do tema) e aplicar em SVG + manifest + regeneração dos PNGs.

### 🟠 P1 — Símbolo descentralizado no `viewBox` do componente
`viewBox="0 0 220 120"` → centro em **x=110**. O desenho ocupa **x 10…180** (centro **95**) e **y 10…110** (centro **60**). Logo, o símbolo fica **~7% à esquerda** do centro, com sobra à direita — perceptível no logo `horizontal` (ícone + texto).
**Correção:** apertar o `viewBox` para `4 4 180 112` (centro x=94 ≈ centro do desenho) e derivar a altura da nova proporção (`height ≈ size × 112/180`), em vez do atual `120/220`.

> ✅ Observação: o **`app-icon.svg` está perfeitamente centralizado** (o `translate(66,136) scale(2)` leva o desenho ao centro exato de 512×512). O problema é só no componente.

### 🟠 P1 — Glow ligado por padrão em tamanhos pequenos
`glow = true` por padrão. Com `iconSize=26` (AppShell l.488/600) o `feGaussianBlur stdDeviation="3.5"` (em espaço de 220) vira borrão e **piora a legibilidade** — além de custar performance (filtro SVG em itens de lista).
**Correção:** desligar glow automaticamente abaixo de ~40px (`glow = size >= 40`) e/ou escalar `stdDeviation` com o tamanho.

### 🟠 P1 — `overflow: visible` + filtro
`style={{ overflow: 'visible' }}` junto do filtro pode **vazar/clipar** e afetar layout em containers apertados. → Manter `overflow: visible` apenas quando `glow` estiver ativo, com padding no viewBox.

### 🟡 P2 — Logotipo não usa a tipografia do design system
`EndorfinappWordmark.tsx:31` → `fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif"` hardcoded. O design system define **Barlow Condensed** para títulos/logotipo e `--font-sans` (DM Sans/Inter) para corpo. → Usar `var(--font-condensed, 'Barlow Condensed')` no logotipo (wordmark) mantém coerência tipográfica.

### 🟡 P2 — "APP" muda de cor com o tema
`EndorfinappWordmark.tsx:46` → `<span style={{ color: 'var(--color-primary)' }}>APP</span>`. É **azul no tema atual** — aceitável em contraste (5,17:1 dia / 5,13:1 noite), mas cria divergência com o ícone neon. → Decidir formalmente: **(A)** marca adaptativa (azul no app + neon só na loja) ou **(B)** marca fixa (neon sempre, exigindo fundo escuro). Recomendo **(A)** — casa com "cores que transmitam confiança".

### 🟡 P2 — `EndorfinappLogo` não expõe cor/monocromático/`aria-hidden`
Só o `EndorfinappIcon` tem a prop `color`. Para a **página de planos** (fundo branco no modo dia, navy no modo noite) e para materiais monocromáticos, falta: `color`, `monochrome` e `aria-hidden` no `Logo`. → Adicionar e repassar.

###  P2 — Acessibilidade: anúncio duplicado
`EndorfinappIcon.tsx:33` → `role="img"` + `aria-label="ENDORFINAPP Icon"` **sempre**. No logo `horizontal`/`full`, o leitor de tela lê o símbolo **e** o texto ("ENDORFINAPP") → duplicidade. → Quando o logotipo textual estiver presente, o símbolo deve ser `aria-hidden="true"`.

###  P3 — Traços invisíveis em tamanhos pequenos
No espaço de 220: ECG `strokeWidth=7` e raio `strokeWidth=2`. Em 26px isso vira **~0,83px** e **~0,24px** — o raio praticamente desaparece. → Para tamanhos < 32px, usar uma variante "compacta" (raio preenchido, sem glow, traço reforçado).

### 🔵 P3 — Fallback obsoleto do fundo
`withBackground` usa `var(--color-surface-card, #1C1C1C)` — o `#1C1C1C` é do tema escuro antigo. → Fallback para `#111C33` (card do tema azul).

---

## 3. Recomendação consolidada de uso na página de planos

| Contexto | Asset/variante | Cor | Glow |
|---|---|---|---|
| Hero (noite/navy) | `EndorfinappLogo variant="horizontal" onBackground` | texto branco + símbolo `--color-primary` | `false` |
| Hero (dia/branco) | idem, sem `onBackground` | texto navy `#0B1220` + símbolo `#2563EB` | `false` |
| Topo do app / nav | `horizontal` `iconSize=26` | `--color-primary` | **off** (auto <40) |
| Rodapé institucional | `wordmark` + `showSlogan` | `--color-text` + `--color-text-muted` | — |
| Ícone instalável (loja/PWA) | `app-icon.svg` | `#76FF03` sobre `#0B1220` | sim |

**Regra de ouro:** *neon verde nunca sobre fundo claro; azul nunca como texto pequeno sobre navy.*

---

## 4. Proposta de correções (não aplicadas)

### 4.1 `EndorfinappIcon.tsx`
```tsx
// 1) fallback correto + 2) viewBox apertado + 3) glow condicional + 4) a11y
const activeColor = color || 'var(--color-primary, #3B82F6)'
const enableGlow = glow && Number(size) >= 40

<svg
  viewBox="4 4 180 112"                                  // aperta e centraliza o desenho
  width={size}
  height={typeof size === 'number' ? Math.round(size * (112 / 180)) : size}
  role={decorative ? 'presentation' : 'img'}             // nova prop `decorative`
  aria-hidden={decorative || undefined}
  aria-label={decorative ? undefined : 'ENDORFINAPP'}
  ...
>
```

### 4.2 `EndorfinappLogo.tsx`
```tsx
// expor cor, monocromático e a11y; símbolo decorativo quando há texto
<EndorfinappIcon
  size={iconSize ?? 32}
  glow={glow}
  color={color}               // NOVO
  decorative                  // NOVO: o texto já anuncia a marca
/>
```

### 4.3 `app-icon.svg` (fundo)
```svg
<rect width="512" height="512" fill="#0B1220" />   <!-- alinhar ao manifest -->
```
+ atualizar `manifest.json` (`#0B1220`) e regerar os PNGs (`node apps/web/scripts/generate-icons.mjs`).

---

## 5. Critérios de aceite da revisão — ✅ APLICADOS

- [x] Nenhum fallback de cor vermelha (`#FF4D4D`) no código de marca → `#3B82F6`.
- [x] Símbolo legível em **modo claro** (`#2563EB` = 5,17:1 ✅).
- [x] Neon verde aparece **apenas** no ícone de loja/PWA (fundo escuro).
- [x] `viewBox` do símbolo centralizado (`4 4 180 112`).
- [x] Sem glow em tamanhos < 40px (`GLOW_MIN_SIZE = 40`).
- [x] Cor de fundo igual em SVG + manifest + `generate-icons.mjs` + AGENTS.md (`#0B1220`).
- [~] Wordmark tipografia → **descartado por decisão** (mantém DM Sans).
- [x] Símbolo com `aria-hidden`/`role="presentation"` quando acompanhado do logotipo textual.
- [x] Variante monocromática → atendida pela nova prop `color` no `EndorfinappLogo`.

## 7. Aplicado (2026-09-16)

| Arquivo | Mudança |
|---|---|
| `apps/web/src/components/branding/EndorfinappIcon.tsx` | fallback `#3B82F6`; `viewBox="4 4 180 112"` + altura `112/180`; glow condicional (`GLOW_MIN_SIZE=40`); `overflow` só com glow; nova prop `decorative` (`aria-hidden`); fallback do fundo `#111C33` |
| `apps/web/src/components/branding/EndorfinappLogo.tsx` | nova prop `color` repassada ao símbolo; símbolo `decorative` nas variantes `full` e `horizontal` |
| `apps/web/public/app-icon.svg` | fundo `#0A0A0A` → `#0B1220` |
| `apps/web/scripts/generate-icons.mjs` | constante `BLACK` → `#0B1220`; log atualizado |
| `apps/web/public/icon-*.png` | regerados (fundo `#0B1220`) — verificado `rgb(11,18,32)` no canto do `icon-192.png` |
| `apps/web/capacitor-assets/**` | regerados (gitignored) |
| `AGENTS.md` | docs do ícone/manifest → `#0B1220` |

**Validações:** `oxlint src/components/branding` sem avisos · `tsc --noEmit` sem erros de tipo · pixel do ícone conferido.
> Pendente (não bloqueante): o **`EndorfinappWordmark`** mantém DM Sans por decisão; o verde neon agora existe só no ícone de loja.

---

## 6. Decisões

1. ✅ **RESOLVIDO — (A) Marca adaptativa.** Símbolo **no app** usa `var(--color-primary)` (azul: `#2563EB` dia / `#3B82F6` noite); **verde neon `#76FF03` apenas no ícone de loja/PWA** (fundo escuro). Consequências diretas:
   - fallback do símbolo passa de `#FF4D4D` (vermelho) → **`#3B82F6`**;
   - neon verde **nunca** sobre fundo claro;
   - duas variantes com papéis documentados (app = confiança/azul; loja = identidade/neon).
2. ✅ **RESOLVIDO — fundo `#0B1220`** (navy, alinhado ao manifest/tema).
3. ✅ **RESOLVIDO — wordmark mantém DM Sans** (sem migração tipográfica).
4. ✅ **RESOLVIDO — correções aplicadas** (ver §7).