# Planejamento: Editar Treino do Aluno + Wizard IA com Grupos Musculares

**Data:** 2026-07-21  
**Features:**
1. Aluno editar treino já salvo (UI + refinamentos de regra)
2. Passo de grupos musculares no wizard de IA (fim do “treino aleatório”)

---

## 1. Diagnóstico do Estado Atual

### 1.1 Edição de treino pelo aluno

| Camada | Situação |
|--------|----------|
| **API** `PATCH /treinos/:id` | ✅ Existe. Aluno dono pode editar `nome`, `diasSemana`, `exercicios`. Bloqueia só `EM_EXECUCAO`. |
| **Client** `api.editarTreino` | ✅ Existe em `apps/web/src/api/client.ts` |
| **UI aluno** | ❌ Não existe rota, botão nem tela de edição |
| **CriarTreinoAluno** | Só cria (`POST /treinos/autogestao`). Não carrega treino existente |

**Gap real:** backend pronto; falta fluxo frontend e regras de UX (quando pode editar, o que acontece com histórico/execuções).

### 1.2 Wizard IA (`TreinoIA.tsx` + `PrescricaoIAService`)

Passos atuais:
1. Objetivo  
2. Nível & dias/semana  
3. Restrições articulares  
4. Resultado  

**Problema de negócio:** `gerarTreinoIA` faz:

```ts
const planosCompativeis = await listarPlanos({ objetivo, nivel, sexo })
let planoEscolhido = planosCompativeis[0] // ← primeiro da lista, sem ranking
```

- Não filtra por `diasPorSemana`
- Não pergunta / não usa **grupos musculares desejados**
- Não aplica de fato as `restricoes` na escolha do plano (só texto no resumo)
- Ordenação é `criado_em DESC` → sensação de “aleatório”

Filtro de grupo muscular só aparece **depois** no passo 4, como chips para planos prontos alternativos — não entra na prescrição principal.

---

## 2. Objetivos

### Feature A — Editar treino salvo
- Aluno altera nome, dias da semana, exercícios (add/remove/reordenar), séries, reps e carga sugerida de um treino próprio.
- Entrada clara em `MeusTreinos` (e opcionalmente em `TreinoInicio`).
- Reutilizar o builder de `CriarTreinoAluno` em modo create/edit.

### Feature B — IA com grupos musculares
- Novo passo no wizard: **quais grupos musculares quer trabalhar**.
- Backend ranqueia/seleciona plano (ou monta sessões) com base em: objetivo + nível + dias + grupos + restrições + sexo.
- Resultado deixa de ser “primeiro plano da lista”.

---

## 3. Feature A — Editar Treino do Aluno

### 3.1 Regras de negócio

| Status do treino | Pode editar? | Observação |
|------------------|--------------|------------|
| `CADASTRADO` | ✅ | Raro no aluno (migração → ENVIADO) |
| `ENVIADO` | ✅ | Antes de aceitar; editar = customizar ficha recebida |
| `ACEITO` | ✅ | Caso principal |
| `EM_ABERTO` | ✅ | Ainda não em execução |
| `EM_EXECUCAO` | ❌ | Já bloqueado na API |
| `CONCLUIDO` | ✅ (recomendado) | Edita a ficha para o próximo ciclo; **não apaga** `execucao_exercicios` históricas |
| `RECUSADO` | ✅ | Pode ajustar e reusar |

**Decisões:**
1. Edição **não** apaga histórico de execuções nem `treino_historico`.
2. Se o aluno editar exercícios de um treino `CONCLUIDO`/`ACEITO`, a ficha muda para a próxima sessão; histórico antigo permanece vinculado ao `treino_id`.
3. Opcional (fase 2): ao editar treino `CONCLUIDO` com muitas execuções, oferecer “Duplicar e editar” para preservar ficha original — **fora do MVP**.
4. Tenant: só o aluno dono (`aluno.usuario_id === sub`). Professor/academia já editam pela mesma rota.

### 3.2 Backend (MVP mínimo)

**Arquivo:** `apps/api/src/presentation/http/routes/treino.routes.ts`

Ajustes leves no `PATCH /treinos/:id`:

1. Manter bloqueio de `EM_EXECUCAO`.
2. (Opcional) Permitir body parcial mais flexível: `exercicios` com `.min(1)` já existe — ok.
3. **Não** resetar status ao editar (evita quebrar máquina de estados).
4. Log opcional em `treino_historico` com ator `ALUNO` e mensagem implícita via status igual (só se quiser auditoria — fase 2).

