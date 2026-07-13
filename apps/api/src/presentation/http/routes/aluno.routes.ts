import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role, AcademiaStatus } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError, TenantAccessError } from '../../../domain/errors/AppError.js'
import { obterCorrelacoes, calcularEAtualizar } from '../../../application/usecases/correlacao/CorrelacaoService.js'

function calcularIMC(pesoKg: number, alturaCm: number): number | null {
  if (!pesoKg || !alturaCm || alturaCm <= 0) return null
  return parseFloat((pesoKg / ((alturaCm / 100) ** 2)).toFixed(2))
}

async function resolveAluno(usuarioId: string) {
  return prisma.aluno.upsert({
    where: { usuario_id: usuarioId },
    create: { usuario_id: usuarioId },
    update: {},
  })
}

export async function alunoRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.ALUNO)]

  /** POST /alunos/perfil — UC-17 */
  app.post('/perfil', { preHandler: [app.authenticate] }, async (request, reply) => {
    const usuarioId = request.currentUser.sub
    const body = z.object({
      dataNascimento: z.string().optional(),
      pesoKg: z.number().positive().optional(),
      alturaCm: z.number().positive().optional(),
    }).parse(request.body || {})

    const existente = await prisma.aluno.findUnique({ where: { usuario_id: usuarioId } })
    if (existente) return reply.status(200).send(existente)

    const imc = body.pesoKg && body.alturaCm ? calcularIMC(body.pesoKg, body.alturaCm) : null

    const aluno = await prisma.aluno.create({
      data: {
        usuario_id: usuarioId,
        data_nascimento: body.dataNascimento ? new Date(body.dataNascimento) : undefined,
        peso_kg: body.pesoKg,
        altura_cm: body.alturaCm,
      },
    })

    if (body.pesoKg && body.alturaCm) {
      await prisma.medidaCorporal.create({
        data: {
          aluno_id: aluno.id,
          peso_kg: body.pesoKg,
          altura_cm: body.alturaCm,
          imc,
        },
      })
    }

    return reply.status(201).send(aluno)
  })

  /** PATCH /alunos/academia — Vincula o aluno logado a uma academia */
  app.patch('/academia', { preHandler }, async (request, reply) => {
    const { academiaId } = z.object({ academiaId: z.string() }).parse(request.body)
    const academia = await prisma.academia.findUnique({ where: { id: academiaId } })
    if (!academia) throw new NotFoundError('Academia não encontrada')
    if (academia.status !== AcademiaStatus.ATIVO) throw new NotFoundError('Academia não está ativa')
    const aluno = await resolveAluno(request.currentUser.sub)
    const updated = await prisma.aluno.update({
      where: { id: aluno.id },
      data: { academia_id: academiaId },
    })
    return reply.status(200).send(updated)
  })

  /** GET /alunos/perfil — Retorna perfil do aluno com professor e academia */
  app.get('/perfil', { preHandler }, async (request, reply) => {
    await resolveAluno(request.currentUser.sub)
    const aluno = await prisma.aluno.findUnique({
      where: { usuario_id: request.currentUser.sub },
      include: {
        professor: { select: { usuario: { select: { nome: true, email: true, telefone: true } } } },
        academia: { select: { nome: true } },
      },
    })
    if (!aluno) throw new NotFoundError('Aluno')

    return reply.status(200).send(aluno)
  })

  /** GET /alunos/treinos — lista treinos do aluno */
  app.get('/treinos', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const treinos = await prisma.treino.findMany({
      where: { aluno_id: aluno.id },
      include: { exercicios: { include: { exercicio: true } } },
      orderBy: { atualizado_em: 'desc' },
    })
    return reply.status(200).send(treinos)
  })

  /** POST /alunos/medidas — UC-24 */
  app.post('/medidas', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const body = z.object({
      pesoKg: z.number().positive().optional(),
      alturaCm: z.number().positive().optional(),
      percentualBf: z.number().min(0).max(100).optional(),
      massaMagraKg: z.number().positive().optional(),
      observacao: z.string().optional(),
    }).parse(request.body)

    const imc = body.pesoKg && body.alturaCm ? calcularIMC(body.pesoKg, body.alturaCm) : null

    const medida = await prisma.medidaCorporal.create({
      data: {
        aluno_id: aluno.id,
        peso_kg: body.pesoKg,
        altura_cm: body.alturaCm,
        percentual_bf: body.percentualBf,
        massa_magra_kg: body.massaMagraKg,
        imc,
        observacao: body.observacao,
      },
    })
    return reply.status(201).send(medida)
  })

  /** GET /alunos/medidas — UC-25 */
  app.get('/medidas', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const medidas = await prisma.medidaCorporal.findMany({
      where: { aluno_id: aluno.id },
      orderBy: { data: 'asc' },
    })
    return reply.status(200).send(medidas)
  })

  /** PATCH /alunos/medidas/:id — Editar uma medida existente */
  app.patch('/medidas/:id', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)
    const { id } = z.object({ id: z.string() }).parse(request.params)

    const medida = await prisma.medidaCorporal.findFirst({
      where: { id, aluno_id: aluno.id },
    })
    if (!medida) throw new NotFoundError('Medida')

    const body = z.object({
      pesoKg: z.number().positive().optional(),
      alturaCm: z.number().positive().optional(),
      percentualBf: z.number().min(0).max(100).optional(),
      massaMagraKg: z.number().positive().optional(),
      observacao: z.string().optional(),
    }).parse(request.body)

    const pesoFinal = body.pesoKg ?? medida.peso_kg
    const alturaFinal = body.alturaCm ?? medida.altura_cm
    const imc = pesoFinal && alturaFinal ? calcularIMC(pesoFinal, alturaFinal) : medida.imc

    const updated = await prisma.medidaCorporal.update({
      where: { id },
      data: {
        peso_kg: body.pesoKg !== undefined ? body.pesoKg : medida.peso_kg,
        altura_cm: body.alturaCm !== undefined ? body.alturaCm : medida.altura_cm,
        percentual_bf: body.percentualBf !== undefined ? body.percentualBf : medida.percentual_bf,
        massa_magra_kg: body.massaMagraKg !== undefined ? body.massaMagraKg : medida.massa_magra_kg,
        imc,
        observacao: body.observacao !== undefined ? body.observacao : medida.observacao,
      },
    })
    return reply.status(200).send(updated)
  })

  /** GET /alunos/notificacoes — Lista notificações não lidas */
  app.get('/notificacoes', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const notificacoes = await prisma.notificacao.findMany({
      where: { aluno_id: aluno.id, lida: false },
      orderBy: { criado_em: 'desc' },
    })
    return reply.status(200).send(notificacoes)
  })

  /** POST /alunos/notificacoes/visualizar — Marca notificações como lidas */
  app.post('/notificacoes/visualizar', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    await prisma.notificacao.updateMany({
      where: { aluno_id: aluno.id, lida: false },
      data: { lida: true },
    })
    return reply.status(204).send()
  })

  /** GET /alunos/correlacoes — UC-32 (lê cache, sugere atualização após 30d) */
  app.get('/correlacoes', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const resultado = await obterCorrelacoes(aluno.id)
    return reply.status(200).send(resultado)
  })

  /** POST /alunos/correlacoes — Força recálculo das correlações */
  app.post('/correlacoes', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const calculado = await calcularEAtualizar(aluno.id)
    if (!calculado) {
      const cache = await obterCorrelacoes(aluno.id)
      return reply.status(200).send({ ...cache, mensagem: 'Dados insuficientes para calcular correlações.' })
    }

    const resultado = await obterCorrelacoes(aluno.id)
    return reply.status(200).send(resultado)
  })
}
