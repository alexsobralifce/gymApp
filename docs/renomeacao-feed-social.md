# Documentação: Rebranding da Rota /mural para /feed ("Feed Social")

## Visão Geral
A rota `/mural` e suas exibições na interface do usuário do **ENDORFINAPP** foram atualizadas para a nomenclatura **"Feed Social"** (`/feed`), alinhada ao propósito do aplicativo como uma rede social fitness e ecossistema de alta performance (*"A Química do Crescimento"*).

---

## 🚀 O que mudou

1. **Rota Principal & Redirecionamento**:
   - A rota principal passa a ser `/feed` (`pages/aluno/Mural.tsx`).
   - A rota `/mural` foi mantida com um redirecionamento automático `<Navigate to="/feed" replace />` para retrocompatibilidade.

2. **Navegação & UI (AppShell.tsx)**:
   - Sidebar desktop: Item renomeado para `Feed Social` com rota `/feed`.
   - Bottom Bar mobile: Tab renomeada para `Feed Social` apontando para `/feed`.
   - Drawer mobile: Item renomeado para `Feed Social`.
   - Badges de notificação de comentários/atividades atualizados para observar a rota `/feed`.

3. **Painel do Aluno (Dashboard.tsx)**:
   - Card de navegação rápida atualizado de `Mural de Atividades` para `Feed Social` apontando para `/feed`.

4. **Moderação Root (Social.tsx)**:
   - Aba de moderação renomeada para `Feed Social`.

5. **Documentação & Landing Page**:
   - Copys da Landing Page e tabela de rotas do `AGENTS.md` atualizadas.
