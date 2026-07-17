# Planejamento: Sincronização de Exercícios do GifDoTreino

**Data:** 2026-07-17  
**Fonte:** https://www.gifdotreino.com  
**Objetivo:** Extrair todos os exercícios (incluindo mobilidade/alongamentos) e importar no banco GymApp.

---

## 1. Anatomia da Fonte

### Estrutura do Site
O site é uma SPA vanilla que carrega exercícios via `search_gifs.php`. O source está em:

| Recurso | URL |
|---------|-----|
| Lista de pastas | `GET /get_exercise_folders.php` |
| Exercícios | `GET /search_gifs.php?q=&page={n}&limit=20&folders=[]` |
| Descrição | `GET /Descrição/{nome}.txt` |
| Thumbnail | `/Thumbnails/{nome}.PNG` |
| GIF | Caminho no campo `path` do JSON |

### Pastas (16 categorias)
```
Antebraços, Bíceps, Calistenia, Cardio, Costas, Crossfit, Eretor Lombar,
Funcional e HIT, Glúteos, Mobilidade, Ombros, Panturrilhas, Peitoral,
Pernas, Trapézio, Tríceps
```

### Volume Estimado
- **~963 exercícios** (49 páginas × 20, última página com 3)
- Descrições em HTML português, 1 arquivo `.txt` por exercício

### Formato da Descrição (exemplo)
```html
<div>
<p><strong>Exercício: Abdução Lateral do Quadril com Alavanca</strong></p>
<p>Parágrafo descritivo sobre o objetivo do exercício...</p>
<p>Para executar o exercício, o praticante deve...</p>
<p>O número de repetições e séries...</p>
<p><strong>Aviso:</strong> Sempre busque a orientação...</p>
</div>
```

---

## 2. Mapeamento para o Modelo `Exercicio`

Nosso modelo atual (`apps/api/prisma/schema.prisma`):

```
model Exercicio {
  id                    String   @id @default(cuid())
  nome                  String
  grupo_muscular        String?
  equipamento           String?
  nivel                 String?
  imagem_url            String?
  gif_url               String?
  dica                  String?
  musculo_alvo          String?
  musculos_secundarios  String[]
  passos_pt             String[]
  descricao_pt          String?
  criado_em             DateTime @default(now())
  atualizado_em         DateTime @updatedAt
}
```

### Regras de Mapeamento

| Campo | Origem | Regra |
|-------|--------|-------|
| `id` | Auto | `cuid()` gerado automaticamente |
| `nome` | `name` do JSON | Usar exatamente como vem (preserva acentuação) |
| `grupo_muscular` | Pasta do `path` | Mapear nome da pasta → nosso enum de grupos |
| `equipamento` | Extrair do nome | Heurística por palavra-chave (Barra → Barra, Haltere → Halteres, etc.) |
| `imagem_url` | `thumbnail` | URL completa: `https://www.gifdotreino.com/Thumbnails/{nome}.PNG` |
| `gif_url` | `path` | URL completa: `https://www.gifdotreino.com/{path}` |
| `descricao_pt` | Arquivo `.txt` | Texto HTML limpo (remover tags `<p>`, `<strong>`, `<div>`) |
| `passos_pt` | `descricao_pt` | Extrair sentenças do parágrafo "Para executar..." como array |
| `dica` | Primeira frase da descrição | "A {nome} é um exercício que tem como objetivo..." |
| `musculo_alvo` | Heurística do nome | Ex: "Rosca" → "Bíceps", "Supino" → "Peitoral" |
| `musculos_secundarios` | Heurística | Array vazio por padrão (preencher manualmente depois) |
| `nivel` | null | Não disponível na fonte |

### Mapeamento de Pasta → Grupo Muscular GymApp

```typescript
const PASTA_TO_GRUPO: Record<string, string> = {
  'Antebraços':      'Antebraccos',
  'Bíceps':          'Bracos',
  'Calistenia':      'Peso Corporal',   // equipamento, não grupo
  'Cardio':          'Cardio',
  'Costas':          'Costas',
  'Crossfit':        'Peso Corporal',   // equipamento, não grupo
  'Eretor Lombar':   'Abdomen / Lombar',
  'Funcional e HIT': 'Peso Corporal',   // equipamento, não grupo
  'Glúteos':         'Coxas',
  'Mobilidade':      'Peso Corporal',   // categoria de alongamento
  'Ombros':          'Ombros',
  'Panturrilhas':    'Panturrilhas / Tibiais',
  'Peitoral':        'Peito',
  'Pernas':          'Coxas',
  'Trapézio':        'Costas',
  'Tríceps':         'Bracos',
}
```

