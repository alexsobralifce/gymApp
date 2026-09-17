function formatarDuracao(segundos: number | null): string {
  if (!segundos || segundos <= 0) return 'tempo não registrado'
  const horas = Math.floor(segundos / 3600)
  const minutos = Math.round((segundos % 3600) / 60)
  if (horas > 0) return `${horas}h${minutos > 0 ? ` ${minutos}min` : ''}`
  return `${minutos}min`
}

/** Gera a legenda automática de um post de treino concluído, sempre incluindo
 *  nome do treino, tempo total, data, local e calorias — mesmo sem foto anexada. */
export function gerarLegendaTreinoConcluido(params: {
  nomeTreino: string
  duracaoSegundos: number | null
  caloriasQueimadas: number | null
  finalizadoEm: Date
  academiaNome: string | null
}): string {
  const { nomeTreino, duracaoSegundos, caloriasQueimadas, finalizadoEm, academiaNome } = params

  const tempoTexto = formatarDuracao(duracaoSegundos)
  const dataTexto = finalizadoEm.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const localTexto = academiaNome ?? 'treino livre'
  const caloriasTexto = caloriasQueimadas != null ? `${Math.round(caloriasQueimadas)} kcal` : 'não registradas'

  return `💪 Concluiu o treino "${nomeTreino}" · ⏱️ ${tempoTexto} · 📅 ${dataTexto} · 📍 ${localTexto} · 🔥 ${caloriasTexto}`
}
