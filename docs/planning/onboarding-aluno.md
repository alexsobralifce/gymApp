# Planejamento: Onboarding do Aluno — Wizard + Boas-Vindas + UX

**Data:** 2026-07-17
**Objetivo:** Redesenhar o fluxo de cadastro e primeira experiência do aluno para reduzir fricção e aumentar engajamento.

---

## Auditoria (o que NÃO existe hoje)

| # | Requisito | Status atual |
|---|-----------|-------------|
| 1 | Wizard de cadastro em passos | Formulário único flat, zero divisão em passos |
| 2 | Tela de boas-vindas pós-cadastro | Redireciona direto ao Dashboard, sem onboarding |
| 3 | Empty states ilustrados em Meus Treinos | Só texto genérico, sem tratamento autogestão vs professor |
| 4 | Coach marks na execução de treino | Fluxo funcional, mas zero tooltips/ localStorage |
| 5 | Validação inline peso/altura | Só HTML nativo (`required`, `min`); feedback só no 422 |

---

## 1. Wizard de Cadastro em 3 Passos

### Estratégia
Substituir o formulário único do `Register.tsx` por um componente `RegisterWizard` com 3 passos e barra de progresso. O componente gerencia estado via `useState(step)` local — sem Zustand, pois é estado transitório de UI (Clean Code G36: config at high levels).

### Passo 1 — Dados Básicos
- Nome, email, senha, WhatsApp (opcional)
- Select de role (Aluno/Professor/Academia)
- Validação: nome ≥ 2 chars, email formato, senha ≥ 8 chars

### Passo 2 — Perfil Físico (só se role=ALUNO)
- Data de nascimento
- Peso (kg) + Altura (cm) com **validação inline em tempo real**
- Sexo (Masculino/Feminino)
- Feedback visual: borda verde ao digitar valor válido, vermelha + mensagem se inválido

### Passo 3 — Academia (só se role=ALUNO)
- Dropdown de academias ativas + opção "Autogestão"
- Se autogestão: texto explicativo "Você montará seus próprios treinos"

### Barra de Progresso
- Componente `StepIndicator` com 3 círculos numerados e linhas conectoras
- Step atual preenchido (cor primary), futuros em cinza, concluídos com check
- Botões "Voltar" e "Próximo" no rodapé

### Arquivos

| Arquivo | O que faz |
|---------|-----------|
| `RegisterWizard.tsx` (novo) | Container do wizard, estado `step`, renderização condicional |
| `StepIndicator.tsx` (novo) | Barra de progresso visual com 3 passos |
| `Register.tsx` | Substituir conteúdo pelo `<RegisterWizard />` |
| `Step1Basics.tsx` (novo) | Passo 1 — dados básicos |
| `Step2Profile.tsx` (novo) | Passo 2 — perfil físico |
| `Step3Academy.tsx` (novo) | Passo 3 — academia/autogestão |

**Clean Code:** F1 (max 3 args), F3 (sem flags — cada passo é um componente separado em vez de `if (step === 1)`), G30 (cada passo faz uma coisa).

---

## 2. Tela de Boas-Vindas Pós-Cadastro

### Estratégia
Componente `WelcomeCards` exibido APENAS no primeiro login após registro. Controlado por localStorage (`gymapp_welcome_seen`). Se já visto, redireciona direto ao Dashboard.

### Cards (3 cards horizontais em desktop, verticais em mobile)

| Card | Ícone | Título | Descrição |
|------|-------|--------|-----------|
| 1 | 📨 (envelope) | Aceitar Treino | Seu professor envia fichas de treino. Aceite para começar a treinar! |
| 2 | ✅ (check) | Registrar Execução | Durante o treino, registre carga e repetições de cada série. |
| 3 | 📈 (chart) | Ver Evolução | Acompanhe seu progresso com gráficos de medidas e correlações. |

Se aluno é autogestão: Card 1 muda para "Criar Treino" explicando que ele mesmo monta suas fichas.

### Comportamento
- Botão "Começar" → navigate('/') → Dashboard
- Link "Pular" no canto superior direito
- localStorage `gymapp_welcome_seen = 'true'` após fechar

### Arquivos

| Arquivo | O que faz |
|---------|-----------|
| `WelcomeCards.tsx` (novo) | Componente com 3 cards + botão Começar/Pular |
| `App.tsx` | Rota `/welcome` renderiza `WelcomeCards`; se `welcome_seen`, redireciona |

---

## 3. Empty States Ilustrados — Meus Treinos

### Estratégia
Substituir o `<p>` genérico por um componente `EmptyState` com ilustração SVG inline, texto contextual e CTA diferente por cenário.

### Cenário A — Aluno com Professor, sem treinos ativos
- Ilustração: SVG de prancheta vazia com halter
- Título: "Nenhum treino ativo"
- Texto: "Seu professor ainda não enviou fichas, ou você ainda não aceitou nenhuma. Fique de olho nas notificações!"
- CTA: "Ver Notificações" → navega ou abre notificações

