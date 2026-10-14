// Segunda opinião semântica sobre o casamento lexical: o Jev escolhe entre os candidatos do catálogo
// nos casos duvidosos e aponta linhas que não são exercício. Se o Jev falhar, vale o resultado lexical.
import type { ClienteJev, PerguntaJev } from '../../../../infrastructure/ia/typesafe.js'
import type { ExercicioPrevia } from './ImportacaoTreinoService.js'

export const CONFIANCA_ESCOLHA = 0.8
export const LIMITE_NAO_EXERCICIO = 0.1
const LOTE = 20
const NENHUM = 'nenhum'

interface ItemEstado {
  textoOriginal: string
  nomeProvavel: string
  candidatos: string[]
}

function perguntasDoItem(i: number, previa: ExercicioPrevia): Record<string, PerguntaJev> {
  const ref = `itens[${i}]`
  const perguntas: Record<string, PerguntaJev> = {}
  if (previa.status === 'nao_encontrado') {
    perguntas[`ex${i}`] = {
      type: 'noul',
      instructions: `\`${ref}.textoOriginal\` é uma linha de exercício de treino de musculação ou condicionamento (e não um título, comentário, aquecimento genérico, aviso ou lixo de formatação)?`,
    }
  }
  if (previa.candidatos.length > 0) {
    const criteria: Record<string, string | null> = {}
    previa.candidatos.forEach((_, k) => {
      criteria[`c${k}`] = `É o exercício \`${ref}.candidatos[${k}]\`.`
    })
    criteria[NENHUM] = 'Nenhum dos candidatos é o mesmo exercício da linha (outro movimento, outro equipamento ou outro músculo).'
    perguntas[`esc${i}`] = {
      type: 'choice',
      instructions: `Qual candidato é o mesmo exercício de \`${ref}.textoOriginal\` (nome provável: \`${ref}.nomeProvavel\`)? Considere movimento, equipamento e músculo; variações de equipamento diferentes não são o mesmo exercício.`,
      criteria,
    }
  }
  return perguntas
}

/** Devolve a prévia refinada; itens que o Jev considera "não é exercício" saem da lista. */
export async function refinarComJev(exercicios: ExercicioPrevia[], jev: ClienteJev): Promise<ExercicioPrevia[]> {
  const resultado = [...exercicios]
  const remover = new Set<number>()

  for (let inicio = 0; inicio < exercicios.length; inicio += LOTE) {
    const lote = exercicios.slice(inicio, inicio + LOTE)
    const estado: { itens: ItemEstado[] } = {
      itens: lote.map((e) => ({ textoOriginal: e.textoOriginal, nomeProvavel: e.nomeProvavel, candidatos: e.candidatos.map((c) => c.nome) })),
    }
    const perguntas: Record<string, PerguntaJev> = {}
    lote.forEach((e, i) => {
      if (e.status !== 'ok') Object.assign(perguntas, perguntasDoItem(i, e))
    })
    if (Object.keys(perguntas).length === 0) continue

    const respostas = await jev.perguntar(estado, perguntas)
    lote.forEach((e, i) => {
      if (e.status === 'ok') return
      const global = inicio + i
      const ex = respostas.noul(`ex${i}`)
      if (ex !== undefined && ex < LIMITE_NAO_EXERCICIO) {
        remover.add(global)
        return
      }
      const esc = respostas.choice(`esc${i}`)
      if (!esc) return
      if (esc.choice === NENHUM) {
        if (esc.confidence >= CONFIANCA_ESCOLHA) resultado[global] = { ...e, status: 'nao_encontrado', exercicioId: null }
        return
      }
      const k = Number(esc.choice.slice(1))
      const escolhido = e.candidatos[k]
      if (!escolhido) return
      // Com confiança alta o Jev resolve a dúvida; senão só reordena para o certo vir primeiro.
      const candidatos = [escolhido, ...e.candidatos.filter((_, j) => j !== k)]
      resultado[global] =
        esc.confidence >= CONFIANCA_ESCOLHA
          ? { ...e, status: 'ok', exercicioId: escolhido.exercicioId, candidatos }
          : { ...e, status: 'duvida', exercicioId: escolhido.exercicioId, candidatos }
    })
  }
  return resultado.filter((_, i) => !remover.has(i))
}
