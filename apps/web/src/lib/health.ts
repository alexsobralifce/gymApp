export function calcularIMC(pesoKg: number | null | undefined, alturaCm: number | null | undefined): number | null {
  if (!pesoKg || !alturaCm || alturaCm <= 0) return null
  return parseFloat((pesoKg / ((alturaCm / 100) ** 2)).toFixed(1))
}

export function classificarIMC(imc: number): { label: string; cor: string } {
  if (imc < 18.5) return { label: 'Abaixo do peso', cor: 'text-primary' }
  if (imc < 25) return { label: 'Peso normal', cor: 'text-success' }
  if (imc < 30) return { label: 'Sobrepeso', cor: 'text-accent' }
  if (imc < 35) return { label: 'Obesidade I', cor: 'text-accent' }
  if (imc < 40) return { label: 'Obesidade II', cor: 'text-destructive' }
  return { label: 'Obesidade III', cor: 'text-destructive' }
}

export function calcularIdade(dataNascimento: string | null | undefined): number | null {
  if (!dataNascimento) return null
  const today = new Date()
  const birth = new Date(dataNascimento)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export interface ZonaCardiaca {
  zona: number
  label: string
  cor: string
  bgClass: string
  borderClass: string
  textClass: string
  percentualFcMax: number
}

/**
 * Calcula o gasto calórico baseado na fórmula fisiológica de Keytel et al. (Journal of Sports Sciences)
 * Homens: [(-55.0969 + (0.6309 * BPM) + (0.1988 * Peso) + (0.2017 * Idade)) / 4.184] * (Minutos)
 * Mulheres: [(-20.4022 + (0.4472 * BPM) - (0.1263 * Peso) + (0.074 * Idade)) / 4.184] * (Minutos)
 */
export function calcularCaloriasKeytel({
  bpm,
  pesoKg = 75,
  idade = 30,
  sexo = 'MASCULINO',
  duracaoSegundos,
}: {
  bpm: number
  pesoKg?: number | null
  idade?: number | null
  sexo?: 'MASCULINO' | 'FEMININO' | null
  duracaoSegundos: number
}): number {
  const p = pesoKg && pesoKg > 0 ? pesoKg : 75
  const i = idade && idade > 0 ? idade : 30
  const minutos = duracaoSegundos / 60
  if (minutos <= 0) return 0

  let calPerMin = 0
  if (sexo === 'FEMININO') {
    calPerMin = (-20.4022 + 0.4472 * bpm - 0.1263 * p + 0.074 * i) / 4.184
  } else {
    calPerMin = (-55.0969 + 0.6309 * bpm + 0.1988 * p + 0.2017 * i) / 4.184
  }

  const result = Math.max(0, calPerMin * minutos)
  return parseFloat(result.toFixed(1))
}

/**
 * Determina a Zona de Frequência Cardíaca (Karvonen / Haskell-Fox: FCmax = 220 - idade)
 */
export function obterZonaCardiaca(bpm: number, idade?: number | null): ZonaCardiaca {
  const age = idade && idade > 0 ? idade : 30
  const fcMax = Math.max(120, 220 - age)
  const pct = Math.min(100, Math.max(0, Math.round((bpm / fcMax) * 100)))

  if (pct < 60) {
    return {
      zona: 1,
      label: 'Aquecimento',
      cor: '#3b82f6',
      bgClass: 'bg-blue-500/20',
      borderClass: 'border-blue-500/40',
      textClass: 'text-blue-400',
      percentualFcMax: pct,
    }
  }
  if (pct < 70) {
    return {
      zona: 2,
      label: 'Queima de Gordura',
      cor: '#22c55e',
      bgClass: 'bg-emerald-500/20',
      borderClass: 'border-emerald-500/40',
      textClass: 'text-emerald-400',
      percentualFcMax: pct,
    }
  }
  if (pct < 80) {
    return {
      zona: 3,
      label: 'Cardio / Aeróbico',
      cor: '#eab308',
      bgClass: 'bg-yellow-500/20',
      borderClass: 'border-yellow-500/40',
      textClass: 'text-yellow-400',
      percentualFcMax: pct,
    }
  }
  if (pct < 90) {
    return {
      zona: 4,
      label: 'Limiar Anaeróbico',
      cor: '#f97316',
      bgClass: 'bg-orange-500/20',
      borderClass: 'border-orange-500/40',
      textClass: 'text-orange-400',
      percentualFcMax: pct,
    }
  }
  return {
    zona: 5,
    label: 'Esforço Máximo',
    cor: '#ef4444',
    bgClass: 'bg-red-500/20',
    borderClass: 'border-red-500/40',
    textClass: 'text-red-400',
    percentualFcMax: pct,
  }
}

/**
 * Calcula a média de batimentos cardíacos a partir de um array de leituras
 */
export function calcularMediaFC(leituras: number[]): number | null {
  const validas = leituras.filter((b) => typeof b === 'number' && b > 30 && b < 240)
  if (validas.length === 0) return null
  const soma = validas.reduce((acc, cur) => acc + cur, 0)
  return Math.round(soma / validas.length)
}

/**
 * Calcula a Taxa Metabólica Basal (TMB / BMR) baseada nas medidas vitais:
 * - Se massa magra disponível: Katch-McArdle
 * - Caso contrário: Mifflin-St Jeor
 */
export function calcularTMB({
  pesoKg,
  alturaCm,
  idade,
  sexo = 'MASCULINO',
  massaMagraKg,
}: {
  pesoKg?: number | null
  alturaCm?: number | null
  idade?: number | null
  sexo?: 'MASCULINO' | 'FEMININO' | null
  massaMagraKg?: number | null
}): number {
  if (massaMagraKg && massaMagraKg > 0) {
    return Math.round(370 + 21.6 * massaMagraKg)
  }
  const p = pesoKg && pesoKg > 0 ? pesoKg : 75
  const a = alturaCm && alturaCm > 0 ? alturaCm : 175
  const i = idade && idade > 0 ? idade : 30

  if (sexo === 'FEMININO') {
    return Math.round(10 * p + 6.25 * a - 5 * i - 161)
  }
  return Math.round(10 * p + 6.25 * a - 5 * i + 5)
}

