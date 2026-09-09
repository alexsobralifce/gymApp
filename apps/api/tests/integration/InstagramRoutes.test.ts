import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma } from '../../src/infrastructure/database/prisma.js'
import { Role } from '@prisma/client'
import type { FastifyInstance } from 'fastify'

describe('Instagram OAuth & Publicação Routes', () => {
  let app: FastifyInstance
  let usuario: any
  let tokenAluno: string

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    usuario = await prisma.usuario.create({
      data: {
        email: `aluno-instagram-${Date.now()}@teste.com`,
        nome: 'Aluno Instagram Teste',
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
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /auth/instagram/status retorna conectado: false quando o usuário não vinculou Instagram', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/instagram/status',
      headers: { authorization: `Bearer ${tokenAluno}` },
    })

    expect(res.statusCode).toBe(200)
    const data = JSON.parse(res.body)
    expect(data.conectado).toBe(false)
  })

  it('GET /auth/instagram redireciona com URL de autorização contendo state assinado', async () => {
    // Configurar temporariamente META_APP_ID para teste
    process.env.META_APP_ID = 'test_meta_app_id_12345'
    process.env.META_APP_SECRET = 'test_meta_app_secret_67890'

    const res = await app.inject({
      method: 'GET',
      url: `/auth/instagram?token=${tokenAluno}`,
    })

    expect(res.statusCode).toBe(302)
    const location = res.headers.location as string
    expect(location).toContain('https://api.instagram.com/oauth/authorize')
    expect(location).toContain('client_id=test_meta_app_id_12345')
    expect(location).toContain('scope=instagram_basic%2Cinstagram_content_publish')
  })

  it('GET /auth/instagram/status retorna conectado: true quando o usuário tem token salvo', async () => {
    // Simula token salvo no usuário
    const expiraEm = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        instagram_user_id: 'ig_123456789',
        instagram_token: 'EAABsbcsd8f76s8d7f6s8d7f',
        instagram_token_expira: expiraEm,
      },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/auth/instagram/status',
      headers: { authorization: `Bearer ${tokenAluno}` },
    })

    expect(res.statusCode).toBe(200)
    const data = JSON.parse(res.body)
    expect(data.conectado).toBe(true)
    expect(data.expiraEm).toBeDefined()
  })

  it('DELETE /auth/instagram desconecta a conta e limpa os tokens do usuário', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/auth/instagram',
      headers: { authorization: `Bearer ${tokenAluno}` },
    })

    expect(res.statusCode).toBe(200)
    const data = JSON.parse(res.body)
    expect(data.message).toContain('desconectada')

    // Verificar se foi limpo no banco
    const usuarioAtualizado = await prisma.usuario.findUnique({
      where: { id: usuario.id },
    })
    expect(usuarioAtualizado?.instagram_user_id).toBeNull()
    expect(usuarioAtualizado?.instagram_token).toBeNull()
  })

  it('POST /social/instagram/publicar retorna erro 400 se a conta não estiver conectada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/social/instagram/publicar',
      headers: { authorization: `Bearer ${tokenAluno}` },
      payload: {
        imagemUrl: 'https://exemplo.com/treino.png',
        caption: 'Treino concluído!',
      },
    })

    expect(res.statusCode).toBe(400)
    const data = JSON.parse(res.body)
    expect(data.message).toContain('não está conectada')
  })
})
