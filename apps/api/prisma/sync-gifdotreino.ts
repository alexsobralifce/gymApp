/**
 * sync-gifdotreino.ts
 * Sincroniza todos os exercícios do https://www.gifdotreino.com
 * Executar: npx tsx apps/api/prisma/sync-gifdotreino.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = 'https://www.gifdotreino.com'
const DELAY = 400
const DESC_DELAY = 150
const CONCURRENCY = 6

const PASTA_TO_GRUPO: Record<string, string> = {
  'Antebraços': 'Antebraccos',
  'Bíceps': 'Bracos',
  'Calistenia': 'Peso Corporal',
  'Cardio': 'Cardio',
  'Costas': 'Costas',
  'Crossfit': 'Peso Corporal',
  'Eretor Lombar': 'Abdomen / Lombar',
  'Funcional e HIT': 'Peso Corporal',
  'Glúteos': 'Coxas',
  'Mobilidade': 'Peso Corporal',
  'Ombros': 'Ombros',
  'Panturrilhas': 'Panturrilhas / Tibiais',
  'Peitoral': 'Peito',
  'Pernas': 'Coxas',
  'Trapézio': 'Costas',
  'Tríceps': 'Bracos',
}

interface RawExercise {
  name: string
  path: string
  thumbnail: string
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function extractFolder(p: string): string {
  const parts = p.split('/')
  return parts[1] || 'Outros'
}

function mapToGrupoMuscular(folder: string): string | null {
  return PASTA_TO_GRUPO[folder] || null
}

function inferEquipamento(nome: string, folder: string): string | null {
  if (/faixa|elástic/i.test(nome)) return 'Elásticos'
  if (/barra/i.test(nome) && !/halter/i.test(nome)) return 'Barra'
  if (/halter/i.test(nome)) return 'Halteres'
  if (/cabo|polia/i.test(nome)) return 'Polia'
  if (/máquina|alavanca/i.test(nome)) return 'Máquina'
  if (/kettlebell/i.test(nome)) return 'Kettlebell'
  if (/bola|pilates/i.test(nome)) return 'Bola de Pilates'
  if (['Calistenia', 'Crossfit', 'Funcional e HIT', 'Mobilidade'].includes(folder))
    return 'Peso Corporal'
  return null
}

function inferMusculoAlvo(nome: string): string | null {
  const n = nome.toLowerCase()
  if (/rosca|bíceps|brac.*curl|concentrad/i.test(n)) return 'Bíceps'
  if (/tríceps|francesa|testa|coice|pulley.*tr/i.test(n)) return 'Tríceps'
  if (/supino|peck|peitoral|crucifixo|flexão(?!.*perna)/i.test(n)) return 'Peitoral'
  if (/puxada|remada|barra.*fixa|pulldown|pull.?up|costas|dorsal/i.test(n)) return 'Costas'
  if (/ombro|deltoid|elevação.*lateral|desenvolvimento|arnold/i.test(n)) return 'Ombros'
  if (/agachamento|leg press|cadeira.*extens|flexora|afundo|lunge|agacha/i.test(n)) return 'Coxas'
  if (/panturrilha|gêmeos|tibial/i.test(n)) return 'Panturrilhas'
  if (/abdomi|prancha|crunch|sit.?up/i.test(n)) return 'Abdômen'
  if (/glúteo|glute|ponte|coice|abduç|aduç/i.test(n)) return 'Glúteos'
  if (/trapézio|encolhimento|shrug/i.test(n)) return 'Trapézio'
  if (/antebraç|punho|wrist/i.test(n)) return 'Antebraços'
  if (/cardio|esteira|bicicleta|corrida|eliptic|burpee/i.test(n)) return 'Cardio'
  if (/lombar|eretor|extensão.*tronco/i.test(n)) return 'Lombar'
  return null
}

function parseDescricao(html: string): {
  descricao_pt: string | null
  dica: string | null
  passos_pt: string[]
} {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return { descricao_pt: null, dica: null, passos_pt: [] }

  const clean = text
    .replace(/^Exercício:\s*[^.]+\.?\s*/i, '')
    .replace(/Aviso:\s*.*$/s, '')
    .trim()

  const sentences = clean.split(/\.\s+/).filter((s) => s.length > 15)
  const passosIdx = sentences.findIndex((s) => /para execut|praticante|posicione|deite|sente|fique em pé|segure|comece|inicie|ajuste|mantenha|realize|eleve|flexione|estenda|coloque|apoie|deve|é importante|o movimento/i.test(s.toLowerCase()))

  return {
    descricao_pt: clean || null,
    dica: sentences[0] || null,
    passos_pt: passosIdx >= 0 ? sentences.slice(passosIdx) : [],
  }
}