**Nota sobre equipamento inferido:** Se a pasta for Calistenia/Crossfit/Funcional e HIT, sugerir `equipamento: 'Peso Corporal'`. Outros exercícios tentam extrair do nome (Barra, Halteres, Polia/Cabo, Máquina, etc).

---

## 3. Estratégia de Crawling

### Abordagem: Script TypeScript dedicado

Criar `apps/api/prisma/sync-gifdotreino.ts` que:

1. **Coleta**: Faz GET paginado no `search_gifs.php` (49 páginas, 20/página, ~1s delay entre páginas)
2. **Descrições**: Para cada exercício, faz GET no `Descrição/{nome}.txt` (com delay para não sobrecarregar)
3. **Processa**: Aplica mapeamento e parsing HTML → texto limpo
4. **Importa**: `upsert` por `nome` (nome é único na prática) — se existe, atualiza campos; se não, cria

### Rate Limiting
- **Respeitar o servidor**: 500ms delay entre requests de exercícios, 200ms entre descrições
- **Total estimado**: ~963 exercícios + ~963 descrições = ~1,926 requests
- **Tempo estimado**: ~15-20 minutos para execução completa
- **Paralelismo**: 5 requisições simultâneas em pool (para acelerar sem abusar)

### Fallback
- Se descrição não existir (404), deixar `descricao_pt = null`
- Se thumbnail não existir, usar GIF como fallback
- Log de erros no console para revisão posterior

---

## 4. Script (Pseudocódigo)

```typescript
// apps/api/prisma/sync-gifdotreino.ts

import { prisma } from '../src/infrastructure/database/prisma.js'

const BASE = 'https://www.gifdotreino.com'
const DELAY = 500 // ms entre requests
const DELAY_DESC = 200 // ms entre descrições
const CONCURRENCY = 5

interface RawExercise {
  name: string
  path: string       // "Exercicios/Peitoral/Supino reto.gif"
  thumbnail: string  // "thumbnails/Supino reto.png"
  description: string
}

function extractFolder(path: string): string {
  const parts = path.split('/')
  // "Exercicios/Peitoral/Supino.gif" → "Peitoral"
  return parts[1] || 'Outros'
}

function mapToGrupoMuscular(folder: string): string | null {
  // usa PASTA_TO_GRUPO acima
}

function inferEquipamento(nome: string, folder: string): string | null {
  if (['Calistenia', 'Crossfit', 'Funcional e HIT', 'Mobilidade'].includes(folder))
    return 'Peso Corporal'
  if (/barra/i.test(nome)) return 'Barra'
  if (/halter/i.test(nome)) return 'Halteres'
  if (/cabo|polia/i.test(nome)) return 'Polia'
  if (/máquina|alavanca/i.test(nome)) return 'Máquina'
  if (/faixa|elástic/i.test(nome)) return 'Elásticos'
  if (/kettlebell/i.test(nome)) return 'Kettlebell'
  return null
}

function parseDescricao(html: string): {
  descricao_pt: string
  dica: string | null
  passos_pt: string[]
} {
  // Remove tags HTML
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  // Remove linha "Exercício: Nome"
  const clean = text.replace(/^Exercício:\s*[^.]+\.?\s*/, '')
  // Remove "Aviso: ..."
  const withoutAviso = clean.replace(/Aviso:.*$/s, '').trim()

  // Passos: extrai sentenças começando com "Para executar"
  const passosMatch = withoutAviso.match(/Para executar.*?(?=O número|$)/s)
  const passos_pt = passosMatch
    ? passosMatch[0].split(/\.\s+/).filter(s => s.length > 10)
    : []

  return {
    descricao_pt: withoutAviso,
    dica: withoutAviso.split('. ')[0] || null,
    passos_pt,
  }
}

async function fetchAllExercises(): Promise<RawExercise[]> {
  const all: RawExercise[] = []
  let page = 1
  while (true) {
    const res = await fetch(`${BASE}/search_gifs.php?q=&page=${page}&limit=20&folders=[]`)
    const data: RawExercise[] = await res.json()
    if (data.length === 0) break
    all.push(...data)
    page++
    await sleep(DELAY)
  }
  return all
}

async function fetchDescription(name: string): Promise<string | null> {
  const url = `${BASE}/Descrição/${encodeURIComponent(name)}.txt`
  const res = await fetch(url)
  if (!res.ok) return null
  return res.text()
}

async function main() {
  console.log('🔍 Buscando todos os exercícios...')
  const exercises = await fetchAllExercises()
  console.log(`📦 ${exercises.length} exercícios encontrados`)

  let imported = 0, updated = 0, skipped = 0

  // Processa em lotes de CONCURRENCY
  for (let i = 0; i < exercises.length; i += CONCURRENCY) {
    const batch = exercises.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (ex) => {
      const folder = extractFolder(ex.path)
      const grupoMuscular = mapToGrupoMuscular(folder)
      const equipamento = inferEquipamento(ex.nome, folder)

      const descHtml = await fetchDescription(ex.nome)
      const { descricao_pt, dica, passos_pt } = descHtml ? parseDescricao(descHtml) : { descricao_pt: null, dica: null, passos_pt: [] }

      const data = {
        nome: ex.nome,
        grupo_muscular: grupoMuscular,
        equipamento,
        imagem_url: `${BASE}/${ex.thumbnail}`,
        gif_url: `${BASE}/${ex.path}`,
        descricao_pt,
        dica,
        passos_pt,
      }

      const existing = await prisma.exercicio.findFirst({ where: { nome: ex.nome } })

      if (existing) {
        await prisma.exercicio.update({ where: { id: existing.id }, data })
        updated++
      } else {
        await prisma.exercicio.create({ data })
        imported++
      }
    }))

    console.log(`  Progresso: ${Math.min(i + CONCURRENCY, exercises.length)}/${exercises.length} (novos: ${imported}, atualizados: ${updated})`)
    await sleep(DELAY_DESC)
  }

  console.log(`✅ Concluído: ${imported} importados, ${updated} atualizados`)
}

main().catch(console.error)
```

