import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { AuthService } from '../../../application/usecases/auth/AuthService.js'
import { prisma } from '../../../infrastructure/database/prisma.js'

const registerBodySchema = z.object({
  nome: z.string().min(2).max(100),
  email: z.string().email(),
  senha: z.string().min(8),
  role: z.enum([Role.ACADEMIA, Role.PROFESSOR, Role.ALUNO]),
  telefone: z.string().optional(),
})

const loginBodySchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
})

const refreshBodySchema = z.object({
  refreshToken: z.string(),
})

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /auth/register
   * Cria conta base. Use UC-05, UC-09, UC-17 para criar o perfil específico.
   */
  app.post('/register', async (request, reply) => {
    const body = registerBodySchema.parse(request.body)
    const usuario = await AuthService.register(body)
    return reply.status(201).send(usuario)
  })

  /**
   * POST /auth/login
   */
  app.post('/login', async (request, reply) => {
    const body = loginBodySchema.parse(request.body)
    const tokens = await AuthService.login(body, app.jwt.sign.bind(app.jwt))
    return reply.status(200).send(tokens)
  })

  /**
   * POST /auth/refresh
   */
  app.post('/refresh', async (request, reply) => {
    const { refreshToken } = refreshBodySchema.parse(request.body)
    const tokens = await AuthService.refresh(
      refreshToken,
      app.jwt.verify.bind(app.jwt),
      app.jwt.sign.bind(app.jwt),
    )
    return reply.status(200).send(tokens)
  })

  /**
   * POST /auth/logout
   */
  app.post('/logout', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { refreshToken } = refreshBodySchema.parse(request.body)
    await AuthService.logout(refreshToken)
    return reply.status(204).send()
  })

  /**
   * GET /auth/me
   */
  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { sub: id, role, tenantId } = request.currentUser
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: { nome: true, email: true, telefone: true, expo_push_token: true },
    })
    if (!usuario) return reply.status(404).send({ message: 'Usuário não encontrado' })
    return reply.status(200).send({
      id,
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone ?? null,
      role,
      tenantId,
      expoPushToken: usuario.expo_push_token ?? null,
    })
  })

  /**
   * PATCH /auth/me — Atualiza dados do perfil (ex: push token, nome, telefone)
   */
  app.patch('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = z.object({
      expoPushToken: z.string().nullable().optional(),
      webPushSubscription: z.any().nullable().optional(),
      nome: z.string().min(2).max(100).optional(),
      telefone: z.string().nullable().optional(),
    }).parse(request.body)

    const data: Record<string, unknown> = {}
    if (body.expoPushToken !== undefined) data.expo_push_token = body.expoPushToken
    if (body.webPushSubscription !== undefined) data.web_push_subscription = body.webPushSubscription
    if (body.nome !== undefined) data.nome = body.nome
    if (body.telefone !== undefined) data.telefone = body.telefone || null

    const usuario = await prisma.usuario.update({
      where: { id: request.currentUser.sub },
      data,
      select: { id: true, nome: true, email: true, telefone: true, expo_push_token: true },
    })

    return reply.status(200).send(usuario)
  })

  /**
   * POST /auth/change-password — Permite ao usuário logado alterar sua própria senha
   */
  app.post('/change-password', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { senhaAtual, novaSenha } = z.object({
      senhaAtual: z.string().min(1),
      novaSenha: z.string().min(8),
    }).parse(request.body)

    const usuario = await prisma.usuario.findUnique({
      where: { id: request.currentUser.sub },
    })
    if (!usuario) return reply.status(404).send({ message: 'Usuário não encontrado' })

    const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha_hash)
    if (!senhaCorreta) {
      return reply.status(400).send({ message: 'Senha atual incorreta' })
    }

    const novaSenhaHash = await bcrypt.hash(novaSenha, 12)
    await prisma.usuario.update({
      where: { id: request.currentUser.sub },
      data: { senha_hash: novaSenhaHash },
    })

    return reply.status(200).send({ message: 'Senha alterada com sucesso!' })
  })
}
