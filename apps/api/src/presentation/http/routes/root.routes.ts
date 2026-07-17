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
}
