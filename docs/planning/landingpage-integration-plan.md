# Plano — Integracao da LandingPage ao GymApp

## Objetivo

Substituir a landing page atual (`pages/Landing.tsx`) pela versao profissional do diretorio `LandingPage/`, mantendo a fidelidade visual e funcional.

---

## 1. Analise de Compatibilidade

### Cores — 100% compativeis

A landing page usa **exatamente** a mesma paleta que ja aplicamos ao sistema:

| Token | LandingPage | GymApp atual | Match |
|-------|-------------|-------------|-------|
| Primary | `#F20C0C` | `#F20C0C` | Identico |
| Background | `#0D0D0D` | `#0D0D0D` | Identico |
| Surface/Card | `#1A1A1A` | `#1A1A1A` | Identico |
| Text | `#F2F2F2` | `#F2F2F2` | Identico |
| Text muted | `#BFBFBF` | `#BFBFBF` | Identico |
| Accent | `#F2C230` | `#F2C230` | Identico |

**Zero conflitos de cor.** A landing page e o sistema interno compartilham a mesma paleta.

### Fontes — precisa adicionar

| Fonte | LandingPage | GymApp | Acao |
|-------|-------------|--------|------|
| Headings | Barlow Condensed | Inter | Adicionar ao index.css |
| Body | DM Sans | Inter | Adicionar ao index.css |

Barlow Condensed e uma fonte display condensada usada nos titulos grandes (hero, secoes). DM Sans e a fonte de texto. Manteremos Inter como fallback.

### Dependencias — minimo necessario

A landing page original tem 51 dependencias, mas **apenas 4 sao realmente usadas** pelo `App.tsx`:

| Pacote | Usado? | Acao |
|--------|--------|------|
| `lucide-react` | Sim (18 icones) | Ja existe no GymApp |
| `tailwind-merge` | Sim (via cn) | Ja existe no GymApp |
| `clsx` | Sim (via cn) | Ja existe no GymApp |
| `tw-animate-css` | Sim | **Adicionar** |
| `@tailwindcss/vite` | Sim | Ja existe no GymApp |
| 46 outros pacotes | Nao | **Ignorar** |

### Tailwind v4 — 100% compativel

Ambos usam Tailwind CSS v4 com `@import "tailwindcss"` e `@theme`.

---

## 2. Estrutura da Landing Page Original

`App.tsx` tem 802 linhas com 11 secoes:

| # | Secao | id | Conteudo |
|---|-------|-----|----------|
| 1 | Nav | — | Logo + 4 links + Entrar + Teste Gratis |
| 2 | Hero | `#hero` | Background Unsplash + titulo gigante + CTAs |
| 3 | Stats | `#stats` | 4 metricas (12K alunos, 380 academias, etc.) |
| 4 | Features | `#funcionalidades` | 4 cards de funcionalidades |
| 5 | App Preview | `#app` | Mockup do app + features list |
| 6 | How It Works | `#como-funciona` | 3 passos numerados |
| 7 | Pricing | `#planos` | 3 planos (Starter R$89, Pro R$189, Elite R$349) |
| 8 | Testimonials | `#depoimentos` | 3 cards de depoimentos |
| 9 | FAQ | `#faq` | 5 perguntas accordion |
| 10 | Final CTA | `#cta` | CTA com background + gradiente |
| 11 | Footer | — | 4 colunas + copyright |

Navegacao: links internos com `href="#funcionalidades"`, `href="#planos"`, etc.

---

## 3. Arquivos a Migrar/Criar

### 3.1 Copiar do `LandingPage/src/`

| Origem | Destino | Notas |
|--------|---------|-------|
| `app/App.tsx` | `pages/Landing.tsx` | Substituir a atual, adaptar imports |
| `app/components/figma/ImageWithFallback.tsx` | `components/ui/ImageWithFallback.tsx` | Componente de imagem com fallback |
| `app/components/ui/utils.ts` | — | **Ignorar** — GymApp ja tem `cn` via Tailwind |
| `styles/fonts.css` | Fundir no `index.css` | Adicionar @import das fontes |
| `styles/theme.css` | — | **Ignorar** — Cores ja estao no `index.css` |
| `styles/tailwind.css` | — | **Ignorar** — `tw-animate-css` se ja existe |

### 3.2 Modificar existentes

| Arquivo | Modificacao |
|---------|-------------|
| `index.css` | Adicionar `@import` das fontes Google (Barlow Condensed + DM Sans) |
| `App.tsx` | Nenhuma — a rota `/` ja carrega `<Landing />` para nao autenticados |
| `package.json` | Adicionar `tw-animate-css` |

### 3.3 Remover

| Arquivo | Motivo |
|---------|--------|
| `pages/Landing.tsx` (atual) | Substituida pela nova versao |

---

## 4. Adaptacoes Necessarias no App.tsx

### 4.1 Imports

```tsx
// Antes (standalone com paths relativos)
import { cn } from "./components/ui/utils"
import { ImageWithFallback } from "./components/figma/ImageWithFallback"

// Depois (dentro do GymApp)
import { cn } from "@/lib/utils"  // ou adaptar conforme o GymApp
import ImageWithFallback from "../components/ui/ImageWithFallback"
```

**Verificar se o GymApp tem `cn` exportado.** Se nao tiver, criar em `lib/utils.ts`:
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

### 4.2 Links de Navegacao

Os links internos (`href="#funcionalidades"`, etc.) funcionam como anchor links — OK.

Os botoes "Entrar" e "Teste Gratis" precisam apontar para as rotas do GymApp:
```tsx
// "Entrar" → /login
// "Teste Gratis" / "Comece Gratis" → /register
```

Preciso trocar `<a href="/login">` por `<Link to="/login">` (React Router).

### 4.3 Imagens

A landing page original usa URLs do Unsplash diretamente:
```tsx
style={{ backgroundImage: "url('https://images.unsplash.com/...')" }}
```
Isso funciona sem alteracoes. O `ImageWithFallback` so e usado para avatares de depoimentos.

### 4.4 Estado Local

O `App.tsx` tem 2 `useState`:
- `mobileMenuOpen` — toggle do menu mobile
- `openFaq` — accordion do FAQ

Nao conflitam com nada — mantem como estao.

---

## 5. Ordem de Implementacao

### Passo 1 — Dependencia + Fontes (5 min)
- Adicionar `tw-animate-css` ao `package.json` do `apps/web`
- Adicionar `@import` das fontes Google no `index.css`
- Rodar `npm install`

### Passo 2 — Utilitarios (5 min)
- Criar `lib/utils.ts` com `cn()` se nao existir
- Copiar `ImageWithFallback.tsx` para `components/ui/`

### Passo 3 — Landing Page (20 min)
- Copiar `LandingPage/src/app/App.tsx` → `apps/web/src/pages/Landing.tsx`
- Adaptar imports (cn, ImageWithFallback, Link do React Router)
- Trocar links de navegacao (`<a>` → `<Link to="/login">` e `<Link to="/register">`)

### Passo 4 — Verificacao (5 min)
- `npm run lint --workspace=apps/web`
- `npm run build --workspace=apps/web`
- Testar navegacao: `/` → landing, clicar "Entrar" → `/login`

---

## 6. Resumo

| O que | Quantidade |
|--------|-----------|
| Arquivos a criar | 2 (`lib/utils.ts`, `ImageWithFallback.tsx`) |
| Arquivos a modificar | 3 (`index.css`, `package.json`, `Landing.tsx`) |
| Dependencias a adicionar | 1 (`tw-animate-css`) |
| Cores conflitantes | 0 |
| Tempo estimado | ~35 minutos |
