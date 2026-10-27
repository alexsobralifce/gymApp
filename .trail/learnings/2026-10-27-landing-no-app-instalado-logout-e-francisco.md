---
title: "Landing no app instalado, logout e blog no mobile"
author: Francisco
date: 2026-10-27
branch: main
cost: { minutes: 10, tokens: 81251 }
touches:
  - ".opencode/agent/designer.md"
  - ".opencode/agent/fixer.md"
  - ".opencode/agent/librarian.md"
  - ".opencode/agent/oracle.md"
  - ".opencode/command/implementar.md"
  - ".opencode/command/mcp-list.md"
  - ".opencode/command/mcp-tool.md"
  - ".opencode/context.md"
  - ".opencode/instructions/orquestracao.md"
  - ".opencode/skills/FrontSkill.md"
---

## Decided
- Logout (web e app instalado) cai em `/`, e `/` agora renderiza a Landing também em modoApp. Antes, em modoApp, `/` redirecionava para `/login` (apps/web/src/App.tsx).
- Links de blog ficam escondidos no app instalado via `mostrarBlog = ARTIGOS.length > 0 && !ehModoApp()` (apps/web/src/pages/Landing.tsx), porque `/blog` não é roteado nele.
- Cards da landing usam `ARTIGOS.slice(0, 3)`: ARTIGOS já vem ordenado por publicadoEm desc (apps/web/src/lib/blog.ts).
- Botão "Blog" do cabeçalho mobile fica no fluxo do flex, ao lado de "Entrar". Não é flutuante.

## Tried and ruled out
- Concatenar artigos antes das notícias (curadoria) na landing: notícias mais recentes ficavam por último.

## Watch out
- No app instalado, links de rodapé para páginas SEO (ex.: /app-de-treino) não existem e caem na Landing.
- BlogLista mantém duas seções ("Artigos" e "Leituras da semana"); cada uma está ordenada, mas a lista não é única.
- Mudanças não commitadas nem testadas no navegador na data da sessão.
