/**
 * exerciseFormatter.ts
 * Utilitário frontend para formatar e lapidar passos de execução dos exercícios
 * em linguagem simples, didática e motivadora de Personal Trainer.
 */

export function formatExerciseStep(step: string): string {
  if (!step || typeof step !== 'string') return ''

  let s = step.trim()

  const phraseReplacements: [RegExp, string][] = [
    [/Lower seus body dentro de a squat posicao/gi, 'Abaixe o corpo na posição de agachamento'],
    [/Lower your body into a squat position/gi, 'Abaixe o corpo na posição de agachamento'],
    [/Lower your body/gi, 'Abaixe o corpo'],
    [/Lower seus body/gi, 'Abaixe o corpo'],
    [/dentro de a squat posicao/gi, 'na posição de agachamento'],
    [/tracking over seus toes/gi, 'alinhados na direção das pontas dos pés'],
    [/reach o bottom of o squat/gi, 'atingir o ponto mais baixo do agachamento'],
    [/o bottom of o/gi, 'o ponto mais baixo do'],
    [/explosively drive through suas pernas/gi, 'empurre o chão com força total pelas pernas'],
    [/push a barra overhead/gi, 'empurre a barra para cima da cabeça'],
    [/reaches seu peak/gi, 'atingir o ponto mais alto'],
    [/drop dentro de a split posicao/gi, 'entre rapidamente na posição de afundo'],
    [/one foot para frente e one foot back/gi, 'um pé à frente e o outro pé atrás'],
    [/Catch a barra overhead/gi, 'Sustente a barra acima da cabeça'],
    [/com seus bracos completamente estendido/gi, 'com os braços completamente estendidos'],
    [/costas knee ligeiramente touching o chao/gi, 'joelho de trás quase tocando o chão'],
    [/Stand up from o split posicao/gi, 'Fique de pé unindo os pés'],
    [/trazendo seus pes back juntos/gi, 'trazendo os pés juntos de volta'],
    [/Lower a barra back to seus ombros/gi, 'Abaixe a barra de volta para a altura dos ombros'],
    [/Repita pelo numero desejado de repeticoes/gi, 'Repita pelo número de repetições prescrito']
  ]

  for (const [pattern, replacement] of phraseReplacements) {
    s = s.replace(pattern, replacement)
  }

  const wordReplacements: [RegExp, string][] = [
    [/\bsquat\b/gi, 'agachamento'],
    [/\bposicao\b/gi, 'posição'],
    [/\bpes\b/gi, 'pés'],
    [/\bvoce\b/gi, 'você'],
    [/\b overhead\b/gi, ' acima da cabeça'],
    [/\bsplit\b/gi, 'afundo'],
    [/\bbracos\b/gi, 'braços'],
    [/\bestendido\b/gi, 'estendidos'],
    [/\bknee\b/gi, 'joelho'],
    [/\bknees\b/gi, 'joelhos'],
    [/\bchao\b/gi, 'chão'],
    [/\btoes\b/gi, 'pontas dos pés'],
    [/\bligeiramente\b/gi, 'levemente'],
    [/\brepeticoes\b/gi, 'repetições'],
    [/\bnumero\b/gi, 'número'],
    [/\bexercicio\b/gi, 'exercício'],
    [/\bexercicios\b/gi, 'exercícios'],
    [/\bmaquina\b/gi, 'máquina'],
    [/\bmaos\b/gi, 'mãos'],
    [/\bcabeca\b/gi, 'cabeça'],
    [/\bmusculo\b/gi, 'músculo'],
    [/\bmusculos\b/gi, 'músculos'],
    [/\babdomen\b/gi, 'abdômen'],
    [/\bcontracao\b/gi, 'contração'],
    [/\bextensao\b/gi, 'extensão'],
    [/\bflexao\b/gi, 'flexão'],
    [/\belevacao\b/gi, 'elevação']
  ]

  for (const [pattern, replacement] of wordReplacements) {
    s = s.replace(pattern, replacement)
  }

  s = s.replace(/\s+/g, ' ').trim()
  if (s.length > 0) {
    s = s.charAt(0).toUpperCase() + s.slice(1)
    if (!/[.!?]$/.test(s)) s += '.'
  }
  return s
}

export function formatExerciseStepsList(steps: string[]): string[] {
  if (!Array.isArray(steps)) return []
  return steps.map(formatExerciseStep).filter(Boolean)
}
