import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { InstagramClient } from '../../../infrastructure/instagram/instagramClient.js'
import { AppError, NotFoundError, UnauthorizedError } from '../../../domain/errors/AppError.js'
import { env } from '../../../shared/env.js'

function getRedirectUri(): string {
  if (env.INSTAGRAM_REDIRECT_URI) return env.INSTAGRAM_REDIRECT_URI
  return `${env.API_BASE_URL}/auth/instagram/callback`
}

function absolutizeUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return `${env.API_BASE_URL}${url}`
  return `${env.API_BASE_URL}/${url}`
}

export async function instagramRoutes(app: FastifyInstance) {
  /**
   * GET /auth/instagram — Redireciona o usuário para login e autorização do Instagram
   */
  app.get('/auth/instagram', async (request, reply) => {
    const { token } = z.object({ token: z.string().optional() }).parse(request.query)

    let userId: string | null = null

    if (token) {
      try {
        const decoded = app.jwt.verify<{ sub: string }>(token)
        userId = decoded.sub
      } catch {
        throw new UnauthorizedError('Token inválido para autenticação com Instagram.')
      }
    } else {
      // Tenta cabeçalho Authorization
      try {
        await request.jwtVerify()
        userId = request.currentUser?.sub || null
      } catch {
        throw new UnauthorizedError('Usuário não autenticado.')
      }
    }

    if (!userId) {
      throw new UnauthorizedError('Identificação do usuário necessária.')
    }

    const state = app.jwt.sign({ userId, prop: 'instagram_oauth' }, { expiresIn: '10m' })
    const redirectUri = getRedirectUri()
    const authUrl = InstagramClient.gerarUrlAutorizacao(redirectUri, state)

    return reply.redirect(authUrl)
  })

  /**
   * GET /auth/instagram/callback — Callback do OAuth do Instagram
   */
  app.get('/auth/instagram/callback', async (request, reply) => {
    const { code, state, error, error_reason, error_description } = z.object({
      code: z.string().optional(),
      state: z.string().optional(),
      error: z.string().optional(),
      error_reason: z.string().optional(),
      error_description: z.string().optional(),
    }).parse(request.query)

    const webBaseUrl = env.WEB_BASE_URL || ''

    if (error || !code || !state) {
      const msg = encodeURIComponent(error_description || error_reason || error || 'Autorização cancelada.')
      return reply.redirect(`${webBaseUrl}/mural?erro_instagram=${msg}`)
    }

    let userId: string
    try {
      const decoded = app.jwt.verify<{ userId: string; prop: string }>(state)
      if (decoded.prop !== 'instagram_oauth') {
        throw new Error('State inválido')
      }
      userId = decoded.userId
    } catch {
      return reply.redirect(`${webBaseUrl}/mural?erro_instagram=SessaoExpirada`)
    }

    try {
      const redirectUri = getRedirectUri()
      
      // 1. Trocar código pelo token de curta duração
      const shortTokenData = await InstagramClient.trocarCodePorToken(code, redirectUri)

      // 2. Trocar pelo token de longa duração (60 dias)
      const longTokenData = await InstagramClient.obterLongLivedToken(shortTokenData.access_token)

      // 3. Obter perfil para id e username
      const profile = await InstagramClient.obterPerfilInstagram(longTokenData.access_token)

      // 4. Salvar dados no usuário
      const expiraEm = new Date(Date.now() + (longTokenData.expires_in || 60 * 24 * 60 * 60) * 1000)

      await prisma.usuario.update({
        where: { id: userId },
        data: {
          instagram_user_id: profile.id || String(shortTokenData.user_id),
          instagram_token: longTokenData.access_token,
          instagram_token_expira: expiraEm,
        },
      })

      return reply.redirect(`${webBaseUrl}/mural?instagram=conectado&username=${encodeURIComponent(profile.username || '')}`)
    } catch (err: any) {
      const msg = encodeURIComponent(err?.message || 'Erro ao vincular conta do Instagram.')
      return reply.redirect(`${webBaseUrl}/mural?erro_instagram=${msg}`)
    }
  })

  /**
   * GET /auth/instagram/status — Consulta status da integração
   */
  app.get('/auth/instagram/status', { preHandler: [app.authenticate] }, async (request, reply) => {
    const usuario = await prisma.usuario.findUnique({
      where: { id: request.currentUser.sub },
      select: {
        instagram_user_id: true,
        instagram_token: true,
        instagram_token_expira: true,
      },
    })

    if (!usuario || !usuario.instagram_token || !usuario.instagram_user_id) {
      return reply.status(200).send({ conectado: false })
    }

    // Se o token estiver expirando em menos de 7 dias, renova em background
    if (usuario.instagram_token_expira) {
      const diasRestantes = (usuario.instagram_token_expira.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      if (diasRestantes > 0 && diasRestantes < 7) {
        InstagramClient.refreshLongLivedToken(usuario.instagram_token)
          .then((novoToken) => {
            const novaExp = new Date(Date.now() + (novoToken.expires_in || 60 * 24 * 60 * 60) * 1000)
            return prisma.usuario.update({
              where: { id: request.currentUser.sub },
              data: {
                instagram_token: novoToken.access_token,
                instagram_token_expira: novaExp,
              },
            })
          })
          .catch(() => {})
      }
    }

    return reply.status(200).send({
      conectado: true,
      expiraEm: usuario.instagram_token_expira?.toISOString(),
    })
  })

  /**
   * DELETE /auth/instagram — Desconecta a conta do Instagram
   */
  app.delete('/auth/instagram', { preHandler: [app.authenticate] }, async (request, reply) => {
    await prisma.usuario.update({
      where: { id: request.currentUser.sub },
      data: {
        instagram_user_id: null,
        instagram_token: null,
        instagram_token_expira: null,
        facebook_page_id: null,
      },
    })

    return reply.status(200).send({ message: 'Conta do Instagram desconectada com sucesso.' })
  })

  /**
   * POST /social/instagram/publicar — Publica foto diretamente no feed do Instagram
   */
  app.post('/social/instagram/publicar', { preHandler: [app.authenticate, app.requireRole(Role.ALUNO)] }, async (request, reply) => {
    const { imagemUrl, caption } = z.object({
      imagemUrl: z.string().min(1),
      caption: z.string().optional(),
    }).parse(request.body)

    const usuario = await prisma.usuario.findUnique({
      where: { id: request.currentUser.sub },
      select: {
        instagram_user_id: true,
        instagram_token: true,
      },
    })

    if (!usuario || !usuario.instagram_token || !usuario.instagram_user_id) {
      throw new AppError('Conta do Instagram não está conectada. Conecte sua conta para publicar.', 400)
    }

    const publicUrl = absolutizeUrl(imagemUrl)

    const result = await InstagramClient.publicarFoto(
      usuario.instagram_user_id,
      usuario.instagram_token,
      publicUrl,
      caption
    )

    return reply.status(201).send({
      message: 'Treino publicado com sucesso no Instagram!',
      mediaId: result.mediaId,
    })
  })
}
