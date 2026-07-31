import type { Exercicio } from '../types/api'

export type MuscleCategoryKey =
  | 'ABDOMINAL'
  | 'AERÓBICO'
  | 'ANTEBRAÇO'
  | 'BÍCEPS'
  | 'COSTAS'
  | 'GLÚTEO'
  | 'OMBRO'
  | 'PANTURRILHA'
  | 'PEITORAL'
  | 'PERNAS'
  | 'TRAPÉZIO'
  | 'TRÍCEPS'

export interface MuscleCategoryConfig {
  key: MuscleCategoryKey
  label: string
  sublabel: string
  keywords: string[]
}

export const MUSCLE_CATEGORIES: MuscleCategoryConfig[] = [
  {
    key: 'ABDOMINAL',
    label: 'ABDOMINAL',
    sublabel: 'Abdômen & Core',
    keywords: ['abdômen', 'abdomen', 'abdominal', 'oblíquo', 'obliquo', 'prancha', 'crunch', 'core', 'infra', 'supra'],
  },
  {
    key: 'AERÓBICO',
    label: 'AERÓBICO',
    sublabel: 'Cardio & HIIT',
    keywords: ['cardio', 'aeróbico', 'aerobico', 'esteira', 'bicicleta', 'corrida', 'elíptico', 'eliptico', 'burpee', 'polichinelo', 'hiit'],
  },
  {
    key: 'ANTEBRAÇO',
    label: 'ANTEBRAÇO',
    sublabel: 'Antebraço & Punho',
    keywords: ['antebraços', 'antebrazos', 'antebraço', 'antebraccos', 'punho', 'flexão de punho', 'extensão de punho'],
  },
  {
    key: 'BÍCEPS',
    label: 'BÍCEPS',
    sublabel: 'Bíceps & Braquial',
    keywords: ['bíceps', 'biceps', 'rosca', 'braquial', 'concentrada', 'martelo', 'scott'],
  },
  {
    key: 'COSTAS',
    label: 'COSTAS',
    sublabel: 'Dorsais & Serrátil',
    keywords: ['costas', 'dorsal', 'dorsais', 'puxada', 'remada', 'barra fixa', 'pulldown', 'serrote', 'latíssimo'],
  },
  {
    key: 'GLÚTEO',
    label: 'GLÚTEO',
    sublabel: 'Glúteos',
    keywords: ['glúteo', 'gluteo', 'glúteos', 'gluteos', 'abdução', 'abducao', 'elevação pélvica', 'elevacao pelvica', 'coice'],
  },
  {
    key: 'OMBRO',
    label: 'OMBRO',
    sublabel: 'Deltoides & Ombros',
    keywords: ['ombro', 'ombros', 'deltoide', 'deltoides', 'desenvolvimento', 'elevação lateral', 'elevacao lateral', 'elevação frontal', 'arnold'],
  },
  {
    key: 'PANTURRILHA',
    label: 'PANTURRILHA',
    sublabel: 'Gêmeos & Tibial',
    keywords: ['panturrilha', 'panturrilhas', 'gêmeos', 'gemeos', 'tibial', 'sóleo', 'soleo'],
  },
  {
    key: 'PEITORAL',
    label: 'PEITORAL',
    sublabel: 'Peitoral Superior & Inferior',
    keywords: ['peito', 'peitoral', 'supino', 'crucifixo', 'peck deck', 'fly', 'cross over', 'flexão de braço'],
  },
  {
    key: 'PERNAS',
    label: 'PERNAS',
    sublabel: 'Quadríceps & Isquiotibiais',
    keywords: ['pernas', 'coxas', 'quadríceps', 'quadriceps', 'isquiotibiais', 'agachamento', 'leg press', 'cadeira extensora', 'mesa flexora', 'afundo', 'stiff', 'passada'],
  },
  {
    key: 'TRAPÉZIO',
    label: 'TRAPÉZIO',
    sublabel: 'Trapézio & Cervical',
    keywords: ['trapézio', 'trapezio', 'encolhimento', 'remada alta', 'shrug'],
  },
  {
    key: 'TRÍCEPS',
    label: 'TRÍCEPS',
    sublabel: 'Tríceps',
    keywords: ['tríceps', 'triceps', 'testa', 'pulley', 'tríceps corda', 'francesa', 'mergulho', 'coice tríceps'],
  },
]

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Classifica um exercício em uma das 12 categorias musculares exatas.
 */
export function getMuscleCategory(ex: {
  grupo_muscular?: string | null
  musculo_alvo?: string | null
  nome?: string | null
}): MuscleCategoryKey {
  const grupo = normalize(ex.grupo_muscular || '')
  const alvo = normalize(ex.musculo_alvo || '')
  const nome = normalize(ex.nome || '')
  const fullText = `${grupo} ${alvo} ${nome}`

  // Mapeamentos diretos por precedência
  if (alvo.includes('antebra') || grupo.includes('antebraccos') || nome.includes('antebra')) return 'ANTEBRAÇO'
  if (alvo.includes('biceps') || (grupo.includes('bracos') && (alvo.includes('biceps') || nome.includes('rosca')))) return 'BÍCEPS'
  if (alvo.includes('triceps') || (grupo.includes('bracos') && (alvo.includes('triceps') || nome.includes('triceps')))) return 'TRÍCEPS'
  if (alvo.includes('trapezio') || nome.includes('encolhimento') || nome.includes('trapezio')) return 'TRAPÉZIO'
  if (alvo.includes('panturrilha') || grupo.includes('panturrilha') || alvo.includes('tibial')) return 'PANTURRILHA'
  if (alvo.includes('gluteo') || nome.includes('gluteo') || (grupo.includes('coxas') && nome.includes('elevacao pelvica'))) return 'GLÚTEO'
  if (alvo.includes('cardio') || grupo.includes('cardio') || nome.includes('corrida') || nome.includes('esteira')) return 'AERÓBICO'
  if (alvo.includes('abdomen') || grupo.includes('abdomen') || nome.includes('abdominal') || nome.includes('prancha')) return 'ABDOMINAL'
  if (alvo.includes('peitoral') || grupo.includes('peito') || nome.includes('supino') || nome.includes('crucifixo')) return 'PEITORAL'
  if (alvo.includes('costas') || grupo.includes('costas') || nome.includes('puxada') || nome.includes('remada')) return 'COSTAS'
  if (alvo.includes('ombro') || grupo.includes('ombros') || nome.includes('desenvolvimento') || nome.includes('elevacao lateral')) return 'OMBRO'
  if (alvo.includes('quadriceps') || alvo.includes('isquiotibiais') || grupo.includes('coxas') || nome.includes('agachamento') || nome.includes('leg press')) return 'PERNAS'

  // Busca genérica por palavras-chave
  for (const cat of MUSCLE_CATEGORIES) {
    if (cat.keywords.some((kw) => fullText.includes(normalize(kw)))) {
      return cat.key
    }
  }

  // Fallback seguro
  return 'PERNAS'
}

/**
 * Filtra uma lista de exercícios por uma categoria muscular selecionada.
 */
export function filterByMuscleCategory(exercicios: Exercicio[], categoryKey: string): Exercicio[] {
  if (!categoryKey) return exercicios
  const targetKey = categoryKey.toUpperCase().trim()
  return exercicios.filter((ex) => getMuscleCategory(ex) === targetKey)
}