Nenhuma migration necessária.

### 3.3 Frontend

#### 3.3.1 Rota
```
/treino/:id/editar  →  EditarTreinoAluno (ou CriarTreinoAluno em modo edit)
```

**Arquivo:** `apps/web/src/App.tsx` — adicionar rota ALUNO.

#### 3.3.2 Reuso do builder

**Opção recomendada:** evoluir `CriarTreinoAluno.tsx` para dual-mode:

```ts
// /treino/novo          → mode = 'create'
// /treino/:id/editar    → mode = 'edit', id = params.id
```

No `useEffect` de edit:
1. `api.getTreino(id)`
2. Pré-popular `nome`, `diasSemana`, `exerciciosTreino`
3. Submit → `api.editarTreino(id, payload)` em vez de `criarTreinoAutogestao`

CTA do botão: “Salvar alterações” vs “Criar treino”.

#### 3.3.3 Entrada na UI — `MeusTreinos.tsx`

No card do treino ativo, ações secundárias (quando status ≠ `EM_EXECUCAO`):

```
[ Editar ]  [ Excluir ]     // Excluir já pode existir ou ser adicionado no mesmo PR
[ Iniciar Ficha de Treino ]
```

- `Editar` → `navigate(/treino/${id}/editar)`
- Desabilitar/ocultar se `status === 'EM_EXECUCAO'`
- Para `ENVIADO`: permitir editar **ou** aceitar/recusar (editar não substitui aceitar)

#### 3.3.4 Client API

Já existe:
```ts
editarTreino(id, { nome?, diasSemana?, exercicios? })
```
Nada a criar no client, só usar.

### 3.4 Critérios de aceite — Feature A

- [ ] Aluno abre Meus Treinos → Editar → vê exercícios atuais
- [ ] Altera nome, dias, add/remove exercício, séries/reps → salva
- [ ] Lista atualiza sem criar treino novo
- [ ] Treino `EM_EXECUCAO` não mostra Editar (ou API rejeita)
- [ ] Histórico de execuções anteriores permanece
- [ ] Aluno não edita treino de outro aluno (401/403)

### 3.5 Estimativa Feature A

| Tarefa | Esforço |
|--------|---------|
| Dual-mode CriarTreinoAluno + rota | M |
| Botões em MeusTreinos | P |
| Teste manual / smoke | P |
| Ajuste fino API (se necessário) | P |

---

## 4. Feature B — Wizard IA com Grupos Musculares

### 4.1 Novo fluxo do wizard

| Passo | Conteúdo |
|-------|----------|
| 1 | Objetivo (inalterado) |
| 2 | Nível & dias/semana (inalterado) |
| **3** | **Grupos musculares** ← NOVO |
| 4 | Restrições articulares (era 3) |
| 5 | Resultado (era 4) |

Indicador de passos em `TreinoIA.tsx` atualizado para 5 etapas.

### 4.2 UX do passo “Grupos musculares”

**Pergunta:** “Quais grupos musculares você quer trabalhar?”

Chips multi-select (reutilizar labels de `GRUPOS_MUSCULARES` + atalhos de split):

**Atalhos de split (opcionais, exclusivos ou combináveis com chips):**
| ID | Label | Grupos implícitos |
|----|-------|-------------------|
| `FULL_BODY` | Corpo inteiro | todos principais |
| `PUSH` | Empurrar | Peito, Ombros, Braços (tríceps) |
| `PULL` | Puxar | Costas, Braços (bíceps) |
| `LEGS` | Pernas | Coxas, Panturrilhas, Glúteos* |
| `UPPER` | Superiores | Peito, Costas, Ombros, Braços |
| `LOWER` | Inferiores | Coxas, Panturrilhas, Abdômen |

\* Se “Glúteos” não existir como valor de `grupo_muscular` no banco, mapear para `Coxas` / termo real do seed.

**Chips individuais** (multi-select, mín. 1):
- Peito, Costas, Ombros, Braços, Coxas, Panturrilhas, Abdômen/Lombar, Antebraços, Cardio

**Validações UI:**
- Mínimo 1 grupo (ou 1 atalho)
- Máximo sugerido: sem hard limit; se dias=2 e 6+ grupos, backend avisa no resumo que o volume será diluído
- Botão “Próximo” desabilitado se nada selecionado

Estado:
```ts
const [gruposMusculares, setGruposMusculares] = useState<string[]>([])
const [splitPreferido, setSplitPreferido] = useState<string | null>(null)
```

