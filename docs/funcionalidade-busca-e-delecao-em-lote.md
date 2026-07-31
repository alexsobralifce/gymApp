# Documentação: Busca e Deleção em Lote nas Tabelas do Sistema

## Visão Geral
Todas as telas do **ENDORFINAPP** que exibem listagens ou tabelas de dados contêm busca por palavra-chave em tempo real, seleção múltipla (checkbox individual por linha e checkbox "Selecionar Todos" no cabeçalho) e a barra flutuante de ações em lote **BatchActionBar** com botão para deleção em cascata com confirmação.

---

## 🎯 Componentes & Telas Atualizadas

### 1. Componente Reutilizável `BatchActionBar.tsx`
- Localização: `apps/web/src/components/ui/BatchActionBar.tsx`
- Exibe o número de itens selecionados em destaque.
- Botão "Deselecionar" para limpar a seleção rápida.
- Botão "Excluir Selecionados em Cascata" em vermelho com ícone de lixeira e confirmação.

### 2. Painel Root (`/root/usuarios`)
- Busca por nome, email ou documento.
- Checkboxes em `AcademiasTab`, `ProfessoresTab` e `AlunosTab`.
- Exclusão em lote e em cascata de academias, professores e alunos selecionados.

### 3. Painel da Academia (`/academia/alunos`)
- Busca por aluno e email.
- Checkboxes de seleção por linha e selecionar todos no cabeçalho `<th>`.
- Desvinculação e exclusão em lote de alunos.

### 4. Painel do Professor (`/professor/treinos`)
- Busca por aluno.
- Seleção de múltiplos treinos na visualização modal com exclusão em lote.

### 5. Medidas Corporais do Aluno (`/medidas`)
- Busca por data, peso ou observação.
- Checkbox no cabeçalho e em cada medida com deleção em lote (`DELETE /alunos/medidas/:id`).

### 6. Avaliações Físicas (`/avaliacoes`)
- Busca por aluno e busca por data/laudo de avaliação.
- Seleção múltipla e exclusão em lote de avaliações físicas.