async function fetchAllExercises(): Promise<RawExercise[]> {
  const all: RawExercise[] = []
  let page = 1

  while (true) {
    const url = `${BASE}/search_gifs.php?q=&page=${page}&limit=20&folders=[]`
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`  Erro HTTP ${res.status} na página ${page}`)
      break
    }
    const data: RawExercise[] = await res.json()
    if (!Array.isArray(data) || data.length === 0) break
    all.push(...data)
    page++
    await sleep(DELAY)
  }

  return all
}

async function fetchDescription(name: string): Promise<string | null> {
  try {
    const url = `${BASE}/Descrição/${encodeURIComponent(name)}.txt`
    const res = await fetch(url)
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

async function main() {
  console.log('🔍 Buscando exercícios do GifDoTreino...')
  const exercises = await fetchAllExercises()
  console.log(`📦 ${exercises.length} exercícios encontrados`)

  let novos = 0
  let atualizados = 0
  let semDescricao = 0
  const erros: string[] = []

  for (let i = 0; i < exercises.length; i += CONCURRENCY) {
    const batch = exercises.slice(i, i + CONCURRENCY)

    await Promise.all(
      batch.map(async (ex) => {
        try {
          const folder = extractFolder(ex.path)
          const grupoMuscular = mapToGrupoMuscular(folder)
          const equipamento = inferEquipamento(ex.name, folder)
          const musculoAlvo = inferMusculoAlvo(ex.name)

          const descHtml = await fetchDescription(ex.name)
          await sleep(DESC_DELAY)

          if (!descHtml) semDescricao++

          const { descricao_pt, dica, passos_pt } = descHtml
            ? parseDescricao(descHtml)
            : { descricao_pt: null, dica: null, passos_pt: [] }

          const data = {
            nome: ex.name,
            grupo_muscular: grupoMuscular,
            equipamento,
            musculo_alvo: musculoAlvo,
            imagem_url: `${BASE}/${ex.thumbnail}`,
            gif_url: `${BASE}/${ex.path}`,
            descricao_pt,
            dica,
            passos_pt,
          }

          const existing = await prisma.exercicio.findFirst({
            where: { nome: ex.name },
          })

          if (existing) {
            await prisma.exercicio.update({
              where: { id: existing.id },
              data,
            })
            atualizados++
          } else {
            await prisma.exercicio.create({ data })
            novos++
          }
        } catch (err: any) {
          erros.push(`${ex.name}: ${err.message?.substring(0, 80)}`)
          if (erros.length <= 3) {
            console.error(`\n  ❌ ERRO [${ex.name}]:`, err.message?.substring(0, 200))
          }
        }
      }),
    )

    const feito = Math.min(i + CONCURRENCY, exercises.length)
    process.stdout.write(
      `\r  Progresso: ${feito}/${exercises.length} | Novos: ${novos} | Atualizados: ${atualizados} | Sem desc: ${semDescricao}`,
    )
    await sleep(DELAY)
  }

  console.log('\n')
  console.log('═══════════════════════════════════')
  console.log(`✅ Concluído!`)
  console.log(`   Novos:        ${novos}`)
  console.log(`   Atualizados:  ${atualizados}`)
  console.log(`   Sem descrição: ${semDescricao}`)
  console.log(`   Total no DB:  ${await prisma.exercicio.count()}`)
  if (erros.length > 0) {
    console.log(`   Erros:        ${erros.length}`)
    console.log('   (use --verbose para ver detalhes)')
  }
  console.log('═══════════════════════════════════')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
