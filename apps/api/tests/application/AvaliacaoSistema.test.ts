import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import fastifyJwt from '@fastify/jwt'
import { Role, TreinoStatus } from '@prisma/client'

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      aluno: { findUnique: vi.fn() },
      avaliacaoSistema: { create: vi.fn() },
      treino: { findUnique: vi.fn() },
      treinoHistorico: { count: vi.fn() },
      $transaction: vi.fn(),
    },
  }
})

vi.mock('../../src/infrastructure/database/prisma.js', () => ({
  prisma: mockPrisma,
}))

import { jwtAuthPlugin } from '../../src/presentation/middlewares/jwtAuth.js'
import { avaliacaoSistemaRoutes } from '../../src/presentation/http/routes/avaliacao-sistema.routes.js'
import { finalizarTreino } from '../../src/application/usecases/treino/TreinoService.js'

async function buildTestApp() {
  const app = Fastify({ logger: false })
  await app.register(fastifyJwt, { secret: 'test-secret' })
  await app.register(jwtAuthPlugin)
  await app.register(avaliacaoSistemaRoutes)
  await app.ready()
  return app
}

function alunoToken(app: FastifyInstance, sub = 'user-1') {
  return app.jwt.sign({ sub, role: Role.ALUNO })
}

const bodyValido = {
  nota: 5,
  respostas: { criar_treino: 5, navegacao: 4, execucao: 5, recomendacao: 4 },
  mensagem: 'Ótimo app',
}

describe('POST /avaliacoes/sistema', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildTestApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('rejeita nota fora de 1-5 com 400', async () => {
    mockPrisma.aluno.findUnique.mockResolvedValue({ id: 'aluno-1' })

    const res = await app.inject({
      method: 'POST',
      url: '/avaliacoes/sistema',
      headers: { authorization: `Bearer ${alunoToken(app)}` },
      payload: { ...bodyValido, nota: 6 },
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.error).toBe('VALIDATION_ERROR')
    expect(body.details.nota).toBeTruthy()
  })

  it('rejeita respostas ausentes com 400', async () => {
    mockPrisma.aluno.findUnique.mockResolvedValue({ id: 'aluno-1' })

    const res = await app.inject({
      method: 'POST',
      url: '/avaliacoes/sistema',
      headers: { authorization: `Bearer ${alunoToken(app)}` },
      payload: { nota: 4 },
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.error).toBe('VALIDATION_ERROR')
    expect(body.details.respostas).toBeTruthy()
  })

  it('cria avaliação com sucesso e retorna { id }', async () => {
    mockPrisma.aluno.findUnique.mockResolvedValue({ id: 'aluno-1', usuario_id: 'user-1' })
    mockPrisma.avaliacaoSistema.create.mockResolvedValue({ id: 'avaliacao-1' })

    const res = await app.inject({
      method: 'POST',
      url: '/avaliacoes/sistema',
      headers: { authorization: `Bearer ${alunoToken(app)}` },
      payload: bodyValido,
    })

    expect(res.statusCode).toBe(201)
    expect(JSON.parse(res.body)).toEqual({ id: 'avaliacao-1' })
    expect(mockPrisma.aluno.findUnique).toHaveBeenCalledWith({ where: { usuario_id: 'user-1' } })
    expect(mockPrisma.avaliacaoSistema.create).toHaveBeenCalledWith({
      data: {
        aluno_id: 'aluno-1',
        nota: 5,
        respostas: { criar_treino: 5, navegacao: 4, execucao: 5, recomendacao: 4 },
        mensagem: 'Ótimo app',
      },
      select: { id: true },
    })
  })
})

describe('finalizarTreino — detecção de primeiroTreino', () => {
  const treinoEmExecucao = {
    id: 'treino-1',
    aluno_id: 'aluno-1',
    nome: 'Treino A',
    status: TreinoStatus.EM_EXECUCAO,
    iniciado_em: new Date(),
    finalizado_em: null,
  }

  const treinoFinalizado = {
    id: 'treino-1',
    aluno_id: 'aluno-1',
    nome: 'Treino A',
    status: TreinoStatus.ACEITO,
    exercicios: [],
  }

  function mockFinalizacao() {
    mockPrisma.treino.findUnique.mockResolvedValue(treinoEmExecucao)
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<unknown>) => {
      const tx = {
        treino: {
          update: vi.fn().mockResolvedValue({}),
          findUnique: vi.fn().mockResolvedValue(treinoFinalizado),
        },
        treinoHistorico: { create: vi.fn().mockResolvedValue({}) },
      }
      return cb(tx)
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFinalizacao()
  })

  it('retorna primeiroTreino=true na primeira conclusão', async () => {
    mockPrisma.treinoHistorico.count.mockResolvedValue(0)

    const result = await finalizarTreino('treino-1', 'aluno-1')

    expect(result.primeiroTreino).toBe(true)
    expect(mockPrisma.treinoHistorico.count).toHaveBeenCalledWith({
      where: {
        treino: { aluno_id: 'aluno-1' },
        status_novo: TreinoStatus.CONCLUIDO,
      },
    })
  })

  it('retorna primeiroTreino=false quando já há conclusões anteriores', async () => {
    mockPrisma.treinoHistorico.count.mockResolvedValue(1)

    const result = await finalizarTreino('treino-1', 'aluno-1')

    expect(result.primeiroTreino).toBe(false)
  })

  it('mantém os demais campos do treino na resposta', async () => {
    mockPrisma.treinoHistorico.count.mockResolvedValue(0)

    const result = await finalizarTreino('treino-1', 'aluno-1')

    expect(result).toEqual({ ...treinoFinalizado, primeiroTreino: true })
  })
})
