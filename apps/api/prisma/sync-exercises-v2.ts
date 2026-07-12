/**
 * sync-exercises-v2.ts
 * Importa 1.324 exercícios do exercises-dataset-main com GIFs reais e PT.
 * Executar: npx tsx apps/api/prisma/sync-exercises-v2.ts
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const prisma = new PrismaClient()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function findDatasetPath(): string {
  const candidates = [
    path.join(process.cwd(), 'exercises-dataset-main', 'data', 'exercises.json'),
    path.join(__dirname, '..', '..', '..', 'exercises-dataset-main', 'data', 'exercises.json'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  throw new Error('exercises-dataset-main/data/exercises.json nao encontrado!')
}

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3333'

const exerciseNameTranslations: Record<string, string> = {
  '3/4 sit-up': 'Abdominal 3/4',
  '45 side bend': 'Inclinacao Lateral 45',
  'air bike': 'Bicicleta no Ar',
  'alternate heel touchers': 'Toque Alternado no Calcanhar',
  'barbell bench press': 'Supino Reto com Barra',
  'barbell curl': 'Rosca Direta com Barra',
  'barbell deadlift': 'Levantamento Terra com Barra',
  'barbell lunge': 'Avanco com Barra',
  'barbell row': 'Remada com Barra',
  'barbell shrug': 'Encolhimento de Ombros com Barra',
  'barbell squat': 'Agachamento com Barra',
  'bench dip': 'Paralelas no Banco',
  'bench press': 'Supino Reto',
  'bent over barbell row': 'Remada Curvada com Barra',
  'bicycle crunch': 'Abdominal Bicicleta',
  'box jump': 'Salto na Caixa',
  'bulgarian split squat': 'Agachamento Bulgaro',
  'burpee': 'Burpee',
  'cable crossover': 'Crossover na Polia',
  'cable curl': 'Rosca na Polia',
  'cable fly': 'Crucifixo na Polia',
  'cable lateral raise': 'Elevacao Lateral na Polia',
  'cable pulldown': 'Puxada Alta na Polia',
  'cable row': 'Remada na Polia',
  'calf raise': 'Elevacao de Panturrilha',
  'chin-up': 'Barra Fixa Supinada',
  'close-grip barbell bench press': 'Supino Fechado com Barra',
  'concentration curl': 'Rosca Concentrada',
  'crunch': 'Abdominal Crunch',
  'deadlift': 'Levantamento Terra',
  'decline bench press': 'Supino Declinado',
  'decline crunch': 'Abdominal Declinado',
  'decline push-up': 'Flexao Declinada',
  'dip': 'Paralelas',
  'dumbbell bench press': 'Supino Reto com Halteres',
  'dumbbell curl': 'Rosca Biceps com Halteres',
  'dumbbell deadlift': 'Levantamento Terra com Halteres',
  'dumbbell fly': 'Crucifixo com Halteres',
  'dumbbell front raise': 'Elevacao Frontal com Halteres',
  'dumbbell lateral raise': 'Elevacao Lateral com Halteres',
  'dumbbell lunge': 'Avanco com Halteres',
  'dumbbell row': 'Remada com Haltere',
  'dumbbell shoulder press': 'Desenvolvimento com Halteres',
  'dumbbell shrug': 'Encolhimento de Ombros com Halteres',
  'dumbbell squat': 'Agachamento com Halteres',
  'face pull': 'Face Pull',
  'french press': 'Triceps Frances',
  'front raise': 'Elevacao Frontal',
  'glute bridge': 'Elevacao de Quadril',
  'goblet squat': 'Agachamento Goblet',
  'hammer curl': 'Rosca Martelo',
  'hanging knee raise': 'Elevacao de Joelhos Suspenso',
  'hanging leg raise': 'Elevacao de Pernas Suspenso',
  'hip thrust': 'Elevacao de Quadril (Hip Thrust)',
  'incline barbell bench press': 'Supino Inclinado com Barra',
  'incline dumbbell bench press': 'Supino Inclinado com Halteres',
  'incline push-up': 'Flexao Inclinada',
  'jumping jack': 'Polichinelo',
  'jumping jacks': 'Polichinelos',
  'kettlebell swing': 'Swing com Kettlebell',
  'lat pulldown': 'Puxada Alta no Pulley',
  'lateral raise': 'Elevacao Lateral',
  'leg extension': 'Cadeira Extensora',
  'leg press': 'Leg Press',
  'leg raise': 'Elevacao de Pernas',
  'lunges': 'Avanco / Passada',
  'lying leg curl': 'Mesa Flexora',
  'military press': 'Desenvolvimento Militar',
  'mountain climber': 'Mountain Climber',
  'overhead press': 'Desenvolvimento Militar',
  'overhead tricep extension': 'Triceps Acima da Cabeca',
  'plank': 'Prancha Abdominal',
  'preacher curl': 'Rosca Scott',
  'pull-up': 'Barra Fixa',
  'pullover': 'Pullover',
  'push-up': 'Flexao de Braco',
  'rear delt fly': 'Crucifixo Invertido',
  'reverse curl': 'Rosca Inversa',
  'reverse lunge': 'Avanco Reverso',
  'romanian deadlift': 'Levantamento Terra Romeno',
  'rope pushdown': 'Triceps Corda no Pulley',
  'russian twist': 'Giro Russo',
  'seated cable row': 'Remada Baixa na Polia',
  'seated calf raise': 'Elevacao de Panturrilha Sentado',
  'seated leg curl': 'Cadeira Flexora',
  'shoulder press': 'Desenvolvimento',
  'shrug': 'Encolhimento de Ombros',
  'side plank': 'Prancha Lateral',
  'squat': 'Agachamento',
  'standing calf raise': 'Elevacao de Panturrilha Em Pe',
  'step-up': 'Subida no Banco',
  't-bar row': 'Remada Cavalinho',
  'tricep dip': 'Paralelas para Triceps',
  'tricep extension': 'Extensao de Triceps',
  'tricep pushdown': 'Triceps no Pulley',
  'upright row': 'Remada Alta',
  'wide-grip pull-up': 'Barra Fixa Aberta',
}

const muscleGroupPT: Record<string, string> = {
  'abs': 'Abdomen', 'abdominals': 'Abdomen', 'waist': 'Abdomen / Lombar',
  'back': 'Costas', 'lats': 'Dorsais', 'latissimus dorsi': 'Grande Dorsal',
  'upper back': 'Costas Superiores', 'lower back': 'Lombar',
  'rhomboids': 'Romboides', 'trapezius': 'Trapezio', 'traps': 'Trapezio',
  'chest': 'Peito', 'shoulders': 'Ombros', 'deltoids': 'Deltoides',
  'rotator cuff': 'Manguito Rotador', 'biceps': 'Biceps', 'triceps': 'Triceps',
  'forearms': 'Antebraccos', 'wrist extensors': 'Extensores do Punho',
  'wrist flexors': 'Flexores do Punho', 'wrists': 'Punhos', 'hands': 'Maos',
  'quads': 'Quadriceps', 'quadriceps': 'Quadriceps',
  'hamstrings': 'Posterior de Coxa', 'glutes': 'Gluteos',
  'calves': 'Panturrilhas', 'soleus': 'Soleo (Panturrilha)',
  'upper legs': 'Coxas', 'lower legs': 'Panturrilhas / Tibiais',
  'hip flexors': 'Flexores do Quadril', 'core': 'Core (Abdomen e Lombar)',
  'obliques': 'Obliquos', 'neck': 'Pescoco', 'ankles': 'Tornozelos',
  'ankle stabilizers': 'Estabilizadores do Tornozelo', 'cardio': 'Cardio',
  'upper arms': 'Bracos', 'lower arms': 'Antebraccos',
}

const equipmentPT: Record<string, string> = {
  'body weight': 'Peso Corporal', 'barbell': 'Barra', 'dumbbell': 'Halteres',
  'cable': 'Polia', 'machine': 'Maquina', 'leverage machine': 'Maquina de Alavanca',
  'smith machine': 'Maquina Smith', 'kettlebell': 'Kettlebell',
  'resistance band': 'Elastico de Resistencia', 'band': 'Elastico',
  'ez barbell': 'Barra W (EZ)', 'olympic barbell': 'Barra Olimpica',
  'trap bar': 'Barra Hexagonal', 'medicine ball': 'Bola de Medicina',
  'stability ball': 'Bola de Pilates', 'bosu ball': 'Bosu',
  'roller': 'Rolo de Liberacao Miofascial', 'rope': 'Corda',
  'weighted': 'Com Peso Adicional', 'assisted': 'Assistido',
  'stationary bike': 'Bicicleta Estacionaria', 'elliptical machine': 'Eliptico',
  'skierg machine': 'Remo Vertical (SkiErg)', 'sled machine': 'Treno de Arrasto',
  'stepmill machine': 'Escada Rolante', 'tire': 'Pneu',
  'hammer': 'Marreta', 'upper body ergometer': 'Ergometro de Bracos',
  'wheel roller': 'Roda Abdominal',
}

const bodyPartPT: Record<string, string> = {
  'waist': 'Abdomen / Lombar', 'back': 'Costas', 'chest': 'Peito',
  'shoulders': 'Ombros', 'upper arms': 'Bracos', 'lower arms': 'Antebraccos',
  'upper legs': 'Coxas', 'lower legs': 'Pernas Inferiores',
  'neck': 'Pescoco', 'cardio': 'Cardio',
}

function translateStep(step: string): string {
  const map: [RegExp, string][] = [
    [/lie flat on your back/gi, 'Deite-se de costas no chao'],
    [/lie on your back/gi, 'Deite-se de costas'],
    [/stand with your feet shoulder.?width apart/gi, 'Fique em pe com os pes na largura dos ombros'],
    [/keep your back straight/gi, 'Mantenha as costas retas'],
    [/engage your (abs|core)/gi, 'Contraia o abdomen'],
    [/engaging your (abs|core)/gi, 'Contraindo o abdomen'],
    [/return to the starting position/gi, 'Retorne a posicao inicial'],
    [/slowly lower/gi, 'Abaixe lentamente'],
    [/slowly lift/gi, 'Levante lentamente'],
    [/slowly raise/gi, 'Eleve lentamente'],
    [/pause for a moment/gi, 'Faca uma pausa por um momento'],
    [/pause at the top/gi, 'Faca uma pausa no topo'],
    [/hold this position for/gi, 'Mantenha esta posicao por'],
    [/repeat for the desired number of repetitions/gi, 'Repita pelo numero desejado de repeticoes'],
    [/continue alternating sides/gi, 'Continue alternando os lados'],
    [/repeat on the other side/gi, 'Repita no outro lado'],
    [/switch legs/gi, 'Troque de perna'],
    [/inhale/gi, 'Inspire'], [/exhale/gi, 'Expire'],
    [/(\d+)-(\d+) seconds/gi, '$1-$2 segundos'],
    [/(\d+) seconds/gi, '$1 segundos'],
    [/the ground|the floor/gi, 'o chao'],
    [/the bench/gi, 'o banco'],
    [/your shoulders/gi, 'seus ombros'], [/your back/gi, 'suas costas'],
    [/your knees/gi, 'seus joelhos'], [/your feet/gi, 'seus pes'],
    [/your hands/gi, 'suas maos'], [/your arms/gi, 'seus bracos'],
    [/your legs/gi, 'suas pernas'], [/your core/gi, 'seu core'],
    [/your abs/gi, 'seu abdomen'], [/your hips/gi, 'seu quadril'],
    [/upper body/gi, 'parte superior do corpo'],
    [/lower body/gi, 'parte inferior do corpo'],
  ]
  let result = step
  for (const [pattern, replacement] of map) {
    result = result.replace(pattern, replacement)
  }
  return result.charAt(0).toUpperCase() + result.slice(1)
}

function translateName(name: string): string {
  const key = name.toLowerCase().trim().replace(/[°]/g, ' ').trim()
  if (exerciseNameTranslations[key]) return exerciseNameTranslations[key]
  const wordMap: [RegExp, string][] = [
    [/\bbarbell\b/gi, 'com Barra'], [/\bdumbbells?\b/gi, 'com Halteres'],
    [/\bcables?\b/gi, 'na Polia'], [/\bmachines?\b/gi, 'na Maquina'],
    [/\blying\b/gi, 'Deitado'], [/\bseated\b/gi, 'Sentado'],
    [/\bstanding\b/gi, 'Em Pe'], [/\bincline\b/gi, 'Inclinado'],
    [/\bdecline\b/gi, 'Declinado'], [/\bcurls?\b/gi, 'Rosca'],
    [/\braises?\b/gi, 'Elevacao'], [/\brows?\b/gi, 'Remada'],
    [/\bpress\b/gi, 'Desenvolvimento'], [/\bsquats?\b/gi, 'Agachamento'],
    [/\bextensions?\b/gi, 'Extensao'], [/\bflyes?|flys?\b/gi, 'Crucifixo'],
    [/\bshrugs?\b/gi, 'Encolhimento'], [/\blunges?\b/gi, 'Avanco'],
    [/\bcrunches?|crunch\b/gi, 'Abdominal'], [/\bpull.?downs?\b/gi, 'Puxada'],
    [/\bpush.?ups?\b/gi, 'Flexao de Braco'], [/\bpull.?ups?\b/gi, 'Barra Fixa'],
    [/\bdeadlifts?\b/gi, 'Levantamento Terra'],
  ]
  let t = name
  for (const [p, r] of wordMap) t = t.replace(p, r)
  return t
}

async function sync() {
  const dataPath = findDatasetPath()
  console.log(`Carregando dataset: ${dataPath}`)
  const exercises: any[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  console.log(`${exercises.length} exercicios encontrados.`)

  let count = 0, errors = 0
  const BATCH = 50

  for (let i = 0; i < exercises.length; i += BATCH) {
    const batch = exercises.slice(i, i + BATCH)
    await Promise.all(batch.map(async (ex) => {
      try {
        const nomePT = translateName(ex.name)
        const imagemUrl = ex.image ? `${API_BASE_URL}/exercises/${ex.image}` : null
        const gifUrl = ex.gif_url ? `${API_BASE_URL}/exercises/${ex.gif_url}` : null
        const grupoMuscular = muscleGroupPT[ex.muscle_group?.toLowerCase()] || muscleGroupPT[ex.body_part?.toLowerCase()] || ex.muscle_group || ex.body_part || ''
        const equipamento = equipmentPT[ex.equipment?.toLowerCase()] || ex.equipment || 'Peso Corporal'
        const musculoAlvo = muscleGroupPT[ex.target?.toLowerCase()] || muscleGroupPT[ex.muscle_group?.toLowerCase()] || ex.target || ex.muscle_group || ''
        const musculosSecundarios = (ex.secondary_muscles || []).map((m: string) => muscleGroupPT[m.toLowerCase()] || m)
        const passosEN: string[] = ex.instruction_steps?.en || []
        const passosPT = passosEN.map(translateStep)
        const descricaoEN: string = ex.instructions?.en || ''
        const descricaoPT = descricaoEN ? translateStep(descricaoEN) : passosPT.join(' ')
        const dica = `${bodyPartPT[ex.body_part?.toLowerCase()] || ex.body_part || ''} | ${grupoMuscular}`
        const exercicioId = `ds-${ex.id}`

        await prisma.exercicio.upsert({
          where: { id: exercicioId },
          create: { id: exercicioId, nome: nomePT, grupo_muscular: grupoMuscular, equipamento, imagem_url: imagemUrl, gif_url: gifUrl, descricao_pt: descricaoPT, passos_pt: passosPT, musculo_alvo: musculoAlvo, musculos_secundarios: musculosSecundarios, dica, nivel: 'Intermediario' },
          update: { nome: nomePT, grupo_muscular: grupoMuscular, equipamento, imagem_url: imagemUrl, gif_url: gifUrl, descricao_pt: descricaoPT, passos_pt: passosPT, musculo_alvo: musculoAlvo, musculos_secundarios: musculosSecundarios, dica },
        })
        count++
      } catch (err) {
        errors++
        console.error(`Erro em ${ex.id} (${ex.name}):`, err)
      }
    }))
    console.log(`${Math.min(i + BATCH, exercises.length)}/${exercises.length} processados...`)
  }

  console.log(`Sincronizacao concluida! ${count} exercicios importados. ${errors} erros.`)
}

sync().catch(console.error).finally(() => prisma.$disconnect())
