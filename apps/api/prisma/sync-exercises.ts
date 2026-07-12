import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const exerciseTranslations: Record<string, string> = {
  'cable lateral raise': 'Elevação Lateral na Polia',
  'dumbbell lateral raise': 'Elevação Lateral com Halteres',
  'barbell curl': 'Rosca Direta com Barra',
  'dumbbell curl': 'Rosca Bíceps com Halteres',
  'hammer curl': 'Rosca Martelo',
  'concentration curl': 'Rosca Concentrada',
  'preacher curl': 'Rosca Scott',
  'barbell bench press': 'Supino Reto com Barra',
  'dumbbell bench press': 'Supino Reto com Halteres',
  'incline barbell bench press': 'Supino Inclinado com Barra',
  'incline dumbbell bench press': 'Supino Inclinado com Halteres',
  'decline barbell bench press': 'Supino Declinado com Barra',
  'decline dumbbell bench press': 'Supino Declinado com Halteres',
  'pushups': 'Flexões de Braço',
  'push-up': 'Flexão de Braço',
  'pullups': 'Barra Fixa',
  'pull-up': 'Barra Fixa',
  'chinups': 'Barra Fixa Supinada',
  'chin-up': 'Barra Fixa Supinada',
  'dips': 'Paralelas',
  'chest dip': 'Paralelas para Peito',
  'tricep dip': 'Paralelas para Tríceps',
  'leg press': 'Leg Press',
  'barbell squat': 'Agachamento Livre com Barra',
  'goblet squat': 'Agachamento Goblet',
  'bulgarian split squat': 'Agachamento Búlgaro',
  'romanian deadlift': 'Levantamento Terra Romeno (RDL)',
  'stiff-legged deadlift': 'Stiff com Barra',
  'deadlift': 'Levantamento Terra',
  'lying leg curl': 'Mesa Flexora',
  'seated leg curl': 'Cadeira Flexora',
  'leg extension': 'Cadeira Extensora',
  'calf raise': 'Elevação de Panturrilha',
  'standing calf raise': 'Panturrilha em Pé',
  'seated calf raise': 'Panturrilha Sentado',
  'cable crossover': 'Crossover na Polia',
  'pec deck': 'Voador / Pec Deck',
  'chest fly': 'Crucifixo',
  'dumbbell fly': 'Crucifixo com Halteres',
  'cable fly': 'Crucifixo na Polia',
  'barbell row': 'Remada Curvada com Barra',
  'dumbbell row': 'Remada Unilateral (Serrote)',
  'one arm dumbbell row': 'Remada Unilateral (Serrote)',
  't-bar row': 'Remada Cavalinho',
  'seated cable row': 'Remada Baixa na Polia',
  'lat pulldown': 'Puxada Aberta no Pulley',
  'cable pulldown': 'Puxada na Polia',
  'face pull': 'Face Pull',
  'dumbbell shoulder press': 'Desenvolvimento com Halteres',
  'barbell shoulder press': 'Desenvolvimento com Barra',
  'overhead press': 'Desenvolvimento Militar',
  'military press': 'Desenvolvimento Militar',
  'arnold press': 'Desenvolvimento Arnold',
  'front raise': 'Elevação Frontal',
  'dumbbell front raise': 'Elevação Frontal com Halteres',
  'cable front raise': 'Elevação Frontal na Polia',
  'shrugs': 'Encolhimento de Ombros',
  'barbell shrug': 'Encolhimento com Barra',
  'dumbbell shrug': 'Encolhimento com Halteres',
  'tricep extension': 'Extensão de Tríceps',
  'overhead tricep extension': 'Tríceps Testa',
  'french press': 'Tríceps Francês',
  'cable pushdown': 'Tríceps Pulley',
  'rope pushdown': 'Tríceps Corda',
  'skull crusher': 'Tríceps Testa',
  'plank': 'Prancha Abdominal',
  'side plank': 'Prancha Lateral',
  'crunches': 'Abdominal Crunch',
  'crunch': 'Abdominal Crunch',
  'sit-ups': 'Abdominal Remador',
  'sit-up': 'Abdominal Remador',
  'hanging knee raise': 'Elevação de Joelhos Suspenso',
  'hanging leg raise': 'Elevação de Pernas Suspenso',
  'russian twist': 'Giro Russo',
  'mountain climbers': 'Corrida Estacionária (Alpinista)',
  'lunges': 'Avanço / Passada',
  'dumbbell lunge': 'Avanço com Halteres',
  'barbell lunge': 'Avanço com Barra',
  'step-up': 'Subida no Banco',
  'thrusters': 'Thruster',
  'burpees': 'Burpee',
  'burpee': 'Burpee',
  'jumping jacks': 'Polichinelos',
  'jumping jack': 'Polichinelo',
}

