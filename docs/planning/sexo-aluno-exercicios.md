# Planejamento: Sexo do Aluno no Cadastro

**Data:** 2026-07-17  
**Objetivo:** Adicionar campo `sexo` (Masculino/Feminino) no cadastro do aluno. Homens e mulheres veem os mesmos GIFs — sem filtro de exercícios por gênero.

---

## 1. Modelo de Dados

### Migration: Adicionar `sexo` apenas no Aluno

```prisma
enum Sexo {
  MASCULINO
  FEMININO
}

model Aluno {
  // ... campos existentes ...
  sexo Sexo?
}
```

**SQL:**
```sql
CREATE TYPE "Sexo" AS ENUM ('MASCULINO', 'FEMININO');
ALTER TABLE "alunos" ADD COLUMN "sexo" "Sexo";
```

`nullable` para compatibilidade com alunos existentes. Exercícios **não** recebem campo `sexo` — todos veem os mesmos GIFs.

---

## 2. Backend

### 2.1 `POST /alunos/perfil` — aceitar `sexo`

```typescript
const body = z.object({
  dataNascimento: z.string().optional(),
  pesoKg: z.number().positive().optional(),
  alturaCm: z.number().positive().optional(),
  sexo: z.enum(['MASCULINO', 'FEMININO']).optional(),
}).parse(request.body)
```

### 2.2 `GET /alunos/perfil` — retornar `sexo`

Incluir `sexo: true` no select.

### 2.3 Dashboard professor — incluir `sexo`

No `dashboardProfessor` (`TreinoService.ts`), adicionar `sexo: true` no select do aluno.

---

## 3. Frontend

### 3.1 Cadastro (`Register.tsx`)

Adicionar select de sexo no formulário de perfil do aluno:

```tsx
<select required>
  <option value="">Selecione...</option>
  <option value="MASCULINO">Masculino</option>
  <option value="FEMININO">Feminino</option>
</select>
```

Enviar no `POST /alunos/perfil`.

### 3.2 Types

```typescript
export interface PerfilAluno {
  // ... existentes ...
  sexo?: 'MASCULINO' | 'FEMININO' | null
}

export interface ProfessorDashboard {
  // ... existentes ...
  sexo?: 'MASCULINO' | 'FEMININO' | null
}
```

### 3.3 Perfil do Aluno (avatar dropdown)

Exibir "Masculino" / "Feminino" nos dados do aluno (somente leitura).

---

## 4. Ordem de Implementação

| # | Etapa | Arquivos |
|---|-------|----------|
| 1 | `enum Sexo` + campo no `Aluno` | `schema.prisma` |
| 2 | Migration | Nova migration |
| 3 | `POST /alunos/perfil` aceitar `sexo` | `aluno.routes.ts` |
| 4 | `GET /alunos/perfil` retornar `sexo` | `aluno.routes.ts` |
| 5 | Dashboard incluir `sexo` | `TreinoService.ts` |
| 6 | Types: `sexo` no `PerfilAluno` e `ProfessorDashboard` | `api.ts` |
| 7 | Campo "Sexo" no cadastro | `Register.tsx` |
| 8 | Exibir sexo nos dados do aluno | Componente de perfil |

---

## 5. O que NÃO muda

- **Exercícios:** sem campo `sexo`, sem filtro por gênero — homens e mulheres veem a mesma biblioteca
- **Templates:** sem filtro
- **CriarTreino:** sem filtro de sexo ao carregar exercícios
- **GIFs:** mesmos GIFs para todos
