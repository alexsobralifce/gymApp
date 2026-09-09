import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma } from '../../src/infrastructure/database/prisma.js'
import { Role } from '@prisma/client'
import { FastifyInstance } from 'fastify'

describe('Social Modules - resolveAluno upsert behavior', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('permite que um usuário com role ALUNO sem registro na tabela alunos crie/acesse clubes e participe', async () => {
    // 1. Criar usuário ALUNO diretamente sem criar registro na tabela Aluno
    const usuario = await prisma.usuario.create({
      data: {
        email: `aluno-sem-onboarding-${Date.now()}@teste.com`,
        nome: 'Aluno Sem Onboarding',
        role: Role.ALUNO,
        ativo: true,
        email_verified: true,
      },
    })

    // 2. Criar um clube temático com outro usuário
    const criador = await prisma.usuario.create({
      data: {
        email: `criador-${Date.now()}@teste.com`,
        nome: 'Criador Clube',
        role: Role.ALUNO,
        ativo: true,
        email_verified: true,
        aluno: {
          create: {},
        },
      },
      include: { aluno: true },
    })

    const tokenCriador = app.jwt.sign({
      sub: criador.id,
      email: criador.email,
      role: criador.role,
    })

    const createClubRes = await app.inject({
      method: 'POST',
      url: '/social/clubes',
      headers: {
        authorization: `Bearer ${tokenCriador}`,
      },
      payload: {
        nome: `Clube Teste Upsert ${Date.now()}`,
        descricao: 'Clube de teste',
      },
    })

    expect(createClubRes.statusCode).toBe(201)
    const club = JSON.parse(createClubRes.body)

    // 3. O usuário sem registro na tabela alunos tenta entrar no clube
    const tokenAluno = app.jwt.sign({
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
    })

    // Checar que o aluno NÃO existe antes
    const alunoAntes = await prisma.aluno.findUnique({
      where: { usuario_id: usuario.id },
    })
    expect(alunoAntes).toBeNull()

    // Entrar no clube
    const joinRes = await app.inject({
      method: 'POST',
      url: `/social/clubes/${club.id}/entrar`,
      headers: {
        authorization: `Bearer ${tokenAluno}`,
      },
    })

    expect(joinRes.statusCode).toBe(200)

    // 4. Checar que o aluno foi criado via upsert
    const alunoDepois = await prisma.aluno.findUnique({
      where: { usuario_id: usuario.id },
    })
    expect(alunoDepois).not.toBeNull()
    expect(alunoDepois?.usuario_id).toBe(usuario.id)

    // 5. Testar GET /social/clubes
    const listRes = await app.inject({
      method: 'GET',
      url: '/social/clubes',
      headers: {
        authorization: `Bearer ${tokenAluno}`,
      },
    })
    expect(listRes.statusCode).toBe(200)
    const listData = JSON.parse(listRes.body)
    expect(listData.meus.some((c: any) => c.id === club.id)).toBe(true)

    // 6. Testar GET /social/mural
    const feedRes = await app.inject({
      method: 'GET',
      url: '/social/mural',
      headers: {
        authorization: `Bearer ${tokenAluno}`,
      },
    })
    expect(feedRes.statusCode).toBe(200)

    // 7. Testar GET /social/amizades/pendentes
    const friendRes = await app.inject({
      method: 'GET',
      url: '/social/amizades/pendentes',
      headers: {
        authorization: `Bearer ${tokenAluno}`,
      },
    })
    expect(friendRes.statusCode).toBe(200)
  })
})
