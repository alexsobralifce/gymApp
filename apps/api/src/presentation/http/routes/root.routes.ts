import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role, VinculoStatus, AcademiaStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { Prisma } from '@prisma/client'
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

  /** GET /root/vinculos — lista vínculos com paginação */
  app.get('/vinculos', { preHandler }, async (request, reply) => {
    const rawQuery = request.query as Record<string, string>
    const hasPagination = rawQuery.page !== undefined
    const parsed = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      status: z.enum(['PENDENTE_ACADEMIA', 'PENDENTE_ROOT', 'ATIVO', 'REJEITADO', 'REMOVIDO']).optional(),
    }).parse(request.query)

    const where: Prisma.ProfessorAcademiaWhereInput = parsed.status
      ? { status: parsed.status }
      : { status: VinculoStatus.PENDENTE_ROOT }

    if (hasPagination) {
      const skip = (parsed.page - 1) * parsed.limit
      const [vinculos, total] = await Promise.all([
        prisma.professorAcademia.findMany({
          where,
          include: {
            professor: { include: { usuario: { select: { nome: true, email: true } } } },
            academia: { select: { id: true, nome: true } },
          },
          orderBy: { criado_em: 'asc' },
          skip,
          take: parsed.limit,
        }),
        prisma.professorAcademia.count({ where }),
      ])
      return reply.status(200).send({ items: vinculos, total, page: parsed.page, limit: parsed.limit, totalPages: Math.ceil(total / parsed.limit) })
    }

    const vinculos = await prisma.professorAcademia.findMany({
      where,
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

    if (acao === 'APROVAR') {
      try {
        await prisma.socialClub.upsert({
          where: { academia_id: id },
          create: { academia_id: id, nome: academia.nome, tipo: 'ACADEMIA' },
          update: {},
        })
      } catch {
        // club creation is best-effort, never block approval
      }
    }

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

  /** GET /root/usuarios — lista usuários com paginação, busca e ordenação */
  app.get('/usuarios', { preHandler }, async (request, reply) => {
    const rawQuery = request.query as Record<string, string>
    const hasPagination = rawQuery.page !== undefined
    const parsed = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      search: z.string().optional(),
      sortBy: z.enum(['nome', 'email', 'criado_em', 'role']).default('criado_em'),
      order: z.enum(['asc', 'desc']).default('desc'),
      role: z.enum(['ROOT', 'ACADEMIA', 'PROFESSOR', 'ALUNO']).optional(),
      ativo: z.coerce.boolean().optional(),
    }).parse(request.query)

    const where: Prisma.UsuarioWhereInput = {}
    if (parsed.search) {
      where.OR = [
        { nome: { contains: parsed.search, mode: 'insensitive' } },
        { email: { contains: parsed.search, mode: 'insensitive' } },
      ]
    }
    if (parsed.role) where.role = parsed.role
    if (parsed.ativo !== undefined) where.ativo = parsed.ativo

    if (hasPagination) {
      const skip = (parsed.page - 1) * parsed.limit
      const [usuarios, total] = await Promise.all([
        prisma.usuario.findMany({
          where,
          include: { academia: true, professor: true, aluno: true },
          orderBy: { [parsed.sortBy]: parsed.order },
          skip,
          take: parsed.limit,
        }),
        prisma.usuario.count({ where }),
      ])
      return reply.status(200).send({
        items: usuarios,
        total,
        page: parsed.page,
        limit: parsed.limit,
        totalPages: Math.ceil(total / parsed.limit),
      })
    }

    const usuarios = await prisma.usuario.findMany({
      where,
      include: { academia: true, professor: true, aluno: true },
      orderBy: { criado_em: 'desc' },
    })
    return reply.status(200).send(usuarios)
  })

  /** PATCH /root/usuarios/:id/status — ativa ou desativa usuário */
  app.patch('/usuarios/:id/status', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { ativo } = z.object({ ativo: z.boolean() }).parse(request.body)

    const usuario = await prisma.usuario.findUnique({ where: { id } })
    if (!usuario) throw new NotFoundError('Usuário')
    if (usuario.role === Role.ROOT) throw new ForbiddenError('Não é permitido alterar o status de outro administrador ROOT')

    const updated = await prisma.usuario.update({
      where: { id },
      data: { ativo },
    })

    return reply.status(200).send({ id: updated.id, ativo: updated.ativo })
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

  /** GET /root/academias — lista academias com paginação */
  app.get('/academias', { preHandler }, async (request, reply) => {
    const rawQuery = request.query as Record<string, string>
    const hasPagination = rawQuery.page !== undefined
    const parsed = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      search: z.string().optional(),
      status: z.enum(['PENDENTE', 'ATIVO', 'REJEITADO']).optional(),
    }).parse(request.query)

    const where: Prisma.AcademiaWhereInput = {}
    if (parsed.search) {
      where.OR = [
        { nome: { contains: parsed.search, mode: 'insensitive' } },
        { cnpj: { contains: parsed.search, mode: 'insensitive' } },
      ]
    }
    if (parsed.status) where.status = parsed.status

    if (hasPagination) {
      const skip = (parsed.page - 1) * parsed.limit
      const [academias, total] = await Promise.all([
        prisma.academia.findMany({
          where,
          include: {
            usuario: { select: { id: true, email: true, nome: true } },
            _count: { select: { professores: true, alunos: true } },
          },
          orderBy: { criado_em: 'desc' },
          skip,
          take: parsed.limit,
        }),
        prisma.academia.count({ where }),
      ])
      return reply.status(200).send({ items: academias, total, page: parsed.page, limit: parsed.limit, totalPages: Math.ceil(total / parsed.limit) })
    }

    const academias = await prisma.academia.findMany({
      where,
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

  /** GET /root/professores — lista professores com paginação */
  app.get('/professores', { preHandler }, async (request, reply) => {
    const rawQuery = request.query as Record<string, string>
    const hasPagination = rawQuery.page !== undefined
    const parsed = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      search: z.string().optional(),
    }).parse(request.query)

    const where: Prisma.ProfessorWhereInput = {}
    if (parsed.search) {
      where.OR = [
        { usuario: { nome: { contains: parsed.search, mode: 'insensitive' } } },
        { usuario: { email: { contains: parsed.search, mode: 'insensitive' } } },
        { cref: { contains: parsed.search, mode: 'insensitive' } },
      ]
    }

    if (hasPagination) {
      const skip = (parsed.page - 1) * parsed.limit
      const [professores, total] = await Promise.all([
        prisma.professor.findMany({
          where,
          include: {
            usuario: { select: { id: true, email: true, nome: true } },
            academias: {
              include: { academia: { select: { id: true, nome: true } } },
            },
            _count: { select: { alunos: true } },
          },
          orderBy: { criado_em: 'desc' },
          skip,
          take: parsed.limit,
        }),
        prisma.professor.count({ where }),
      ])
      return reply.status(200).send({ items: professores, total, page: parsed.page, limit: parsed.limit, totalPages: Math.ceil(total / parsed.limit) })
    }

    const professores = await prisma.professor.findMany({
      where,
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

  /** GET /root/alunos — lista alunos com paginação */
  app.get('/alunos', { preHandler }, async (request, reply) => {
    const rawQuery = request.query as Record<string, string>
    const hasPagination = rawQuery.page !== undefined
    const parsed = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      search: z.string().optional(),
    }).parse(request.query)

    const where: Prisma.AlunoWhereInput = {}
    if (parsed.search) {
      where.OR = [
        { usuario: { nome: { contains: parsed.search, mode: 'insensitive' } } },
        { usuario: { email: { contains: parsed.search, mode: 'insensitive' } } },
      ]
    }

    if (hasPagination) {
      const skip = (parsed.page - 1) * parsed.limit
      const [alunos, total] = await Promise.all([
        prisma.aluno.findMany({
          where,
          include: {
            usuario: { select: { id: true, email: true, nome: true, telefone: true } },
            academia: { select: { id: true, nome: true } },
            professor: { select: { id: true, usuario: { select: { nome: true } } } },
          },
          orderBy: { criado_em: 'desc' },
          skip,
          take: parsed.limit,
        }),
        prisma.aluno.count({ where }),
      ])
      return reply.status(200).send({ items: alunos, total, page: parsed.page, limit: parsed.limit, totalPages: Math.ceil(total / parsed.limit) })
    }

    const alunos = await prisma.aluno.findMany({
      where,
      include: {
        usuario: { select: { id: true, email: true, nome: true, telefone: true } },
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
      telefone: z.string().nullable().optional(),
      data_nascimento: z.string().nullable().optional(),
      peso_kg: z.number().positive().nullable().optional(),
      altura_cm: z.number().positive().nullable().optional(),
      academia_id: z.string().nullable().optional(),
      professor_id: z.string().nullable().optional(),
    }).parse(request.body)

    const aluno = await prisma.aluno.findUnique({
      where: { id },
      include: { usuario: { select: { email: true } } },
    })
    if (!aluno) throw new NotFoundError('Aluno')

    const { email, nome, telefone, data_nascimento, peso_kg, altura_cm, ...alunoData } = body

    if (email && email !== aluno.usuario.email) {
      const exists = await prisma.usuario.findUnique({ where: { email } })
      if (exists) throw new ConflictError('E-mail já cadastrado')
    }

    const updated = await prisma.$transaction(async (tx) => {
      const usuarioData: Record<string, unknown> = {}
      if (nome !== undefined) usuarioData.nome = nome
      if (email !== undefined) usuarioData.email = email
      if (telefone !== undefined) usuarioData.telefone = telefone
      if (Object.keys(usuarioData).length > 0) {
        await tx.usuario.update({
          where: { id: aluno.usuario_id },
          data: usuarioData,
        })
      }

      const alunoUpdateData: Record<string, unknown> = {}
      if (data_nascimento !== undefined) alunoUpdateData.data_nascimento = data_nascimento ? new Date(data_nascimento) : null
      if (peso_kg !== undefined) alunoUpdateData.peso_kg = peso_kg
      if (altura_cm !== undefined) alunoUpdateData.altura_cm = altura_cm
      if (alunoData.academia_id !== undefined) alunoUpdateData.academia_id = alunoData.academia_id
      if (alunoData.professor_id !== undefined) alunoUpdateData.professor_id = alunoData.professor_id
      if (Object.keys(alunoUpdateData).length > 0) {
        await tx.aluno.update({
          where: { id },
          data: alunoUpdateData,
        })
      }

      return tx.aluno.findUnique({
        where: { id },
        include: {
          usuario: { select: { id: true, email: true, nome: true, telefone: true } },
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
      await tx.notificacao.deleteMany({ where: { aluno_id: id } })
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
        cwd: '/app/apps/api',
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

  /** POST /root/fix-exercise-urls — corrige URLs de exercícios para relativas */
  app.post('/fix-exercise-urls', { preHandler }, async (_request, reply) => {
    try {
      const result = await prisma.$executeRaw`
        UPDATE exercicios 
        SET imagem_url = REPLACE(imagem_url, 'http://localhost:3333', ''),
            gif_url = REPLACE(gif_url, 'http://localhost:3333', '')
        WHERE imagem_url LIKE 'http://localhost:3333%' 
           OR gif_url LIKE 'http://localhost:3333%'
      `
      
      return reply.status(200).send({
        message: 'URLs corrigidas com sucesso!',
        updated: result,
      })
    } catch (error: any) {
      return reply.status(500).send({
        message: 'Erro ao corrigir URLs',
        error: error.message,
      })
    }
  })

  /** POST /root/fix-exercise-levels — distribui níveis dos exercícios por equipamento */
  app.post('/fix-exercise-levels', { preHandler }, async (_request, reply) => {
    try {
      const iniciante = await prisma.$executeRaw`
        UPDATE exercicios SET nivel = 'Iniciante' WHERE equipamento IN (
          'Peso Corporal', 'Elastico', 'Bola de Pilates', 'Assistido', 'Bola de Medicina',
          'Rolo de Liberacao Miofascial', 'Elastico de Resistencia', 'Bosu', 'Roda Abdominal',
          'Bicicleta Estacionaria', 'Escada Rolante', 'Eliptico', 'Remo Vertical (SkiErg)', 'Ergometro de Bracos'
        )
      `
      const avancado = await prisma.$executeRaw`
        UPDATE exercicios SET nivel = 'Avancado' WHERE equipamento IN (
          'Barra', 'Maquina de Alavanca', 'Maquina Smith', 'Barra W (EZ)', 'Treno de Arrasto',
          'Barra Olimpica', 'Barra Hexagonal', 'Pneu', 'Marreta'
        )
      `
      const intermediario = await prisma.exercicio.count({ where: { nivel: { notIn: ['Iniciante', 'Avancado'] } } })
      await prisma.exercicio.updateMany({
        where: { nivel: { notIn: ['Iniciante', 'Avancado'] } },
        data: { nivel: 'Intermediario' },
      })

      return reply.status(200).send({
        message: 'Niveis atualizados com sucesso!',
        iniciante,
        intermediario,
        avancado,
      })
    } catch (error: any) {
      return reply.status(500).send({
        message: 'Erro ao corrigir niveis',
        error: error.message,
      })
    }
  })

  /** GET /root/check-exercises — verifica URLs dos exercícios */
  app.get('/check-exercises', { preHandler }, async (_request, reply) => {
    try {
      const sample = await prisma.exercicio.findMany({
        take: 5,
        select: {
          id: true,
          nome: true,
          imagem_url: true,
          gif_url: true,
        },
      })
      
      const stats = await prisma.exercicio.aggregate({
        _count: true,
      })
      
      const withLocalhost = await prisma.exercicio.count({
        where: {
          OR: [
            { imagem_url: { contains: 'localhost:3333' } },
            { gif_url: { contains: 'localhost:3333' } },
          ],
        },
      })
      
      return reply.status(200).send({
        total: stats._count,
        withLocalhost,
        sample,
      })
    } catch (error: any) {
      return reply.status(500).send({
        message: 'Erro ao verificar exercícios',
        error: error.message,
      })
    }
  })

  // ─── Social Moderation (ROOT) ──────────────────────────────────────────

  /** GET /root/social/mural — feed global com paginação */
  app.get('/social/mural', { preHandler }, async (request, reply) => {
    const { page, limit, search } = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      search: z.string().optional(),
    }).parse(request.query)

    const where: Prisma.SocialPostWhereInput = {}
    if (search) {
      where.autor_nome = { contains: search, mode: 'insensitive' }
    }

    const skip = (page - 1) * limit
    const [posts, total] = await Promise.all([
      prisma.socialPost.findMany({
        where,
        orderBy: { criado_em: 'desc' },
        skip,
        take: limit,
      }),
      prisma.socialPost.count({ where }),
    ])

    return reply.status(200).send({ items: posts, total, page, limit, totalPages: Math.ceil(total / limit) })
  })

  /** DELETE /root/social/mural/:postId — remove post */
  app.delete('/social/mural/:postId', { preHandler }, async (request, reply) => {
    const { postId } = z.object({ postId: z.string() }).parse(request.params)

    const post = await prisma.socialPost.findUnique({ where: { id: postId } })
    if (!post) throw new NotFoundError('Post')

    await prisma.$transaction(async (tx) => {
      await tx.socialComment.deleteMany({ where: { post_id: postId } })
      await tx.socialLike.deleteMany({ where: { post_id: postId } })
      await tx.socialPost.delete({ where: { id: postId } })
    })

    return reply.status(200).send({ message: 'Post removido com sucesso!' })
  })

  /** GET /root/social/clubes — lista clubes */
  app.get('/social/clubes', { preHandler }, async (request, reply) => {
    const { page, limit } = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).parse(request.query)

    const skip = (page - 1) * limit
    const [clubes, total] = await Promise.all([
      prisma.socialClub.findMany({
        orderBy: { criado_em: 'desc' },
        skip,
        take: limit,
      }),
      prisma.socialClub.count(),
    ])

    const clubesComMembros = await Promise.all(
      clubes.map(async (c) => ({
        ...c,
        totalMembros: await prisma.socialClubMember.count({ where: { clube_id: c.id } }),
      })),
    )

    return reply.status(200).send({ items: clubesComMembros, total, page, limit, totalPages: Math.ceil(total / limit) })
  })

  /** DELETE /root/social/clubes/:id — remove clube */
  app.delete('/social/clubes/:id', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)

    const clube = await prisma.socialClub.findUnique({ where: { id } })
    if (!clube) throw new NotFoundError('Clube')

    await prisma.$transaction(async (tx) => {
      await tx.socialClubMember.deleteMany({ where: { clube_id: id } })
      await tx.socialPost.deleteMany({ where: { clube_id: id } })
      await tx.socialClub.delete({ where: { id } })
    })

    return reply.status(200).send({ message: 'Clube removido com sucesso!' })
  })

  /** GET /root/social/amizades — lista todas as amizades com paginação */
  app.get('/social/amizades', { preHandler }, async (request, reply) => {
    const { page, limit } = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).parse(request.query)

    const skip = (page - 1) * limit
    const [amizades, total] = await Promise.all([
      prisma.socialFriendship.findMany({
        orderBy: { criado_em: 'desc' },
        skip,
        take: limit,
      }),
      prisma.socialFriendship.count(),
    ])

    const amizadesComNomes = await Promise.all(
      amizades.map(async (a) => {
        const [aluno1, aluno2] = await Promise.all([
          prisma.aluno.findUnique({ where: { id: a.aluno_id }, include: { usuario: { select: { nome: true } } } }),
          prisma.aluno.findUnique({ where: { id: a.amigo_id }, include: { usuario: { select: { nome: true } } } }),
        ])
        return {
          ...a,
          aluno_nome: aluno1?.usuario.nome ?? '',
          amigo_nome: aluno2?.usuario.nome ?? '',
        }
      }),
    )

    return reply.status(200).send({ items: amizadesComNomes, total, page, limit, totalPages: Math.ceil(total / limit) })
  })
}
