# Planejamento: Template de Treino

**Data:** 2026-07-16
**Feature:** Adicionar conceito de "Template de Treino" para acelerar criação de fichas.

---

## 1. Visão Geral

Adicionar flag `is_template` na tabela `treinos` para que professores possam salvar fichas como templates reutilizáveis. Templates podem ser usados como base para:
- Pré-preencher o formulário de criação (`CriarTreino.tsx`)
- Clonagem em lote para múltiplos alunos simultaneamente (`POST /treinos/:id/clonar-lote`)

---

## 2. Decisão de Design: Aluno Dummy vs Aluno Real

**Opção escolhida: Treino template associado a um aluno real do professor.**

Um template é um `Treino` normal (com `aluno_id` preenchido obrigatoriamente) que possui `is_template = true`. A FK `aluno_id` permanece `NOT NULL` — não se mexe na constraint. Quando um template for clonado, o `aluno_id` do template é ignorado e o destino é definido pelo novo aluno. A validação de tenant no clone usa o professor dono do aluno do template (que é aluno do professor), garantindo isolamento.

**Por que não criar aluno "dummy"?**
- Complexidade desnecessária: seria preciso criar/manter um aluno fantasma por professor
- Templates podem ser treinos reais que o professor quer reusar; o aluno original é irrelevante na clonagem

**Regra:** Ao marcar um treino como template, o campo `is_template` muda para `true`. Ao desmarcar, volta para `false`. Nenhuma outra alteração ocorre.

---

## 3. Etapas de Implementação

### 3.1 Migração Prisma

**Arquivo:** Nova migration

```prisma
model Treino {
  // ... campos existentes ...
  is_template            Boolean      @default(false)
}
```

**Comando:**
```bash
npx prisma migrate dev --name add_is_template_to_treinos --schema=apps/api/prisma/schema.prisma
```

**Impacto:** Campo novo com default `false`, sem breaking changes. Prisma Client será regenerado automaticamente.

---

### 3.2 Backend — Rota GET `/professores/templates`

**Arquivo:** `apps/api/src/presentation/http/routes/professor.routes.ts`

**Rota:**
```
GET /professores/templates
Auth: PROFESSOR
Query: ?academiaId (opcional)
```

**Lógica:**
1. Resolve professor via `resolveProfessor(request.currentUser.sub)`
2. Busca alunos do professor (filtro opcional por `academiaId`)
3. Busca treinos com `is_template = true` cujo `aluno_id` está na lista de alunos do professor
4. Retorna treinos com `exercicios` (include `exercicio`) ordenados por `atualizado_em DESC`

**Response:**
```json
[
  {
    "id": "cuid",
    "nome": "Treino A — Peito e Tríceps",
    "dias_semana": [1, 3, 5],
    "is_template": true,
    "aluno_id": "cuid",
    "exercicios": [
      {
        "id": "cuid",
        "ordem": 1,
        "series": 3,
        "repeticoes": 12,
        "carga_sugerida_kg": null,
        "exercicio": { "id": "cuid", "nome": "Supino reto", "grupo_muscular": "Peito", ... }
      }
    ]
  }
]
```

---

### 3.3 Backend — Rota POST `/treinos/:id/marcar-template`

**Arquivo:** `apps/api/src/presentation/http/routes/treino.routes.ts`

**Rota:**
```
POST /treinos/:id/marcar-template
Auth: PROFESSOR, ACADEMIA
Body: { isTemplate: boolean }
```

**Lógica:**
1. Valida params `{ id }` e body `{ isTemplate: z.boolean() }`
2. Busca treino com tenant check (igual ao PATCH existente)
3. Atualiza `is_template` no banco
4. Retorna treino atualizado

**Tenant check:** professor dono do aluno do treino OU academia dona do aluno do treino (mesmo padrão do PATCH /:id e DELETE /:id).

---

### 3.4 Backend — Rota POST `/treinos/:id/clonar-lote`

**Arquivo:** `apps/api/src/presentation/http/routes/treino.routes.ts`

**Rota:**
```
POST /treinos/:id/clonar-lote
Auth: PROFESSOR, ACADEMIA
Body: { alunoIds: string[] }
```

**Lógica:**
1. Valida params `{ id }` e body `{ alunoIds: z.array(z.string()).min(1) }`
2. Busca treino fonte com exercícios (mesmo padrão do `clonarTreino`)
3. Tenant check no treino fonte (professor/academia)
4. Para cada `alunoId`:
   - Busca aluno e valida tenant
   - Cria cópia do treino com `aluno_id = alunoId`, nome `treino.nome` (sem sufixo), status `CADASTRADO`
   - Copia exercícios (ordem, series, repeticoes, carga_sugerida_kg)
   - NÃO copia `is_template` (clones sempre têm `is_template = false`)
   - Registra histórico
5. Retorna array de treinos criados

**Service:** Nova função `clonarTreinoEmLote(treinoId, alunoIds, atorId, atorTipo)` no `TreinoService.ts`. Reutiliza a lógica de clonagem individual internamente ou faz em transação.

