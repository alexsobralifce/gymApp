import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role, VinculoStatus, AcademiaStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError, ForbiddenError, ConflictError } from '../../../domain/errors/AppError.js'
import {
  painelGlobal,
  aprovacaoAcademia,
  definirLimiteProfessores,
  aprovacaoVinculoProfessor,
  alterarStatusAcademia,
} from '../../../application/usecases/academia/AcademiaService.js'

const execAsync = promisify(exec)

export async function rootRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.ROOT)]

  /** GET /root/painel — UC-04 */
  app.get('/painel', { preHandler }, async (_request, reply) => {
    const data = await painelGlobal()
    return reply.status(200).send(data)
  })

  /** GET /root/vinculos — lista vínculos pendentes (2ª camada) */
  app.get('/vinculos', { preHandler }, async (_request, reply) => {
    const vinculos = await prisma.professorAcademia.findMany({
      where: { status: VinculoStatus.PENDENTE_ROOT },
      include: {
        professor: { include: { usuario: { select: { nome: true, email: true } } } },
        academia: { select: { id: true, nome: true } },
      },
      orderBy: { criado_em: 'asc' },
    })
    return reply.status(200).send(vinculos)
  })

  /** PATCH /root/academias/:id/aprovacao — UC-01 */
  app.patch('/academias/:id/aprovacao', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { acao, motivo } = z.object({
      acao: z.enum(['APROVAR', 'REJEITAR']),
      motivo: z.string().optional(),
    }).parse(request.body)

    const academia = await aprovacaoAcademia(id, acao, motivo)
    return reply.status(200).send(academia)
  })

  /** PATCH /root/academias/:id/limite-professores — UC-02 */
  app.patch('/academias/:id/limite-professores', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { limite } = z.object({ limite: z.number().int().min(1).max(500) }).parse(request.body)

    const academia = await definirLimiteProfessores(id, limite)
    return reply.status(200).send(academia)
  })

  /** PATCH /root/vinculos/:id/aprovacao — UC-03 */
  app.patch('/vinculos/:id/aprovacao', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { acao } = z.object({ acao: z.enum(['APROVAR', 'REJEITAR']) }).parse(request.body)

    const vinculo = await aprovacaoVinculoProfessor(id, acao)
    return reply.status(200).send(vinculo)
  })

  /** PATCH /root/academias/:id/status */
  app.patch('/academias/:id/status', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { status } = z.object({ status: z.enum([AcademiaStatus.ATIVO, AcademiaStatus.REJEITADO]) }).parse(request.body)

    const academia = await alterarStatusAcademia(id, status)
    return reply.status(200).send(academia)
  })

  /** GET /root/usuarios — lista todos os usuários */
  app.get('/usuarios', { preHandler }, async (_request, reply) => {
    const usuarios = await prisma.usuario.findMany({
      include: {
        academia: true,
        professor: true,
        aluno: true,
      },
      orderBy: { criado_em: 'desc' },
    })
    return reply.status(200).send(usuarios)
  })

  /** POST /root/usuarios/:id/reset-password — reseta senha */
  app.post('/usuarios/:id/reset-password', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { senha } = z.object({ senha: z.string().min(8) }).parse(request.body)

    const usuario = await prisma.usuario.findUnique({ where: { id } })
    if (!usuario) throw new NotFoundError('Usuário não encontrado')
    if (usuario.role === Role.ROOT) throw new ForbiddenError('Não é permitido resetar a senha de outro administrador ROOT')

    const senhaHash = await bcrypt.hash(senha, 12)
    await prisma.usuario.update({
      where: { id },
      data: { senha_hash: senhaHash },
    })

    return reply.status(200).send({ message: 'Senha resetada com sucesso!' })
  })

  /** GET /root/academias — lista todas as academias */
  app.get('/academias', { preHandler }, async (_request, reply) => {
    const academias = await prisma.academia.findMany({
      include: {
        usuario: { select: { id: true, email: true, nome: true } },
        _count: { select: { professores: true, alunos: true } },
      },
      orderBy: { criado_em: 'desc' },
    })
    return reply.status(200).send(academias)
  })

  /** PUT /root/academias/:id — atualiza academia */
  app.put('/academias/:id', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const body = z.object({
      nome: z.string().min(1).optional(),
      cnpj: z.string().min(1).optional(),
      max_professores: z.number().int().min(1).max(500).optional(),
      status: z.enum([AcademiaStatus.ATIVO, AcademiaStatus.PENDENTE, AcademiaStatus.REJEITADO]).optional(),
      email: z.string().email().optional(),
    }).parse(request.body)

    const academia = await prisma.academia.findUnique({
      where: { id },
      include: { usuario: { select: { email: true } } },
    })
    if (!academia) throw new NotFoundError('Academia')

    const { email, ...academiaData } = body

    if (body.cnpj && body.cnpj !== academia.cnpj) {
      const exists = await prisma.academia.findUnique({ where: { cnpj: body.cnpj } })
      if (exists) throw new ConflictError('CNPJ já cadastrado')
    }

    if (email && email !== academia.usuario.email) {
      const exists = await prisma.usuario.findUnique({ where: { email } })
      if (exists) throw new ConflictError('E-mail já cadastrado')
    }

    const updated = await prisma.$transaction(async (tx) => {
      const acad = await tx.academia.update({
        where: { id },
        data: academiaData,
      })

      if (email) {
        await tx.usuario.update({
          where: { id: academia.usuario_id },
          data: { email },
        })
      }

      return acad
    })

    return reply.status(200).send(updated)
  })

  /** DELETE /root/academias/:id — exclui academia e seus vínculos */
  app.delete('/academias/:id', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)

    const academia = await prisma.academia.findUnique({
      where: { id },
      include: { _count: { select: { professores: true, alunos: true } } },
    })
    if (!academia) throw new NotFoundError('Academia')

    await prisma.$transaction(async (tx) => {
      await tx.professorAcademia.deleteMany({ where: { academia_id: id } })
      await tx.aluno.updateMany({ where: { academia_id: id }, data: { academia_id: null } })
      await tx.academia.delete({ where: { id } })
      await tx.usuario.delete({ where: { id: academia.usuario_id } })
    })

    return reply.status(200).send({ message: 'Academia excluída com sucesso!' })
  })

  /** GET /root/professores — lista todos os professores */
  app.get('/professores', { preHandler }, async (_request, reply) => {
    const professores = await prisma.professor.findMany({
      include: {
        usuario: { select: { id: true, email: true, nome: true } },
        academias: {
          include: { academia: { select: { id: true, nome: true } } },
        },
        _count: { select: { alunos: true } },
      },
      orderBy: { criado_em: 'desc' },
    })
    return reply.status(200).send(professores)
  })

  /** PUT /root/professores/:id — atualiza professor */
  app.put('/professores/:id', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const body = z.object({
      nome: z.string().min(1).optional(),
      email: z.string().email().optional(),
      cref: z.string().nullable().optional(),
      academias_ids: z.array(z.string()).optional(),
    }).parse(request.body)

    const professor = await prisma.professor.findUnique({
      where: { id },
      include: { academias: true, usuario: { select: { email: true } } },
    })
    if (!professor) throw new NotFoundError('Professor')

    const { email, academias_ids, ...professorData } = body

    if (email && email !== professor.usuario.email) {
      const exists = await prisma.usuario.findUnique({ where: { email } })
      if (exists) throw new ConflictError('E-mail já cadastrado')
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body.nome || email) {
        const usuarioData: Record<string, string> = {}
        if (body.nome) usuarioData.nome = body.nome
        if (email) usuarioData.email = email
        await tx.usuario.update({
          where: { id: professor.usuario_id },
          data: usuarioData,
        })
      }

      if (body.cref !== undefined) {
        await tx.professor.update({
          where: { id },
          data: { cref: body.cref },
        })
      }

      if (academias_ids !== undefined) {
        await tx.professorAcademia.deleteMany({ where: { professor_id: id } })

        if (academias_ids.length > 0) {
          await tx.professorAcademia.createMany({
            data: academias_ids.map((academia_id) => ({
              professor_id: id,
              academia_id,
              status: VinculoStatus.ATIVO,
            })),
          })
        }
      }

      return tx.professor.findUnique({
        where: { id },
        include: {
          usuario: { select: { id: true, email: true, nome: true } },
          academias: {
            include: { academia: { select: { id: true, nome: true } } },
          },
        },
      })
    })

    return reply.status(200).send(updated)
  })

  /** DELETE /root/professores/:id — exclui professor e seus vínculos */
  app.delete('/professores/:id', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)

    const professor = await prisma.professor.findUnique({ where: { id } })
    if (!professor) throw new NotFoundError('Professor')

    await prisma.$transaction(async (tx) => {
      await tx.aluno.updateMany({ where: { professor_id: id }, data: { professor_id: null } })
      await tx.professorAcademia.deleteMany({ where: { professor_id: id } })
      await tx.professor.delete({ where: { id } })
      await tx.usuario.delete({ where: { id: professor.usuario_id } })
    })

    return reply.status(200).send({ message: 'Professor excluído com sucesso!' })
  })

  /** GET /root/alunos — lista todos os alunos */
  app.get('/alunos', { preHandler }, async (_request, reply) => {
    const alunos = await prisma.aluno.findMany({
      include: {
        usuario: { select: { id: true, email: true, nome: true } },
        academia: { select: { id: true, nome: true } },
        professor: { select: { id: true, usuario: { select: { nome: true } } } },
      },
      orderBy: { criado_em: 'desc' },
    })
    return reply.status(200).send(alunos)
  })

  /** PUT /root/alunos/:id — atualiza aluno */
  app.put('/alunos/:id', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const body = z.object({
      nome: z.string().min(1).optional(),
      email: z.string().email().optional(),
      academia_id: z.string().nullable().optional(),
      professor_id: z.string().nullable().optional(),
    }).parse(request.body)

    const aluno = await prisma.aluno.findUnique({
      where: { id },
      include: { usuario: { select: { email: true } } },
    })
    if (!aluno) throw new NotFoundError('Aluno')

    const { email, nome, ...alunoData } = body

    if (email && email !== aluno.usuario.email) {
      const exists = await prisma.usuario.findUnique({ where: { email } })
      if (exists) throw new ConflictError('E-mail já cadastrado')
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (nome || email) {
        const usuarioData: Record<string, string> = {}
        if (nome) usuarioData.nome = nome
        if (email) usuarioData.email = email
        await tx.usuario.update({
          where: { id: aluno.usuario_id },
          data: usuarioData,
        })
      }

      await tx.aluno.update({
        where: { id },
        data: alunoData,
      })

      return tx.aluno.findUnique({
        where: { id },
        include: {
          usuario: { select: { id: true, email: true, nome: true } },
          academia: { select: { id: true, nome: true } },
          professor: { select: { id: true, usuario: { select: { nome: true } } } },
        },
      })
    })

    return reply.status(200).send(updated)
  })

  /** DELETE /root/alunos/:id — exclui aluno e todos os seus dados */
  app.delete('/alunos/:id', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)

    const aluno = await prisma.aluno.findUnique({
      where: { id },
      include: {
        treinos: { select: { id: true } },
      },
    })
    if (!aluno) throw new NotFoundError('Aluno')

    const treinoIds = aluno.treinos.map((t) => t.id)

    await prisma.$transaction(async (tx) => {
      if (treinoIds.length > 0) {
        await tx.execucaoExercicio.deleteMany({ where: { treino_id: { in: treinoIds } } })
        await tx.treinoExercicio.deleteMany({ where: { treino_id: { in: treinoIds } } })
        await tx.treinoHistorico.deleteMany({ where: { treino_id: { in: treinoIds } } })
        await tx.treino.deleteMany({ where: { id: { in: treinoIds } } })
      }

      await tx.medidaCorporal.deleteMany({ where: { aluno_id: id } })
      await tx.mensagemMotivacionalEnviada.deleteMany({ where: { aluno_id: id } })
      await tx.correlacaoDesempenho.deleteMany({ where: { aluno_id: id } })
      await tx.aluno.delete({ where: { id } })
      await tx.usuario.delete({ where: { id: aluno.usuario_id } })
    })

    return reply.status(200).send({ message: 'Aluno excluído com sucesso!' })
  })

  /** POST /root/sync-exercises — executa sync de exercícios (apenas uma vez) */
  app.post('/sync-exercises', { preHandler }, async (_request, reply) => {
    try {
      const { stdout, stderr } = await execAsync('npx tsx prisma/sync-exercises-v2.ts', {
        cwd: process.cwd(),
        timeout: 300000,
      })
      
      return reply.status(200).send({
        message: 'Sync de exercícios executado com sucesso!',
        output: stdout,
        errors: stderr || null,
      })
    } catch (error: any) {
      return reply.status(500).send({
        message: 'Erro ao executar sync de exercícios',
        error: error.message,
        output: error.stdout || null,
        errors: error.stderr || null,
      })
    }
  })
}
