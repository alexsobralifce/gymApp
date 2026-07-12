import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const prisma = new PrismaClient()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Resolver pasta exercises.json-master independente de onde for rodado
let exercisesDir = path.join(process.cwd(), 'exercises.json-master', 'exercises')
if (!fs.existsSync(exercisesDir)) {
  exercisesDir = path.join(process.cwd(), '..', '..', 'exercises.json-master', 'exercises')
}
if (!fs.existsSync(exercisesDir)) {
  // Tentar resolver a partir de apps/api/prisma
  exercisesDir = path.resolve(__dirname, '..', '..', '..', 'exercises.json-master', 'exercises')
}

console.log(`📁 Buscando exercicios em: ${exercisesDir}`)

const exerciseTranslations: Record<string, string> = {
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
  'pushups - close triceps position': 'Flexões de Braço Fechada (Tríceps)',
  'pushups with feet elevated': 'Flexões com Pés Elevados',
  'pullups': 'Barra Fixa',
  'pull-up': 'Barra Fixa',
  'chinups': 'Barra Fixa Supinada',
  'dips': 'Paralelas',
  'bench dips': 'Paralelas no Banco',
  'dips - chest version': 'Paralelas para Peito',
  'dips - triceps version': 'Paralelas para Tríceps',
  'leg press': 'Leg Press',
  'barbell squat': 'Agachamento Livre com Barra',
  'dumbbell squat': 'Agachamento com Halteres',
  'goblet squat': 'Agachamento Goblet',
  'bulgarian split squat': 'Agachamento Búlgaro',
  'deadlift': 'Levantamento Terra',
  'barbell deadlift': 'Levantamento Terra com Barra',
  'lying leg curls': 'Mesa Flexora',
  'seated leg curl': 'Cadeira Flexora',
  'leg extensions': 'Cadeira Extensora',
  'standing calf raises': 'Panturrilha em Pé',
  'seated calf raise': 'Panturrilha Sentado',
  'cable crossover': 'Crossover na Polia',
  'cable fly': 'Crucifixo na Polia',
  'dumbbell flyes': 'Crucifixo com Halteres',
  'bent over barbell row': 'Remada Curvada com Barra',
  'one-arm dumbbell row': 'Remada Unilateral (Serrote)',
  't-bar row': 'Remada Cavalinho',
  'seated cable rows': 'Remada Baixa na Polia',
  'lat pulldown': 'Puxada Aberta no Pulley',
  'cable pulldown': 'Puxada na Polia',
  'face pull': 'Face Pull',
  'dumbbell shoulder press': 'Desenvolvimento com Halteres',
  'barbell shoulder press': 'Desenvolvimento com Barra',
  'overhead press': 'Desenvolvimento Militar',
  'arnold dumbbell press': 'Desenvolvimento Arnold',
  'lateral raise': 'Elevação Lateral',
  'front raise': 'Elevação Frontal',
  'shrugs': 'Encolhimento de Ombros',
  'barbell shrug': 'Encolhimento com Barra',
  'dumbbell shrug': 'Encolhimento com Halteres',
  'tricep extension': 'Extensão de Tríceps',
  'overhead triceps extension': 'Tríceps Testa',
  'french press': 'Tríceps Francês',
  'cable pushdown': 'Tríceps Pulley',
  'rope pushdown': 'Tríceps Corda',
  'plank': 'Prancha Abdominal',
  'side plank': 'Prancha Lateral',
  'crunches': 'Abdominal Crunch',
  'hanging leg raise': 'Elevação de Pernas Suspenso',
  'russian twist': 'Giro Russo',
  'lunges': 'Avanço / Passada',
  'dumbbell lunges': 'Avanço com Halteres',
  'barbell lunge': 'Avanço com Barra',
  'step-ups': 'Subida no Banco',
  'burpees': 'Burpee',
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
  [/\bflyes\b/gi, 'Crucifixo'],
  [/\bshrug\b/gi, 'Encolhimento'],
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
]