Payload no `POST /treinos/ia/gerar`:
```json
{
  "objetivo": "HIPERTROFIA",
  "nivel": "INICIANTE",
  "diasPorSemana": 3,
  "restricoes": ["joelho"],
  "gruposMusculares": ["Peito", "Costas", "Coxas"],
  "splitPreferido": "FULL_BODY"
}
```

### 4.3 Backend — ranking de planos (fim do aleatório)

**Arquivo:** `PrescricaoIAService.ts` → `gerarTreinoIA`

#### 4.3.1 Input ampliado
```ts
{
  objetivo: string
  nivel: string
  diasPorSemana: number
  restricoes?: string[]
  gruposMusculares?: string[]
  splitPreferido?: string
}
```

#### 4.3.2 Algoritmo de seleção (MVP — sem LLM)

1. Buscar candidatos: `listarPlanos({ objetivo, nivel, sexo })`  
   Fallback: só objetivo → todos ativos.
2. **Score** por plano:

| Critério | Pontos |
|----------|--------|
| `dias_por_semana === diasPorSemana` | +30 |
| `\|dias_por_semana - diasPorSemana\| === 1` | +10 |
| `split_tipo` casa com `splitPreferido` (mapa PUSH→codigo PULL/LEGS/ABC…) | +25 |
| % de exercícios cujos `grupo_muscular` ∈ grupos selecionados | +0..40 (proporcional) |
| Nível exato | +15 |
| Sexo exato (não AMBOS) | +5 |
| Penalidade: exercício com `restricoes_incompativeis` ∩ restrições do aluno | −8 por ocorrência |

3. Ordenar por score desc; empate → preferir mais dias próximos + mais recente.
4. Se score top < limiar (ex.: 20) e há grupos: **montar ficha dinâmica** (fase 2) ou retornar top + aviso no resumo.

#### 4.3.3 Mapa split ↔ código/grupos

Alinhar com `seed-planos.ts`:
- `PUSH_*` → Peito, Ombros, Braços  
- `PULL_*` → Costas, Braços  
- `LEGS_*` → Coxas, Panturrilhas  
- `FULL_BODY` → cobertura ampla  
- `ABC` / `ABCD` → splits clássicos (score médio se grupos cobrem peito+costas+pernas)

#### 4.3.4 Aplicar restrições de verdade

Ao devolver sessões (ou ao `adotarPlano`):
- Para cada `PlanoSessaoExercicio` com `restricoes_incompativeis` conflitantes:
  - Preferir `alternativo_id` se existir
  - Senão, buscar exercício do mesmo `grupo_muscular` sem a restrição (query simples em `exercicios`)
- Atualizar texto de `observacoes` com lista real de substituições

#### 4.3.5 Rotas Zod

**Arquivo:** `treino-ia.routes.ts`

```ts
gruposMusculares: z.array(z.string()).min(1).optional(),
splitPreferido: z.string().optional(),
// manter diasPorSemana obrigatório no gerar
```

`classificarGrupo` pode receber os mesmos campos para consistência futura.

### 4.4 Frontend — `TreinoIA.tsx`

1. Inserir step 3 grupos; renumerar restrições→4, resultado→5.
2. Enviar `gruposMusculares` / `splitPreferido` em `handleGerarPrescricao`.
3. No resultado, exibir chips dos grupos pedidos + score/justificativa se a API devolver (`justificativa_match`).
4. Seção “planos prontos” no passo final: pré-filtrar pelo `splitPreferido` / grupos (já existe filtro manual — inicializar `grupoFiltro` a partir da escolha).

### 4.5 Resposta API enriquecida (recomendado)

```json
{
  "tipo_tarefa": "GERAR_TREINO",
  "planoId": "...",
  "nome_treino": "...",
  "grupo_treino": "HIPERTROFIA_INICIANTE_3X",
  "score_match": 78,
  "justificativa_match": "Plano escolhido por cobrir Peito/Costas/Coxas em 3 dias (ABC) e nível iniciante.",
  "grupos_solicitados": ["Peito", "Costas", "Coxas"],
  "sessoes": [...],
  "resumo_prescricao": "...",
  "observacoes": ["...", "Substituído agachamento livre → leg press (restrição joelho)."]
}
```

### 4.6 Critérios de aceite — Feature B

