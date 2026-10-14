import { describe, it, expect, vi } from 'vitest'

vi.mock('../../src/infrastructure/database/prisma.js', () => ({ prisma: {} }))
vi.mock('../../src/shared/env.js', () => ({ env: { OPENAI_API_KEY: '', IMPORTACAO_TREINO_MODELO: 'teste' } }))

import { gerarPrevia, gerarPreviaDeArquivo } from '../../src/application/usecases/treino/importacao/ImportacaoTreinoService.js'
import type { ClienteIA } from '../../src/infrastructure/ia/openai.js'
import type { ExercicioCatalogo } from '../../src/application/usecases/treino/importacao/casadorExercicios.js'

const ex = (id: string, nome: string): ExercicioCatalogo => ({ id, nome, grupo_muscular: null, equipamento: null, imagem_url: null, gif_url: null })
const catalogo = [ex('1', 'Supino Reto com Barra'), ex('2', 'Puxada Alta'), ex('3', 'Agachamento Livre')]

const clienteCom = (resp: Awaited<ReturnType<ClienteIA['gerar']>>): ClienteIA => ({ gerar: async () => resp })

const resposta = {
  treinos: [
    {
      rotulo: 'Segunda - Peito',
      diasSemana: [1],
      exercicios: [
        { textoOriginal: 'Supino reto c/ barra 4x10', nomeProvavel: 'Supino reto com barra', series: 4, repeticoes: 10, cargaKg: null, observacao: null },
        { textoOriginal: 'Levantamento de mamute 3x8', nomeProvavel: 'Levantamento de mamute', series: 3, repeticoes: 8, cargaKg: 20, observacao: 'até a falha' },
      ],
    },
    { rotulo: 'Vazio', diasSemana: [], exercicios: [] },
  ],
}

describe('gerarPrevia', () => {
  it('estrutura o texto, reconhece exercícios, mantém a ordem e descarta treinos vazios', async () => {
    const r = await gerarPrevia('texto qualquer da ficha', { cliente: clienteCom({ texto: JSON.stringify(resposta) }), catalogo, jev: null })
    expect(r.treinos).toHaveLength(1)
    const [a, b] = r.treinos[0].exercicios
    expect(a).toMatchObject({ status: 'ok', exercicioId: '1', series: 4, repeticoes: 10 })
    expect(b).toMatchObject({ status: 'nao_encontrado', exercicioId: null, cargaSugeridaKg: 20, observacoes: 'até a falha' })
  })

  it('devolve erro 422 amigável quando a IA recusa', async () => {
    await expect(gerarPrevia('texto qualquer da ficha', { cliente: clienteCom({ recusa: 'não posso' }), catalogo })).rejects.toMatchObject({ statusCode: 422 })
  })

  it('devolve erro 422 amigável quando o JSON é inválido', async () => {
    await expect(gerarPrevia('texto qualquer da ficha', { cliente: clienteCom({ texto: '{"treinos": "x"}' }), catalogo })).rejects.toMatchObject({ statusCode: 422 })
    await expect(gerarPrevia('texto qualquer da ficha', { cliente: clienteCom({ texto: 'não é json' }), catalogo })).rejects.toMatchObject({ statusCode: 422 })
  })
})

describe('gerarPrevia sem chave da OpenAI', () => {
  it('responde 503 quando não há cliente nem OPENAI_API_KEY', async () => {
    await expect(gerarPrevia('texto qualquer da ficha', { catalogo })).rejects.toMatchObject({ statusCode: 503 })
  })
})

describe('gerarPreviaDeArquivo', () => {
  it('Markdown entra como texto e foto vai como anexo', async () => {
    const vistos: Array<{ usuario: string; anexos?: unknown[] }> = []
    const cliente: ClienteIA = { gerar: async (a) => { vistos.push({ usuario: a.usuario, anexos: a.anexos }); return { texto: JSON.stringify(resposta) } } }
    await gerarPreviaDeArquivo(Buffer.from('# Segunda\nSupino reto 4x10'), 'ficha.md', { cliente, catalogo, jev: null })
    await gerarPreviaDeArquivo(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]), 'foto.jpg', { cliente, catalogo, jev: null })
    expect(vistos[0].usuario).toContain('Supino reto 4x10')
    expect(vistos[0].anexos).toBeUndefined()
    expect(vistos[1].anexos).toHaveLength(1)
  })
})
