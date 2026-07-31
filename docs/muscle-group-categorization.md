# Documentação: Categorização dos Grupos Musculares (12 Categorias)

Esta documentação descreve a arquitetura do novo sistema de categorização visual dos grupos musculares da plataforma **ENDORFINAPP**, projetada sob os princípios de **Design Mobile-First**.

---

## 1. Visão Geral das 12 Categorias

Para organizar todos os +900 exercícios e GIFs animados sincronizados, a aplicação adota 12 categorias canônicas universais apresentadas em matriz visual em ordem alfabética:

| Categoria | Descrição Muscular | Exemplos de Exercícios |
|---|---|---|
| **ABDOMINAL** | Abdômen & Core | Abdominais, Pranchas, Crunches, Oblíquos |
| **AERÓBICO** | Cardio & HIIT | Esteira, Bicicleta, Corrida, Elíptico, Burpees |
| **ANTEBRAÇO** | Antebraço & Punho | Rosca Punho, Extensão de Punho |
| **BÍCEPS** | Bíceps & Braquial | Rosca Direta, Martelo, Concentrada, Scott |
| **COSTAS** | Dorsais, Trava & Serrátil | Puxada Pulley, Remada Curvada, Serrote, Barra Fixa |
| **GLÚTEO** | Glúteos | Elevação Pélvica, Abdução em Cabo, Coice |
| **OMBRO** | Deltoides & Ombros | Desenvolvimento, Elevação Lateral, Elevação Frontal |
| **PANTURRILHA** | Gêmeos & Tibial | Elevação de Panturrilha em pé/sentado |
| **PEITORAL** | Peitoral Superior/Inferior | Supino Reto, Crucifixo, Peck Deck, Flexões |
| **PERNAS** | Quadríceps & Isquiotibiais | Agachamento, Leg Press, Cadeira Extensora, Flexora |
| **TRAPÉZIO** | Trapézio & Cervical | Encolhimento com Halter/Barra, Remada Alta |
| **TRÍCEPS** | Tríceps | Tríceps Testa, Pulley Corda, Francês, Mergulho |

---

## 2. Arquitetura do Componente `MuscleCategoryGrid`

O componente `MuscleCategoryGrid` ([MuscleCategoryGrid.tsx](file:///Users/alexandrerocha/gymApp/apps/web/src/components/ui/MuscleCategoryGrid.tsx)) implementa o padrão de visualização mobile-first:

- **Grid Responsivo**:
  - `grid-cols-3` em telas de celulares (3 colunas com ícones e rótulo).
  - `sm:grid-cols-4` em tablets pequenos.
  - `md:grid-cols-6` em telas médias e desktops (2 linhas de 6 colunas).
- **Ícones Vetoriais SVG**:
  - Renderizados pelo módulo `MuscleIcons.tsx` ([MuscleIcons.tsx](file:///Users/alexandrerocha/gymApp/apps/web/src/components/icons/MuscleIcons.tsx)).
- **Interatividade & Seleção**:
  - Destaque ativo em fundo suave com borda `primary`.
  - Suporta seleção individual ou desmarcar para listar todos os exercícios.

---

## 3. Mapeamento Automático (`muscleCategories.ts`)

O módulo [muscleCategories.ts](file:///Users/alexandrerocha/gymApp/apps/web/src/lib/muscleCategories.ts) analisa os atributos `grupo_muscular`, `musculo_alvo` e `nome` de qualquer exercício para derivar sua categoria correspondente em tempo real.

---

## 4. Integração nas Telas do Sistema
- **Criar Treino Aluno**: [CriarTreinoAluno.tsx](file:///Users/alexandrerocha/gymApp/apps/web/src/pages/aluno/CriarTreinoAluno.tsx)
- **Criar Treino Professor**: [CriarTreino.tsx](file:///Users/alexandrerocha/gymApp/apps/web/src/pages/professor/CriarTreino.tsx)
- **Criar Treino Academia**: [CriarTreinoAcademia.tsx](file:///Users/alexandrerocha/gymApp/apps/web/src/pages/academia/CriarTreinoAcademia.tsx)
- **Prescrição por IA**: [TreinoIA.tsx](file:///Users/alexandrerocha/gymApp/apps/web/src/pages/aluno/TreinoIA.tsx)
