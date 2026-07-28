/**
 * translate-exercises.ts
 * Traduz termos em ingles nos passos e descricoes dos exercicios para portugues.
 * Executar: npx tsx apps/api/prisma/translate-exercises.ts
 */
import { PrismaClient } from '@prisma/client'
import { translateToPt } from './translate-utils.js'

const prisma = new PrismaClient()

function countEnglishWords(text: string): string[] {
  const englishPattern = /\b(barbell|dumbbell|squat|deadlift|bench press|press|curl|row|fly|extension|raise|kickback|pulldown|pushdown|shrug|lunge|plank|dip|crossover|swing|thruster|burpee|jump|pull.?up|chin.?up|push.?up|crunch|sit.?up|calf raise|hip thrust|glute bridge|face pull|lateral raise|front raise|rear delt|good morning|clean|snatch|jerk|carry|cable|pulley|machine|kettlebell|resistance band|swiss ball|foam roller|trx|chest|shoulder|triceps?|biceps?|forearms?|quadriceps?|quads?|hamstrings?|glutes?|calves?|abs?|core|lower back|upper back|traps?|lats?|delts?|obliques?|hip flexors?|pelvis|wrist|elbow|knee|ankle|heel|toes|feet|foot|neck|head|standing|seated|lying|prone|supine|incline|decline|unilateral|bilateral|supinated|pronated|grip|concentric|eccentric|isometric|negative|repetition|repetitions|reps?|sets?|weight|movement|position|breathing|exhale|inhale|slowly|controlled|explosive|overhead)\b/gi

  const matches = text.match(englishPattern) || []
  return [...new Set(matches.map((m) => m.toLowerCase()))]
}

async function main() {
  console.log('🔍 Buscando exercicios com termos em ingles...')

  const exercicios = await prisma.exercicio.findMany({
    select: {
      id: true,
      nome: true,
      descricao_pt: true,
      passos_pt: true,
    },
  })

  let totalTranslated = 0
  let totalStepsTranslated = 0
  const changed: string[] = []

  for (const ex of exercicios) {
    const oldDesc = ex.descricao_pt || ''
    const newDesc = oldDesc ? translateToPt(oldDesc) : oldDesc

    const newPassos = (ex.passos_pt || []).map((p: string) =>
      translateToPt(p),
    )

    const descChanged = oldDesc !== newDesc
    const stepsChanged = JSON.stringify(ex.passos_pt) !== JSON.stringify(newPassos)

    if (descChanged || stepsChanged) {
      await prisma.exercicio.update({
        where: { id: ex.id },
        data: {
          descricao_pt: newDesc || null,
          passos_pt: newPassos,
        },
      })

      if (descChanged) totalTranslated++
      if (stepsChanged) totalStepsTranslated++

      const before = countEnglishWords(oldDesc)
      const stepsBefore = (ex.passos_pt || []).flatMap(countEnglishWords)
      if (before.length > 0 || stepsBefore.length > 0) {
        changed.push(
          `  ${ex.nome}: ${[...new Set([...before, ...stepsBefore])].join(', ')}`,
        )
      }
    }
  }

  console.log('')
  console.log('═══════════════════════════════════════')
  console.log('✅ Traducao concluida!')
  console.log(`   Total exercicios:     ${exercicios.length}`)
  console.log(`   Descricoes traduzidas: ${totalTranslated}`)
  console.log(`   Passos traduzidos:    ${totalStepsTranslated}`)
  if (changed.length > 0) {
    console.log(`   Termos traduzidos:`)
    changed.forEach((c) => console.log(c))
  }
  console.log('═══════════════════════════════════════')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
