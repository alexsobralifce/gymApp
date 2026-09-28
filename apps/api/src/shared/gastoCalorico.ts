/**
 * Gasto calórico estimado por METs (sem frequência cardíaca).
 *
 * Base: Compendium of Physical Activities (Ainsworth et al., 2011), categoria 02 —
 * "Conditioning Exercise", treino resistido; e ACSM (1 MET = 3,5 mL O2·kg⁻¹·min⁻¹,
 * ≈ 1 kcal·kg⁻¹·h⁻¹).
 *
 *   kcal = MET × peso (kg) × tempo (h)
 *
 * Os METs do Compêndio para musculação são medidos sobre a sessão inteira, já
 * incluindo os intervalos entre séries. Por isso o tempo usado é o tempo total do
 * treino (início → fim) e não apenas o tempo sob tensão. O resultado é gasto
 * bruto (inclui o repouso de 1 MET), como no Compêndio.
 *
 * ATENÇÃO: manter em sincronia com apps/web/src/lib/gastoCalorico.ts.
 */

/** Compêndio 2011 — treino resistido, esforço leve/moderado (8-15 reps, cargas variadas). */
export const MET_MUSCULACAO_LEVE_MODERADO = 3.5
/** Compêndio 2011 — treino resistido, powerlifting/bodybuilding, esforço vigoroso. */
export const MET_MUSCULACAO_VIGOROSO = 6.0

/** Sessões acima disso costumam ser treino esquecido aberto; limita a superestimativa. */
export const DURACAO_MAXIMA_SEGUNDOS = 3 * 60 * 60

/**
 * Classificação de intensidade: só usa valores tabelados, sem interpolar.
 * Sem avaliação, adota o valor conservador (leve/moderado).
 */
export function metMusculacao(avaliacaoDificuldade?: string | null): number {
  return avaliacaoDificuldade === 'INTENSO' || avaliacaoDificuldade === 'MUITO_INTENSO'
    ? MET_MUSCULACAO_VIGOROSO
    : MET_MUSCULACAO_LEVE_MODERADO
}

/** kcal = MET × kg × h. Retorna null sem peso ou duração válidos (não inventa valores). */
export function calcularGastoCalorico({
  met,
  pesoKg,
  duracaoSegundos,
}: {
  met: number
  pesoKg?: number | null
  duracaoSegundos?: number | null
}): number | null {
  if (!pesoKg || pesoKg <= 0 || !duracaoSegundos || duracaoSegundos <= 0) return null
  const horas = Math.min(duracaoSegundos, DURACAO_MAXIMA_SEGUNDOS) / 3600
  return Math.round(met * pesoKg * horas)
}
