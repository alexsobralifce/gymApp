import { describe, it, expect } from 'vitest'
import { refinarComJev } from '../../src/application/usecases/treino/importacao/refinadorJev.js'
import type { ExercicioPrevia } from '../../src/application/usecases/treino/importacao/ImportacaoTreinoService.js'
import { respostasDe, type ClienteJev } from '../../src/infrastructure/ia/typesafe.js'

const item = (over: Partial<ExercicioPrevia>): ExercicioPrevia => ({
  textoOriginal: 'x',
  nomeProvavel: 'x',
  status: 'duvida',
  exercicioId: 'a',
  series: 3,
  repeticoes: 10,
  cargaSugeridaKg: null,
  observacoes: null,
  candidatos: [
    { exercicioId: 'a', nome: 'Rosca Direta', nota: 0.6 },
    { exercicioId: 'b', nome: 'Rosca Alternada', nota: 0.58 },
  ],
  ...over,
})

const jevCom = (answers: Record<string, object>): ClienteJev => ({ perguntar: async () => respostasDe({ answers }) })

describe('refinarComJev', () => {
  it('promove a dúvida a ok quando o Jev escolhe com confiança alta', async () => {
    const r = await refinarComJev([item({})], jevCom({ esc0: { type: 'choice', choice: 'c1', confidence: 0.95, probabilities: {} } }))
    expect(r[0]).toMatchObject({ status: 'ok', exercicioId: 'b' })
    expect(r[0].candidatos[0].exercicioId).toBe('b')
  })

  it('mantém dúvida, mas reordena, quando a confiança é baixa', async () => {
    const r = await refinarComJev([item({})], jevCom({ esc0: { type: 'choice', choice: 'c1', confidence: 0.5, probabilities: {} } }))
    expect(r[0]).toMatchObject({ status: 'duvida', exercicioId: 'b' })
  })

  it('vira nao_encontrado quando o Jev diz "nenhum" com confiança', async () => {
    const r = await refinarComJev([item({})], jevCom({ esc0: { type: 'choice', choice: 'nenhum', confidence: 0.9, probabilities: {} } }))
    expect(r[0]).toMatchObject({ status: 'nao_encontrado', exercicioId: null })
  })

  it('remove linhas que não são exercício e nunca mexe em itens já ok', async () => {
    const itens = [item({ status: 'nao_encontrado', exercicioId: null, candidatos: [] }), item({ status: 'ok', exercicioId: 'z' })]
    const r = await refinarComJev(itens, jevCom({ ex0: { type: 'noul', noul: 0.02 } }))
    expect(r).toHaveLength(1)
    expect(r[0].exercicioId).toBe('z')
  })

  it('não chama o Jev quando tudo já está ok', async () => {
    let chamadas = 0
    const jev: ClienteJev = { perguntar: async () => { chamadas++; return respostasDe({}) } }
    await refinarComJev([item({ status: 'ok' })], jev)
    expect(chamadas).toBe(0)
  })
})
