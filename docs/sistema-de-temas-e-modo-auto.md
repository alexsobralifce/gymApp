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

1. **Compilação CSS (Sintaxe):** Identificado e corrigido um erro de sintaxe no arquivo `apps/web/src/index.css` (chave `}` ausente na linha 247). A correção garantiu a compilação limpa do Vite em 670ms e a aplicação imediata do modo claro no mobile.
2. **Sincronização Capacitor/Meta Tags (`useCapacitorTheme`):** Corrigido o hook `useCapacitorTheme.ts` que utilizava `mode === 'day'` em vez de `effectiveMode === 'day'`. Anteriormente, quando o modo estava em `auto` das 06:00 às 18:00, as meta tags (`theme-color`, status bar iOS e `colorScheme`) eram configuradas incorretamente como escuro, divergindo do botão `Dia`. Com o uso de `effectiveMode`, tanto o botão `Auto` (entre 06h-18h) quanto o botão `Dia` aplicam rigorosamente as mesmas cores de fundo, superfície e meta-tags do navegador/dispositivo.