**Performance:** Para lotes grandes (50+ alunos), usar `prisma.$transaction` com `createMany` para exercícios pode ser necessário. Para MVP, loop sequencial dentro de transação é aceitável.

---

### 3.5 Frontend — API Client

**Arquivo:** `apps/web/src/api/client.ts`

Novos métodos:
```typescript
getTemplates: (academiaId?: string) =>
  api.get<Treino[]>(`/professores/templates${academiaId ? `?academiaId=${academiaId}` : ''}`),

marcarTemplate: (treinoId: string, isTemplate: boolean) =>
  api.post<Treino>(`/treinos/${treinoId}/marcar-template`, { isTemplate }),

clonarTreinoLote: (treinoId: string, alunoIds: string[]) =>
  api.post<Treino[]>(`/treinos/${treinoId}/clonar-lote`, { alunoIds }),
```

---

### 3.6 Frontend — Types

**Arquivo:** `apps/web/src/types/api.ts`

Adicionar no `Treino`:
```typescript
export interface Treino {
  // ... campos existentes ...
  is_template?: boolean
}
```

---

### 3.7 Frontend — Botão "Marcar como Template" no Treinos.tsx

**Arquivo:** `apps/web/src/pages/professor/Treinos.tsx`

No modal de visualização de treinos, adicionar botão ao lado de "Clonar":

```tsx
<button
  onClick={() => handleToggleTemplate(t.id, !t.is_template)}
  className="text-xs text-amber-400 hover:underline cursor-pointer"
>
  {t.is_template ? 'Desmarcar Template' : 'Template'}
</button>
```

Handler:
```typescript
const handleToggleTemplate = async (treinoId: string, isTemplate: boolean) => {
  try {
    await api.marcarTemplate(treinoId, isTemplate)
    showToast(isTemplate ? 'Template ativado!' : 'Template removido!')
    const data = await api.getDashboard()
    setAlunos(data)
  } catch (e) {
    showToast((e as Error).message, 'error')
  }
}
```

**Nota:** `ProfessorDashboard.treinos` não tem campo `is_template`. Será necessário incluir o campo na resposta do dashboard OU fazer um GET extra. **Solução:** Adicionar `is_template: true` no `select` da query de dashboard no backend (`TreinoService.ts:340-364`).

---

### 3.8 Frontend — Dropdown de Templates no CriarTreino.tsx

**Arquivo:** `apps/web/src/pages/professor/CriarTreino.tsx`

**Estado novo:**
```typescript
const [templates, setTemplates] = useState<Treino[]>([])
const [selectedTemplateId, setSelectedTemplateId] = useState('')
```

**Carregar templates** após selecionar academia (mesmo useEffect que carrega alunos/exercícios):
```typescript
api.getTemplates(academiaId || undefined).then(setTemplates).catch(() => {})
```

**UI:** Abaixo do seletor de aluno, adicionar card colapsável:
```tsx
<div className="max-w-md bg-surface-card border border-surface-input rounded-2xl p-4 shadow-sm">
  <label className="mb-1.5 block text-xs font-semibold text-text-muted uppercase tracking-wider">
    Criar a partir de Template
  </label>
  <select
    value={selectedTemplateId}
    onChange={(e) => handleSelectTemplate(e.target.value)}
    className="w-full rounded-xl border border-surface-input bg-surface px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
  >
    <option value="">Nenhum (criar do zero)</option>
    {templates.map((t) => (
      <option key={t.id} value={t.id}>{t.nome}</option>
    ))}
  </select>
</div>
```

**Handler `handleSelectTemplate`:**
1. Busca detalhes do template via `api.getTreino(templateId)` (rota já existe)
2. Converte `exercicios` do template para o formato `FichaTreino` local
3. `setFichas(...)` com os exercícios pré-preenchidos
4. Mantém `dias_semana` do template
5. Reseta `alunoId` — obriga o professor a selecionar o aluno destino

```typescript
const handleSelectTemplate = async (templateId: string) => {
  if (!templateId) return
  setSelectedTemplateId(templateId)
  try {
    const treino = await api.getTreino(templateId)
    const exerciciosPreenchidos: ExercicioTreino[] = (treino.exercicios || []).map((te) => ({
      exercicioId: te.exercicio.id,
      nome: te.exercicio.nome,
      ordem: te.ordem,
      series: te.series,
      repeticoes: te.repeticoes,
      cargaSugeridaKg: te.carga_sugerida_kg ?? undefined,
      imagemUrl: te.exercicio.imagem_url,
      gifUrl: te.exercicio.gif_url,
      grupoMuscular: te.exercicio.grupo_muscular,
    }))
    setFichas([{
      nome: treino.nome,
      diasSemana: treino.dias_semana || [],
      exercicios: exerciciosPreenchidos,
    }])
    setAlunoId('') // força seleção de aluno
  } catch (e) {
    console.error(e)
  }
}
```

---

### 3.9 Frontend — Clonagem em Lote no Treinos.tsx

**Arquivo:** `apps/web/src/pages/professor/Treinos.tsx`

Adicionar botão "Clonar em Lote" no modal de visualização de treinos (visível apenas para templates):