const muscleTranslations: Record<string, string> = {
  'chest': 'Peito',
  'back': 'Costas',
  'lats': 'Costas (Dorsais)',
  'middle back': 'Costas (Terso Médio)',
  'lower back': 'Lombar',
  'shoulders': 'Ombros',
  'traps': 'Trapézio',
  'biceps': 'Bíceps',
  'triceps': 'Tríceps',
  'forearms': 'Antebraços',
  'quadriceps': 'Quadríceps (Coxas)',
  'hamstrings': 'Posterior de Coxa',
  'glutes': 'Glúteos',
  'calves': 'Panturrilhas',
  'abductors': 'Abdutores',
  'adductors': 'Adutores',
  'abs': 'Abdômen',
  'neck': 'Pescoço',
  'quads': 'Quadríceps',
  'cardio': 'Cardio'
}

const equipmentTranslations: Record<string, string> = {
  'barbell': 'Barra',
  'dumbbell': 'Halteres',
  'cable': 'Polia',
  'machine': 'Máquina',
  'kettlebell': 'Kettlebell',
  'body only': 'Peso Corporal',
  'body': 'Peso Corporal',
  'exercise ball': 'Bola de Pilates',
  'bands': 'Elásticos',
  'foam roll': 'Rolo de Liberação',
  'other': 'Outro',
  'e-z curl bar': 'Barra W'
}

const levelTranslations: Record<string, string> = {
  'beginner': 'Iniciante',
  'intermediate': 'Intermediário',
  'expert': 'Avançado'
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
  if (!fs.existsSync(exercisesDir)) {
    console.error('❌ Pasta de exercicios nao encontrada!')
    process.exit(1)
  }

  const items = fs.readdirSync(exercisesDir)
  console.log(`📚 Encontrados ${items.length} exercicios para processamento.`)

  let count = 0

  for (const itemName of items) {
    const itemPath = path.join(exercisesDir, itemName)
    if (!fs.statSync(itemPath).isDirectory()) continue

    const jsonPath = path.join(itemPath, 'exercise.json')
    if (!fs.existsSync(jsonPath)) continue

    try {
      const fileData = fs.readFileSync(jsonPath, 'utf-8')
      const data = JSON.parse(fileData)

      const englishName = data.name || itemName.replace(/_/g, ' ')
      const translatedName = translateExerciseName(englishName)

      // Determinar músculos principais
      const rawMuscle = data.primaryMuscles?.[0] || 'cardio'
      const translatedMuscle = muscleTranslations[rawMuscle.toLowerCase()] || rawMuscle

      // Determinar equipamento
      const rawEquip = data.equipment || 'body'
      const translatedEquip = equipmentTranslations[rawEquip.toLowerCase()] || rawEquip

      // Determinar nível
      const rawLevel = data.level || 'beginner'
      const translatedLevel = levelTranslations[rawLevel.toLowerCase()] || 'Iniciante'

      // Links das imagens usando Github Raw URL (gratuito)
      const folderUrlName = itemName // ex.: Barbell_Curl
      const imgUrl0 = `https://raw.githubusercontent.com/wrkout/exercises.json/master/exercises/${folderUrlName}/images/0.jpg`
      const imgUrl1 = `https://raw.githubusercontent.com/wrkout/exercises.json/master/exercises/${folderUrlName}/images/1.jpg`

      // Juntar instruções
      const instructionsText = Array.isArray(data.instructions)
        ? data.instructions.join('\n')
        : (data.instructions || '')

      await prisma.exercicio.upsert({
        where: { id: folderUrlName },
        create: {
          id: folderUrlName,
          nome: translatedName,
          grupo_muscular: translatedMuscle,
          equipamento: translatedEquip,
          dica: instructionsText,
          imagem_url: imgUrl0,
          imagem_url_final: imgUrl1,
          nivel: translatedLevel
        },
        update: {
          nome: translatedName,
          grupo_muscular: translatedMuscle,
          equipamento: translatedEquip,
          dica: instructionsText,
          imagem_url: imgUrl0,
          imagem_url_final: imgUrl1,
          nivel: translatedLevel
        }
      })

      count++
      if (count % 50 === 0) {
        console.log(`✅ Progresso: ${count}/${items.length} exercicios sincronizados no banco.`)
      }

    } catch (err) {
      console.error(`❌ Erro ao sincronizar exercicio em ${itemName}:`, err)
    }
  }

  console.log(`🎉 Sincronizacao concluida com sucesso! ${count} exercicios importados/atualizados.`)
}

sync()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