---

## 5. Pré-requisitos

### Campo `musculos_secundarios` no Schema

O campo `musculos_secundarios` é `String[]` no Prisma. Para PostgreSQL, isso requer:
- Se for array nativo (`String[]`), o Prisma mapeia para `TEXT[]` no PG. Precisa verificar se a migration atual suporta isso.
- Alternativa: usar `String` e armazenar como JSON.

**Verificar** se o campo já é `String[]` no schema atual. Caso contrário, precisará de migration.

### Execução

```bash
npx tsx apps/api/prisma/sync-gifdotreino.ts
```

O script precisa de acesso ao banco (`DATABASE_URL` configurado) e rede para acessar `gifdotreino.com`.

---

## 6. Alongamentos

A pasta **Mobilidade** contém exercícios de alongamento e mobilidade articular. Estes são importados como exercícios normais com `grupo_muscular: 'Peso Corporal'` e `equipamento: 'Peso Corporal'`. Não há distinção estrutural entre "exercício" e "alongamento" no site — a categorização fica no nome/grupo.

Para referência futura, podemos adicionar uma tag `tipo: 'ALONGAMENTO'` se quisermos diferenciar.

---

## 7. Plano de Execução

| Etapa | Ação | Duração estimada |
|-------|------|-----------------|
| 1 | Verificar schema: `musculos_secundarios` suporta `String[]`? | 5 min |
| 2 | Criar `sync-gifdotreino.ts` com mapeamentos | 30 min |
| 3 | Executar script local apontando para banco Railway (ou local) | 20 min |
| 4 | Validar alguns exercícios via frontend | 10 min |
| 5 | Commit + deploy (se precisar de migration) | 10 min |

---

## 8. Riscos

- **Thumbnails quebrados**: Alguns thumbnails podem não existir no servidor → `onerror` fallback para o GIF
- **Descrições faltando**: ~10-20% dos exercícios podem não ter `.txt` → `descricao_pt = null`
- **Timeout de rede**: Com 963 exercícios, o script pode levar 20 min → executar em ambiente estável
- **Duplicatas de nome**: O site pode ter exercícios com mesmo nome em pastas diferentes → usar `upsert` por nome