```tsx
{t.is_template && (
  <button
    onClick={() => openCloneLoteModal(t.id, t.nome)}
    className="text-xs text-green-400 hover:underline cursor-pointer"
  >
    Clonar em Lote
  </button>
)}
```

**Modal de clonagem em lote** — estados:
```typescript
const [cloningLote, setCloningLote] = useState<{ id: string; nome: string } | null>(null)
const [alunosLoteDisponiveis, setAlunosLoteDisponiveis] = useState<{ id: string; usuario: { nome: string; email: string } }[]>([])
const [selectedAlunoIds, setSelectedAlunoIds] = useState<string[]>([])
const [buscaAlunoLote, setBuscaAlunoLote] = useState('')
```

**UI do modal:**
- Campo de busca textual que filtra a lista de alunos localmente
- Checkbox list com alunos (multi-seleção)
- Botões "Selecionar Todos" / "Limpar"
- Contador: "X alunos selecionados"
- Botão "Clonar para X alunos"

**Handler:**
```typescript
const handleCloneLote = async () => {
  if (!cloningLote || selectedAlunoIds.length === 0) return
  setSaving(true)
  try {
    const treinos = await api.clonarTreinoLote(cloningLote.id, selectedAlunoIds)
    // Auto-envio para cada clone
    await Promise.all(treinos.map((t) => api.enviarTreino(t.id)))
    showToast(`${treinos.length} treino(s) clonado(s) e enviado(s) com sucesso!`)
    setCloningLote(null)
    setSelectedAlunoIds([])
    const data = await api.getDashboard()
    setAlunos(data)
  } catch (e) {
    showToast((e as Error).message, 'error')
  } finally {
    setSaving(false)
  }
}
```

---

### 3.10 Backend — Atualizar Dashboard para incluir `is_template`

**Arquivo:** `apps/api/src/application/usecases/treino/TreinoService.ts`

Na função `dashboardProfessor`, adicionar `is_template: true` no select de treinos (linhas 340-364):
```typescript
treinos: {
  select: {
    id: true,
    nome: true,
    status: true,
    dias_semana: true,
    is_template: true,  // NOVO
    iniciado_em: true,
    finalizado_em: true,
    atualizado_em: true,
  },
  // ...
}
```

---

## 4. Ordem de Implementação

| # | Etapa | Arquivos | Depende de |
|---|-------|----------|------------|
| 1 | Migration Prisma | `schema.prisma` + migration | - |
| 2 | Atualizar dashboard com `is_template` | `TreinoService.ts` | 1 |
| 3 | Rota `GET /professores/templates` | `professor.routes.ts` | 1 |
| 4 | Rota `POST /treinos/:id/marcar-template` | `treino.routes.ts` | 1 |
| 5 | Rota `POST /treinos/:id/clonar-lote` + service | `treino.routes.ts`, `TreinoService.ts` | 1 |
| 6 | API Client: novos métodos | `client.ts` | - |
| 7 | Types: `is_template` no `Treino` | `api.ts` | 1 |
| 8 | Botão "Marcar Template" no Treinos.tsx | `Treinos.tsx` | 2, 4, 6 |
| 9 | Dropdown de templates no CriarTreino.tsx | `CriarTreino.tsx` | 3, 6 |
| 10 | Modal "Clonar em Lote" no Treinos.tsx | `Treinos.tsx` | 5, 6 |

---

## 5. Compatibilidade

- **Auto-envio mantido:** Após clonagem em lote, `Promise.all(treinos.map(t => api.enviarTreino(t.id)))` é chamado no frontend (mesmo padrão do CriarTreino.tsx e clone simples)
- **Tenant isolation:** Todas as queries validam `professor_id` ou `academia_id` conforme padrão existente
- **Histórico:** Toda clonagem registra entrada em `treino_historico` com `ator_id` e `ator_tipo`
- **Status do clone:** Sempre `CADASTRADO` (clones NÃO herdam `is_template = true`)
- **Nenhuma rota existente é alterada** — apenas adições

---

## 6. Testes Manuais

| Cenário | Passos | Resultado esperado |
|---------|--------|-------------------|
| Marcar treino como template | Treinos.tsx > Ver treinos > Botão "Template" | Treino aparece no dropdown de CriarTreino |
| Desmarcar template | Mesmo botão (toggle) | Treino some do dropdown |
| Criar a partir de template | CriarTreino > selecionar template no dropdown | Fichas pré-preenchidas, aluno resetado |
| Clonar template em lote | Treinos.tsx > Template > Clonar em Lote > selecionar 3 alunos | 3 treinos criados e enviados |
| Auto-envio após clone em lote | Após clonagem em lote | Cada aluno recebe notificação NOVO_TREINO |
| Template não aparece como treino normal | Dashboard do aluno | Treinos com `is_template=true` continuam visíveis (comportamento não muda) |
| Tenant: professor B acessa template do professor A | GET /professores/templates | Templates do professor A não aparecem para professor B |

---

## 7. Estimativa de Esforço

| Área | Horas |
|------|-------|
| Backend (migration + 3 rotas + service) | 2h |
| Frontend (UI + API client + types) | 3h |
| Testes manuais | 1h |
| **Total** | **~6h** |
