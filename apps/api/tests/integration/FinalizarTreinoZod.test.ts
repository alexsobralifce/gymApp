import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma } from '../../src/infrastructure/database/prisma.js'
import { Role, TreinoStatus } from '@prisma/client'
import type { FastifyInstance } from 'fastify'

describe('Validação da rota POST /treinos/:id/finalizar', () => {
  let app: FastifyInstance
  let usuario: any
  let tokenAluno: string
  let treino: any

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    usuario = await prisma.usuario.create({
      data: {
        email: `aluno-finalizar-${Date.now()}@teste.com`,
        nome: 'Aluno Finalizar Teste',
        role: Role.ALUNO,
        ativo: true,
        email_verified: true,
        aluno: { create: {} },
      },
      include: { aluno: true },
    })

    tokenAluno = app.jwt.sign({
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
    })

    treino = await prisma.treino.create({
      data: {
        aluno_id: usuario.aluno.id,
        nome: 'Treino Teste Finalizar',
        status: TreinoStatus.EM_EXECUCAO,
        iniciado_em: new Date(),
        dias_semana: [1],
      },
    })
  })

  afterAll(async () => {
    if (treino?.id) {
      await prisma.treinoHistorico.deleteMany({ where: { treino_id: treino.id } })
      await prisma.treino.delete({ where: { id: treino.id } }).catch(() => {})
    }
    if (usuario?.id) {
      await prisma.aluno.deleteMany({ where: { usuario_id: usuario.id } })
      await prisma.usuario.delete({ where: { id: usuario.id } }).catch(() => {})
    }
    await app.close()
  })

  it('aceita payload com calorias e frequencia cardíaca zeradas (0) sem erro 422', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/treinos/${treino.id}/finalizar`,
      headers: { authorization: `Bearer ${tokenAluno}` },
      payload: {
        caloriasQueimadas: 0,
        frequenciaCardiacaMedia: 0,
        frequenciaCardiacaMaxima: 0,
        notaAvaliacao: 5,
        feedbackComentario: 'Treino top!',
      },
    })

    expect(res.statusCode).not.toBe(422)
    expect(res.statusCode).toBe(200)
  })
})
