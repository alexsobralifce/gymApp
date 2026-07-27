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

function cleanAndTranslateStep(text: string): string {
  if (!text || typeof text !== 'string') return ''

  let s = text.trim()

  const phraseRules: [RegExp, string][] = [
    [/Lower seus body dentro de a squat posicao/gi, 'Abaixe o corpo na posição de agachamento'],
    [/Lower your body into a squat position/gi, 'Abaixe o corpo na posição de agachamento'],
    [/Lower your body/gi, 'Abaixe o corpo'],
    [/lower your body/gi, 'abaixe o corpo'],
    [/Lower seus body/gi, 'Abaixe o corpo'],
    [/lower seus body/gi, 'abaixe o corpo'],
    [/dentro de a squat posicao/gi, 'na posição de agachamento'],
    [/into a squat position/gi, 'na posição de agachamento'],
    [/squat posicao/gi, 'posição de agachamento'],
    [/squat posição/gi, 'posição de agachamento'],
    [/tracking over seus toes/gi, 'alinhados na direção das pontas dos pés'],
    [/tracking over your toes/gi, 'alinhados na direção das pontas dos pés'],
    [/tracking over/gi, 'alinhados com'],
    [/reach o bottom of o squat/gi, 'atingir o ponto mais baixo do agachamento'],
    [/reach the bottom of the squat/gi, 'atingir o ponto mais baixo do agachamento'],
    [/reach o bottom of/gi, 'atingir o ponto mais baixo de'],
    [/the bottom of the/gi, 'o ponto mais baixo do'],
    [/o bottom of o/gi, 'o ponto mais baixo do'],
    [/bottom of/gi, 'ponto mais baixo do'],
    [/explosively drive through suas pernas/gi, 'empurre o chão com força total pelas pernas'],
    [/explosively drive through your legs/gi, 'empurre o chão com força total pelas pernas'],
    [/drive through suas pernas/gi, 'empurre o chão pelas pernas'],
    [/drive through your legs/gi, 'empurre o chão pelas pernas'],
    [/push a barra overhead/gi, 'empurre a barra para cima da cabeça'],
    [/push the bar overhead/gi, 'empurre a barra para cima da cabeça'],
    [/reaches its peak/gi, 'atingir o ponto mais alto'],
    [/reaches seu peak/gi, 'atingir o ponto mais alto'],
    [/peak/gi, 'ponto mais alto'],
    [/drop dentro de a split posicao/gi, 'entre rapidamente na posição de afundo'],
    [/drop into a split position/gi, 'entre rapidamente na posição de afundo'],
    [/split posicao/gi, 'posição de afundo'],
    [/split posição/gi, 'posição de afundo'],
    [/one foot para frente e one foot back/gi, 'um pé à frente e o outro pé atrás'],
    [/one foot forward and one foot back/gi, 'um pé à frente e o outro pé atrás'],
    [/one foot/gi, 'um pé'],
    [/Catch a barra overhead/gi, 'Sustente a barra acima da cabeça'],
    [/catch the bar overhead/gi, 'Sustente a barra acima da cabeça'],
    [/catch a barra/gi, 'Sustente a barra'],
    [/com seus bracos completamente estendido/gi, 'com os braços completamente estendidos'],
    [/com seus braços completamente estendidos/gi, 'com os braços completamente estendidos'],
    [/costas knee ligeiramente touching o chao/gi, 'joelho de trás quase tocando o chão'],
    [/back knee slightly touching the floor/gi, 'joelho de trás quase tocando o chão'],
    [/touching o chao/gi, 'tocando o chão'],
    [/touching the floor/gi, 'tocando o chão'],
    [/Stand up from o split posicao/gi, 'Fique de pé unindo os pés'],
    [/Stand up from the split position/gi, 'Fique de pé unindo os pés'],
    [/trazendo seus pes back juntos/gi, 'trazendo os pés juntos de volta'],
    [/bringing your feet back together/gi, 'trazendo os pés juntos de volta'],
    [/Lower a barra back to seus ombros/gi, 'Abaixe a barra de volta para a altura dos ombros'],
    [/Lower the bar back to your shoulders/gi, 'Abaixe a barra de volta para os ombros'],
    [/Repita pelo numero desejado de repeticoes/gi, 'Repita pelo número de repetições prescrito'],
    [/Repita pelo numero recomendado de repeticoes/gi, 'Repita pelo número de repetições recomendado'],
  ]

  for (const [pattern, replacement] of phraseRules) {
    s = s.replace(pattern, replacement)
  }

  const wordReplacements: [RegExp, string][] = [
    [/\bseus body\b/gi, 'seu corpo'],
    [/\byour body\b/gi, 'seu corpo'],
    [/\bbody\b/gi, 'corpo'],
    [/\bsquat\b/gi, 'agachamento'],
    [/\bposicao\b/gi, 'posição'],
    [/\bposiçoes\b/gi, 'posições'],
    [/\bpes\b/gi, 'pés'],
    [/\bvoce\b/gi, 'você'],
    [/\bvoce reach\b/gi, 'você atingir'],
    [/\breach\b/gi, 'atingir'],
    [/\bbottom of\b/gi, 'ponto mais baixo do'],
    [/\bo bottom of o\b/gi, 'o ponto mais baixo do'],
    [/\bo bottom\b/gi, 'o ponto mais baixo'],
    [/\bbottom\b/gi, 'fundo'],
    [/\b overhead\b/gi, ' acima da cabeça'],
    [/\boverhead\b/gi, 'acima da cabeça'],
    [/\b peak\b/gi, ' topo do movimento'],
    [/\bsplit\b/gi, 'afundo'],
    [/\bone foot\b/gi, 'um pé'],
    [/\bbracos\b/gi, 'braços'],
    [/\b bracos \b/gi, ' braços '],
    [/\bestendido\b/gi, 'estendidos'],
    [/\bcostas knee\b/gi, 'joelho de trás'],
    [/\bknee\b/gi, 'joelho'],
    [/\bknees\b/gi, 'joelhos'],
    [/\bchao\b/gi, 'chão'],
    [/\btoes\b/gi, 'pontas dos pés'],
    [/\bligeiramente\b/gi, 'levemente'],
    [/\brepeticoes\b/gi, 'repetições'],
    [/\brepeticao\b/gi, 'repetição'],
    [/\bnumero\b/gi, 'número'],
    [/\bexercicio\b/gi, 'exercício'],
    [/\bexercicios\b/gi, 'exercícios'],
    [/\bmaquina\b/gi, 'máquina'],
    [/\b maquina \b/gi, ' máquina '],
    [/\bmaos\b/gi, 'mãos'],
    [/\b cabeca \b/gi, ' cabeça '],
    [/\bcabeca\b/gi, 'cabeça'],
    [/\bmusculo\b/gi, 'músculo'],
    [/\bmusculos\b/gi, 'músculos'],
    [/\b abdomen \b/gi, ' abdômen '],
    [/\babdomen\b/gi, 'abdômen'],
    [/\b contrast \b/gi, ' contração '],
    [/\bcontracao\b/gi, 'contração'],
    [/\bextensao\b/gi, 'extensão'],
    [/\bflexao\b/gi, 'flexão'],
    [/\belevação\b/gi, 'elevação'],
    [/\belevacao\b/gi, 'elevação'],
    [/\b atencao \b/gi, ' atenção '],
    [/\batencao\b/gi, 'atenção'],
    [/\b informacao \b/gi, ' informação '],
    [/\b informacoes \b/gi, ' informações '],
    [/\b elasticos \b/gi, ' elásticos '],
    [/\belasticos\b/gi, 'elásticos'],
    [/\b elastic \b/gi, ' elástico '],
    [/\b elastico \b/gi, ' elástico '],
    [/\belastico\b/gi, 'elástico'],
    [/\bbrac \b/gi, 'braço '],
    [/\b antebraccos \b/gi, ' antebraços '],
    [/\bantebraccos\b/gi, 'antebraços'],
    [/\bgluteos\b/gi, 'glúteos'],
    [/\b quadriceps \b/gi, ' quadríceps '],
    [/\bquadriceps\b/gi, 'quadríceps'],
    [/\btrapezio\b/gi, 'trapézio']
  ]

  for (const [pattern, replacement] of wordReplacements) {
    s = s.replace(pattern, replacement)
  }

  s = s.replace(/\s+/g, ' ').trim()
  if (s.length > 0) {
    s = s.charAt(0).toUpperCase() + s.slice(1)
    if (!/[.!?]$/.test(s)) s += '.'
  }
  return s
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

  const rawSentences = clean.split(/\.\s+/).filter((s) => s.length > 15)
  const sentences = rawSentences.map(cleanAndTranslateStep)
  const passosIdx = rawSentences.findIndex((s) => /para execut|praticante|posicione|deite|sente|fique em pé|segure|comece|inicie|ajuste|mantenha|realize|eleve|flexione|estenda|coloque|apoie|deve|é importante|o movimento/i.test(s.toLowerCase()))

  return {
    descricao_pt: cleanAndTranslateStep(clean) || null,
    dica: sentences[0] || null,
    passos_pt: passosIdx >= 0 ? sentences.slice(passosIdx) : sentences,
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
