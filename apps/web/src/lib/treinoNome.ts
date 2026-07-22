import { GRUPOS_GRANULARES } from './exerciseFilters'

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

interface SugerirNomesOpts {
  grupos?: string[]
  split?: string | null
  origem?: 'criar' | 'ia' | 'professor'
  fichasExistentes?: string[]
}

export function sugerirNomes(opts: SugerirNomesOpts = {}): string[] {
  const sugestoes: string[] = []
  const { grupos, split, origem, fichasExistentes } = opts

  const letraProxima = proximaLetra(fichasExistentes || [])
  if (letraProxima) sugestoes.push(letraProxima)

  if (split) {
    const label = splitLabel(split)
    if (label) sugestoes.push(label)
  }

  if (grupos && grupos.length > 0) {
    const top3 = grupos.slice(0, 3)
    const chipLabels = top3.map((g) => {
      const found = GRUPOS_GRANULARES.find((gr) => gr.value === g)
      return found?.label || g
    })
    sugestoes.push(chipLabels.join(' + '))
  }

  if (origem === 'criar' && sugestoes.length === 0) {
    sugestoes.push('Meu Treino')
    sugestoes.push('Treino A')
  }

  if (origem === 'ia' && sugestoes.length === 0) {
    sugestoes.push('Treino IA')
    sugestoes.push('Meu Treino')
  }

  return [...new Set(sugestoes)].filter((s) => !(fichasExistentes || []).includes(s))
}

function proximaLetra(fichas: string[]): string | null {
  const usadas = new Set(LETRAS.map((l) => `Treino ${l}`))
  for (const f of fichas) usadas.add(f.trim())
  for (const l of LETRAS) {
    if (![...usadas].some((u) => u === `Treino ${l}` || u.startsWith(`Treino ${l} —`))) {
      return `Treino ${l}`
    }
  }
  return null
}

function splitLabel(split: string): string {
  const map: Record<string, string> = {
    FULL_BODY: 'Full Body',
    PUSH: 'Push',
    PULL: 'Pull',
    LEGS: 'Legs',
    UPPER: 'Superiores',
    LOWER: 'Inferiores',
  }
  return map[split] || split
}