- [ ] Wizard tem passo de grupos musculares (mín. 1 seleção)
- [ ] Gerar com “só Pernas” retorna plano/sessões majoritariamente de pernas (não full body genérico)
- [ ] `diasPorSemana` influencia a escolha (3x ≠ 6x quando houver planos)
- [ ] Restrição joelho evita ou substitui exercícios incompatíveis
- [ ] Refazer perguntas mantém fluxo 1→5
- [ ] Sem planos compatíveis: erro claro ou fallback documentado (não silencioso)

### 4.7 Estimativa Feature B

| Tarefa | Esforço |
|--------|---------|
| UI passo grupos + renumerar wizard | M |
| Score/ranking em `PrescricaoIAService` | M–G |
| Zod + payload | P |
| Substituição por restrições | M |
| Ficha dinâmica se score baixo (fase 2) | G |

---

## 5. Ordem de Implementação Sugerida

```
Fase 1 (rápida, alto valor UX)
  └─ Feature A: dual-mode edit + botão MeusTreinos + rota

Fase 2 (corrige “IA aleatória”)
  └─ Feature B.1: passo grupos no wizard + payload
  └─ Feature B.2: ranking por score (dias + grupos + split + nível)
  └─ Feature B.3: aplicar restrições com alternativo_id

Fase 3 (opcional / polish)
  └─ Montagem dinâmica de sessões se biblioteca insuficiente
  └─ Duplicar-e-editar treino CONCLUIDO
  └─ Auditoria em treino_historico na edição
  └─ Pré-preencher wizard com perfil do aluno (objetivo_treino, nivel_treino, restricoes)
```

---

## 6. Arquivos impactados

### Feature A
| Arquivo | Mudança |
|---------|---------|
| `apps/web/src/pages/aluno/CriarTreinoAluno.tsx` | Modo create/edit |
| `apps/web/src/pages/aluno/MeusTreinos.tsx` | Botão Editar |
| `apps/web/src/App.tsx` | Rota `/treino/:id/editar` |
| `apps/api/.../treino.routes.ts` | Ajuste fino opcional |

### Feature B
| Arquivo | Mudança |
|---------|---------|
| `apps/web/src/pages/aluno/TreinoIA.tsx` | Novo step + payload |
| `apps/api/.../PrescricaoIAService.ts` | Ranking + restrições |
| `apps/api/.../treino-ia.routes.ts` | Zod input |
| `apps/web/src/lib/exerciseFilters.ts` | Reuso `GRUPOS_MUSCULARES` (ou export compartilhado) |
| `apps/api/prisma/seed-planos.ts` | Só se faltar cobertura de grupos/splits |

### Testes
| Arquivo | Escopo |
|---------|--------|
| Novo unit: score de planos | Feature B |
| Ajuste `TreinoService` / rotas se mexer em PATCH | Feature A |
| Manual: fluxos aluno create → edit → IA com pernas only | Ambos |

---

## 7. Fora de escopo (neste planejamento)

- LLM real (OpenAI etc.) — ranking determinístico é suficiente e previsível
- Edição colaborativa professor↔aluno em tempo real
- Versionamento de fichas (v1, v2)
- Edição durante `EM_EXECUCAO`
- Mudança de schema Prisma (desnecessária no MVP)

---

## 8. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Biblioteca de planos pequena → score sempre no mesmo plano | Ampliar seed; fase 3 montagem dinâmica por `grupo_muscular` dos 963 exercícios |
| Nomes de grupo no banco ≠ labels UI (`Bracos` vs `Braços`) | Normalizar com a mesma `normalize()` de `exerciseFilters.ts` no backend |
| Aluno edita ficha do professor e “perde” prescrição original | MVP aceita; fase 3 “duplicar e editar” |
| `adotarPlano` cria várias fichas e ignora grupos | Garantir que plano ranqueado já reflete grupos; ou filtrar sessões no adotar (fase 2.5) |

---

## 9. Definição de pronto (DoD)

1. Feature A em produção: aluno edita treino salvo ponta a ponta.  
2. Feature B em produção: wizard pergunta grupos; dois perfis diferentes (ex. só pernas 3x vs full body 5x) geram planos distintos e coerentes.  
3. Lint/typecheck web + api ok.  
4. AGENTS.md atualizado com:
   - rota `/treino/:id/editar`
   - passo grupos no wizard IA
   - campos `gruposMusculares` / `splitPreferido` na API de IA

---

## 10. Próximo passo

Aprovar este plano e implementar na ordem **Fase 1 → Fase 2**.  
Se quiser priorizar só a IA (dor “treino aleatório”), inverter: Fase 2 primeiro.
