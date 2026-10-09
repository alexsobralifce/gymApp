// Cálculos das ferramentas públicas (/ferramentas e /en/tools). Funções puras, sem texto de interface:
// os rótulos ficam nas páginas, em PT e EN. Resultados são estimativas de referência.
import { calcularIMC } from './health'

export type Sexo = 'M' | 'F'
export type FaixaIMC = 'abaixo' | 'normal' | 'sobrepeso' | 'obesidade1' | 'obesidade2' | 'obesidade3'
export type NivelAtividade = 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'muitoIntenso'
export type Objetivo = 'perder' | 'manter' | 'ganhar'

export const LIMITES = { pesoKg: [20, 400], alturaCm: [100, 250], idade: [15, 100] } as const

export function dentroDoLimite(valor: number, [min, max]: readonly [number, number]): boolean {
  return Number.isFinite(valor) && valor >= min && valor <= max
}

const FATOR_ATIVIDADE: Record<NivelAtividade, number> = { sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725, muitoIntenso: 1.9 }
const KCAL_POR_KG = 7700
const POLEGADAS_POR_CM = 1 / 2.54

export function faixaDoIMC(imc: number): FaixaIMC {
  if (imc < 18.5) return 'abaixo'
  if (imc < 25) return 'normal'
  if (imc < 30) return 'sobrepeso'
  if (imc < 35) return 'obesidade1'
  if (imc < 40) return 'obesidade2'
  return 'obesidade3'
}

export function imcDe(pesoKg: number, alturaCm: number): { imc: number; faixa: FaixaIMC } | null {
  if (!dentroDoLimite(pesoKg, LIMITES.pesoKg) || !dentroDoLimite(alturaCm, LIMITES.alturaCm)) return null
  const imc = calcularIMC(pesoKg, alturaCm)
  return imc === null ? null : { imc, faixa: faixaDoIMC(imc) }
}

/** Faixa de peso com IMC entre 18,5 e 24,9 para a altura informada. */
export function faixaSaudavelKg(alturaCm: number): { min: number; max: number } {
  const m2 = (alturaCm / 100) ** 2
  return { min: arredondar(18.5 * m2), max: arredondar(24.9 * m2) }
}

export interface PesoIdeal { devine: number; robinson: number; miller: number; hamwi: number; faixa: { min: number; max: number } }

/** Fórmulas clássicas (Devine, Robinson, Miller e Hamwi) a partir de 152,4 cm (5 pés); abaixo disso usa o excesso zero. */
export function pesoIdealDe(alturaCm: number, sexo: Sexo): PesoIdeal | null {
  if (!dentroDoLimite(alturaCm, LIMITES.alturaCm)) return null
  const acima = Math.max(0, alturaCm * POLEGADAS_POR_CM - 60)
  const h = sexo === 'M'
  return {
    devine: arredondar((h ? 50 : 45.5) + 2.3 * acima),
    robinson: arredondar((h ? 52 : 49) + (h ? 1.9 : 1.7) * acima),
    miller: arredondar((h ? 56.2 : 53.1) + (h ? 1.41 : 1.36) * acima),
    hamwi: arredondar(((h ? 48 : 45.5) + (h ? 2.7 : 2.2) * acima)),
    faixa: faixaSaudavelKg(alturaCm),
  }
}

export interface EntradaGasto { pesoKg: number; alturaCm: number; idade: number; sexo: Sexo; atividade: NivelAtividade }

/** TMB pela equação de Mifflin-St Jeor. */
export function tmbDe(e: Pick<EntradaGasto, 'pesoKg' | 'alturaCm' | 'idade' | 'sexo'>): number | null {
  if (!dentroDoLimite(e.pesoKg, LIMITES.pesoKg) || !dentroDoLimite(e.alturaCm, LIMITES.alturaCm) || !dentroDoLimite(e.idade, LIMITES.idade)) return null
  return Math.round(10 * e.pesoKg + 6.25 * e.alturaCm - 5 * e.idade + (e.sexo === 'M' ? 5 : -161))
}

export function gastoDiarioDe(e: EntradaGasto): { tmb: number; tdee: number } | null {
  const tmb = tmbDe(e)
  return tmb === null ? null : { tmb, tdee: Math.round(tmb * FATOR_ATIVIDADE[e.atividade]) }
}

export interface EntradaMeta extends EntradaGasto { objetivo: Objetivo; pesoMetaKg?: number }
export interface ResultadoMeta { tmb: number; tdee: number; meta: number; ajuste: number; kgPorSemana: number; semanasParaMeta: number | null; limitadoPeloMinimo: boolean }

/** Perder: -20% do gasto; ganhar: +10%. Nunca abaixo da TMB (ou 1.200 kcal para mulheres e 1.500 para homens, o que for maior). */
export function metaCaloricaDe(e: EntradaMeta): ResultadoMeta | null {
  const g = gastoDiarioDe(e)
  if (!g) return null
  const alvo = e.objetivo === 'perder' ? g.tdee * 0.8 : e.objetivo === 'ganhar' ? g.tdee * 1.1 : g.tdee
  const minimo = Math.max(g.tmb, e.sexo === 'M' ? 1500 : 1200)
  const limitado = e.objetivo === 'perder' && alvo < minimo
  const meta = Math.round(limitado ? minimo : alvo)
  const ajuste = meta - g.tdee
  const kgPorSemana = arredondar((ajuste * 7) / KCAL_POR_KG, 2)
  const diferenca = e.pesoMetaKg !== undefined ? e.pesoMetaKg - e.pesoKg : undefined
  const caminhaParaMeta = diferenca !== undefined && kgPorSemana !== 0 && Math.sign(diferenca) === Math.sign(kgPorSemana)
  return {
    ...g,
    meta,
    ajuste,
    kgPorSemana,
    semanasParaMeta: caminhaParaMeta ? Math.ceil(Math.abs(diferenca) / Math.abs(kgPorSemana)) : null,
    limitadoPeloMinimo: limitado,
  }
}

function arredondar(valor: number, casas = 1): number {
  const f = 10 ** casas
  return Math.round(valor * f) / f
}
