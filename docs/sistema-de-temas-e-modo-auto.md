# Documentação: Sistema de Temas e Modo Automático Dia/Noite

## Visão Geral
O **ENDORFINAPP** possui um sistema dinâmico de temas baseado em atributos HTML (`data-theme` e `data-mode`) no elemento `<html>`, sincronizados com CSS variables no Tailwind CSS v4. **Mobile e desktop usam exatamente a mesma cascata de tokens** — não há media query de layout que altere cor.

---

## Regra de ouro (mobile = desktop)

1. Tokens de cor **nunca** são definidos em breakpoints (`@media (max-width)`).
2. Tokens de modo **nunca** são amarrados a `:root` nu junto com noite (isso fazia o modo dia falhar em WebViews).
3. Override exclusivo via:
   - `html[data-mode="day"]` → fundo claro + `color-scheme: light`
   - `html[data-mode="night"]` → fundo escuro + `color-scheme: dark`
   - `html[data-theme="…"][data-mode="…"]` → primários + superfícies da marca
4. `html, body { background-color: var(--color-surface); color: var(--color-text); }` garante fundo idêntico em qualquer viewport/WebView.
5. Script síncrono no `<head>` (`apps/web/index.html`) seta `data-theme`/`data-mode` **antes do 1º paint**.

---

## Modos de Exibição

1. **Auto (`auto`) — Padrão:**
   - **Somente horário local:** Dia 06:00–18:00 (fundo claro), Noite 18:00–06:00 (fundo escuro).
   - **Não** segue `prefers-color-scheme` do SO (Android em dark mode deixava Auto = sempre noite).
   - Reavalia a cada 30s quando o relógio cruza 06h/18h.

2. **Dia (`day`):**
   - Força visual **branco** sempre (superfície `#FFFFFF`, cards `#F4F6F9`, texto `#0A1628`).
   - `color-scheme: only light` — bloqueia Auto Dark / force-dark do Chrome Android.
   - **Independente do horário e do tema do celular.**
   - Logs de produção (2026-07-30) já mostravam `bodyBg: rgb(242,244,247)` com mode=day —
     o motor CSS estava correto; se a UI ainda “parecia escura”, limpar cache PWA/SW.

3. **Noite (`night`):**
   - Força visual escuro sempre (ex. Lima: superfície `#0A1628`, cards `#122040`, texto `#F7F9FC`).
   - `color-scheme: dark`.

### Diagnóstico (logs de produção 2026-07-30)
Em Android Chrome com SO escuro:
- Bootstrap + `mode=day` → `surface=#f2f4f7` / body claro ✅ (CSS OK)
- `setMode(auto)` com `prefers-color-scheme: dark` (algoritmo antigo) → `surface=#0a1628` ❌
- Correção: Auto deixa de usar o SO; Dia forçado permanece a forma de garantir fundo claro 24h.

---

## Temas da Marca (Brands)

| Brand | Night primary | Day primary | Night surface | Day surface |
|-------|---------------|-------------|---------------|-------------|
| Lima (`lime`) | `#B8F000` | `#6B9A00` | `#0A1628` | `#F2F4F7` |
| Vermelho (`red`) | `#FF4D4D` | `#DC2626` | `#0F0F0F` | `#F3F4F5` |
| Violeta (`violet`) | `#A78BFA` | `#B794F6` | `#0C0C0E` | `#F4F4F7` |

---

## Arquivos-chave

| Arquivo | Papel |
|---------|--------|
| `apps/web/src/index.css` | Tokens `html[data-theme][data-mode]` |
| `apps/web/src/stores/theme.ts` | Zustand + `applyDom` + auto mode |
| `apps/web/index.html` | Bootstrap síncrono + meta theme-color |
| `apps/web/src/hooks/useCapacitorTheme.ts` | Sync meta tags (sem inline colorScheme) |

---

## Correções (2026-07-30)

### Bug: modo dia escuro / mobile ≠ desktop
**Causa raiz:** o bloco de noite usava seletor `:root, [data-mode="night"]`.  
`:root` **sempre** casa com `<html>`, então as cores escuras competiam com o modo dia. Em alguns WebViews mobile a cascata/`color-scheme` ficava inconsistente com o desktop.

**Solução:**
- Removido `:root` do bloco de noite.
- Tokens só em `html[data-mode="day|night"]` e `html[data-theme][data-mode]`.
- `html, body` com `background-color`/`color` via CSS variables.
- Meta `color-scheme` e `theme-color` atualizados no bootstrap e no hook.
- Nav hover usa `var(--color-menu-hover)` (antes `bg-white/5`, ilegível no dia).
- **Proibido** `document.documentElement.style.colorScheme` (inline mata a cascata).

### Verificação
```bash
npm test --workspace=apps/web -- --run src/index.css.test.ts src/stores/theme.test.ts
npm run build --workspace=apps/web
```
Claims verificados:
- Dia → surface R > 200 (claro)
- Noite → surface R < 40 (escuro)
- Ausência de `:root` + night no mesmo seletor
- `html, body` usam `var(--color-surface)`
