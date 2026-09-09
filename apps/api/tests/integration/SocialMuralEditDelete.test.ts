import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma } from '../../src/infrastructure/database/prisma.js'
import { Role } from '@prisma/client'
import type { FastifyInstance } from 'fastify'

describe('Social Mural - Edição e Exclusão de Posts (PATCH/DELETE)', () => {
  let app: FastifyInstance
  let usuario: any
  let aluno: any
  let tokenAluno: string
  let outroUsuario: any
  let outroToken: string

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    // Criar usuário 1
    usuario = await prisma.usuario.create({
      data: {
        email: `aluno-mural-edit-${Date.now()}@teste.com`,
        nome: 'Aluno Teste Edição',
        role: Role.ALUNO,
        ativo: true,
        email_verified: true,
        aluno: { create: {} },
      },
      include: { aluno: true },
    })
    aluno = usuario.aluno

    tokenAluno = app.jwt.sign({
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
    })

    // Criar usuário 2 (para testar permissão negada)
    outroUsuario = await prisma.usuario.create({
      data: {
        email: `outro-aluno-${Date.now()}@teste.com`,
        nome: 'Outro Aluno',
        role: Role.ALUNO,
        ativo: true,
        email_verified: true,
        aluno: { create: {} },
      },
      include: { aluno: true },
    })

    outroToken = app.jwt.sign({
      sub: outroUsuario.id,
      email: outroUsuario.email,
      role: outroUsuario.role,
    })
  })

  afterAll(async () => {
    await app.close()
  })

  it('permite que o autor edite a foto do post (adicionar, alterar, remover)', async () => {
    // 1. Criar post
    const post = await prisma.socialPost.create({
      data: {
        aluno_id: aluno.id,
        autor_nome: usuario.nome,
        tipo: 'TREINO_CONCLUIDO',
        visibilidade: 'PUBLICO',
        midia_url: null,
      },
    })

    // 2. Adicionar foto via PATCH /social/mural/:postId
    const patchRes1 = await app.inject({
      method: 'PATCH',
      url: `/social/mural/${post.id}`,
      headers: { authorization: `Bearer ${tokenAluno}` },
      payload: { midiaUrl: '/uploads/foto-treino-1.jpg' },
    })

    expect(patchRes1.statusCode).toBe(200)
    const data1 = JSON.parse(patchRes1.body)
    expect(data1.midia_url).toContain('foto-treino-1.jpg')

    // 3. Remover foto passando null
    const patchRes2 = await app.inject({
      method: 'PATCH',
      url: `/social/mural/${post.id}`,
      headers: { authorization: `Bearer ${tokenAluno}` },
      payload: { midiaUrl: null },
    })

    expect(patchRes2.statusCode).toBe(200)
    const data2 = JSON.parse(patchRes2.body)
    expect(data2.midia_url).toBeNull()
  })

  it('proíbe que outro aluno edite post que não seja dele (403)', async () => {
    const post = await prisma.socialPost.create({
      data: {
        aluno_id: aluno.id,
        autor_nome: usuario.nome,
        tipo: 'TREINO_CONCLUIDO',
        visibilidade: 'PUBLICO',
      },
    })

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/social/mural/${post.id}`,
      headers: { authorization: `Bearer ${outroToken}` },
      payload: { midiaUrl: '/hack.jpg' },
    })

    expect(patchRes.statusCode).toBe(403)
  })

  it('permite que o autor exclua seu post e cascateie curtidas e comentários (204)', async () => {
    const post = await prisma.socialPost.create({
      data: {
        aluno_id: aluno.id,
        autor_nome: usuario.nome,
        tipo: 'TREINO_CONCLUIDO',
        visibilidade: 'PUBLICO',
      },
    })

    // Adicionar comentário e like
    await prisma.socialComment.create({
      data: {
        post_id: post.id,
        aluno_id: outroUsuario.aluno.id,
        autor_nome: outroUsuario.nome,
        texto: 'Boa!',
      },
    })
    await prisma.socialLike.create({
      data: {
        post_id: post.id,
        aluno_id: outroUsuario.aluno.id,
      },
    })

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/social/mural/${post.id}`,
      headers: { authorization: `Bearer ${tokenAluno}` },
    })

    expect(delRes.statusCode).toBe(204)

    // Verificar se foi apagado
    const postDeleted = await prisma.socialPost.findUnique({ where: { id: post.id } })
    expect(postDeleted).toBeNull()

    const comments = await prisma.socialComment.findMany({ where: { post_id: post.id } })
    expect(comments).toHaveLength(0)

    const likes = await prisma.socialLike.findMany({ where: { post_id: post.id } })
    expect(likes).toHaveLength(0)
  })
})
