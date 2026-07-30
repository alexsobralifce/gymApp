# Documentação: Sistema de Temas e Modo Automático Dia/Noite

## Visão Geral
O **ENDORFINAPP** possui um sistema dinâmico de temas baseado em atributos HTML (`data-theme` e `data-mode`), sincronizados com CSS variables no Tailwind CSS v4, suporte a PWA/Capacitor e meta-tags dinâmicas.

---

## 🎨 Modos de Exibição
O sistema suporta **3 opções de modo** no menu do usuário:

1. **Auto ⚡ (`auto`) — Padrão:**
   - Alterna automaticamente de acordo com o horário do dia (Dia das 06:00 às 18:00, Noite das 18:00 às 06:00).
   - Escuta em tempo real mudanças no sistema operacional do dispositivo (`prefers-color-scheme`).
   - Verifica atualizações de horário a cada 30 segundos sem recarregar a página.

2. **Dia (`day`):**
   - Força visual claro em 100% da interface (Superfície `#E4E6ED`, Cards `#EDEFF4`, Texto `#0A1628`).
   - Define `color-scheme: light` para desativar o "Force Dark Mode" de navegadores e WebViews Android/iOS.

3. **Noite (`night`):**
   - Força visual escuro de alto contraste (Superfície `#0A1628`, Cards `#122040`, Texto `#F7F9FC`).
   - Define `color-scheme: dark`.

---

## 🎨 Temas da Marca (Brands)
- **Lima & Navy (`lime`):** Verde Lima neon (`#B8F000` / `#6B9A00`).
- **Vermelho & Carvão (`red`):** Vermelho esportivo (`#FF4D4D` / `#DC2626`).
- **Violeta & Grafite (`violet`):** Violeta elétrico (`#A78BFA` / `#B794F6`).

---

---

## 🔧 Correções Efetuadas

1. **Variáveis de Superfície no Tema Lima (`index.css`):** O seletor `[data-theme="lime"][data-mode="day"]` não possuía a definição explícita das variáveis de superfície (`--color-surface: #E4E6ED`, `--color-background`, `--color-card`, `--color-text: #0A1628`), o que fazia com que o tema Lima (padrão) mantivesse o fundo escuro `#0A1628` mesmo no modo Dia. Adicionadas todas as variáveis claras para `lime` em modo dia e escuras em modo noite.
2. **Separação & Suporte OS em Modo Auto (`theme.ts` & `useCapacitorTheme.ts`):** O modo `Auto` agora verifica prioritariamente a preferência do sistema operacional (`prefers-color-scheme`), utilizando o horário (06h-18h) como fallback. As configurações de `Auto`, `Dia` e `Noite` permanecem 100% independentes no Zustand store.