### Cenário B — Aluno Autogestão, sem treinos
- Ilustração: SVG de lápis + halter
- Título: "Crie seu primeiro treino"
- Texto: "No modo autogestão, você monta seus próprios treinos. Comece agora!"
- CTA: "Criar Treino" → navigate('/treinos/criar') ou abre modal de autogestão

### Cenário C — Treinos existem mas nenhum ativo (CONCLUIDO, RECUSADO)
- Ilustração: SVG de check + coração
- Título: "Todos os treinos concluídos"
- Texto: "Você finalizou todos os treinos disponíveis. Aguarde novas fichas do seu professor."
- CTA: "Ver Histórico" → navega para evolução ou calendário

### Arquivos

| Arquivo | O que faz |
|---------|-----------|
| `EmptyState.tsx` (novo) | Componente reutilizável: `icon`, `title`, `description`, `actionLabel`, `onAction` |
| `MeusTreinos.tsx` | Substituir `<p>` inline por `<EmptyState>` condicional |

---

## 4. Coach Marks na Primeira Execução

### Estratégia
Detectar primeira execução via localStorage `gymapp_first_workout_done`. Exibir tooltips posicionados em 3 elementos-chave da tela `TreinoExecucao.tsx`.

### Tooltips (exibidos em sequência)

| Ordem | Alvo | Mensagem |
|-------|------|----------|
| 1 | Timer circular | "O timer registra quanto tempo você leva. Toque para expandir." |
| 2 | Primeira série (carga + reps) | "Preencha a carga usada e quantas repetições fez. Depois toque em ✓." |
| 3 | Botão Finalizar | "Ao concluir todas as séries, finalize o treino aqui." |

### Comportamento
- Tooltip com fundo escuro, seta apontando para o elemento, botão "Entendi" / "Próximo"
- Overlay semi-transparente atrás do tooltip (dim o resto da tela)
- Ao fechar o último → `localStorage.setItem('gymapp_first_workout_done', 'true')`
- Nunca mais exibe para este aluno

### Arquivos

| Arquivo | O que faz |
|---------|-----------|
| `CoachMark.tsx` (novo) | Componente de tooltip posicionado com overlay |
| `useCoachMark.ts` (novo) | Hook: gerencia sequência, localStorage, posicionamento |
| `TreinoExecucao.tsx` | Integrar `useCoachMark` + `CoachMark` nos 3 elementos |

---

## 5. Validação Inline Peso/Altura

### Estratégia
Adicionar validação em tempo real nos inputs de peso e altura no Passo 2 do wizard. Usar `useEffect` + estado local de erro por campo.

### Regras

| Campo | Range | Mensagem de erro |
|-------|-------|-----------------|
| Peso | 20–500 kg | "Peso deve estar entre 20 e 500 kg" |
| Peso | vazio | "Peso é obrigatório" |
| Altura | 50–250 cm | "Altura deve estar entre 50 e 250 cm" |
| Altura | vazio | "Altura é obrigatória" |

### Comportamento
- Validação dispara `onChange` com debounce de 500ms (evita flicker)
- Borda do input: verde com check quando válido, vermelha com mensagem abaixo quando inválido
- Botão "Próximo" desabilitado enquanto houver erro
- Mensagem de erro aparece com animação `fade-in` abaixo do input

### Arquivos

| Arquivo | O que faz |
|---------|-----------|
| `Step2Profile.tsx` (novo, já listado acima) | Validação inline nos campos peso/altura/sexo |

---

## Ordem de Implementação

| # | Requisito | Arquivos | Esforço |
|---|-----------|----------|---------|
| 1 | Validação inline peso/altura | `Step2Profile.tsx` (dentro do wizard) | 30 min |
| 2 | Wizard de 3 passos | `RegisterWizard`, `StepIndicator`, `Step1Basics`, `Step2Profile`, `Step3Academy` | 2h |
| 3 | Empty states ilustrados | `EmptyState.tsx`, `MeusTreinos.tsx` | 1h |
| 4 | Tela de boas-vindas | `WelcomeCards.tsx`, `App.tsx` | 1h |
| 5 | Coach marks na execução | `CoachMark.tsx`, `useCoachMark.ts`, `TreinoExecucao.tsx` | 1h30 |

**Total estimado:** ~6h

---

## Observações

- **KISS**: Cada componente faz uma coisa. Wizard é composição de componentes pequenos, não um monolito.
- **Clean Code (G36)**: Configurações de texto e comportamento dos coach marks em constantes no topo do arquivo, não hardcoded no JSX.
- **Mobile First**: Wizard e WelcomeCards funcionam em coluna vertical no mobile, horizontal no desktop.
- **Sem breaking changes**: O fluxo existente (`register()` no store, rotas no App.tsx) é preservado. O wizard apenas reorganiza a UI.
- **localStorage**: Usado para flags de one-time (welcome, coach marks). Não armazena dados sensíveis.
