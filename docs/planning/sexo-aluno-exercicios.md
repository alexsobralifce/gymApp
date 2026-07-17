# Planejamento: Sexo do Aluno + Filtro de Exercícios por Gênero

**Data:** 2026-07-17  
**Objetivo:** Adicionar campo `sexo` (Masculino/Feminino) no cadastro do aluno e filtrar exercícios/alongamentos com base no gênero.

---

## 1. Análise da Fonte (GifDoTreino)

O site https://www.gifdotreino.com **não expõe metadados de gênero** na API:
- `GET /search_gifs.php` retorna os mesmos exercícios independente do sexo
- Não há URLs separadas (ex: `/male/`, `/female/`) — retornam 404
- Não há campo `sexo` ou `gender` nos objetos retornados
- Os GIFs são unissex (o executante pode ser homem ou mulher, mas o exercício é o mesmo)

**Estratégia adotada:** Implementar a infraestrutura de sexo no modelo de dados e UI, com exercícios padrão como unissex (`sexo = null`). O campo `sexo` no `Exercicio` fica pronto para quando houver uma fonte de dados com conteúdo segmentado por gênero. Enquanto isso, todos os exercícios são exibidos para ambos os sexos.

---

## 2. Modelo de Dados

### 2.1 Migration: Adicionar `sexo` no Aluno

```prisma
enum Sexo {
  MASCULINO
  FEMININO
}

model Aluno {
  // ... campos existentes ...
  sexo Sexo? // nullable para compatibilidade com dados existentes
}
```

**Justificativa:** `nullable` porque alunos existentes não terão o campo preenchido. No futuro pode se tornar required após backfill.

### 2.2 Migration: Adicionar `sexo` no Exercicio

```prisma
model Exercicio {
  // ... campos existentes ...
  sexo Sexo? // null = unissex, MASCULINO ou FEMININO
}
```

**Justificativa:** Exercícios sem sexo definido (null) são exibidos para ambos. Exercícios com sexo específico são exibidos apenas para alunos do sexo correspondente.

### 2.3 Comando Migration

```bash
npx prisma migrate dev --name add_sexo_to_aluno_and_exercicio --schema=apps/api/prisma/schema.prisma
```

**Migration SQL:**
```sql
CREATE TYPE "Sexo" AS ENUM ('MASCULINO', 'FEMININO');
ALTER TABLE "alunos" ADD COLUMN "sexo" "Sexo";
ALTER TABLE "exercicios" ADD COLUMN "sexo" "Sexo";
```

---

## 3. Backend

### 3.1 Perfil do Aluno — Rota `POST /alunos/perfil`

Adicionar `sexo` ao body da requisição:

```typescript
const body = z.object({
  dataNascimento: z.string().optional(),
  pesoKg: z.number().positive().optional(),
  alturaCm: z.number().positive().optional(),
  sexo: z.enum(['MASCULINO', 'FEMININO']).optional(),
}).parse(request.body)
```

Atualizar o upsert do perfil para incluir `sexo`.

### 3.2 Listagem de Exercícios — `GET /professores/exercicios`

Adicionar filtro opcional por `sexo`:

```typescript
const { sexo } = z.object({ sexo: z.enum(['MASCULINO', 'FEMININO']).optional() }).parse(request.query)
```

Se `sexo` informado, filtrar: `where: { OR: [{ sexo: sexo }, { sexo: null }] }` — exercícios que correspondem ao sexo OU são unissex.

### 3.3 Rota `GET /professores/templates`

Mesmo filtro de sexo aplicado aos templates.

### 3.4 Rota `GET /alunos/perfil`

Incluir `sexo` na resposta.

---

## 4. Frontend

### 4.1 Cadastro do Aluno (`Register.tsx`)

Adicionar campo de seleção de sexo após o campo de telefone:

```tsx
<div>
  <label>Sexo</label>
  <select required>
    <option value="">Selecione...</option>
    <option value="MASCULINO">Masculino</option>
    <option value="FEMININO">Feminino</option>
  </select>
</div>
```

Enviar `sexo` no body do `POST /alunos/perfil` (junto com pesoKg e alturaCm).

### 4.2 Perfil do Aluno — Tela "Dados do Aluno"

Exibir o sexo cadastrado (somente leitura).

### 4.3 CriarTreino.tsx (Professor)

Ler `sexo` do aluno selecionado e passar como filtro ao carregar exercícios:

```typescript
const alunoSelecionado = alunos.find(a => a.id === alunoId)
const sexoAluno = alunoSelecionado?.sexo

// Ao carregar exercícios:
api.getExercicios({ sexo: sexoAluno || undefined })
```

O backend retorna exercícios com `sexo = aluno.sexo` OU `sexo = null`.

### 4.4 Dashboard do Professor (`GET /professores/dashboard`)

Incluir `sexo` no retorno do aluno para uso no frontend.

### 4.5 Templates

Mesmo filtro de sexo aplicado ao carregar templates (`GET /professores/templates?sexo=...`).

---

## 5. Ordem de Implementação

| # | Etapa | Arquivos | Depende |
|---|-------|----------|---------|
| 1 | Adicionar `enum Sexo` no schema Prisma | `schema.prisma` | - |
| 2 | Migration `add_sexo` | Nova migration | 1 |
| 3 | Adicionar `sexo` no `POST /alunos/perfil` | `aluno.routes.ts` | 2 |
| 4 | Adicionar filtro `sexo` no `GET /professores/exercicios` | `professor.routes.ts` | 2 |
| 5 | Adicionar filtro `sexo` no `GET /professores/templates` | `professor.routes.ts` | 2 |
| 6 | Incluir `sexo` no dashboard professor | `TreinoService.ts` | 2 |
| 7 | Adicionar `sexo` nas types do frontend | `api.ts` | - |
| 8 | Campo "Sexo" no cadastro (`Register.tsx`) | `Register.tsx` | 3 |
| 9 | Filtro de sexo ao carregar exercícios no `CriarTreino.tsx` | `CriarTreino.tsx` | 4, 7 |
| 10 | Filtro de sexo nos templates | `Treinos.tsx` | 5, 7 |

---

## 6. Observações

- **Clean Code (F3):** O filtro de sexo não usa flag booleana — usa enum `Sexo?` que pode ser `undefined` (sem filtro), `MASCULINO` ou `FEMININO`. Evita o anti-pattern `isMale: boolean`.
- **KISS:** A regra de filtro é simples — exercício com `sexo = null` sempre aparece; com `sexo` específico, aparece só para o gênero correspondente.
- **Backward compatibility:** `sexo` é nullable em ambas as tabelas. Alunos existentes ficam sem sexo, exercícios existentes são unissex. Nenhum breaking change.
- **GifDoTreino:** Como a fonte não tem segmentação por gênero, o campo `sexo` nos exercícios fica `null` (unissex) e todos os GIFs aparecem para ambos os sexos. A infraestrutura fica pronta para quando houver conteúdo segmentado.