const wordReplacements: [RegExp, string][] = [
  [/\bbarbell\b/gi, 'com Barra'],
  [/\bdumbbell\b/gi, 'com Halteres'],
  [/\bcable\b/gi, 'na Polia'],
  [/\bmachine\b/gi, 'na Máquina'],
  [/\blying\b/gi, 'Deitado'],
  [/\bseated\b/gi, 'Sentado'],
  [/\bstanding\b/gi, 'Em Pé'],
  [/\bincline\b/gi, 'Inclinado'],
  [/\bdecline\b/gi, 'Declinado'],
  [/\bassisted\b/gi, 'Assistido'],
  [/\bcurls\b/gi, 'Rosca'],
  [/\bcurl\b/gi, 'Rosca'],
  [/\braises\b/gi, 'Elevação'],
  [/\braise\b/gi, 'Elevação'],
  [/\brow\b/gi, 'Remada'],
  [/\brows\b/gi, 'Remada'],
  [/\bpress\b/gi, 'Supino / Desenvolvimento'],
  [/\bsquat\b/gi, 'Agachamento'],
  [/\bsquats\b/gi, 'Agachamento'],
  [/\bextension\b/gi, 'Extensão'],
  [/\bextensions\b/gi, 'Extensão'],
  [/\bfly\b/gi, 'Crucifixo'],
  [/\bflyer\b/gi, 'Crucifixo'],
  [/\bshrug\b/gi, 'Encolhimento'],
  [/\bshrugs\b/gi, 'Encolhimento'],
  [/\bshrugs\b/gi, 'Encolhimento'],
  [/\blunge\b/gi, 'Avanço'],
  [/\blunges\b/gi, 'Avanço'],
  [/\bstep-up\b/gi, 'Subida no Banco'],
  [/\bstep-ups\b/gi, 'Subida no Banco'],
  [/\bcrunch\b/gi, 'Abdominal'],
  [/\bcrunches\b/gi, 'Abdominal'],
  [/\bpull-down\b/gi, 'Puxada'],
  [/\bpulldown\b/gi, 'Puxada'],
  [/\bpush-up\b/gi, 'Flexão de Braço'],
  [/\bpush-ups\b/gi, 'Flexão de Braço'],
  [/\bpull-up\b/gi, 'Barra Fixa'],
  [/\bpull-ups\b/gi, 'Barra Fixa'],
  [/\bchin-up\b/gi, 'Barra Fixa Supinada'],
  [/\bchin-ups\b/gi, 'Barra Fixa Supinada'],
]

const muscleGroupTranslations: Record<string, string> = {
  'chest': 'Peito',
  'back': 'Costas',
  'shoulders': 'Ombros',
  'upper arms': 'Braços',
  'upper legs': 'Pernas',
  'lower legs': 'Panturrilha',
  'waist': 'Abdômen',
  'cardio': 'Cardio',
  'neck': 'Pescoço',
  'lower arms': 'Antebraços'
}

function translateExerciseName(englishName: string): string {
  if (!englishName) return ''
  const cleanName = englishName.trim().toLowerCase().replace(/\s+/g, ' ')
  
  if (exerciseTranslations[cleanName]) {
    return `${exerciseTranslations[cleanName]} (${englishName})`
  }
  
  let translated = englishName
  for (const [pattern, replacement] of wordReplacements) {
    translated = translated.replace(pattern, replacement)
  }
  
  if (translated === englishName) {
    return englishName
  }
  
  return `${translated} (${englishName})`
}

async function sync() {
  console.log('🔄 Iniciando sincronização de exercícios da API WorkoutX...')
  const apiKey = 'wx_9faec54a147c8ee816f823b3f2ed03ccae2c65b1cea70ee8a7d37887'
  
  let offset = 0
  const limit = 10
  let total = 1327 // Inicialmente assumido, mas será atualizado
  let synced = 0

  while (offset < total) {
    const url = `https://api.workoutxapp.com/v1/exercises?limit=${limit}&offset=${offset}`
    
    try {
      const res = await fetch(url, {
        headers: { 'X-WorkoutX-Key': apiKey }
      })

      if (!res.ok) {
        throw new Error(`Erro na API WorkoutX: ${res.status} ${res.statusText}`)
      }

      const body = await res.json()
      total = body.total || total
      const list = body.data || []

      if (list.length === 0) {
        console.log('⚠️ Nenhum exercício retornado nesta página, encerrando...')
        break
      }

      for (const ex of list) {
        const translatedName = translateExerciseName(ex.name)
        const translatedGroup = muscleGroupTranslations[ex.bodyPart.toLowerCase()] || ex.bodyPart

        await prisma.exercicio.upsert({
          where: { id: ex.id },
          create: {
            id: ex.id,
            nome: translatedName,
            grupo_muscular: translatedGroup,
            equipamento: ex.equipment,
            imagem_url: ex.gifUrl,
            dica: Array.isArray(ex.instructions) ? ex.instructions.join(' ') : ex.instructions
          },
          update: {
            nome: translatedName,
            grupo_muscular: translatedGroup,
            equipamento: ex.equipment,
            imagem_url: ex.gifUrl,
            dica: Array.isArray(ex.instructions) ? ex.instructions.join(' ') : ex.instructions
          }
        })
        synced++
      }

      console.log(`✅ Progresso: ${synced}/${total} exercícios sincronizados...`)
      
      // Delay curto para evitar sobrecarga ou rate limits
      await new Promise(resolve => setTimeout(resolve, 250))
      offset += limit

    } catch (err) {
      console.error(`❌ Erro no offset ${offset}:`, err)
      // Pausa maior em caso de erro e tenta continuar (sem pular offset)
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }

  console.log(`🎉 Sincronização concluída! Total de ${synced} exercícios inseridos/atualizados no banco.`)
}

sync()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
