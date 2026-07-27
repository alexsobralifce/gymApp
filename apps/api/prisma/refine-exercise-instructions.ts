/**
 * refine-exercise-instructions.ts
 *
 * Converte todas as instruções (passos_pt, dica, descricao_pt) dos exercícios no banco de dados
 * para um português fluido, simples e didático de Personal Trainer, eliminando portunglês e faltas de acentuação.
 *
 * Executar: npx tsx apps/api/prisma/refine-exercise-instructions.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Motor de Tradução e Lapidação Didática (Personal Trainer)
 */
export function cleanAndTranslateStep(text: string): string {
  if (!text || typeof text !== 'string') return ''

  let s = text.trim()

  // 1. Frases completas e padrões de Portunglês / Inglês recorrentes
  const phraseRules: [RegExp, string][] = [
    // Agachamentos e impulsos
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

    // Postura e alinhamento inicial
    [/lie flat on your back on the floor/gi, 'Deite-se de costas no chão com a coluna apoiada'],
    [/lie flat on your back/gi, 'Deite-se de costas no chão'],
    [/lie flat on a bench/gi, 'Deite-se em um banco reto'],
    [/lie on your back/gi, 'Deite-se de costas'],
    [/lie on your stomach/gi, 'Deite-se de bruços'],
    [/face down/gi, 'de bruços'],
    [/stand up straight/gi, 'Fique de pé com a postura ereta'],
    [/stand upright/gi, 'Fique de pé com a postura ereta'],
    [/stand with your feet shoulder.?width apart/gi, 'Fique de pé com os pés afastados na largura dos ombros'],
    [/stand with feet shoulder-width apart/gi, 'Fique de pé com os pés na largura dos ombros'],
    [/stand with your feet hip.?width apart/gi, 'Fique de pé com os pés na largura do quadril'],
    [/sit on a flat bench/gi, 'Sente-se em um banco reto'],
    [/sit upright/gi, 'Sente-se com a coluna ereta'],
    [/get into a push.?up position/gi, 'Posicione-se em prancha de flexão de braço'],
    [/start in a plank position/gi, 'Comece na posição de prancha'],

    // Pegada e execução
    [/hold a dumbbell in each hand/gi, 'Segure um haltere em cada mão'],
    [/hold a dumbbell/gi, 'Segure um haltere'],
    [/hold a kettlebell/gi, 'Segure um kettlebell'],
    [/grasp the bar/gi, 'Segure a barra'],
    [/with an overhand grip/gi, 'com pegada pronada (palmas para a frente/baixo)'],
    [/with an underhand grip/gi, 'com pegada supinada (palmas para você/cima)'],
    [/with a neutral grip/gi, 'com pegada neutra (palmas viradas uma para a outra)'],
    [/slightly wider than shoulder.?width/gi, 'ligeiramente mais aberto que a largura dos ombros'],
    [/shoulder.?width apart/gi, 'na largura dos ombros'],
    [/keep your back straight/gi, 'Mantenha as costas retas'],
    [/keep your spine neutral/gi, 'Mantenha a coluna neutra'],
    [/keep your core tight/gi, 'Mantenha o abdômen firme e contraído'],
    [/keep your chest up/gi, 'Mantenha o peito aberto e erguido'],
    [/keep your elbows close to your body/gi, 'Mantenha os cotovelos próximos ao corpo'],
    [/keep your knees slightly bent/gi, 'Mantenha os joelhos ligeiramente flexionados'],
    [/squeeze your glutes/gi, 'Contraia bem os glúteos'],
    [/squeeze your shoulder blades/gi, 'Aproxime bem as escápulas'],
    [/retract your shoulder blades/gi, 'Retraia as escápulas'],

    // Verbos de ação e controle
    [/slowly lower/gi, 'Abaixe suavemente'],
    [/slowly lift/gi, 'Eleve suavemente'],
    [/slowly raise/gi, 'Eleve suavemente'],
    [/slowly bend/gi, 'Flexione lentamente'],
    [/slowly extend/gi, 'Estenda lentamente'],
    [/return to the starting position/gi, 'Retorne à posição inicial'],
    [/return to start/gi, 'Volte à posição inicial'],
    [/bend your knees/gi, 'Flexione os joelhos'],
    [/bend your elbows/gi, 'Flexione os cotovelos'],
    [/extend your arms fully/gi, 'Estenda completamente os braços'],
    [/straighten your arms/gi, 'Estique os braços'],
    [/straighten your legs/gi, 'Estique as pernas'],
    [/pause at the top/gi, 'Faça uma breve pausa no topo do movimento'],
    [/hold the contraction/gi, 'Sustente a contração por um instante'],
    [/do not lock your elbows/gi, 'Não trave completamente os cotovelos'],
    [/do not lock your knees/gi, 'Não trave completamente os joelhos'],
    [/avoid arching your back/gi, 'Evite arquear excessivamente as costas'],
    [/avoid swinging/gi, 'Evite usar o balanço do corpo'],
    [/breathe in/gi, 'Inspire ao descer/preparar'],
    [/breathe out/gi, 'Expire ao fazer a força'],
    [/push through your heels/gi, 'Empurre o chão através dos calcanhares'],
    [/drive through your heels/gi, 'Faça força nos calcanhares']
  ]

  for (const [pattern, replacement] of phraseRules) {
    s = s.replace(pattern, replacement)
  }

  // 2. Vocabulário de palavras isoladas ou vestígios de termos em inglês
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
    [/\btrapezio\b/gi, 'trapézio'],
    [/\b halteres \b/gi, ' halteres '],
    [/\b haltere \b/gi, ' haltere '],
    [/\b barra \b/gi, ' barra ']
  ]

  for (const [pattern, replacement] of wordReplacements) {
    s = s.replace(pattern, replacement)
  }

  // 3. Ajustes de pontuação e primeira letra maiúscula
  s = s.replace(/\s+/g, ' ').trim()
  if (s.length > 0) {
    s = s.charAt(0).toUpperCase() + s.slice(1)
    if (!/[.!?]$/.test(s)) {
      s += '.'
    }
  }

  return s
}

async function run() {
  console.log('🏋️‍♂️ Iniciando refinamento didático de exercícios...')

  const exercicios = await prisma.exercicio.findMany()
  console.log(`Encontrados ${exercicios.length} exercícios no banco de dados PostgreSQL.`)

  let atualizados = 0

  for (let i = 0; i < exercicios.length; i++) {
    const ex = exercicios[i]

    const passosRefinados = (ex.passos_pt || []).map(cleanAndTranslateStep)
    const dicaRefinada = ex.dica ? cleanAndTranslateStep(ex.dica) : null
    const descricaoRefinada = ex.descricao_pt ? cleanAndTranslateStep(ex.descricao_pt) : null

    await prisma.exercicio.update({
      where: { id: ex.id },
      data: {
        passos_pt: passosRefinados,
        dica: dicaRefinada,
        descricao_pt: descricaoRefinada,
      },
    })

    atualizados++
    if (atualizados % 100 === 0 || atualizados === exercicios.length) {
      console.log(`Progresso: ${atualizados}/${exercicios.length} exercícios refinados.`)
    }
  }

  console.log(`\n✅ Sucesso! Todos os ${atualizados} exercícios foram refinados para Português didático de Personal Trainer.`)
  await prisma.$disconnect()
}

run().catch((err) => {
  console.error('Erro ao refinar exercícios:', err)
  prisma.$disconnect()
  process.exit(1)
})
