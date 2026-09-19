import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma } from '../../src/infrastructure/database/prisma.js'
import { Role } from '@prisma/client'
import type { FastifyInstance } from 'fastify'

describe('Social - professor com a mesma liberdade de um aluno', () => {
  let app: FastifyInstance
  let professor: any
  let alunoDoProfessor: any
  let tokenProfessor: string
  let outroAluno: any
  let outroUsuarioId: string
  let postProfessorId: string
  let postOutroId: string
  const sufixo = Date.now()

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    // Professor com perfil de aluno (self-flow: é assim que ele treina e posta)
    professor = await prisma.usuario.create({
      data: {
        email: `prof-mural-${sufixo}@teste.com`,
        nome: 'Professor Mural',
        role: Role.PROFESSOR,
        ativo: true,
        email_verified: true,
        professor: { create: {} },
        aluno: { create: { consentiu_feed_social_em: new Date() } },
      },
      include: { aluno: true },
    })
    alunoDoProfessor = professor.aluno
    tokenProfessor = app.jwt.sign({ sub: professor.id, email: professor.email, role: professor.role })

    const outro = await prisma.usuario.create({
      data: {
        email: `outro-mural-${sufixo}@teste.com`,
        nome: 'Outro Aluno',
        role: Role.ALUNO,
        ativo: true,
        email_verified: true,
        aluno: { create: {} },
      },
      include: { aluno: true },
    })
    outroAluno = outro.aluno
    outroUsuarioId = outro.id

    const postProf = await prisma.socialPost.create({
      data: {
        aluno_id: alunoDoProfessor.id,
        autor_nome: professor.nome,
        tipo: 'TREINO_CONCLUIDO',
        visibilidade: 'AMIGOS',
      },
    })
    postProfessorId = postProf.id

    const postOutro = await prisma.socialPost.create({
      data: {
        aluno_id: outroAluno.id,
        autor_nome: 'Outro Aluno',
        tipo: 'TREINO_CONCLUIDO',
        visibilidade: 'PUBLICO',
      },
    })
    postOutroId = postOutro.id
  })

  afterAll(async () => {
    await prisma.socialLike.deleteMany({ where: { post_id: { in: [postProfessorId, postOutroId] } } })
    await prisma.socialComment.deleteMany({ where: { post_id: { in: [postProfessorId, postOutroId] } } })
    await prisma.socialPost.deleteMany({ where: { id: { in: [postProfessorId, postOutroId] } } })
    await prisma.aluno.deleteMany({ where: { id: { in: [alunoDoProfessor.id, outroAluno.id] } } })
    await prisma.professor.deleteMany({ where: { usuario_id: professor.id } })
    await prisma.usuario.deleteMany({
      where: { email: { in: [`prof-mural-${sufixo}@teste.com`, `outro-mural-${sufixo}@teste.com`] } },
    })
    await app.close()
  })

  const auth = () => ({ authorization: `Bearer ${tokenProfessor}` })

  it('professor encontra o próprio último post de treino', async () => {
    const res = await app.inject({ method: 'GET', url: '/social/mural/meu-ultimo-post', headers: auth() })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).postId).toBe(postProfessorId)
  })

  it('professor adiciona a foto (card) ao próprio post', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/social/mural/${postProfessorId}/foto`,
      headers: auth(),
      payload: { midiaUrl: 'http://localhost:3333/uploads/feed/2026/09/card.jpg' },
    })
    expect(res.statusCode).toBe(200)
    const post = await prisma.socialPost.findUnique({ where: { id: postProfessorId } })
    expect(post?.midia_url).toBe('http://localhost:3333/uploads/feed/2026/09/card.jpg')
  })

  it('professor edita a legenda do próprio post', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/social/mural/${postProfessorId}`,
      headers: auth(),
      payload: { legenda: 'Treino concluído!' },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).legenda).toBe('Treino concluído!')
  })

  it('professor NÃO altera o post de outro autor', async () => {
    const foto = await app.inject({
      method: 'PATCH',
      url: `/social/mural/${postOutroId}/foto`,
      headers: auth(),
      payload: { midiaUrl: 'http://localhost:3333/x.jpg' },
    })
    expect(foto.statusCode).toBe(403)

    const del = await app.inject({ method: 'DELETE', url: `/social/mural/${postOutroId}`, headers: auth() })
    expect(del.statusCode).toBe(403)
  })

  it('upload de foto deixa de ser barrado por papel para o professor (sem arquivo => 400, não 403)', async () => {
    const res = await app.inject({ method: 'POST', url: '/social/upload/foto', headers: auth() })
    expect(res.statusCode).not.toBe(403)
  })

  it('professor vê o feed, curte e comenta como um aluno', async () => {
    const feed = await app.inject({ method: 'GET', url: '/social/mural', headers: auth() })
    expect(feed.statusCode).toBe(200)
    const ids = JSON.parse(feed.body).items.map((p: any) => p.id)
    expect(ids).toContain(postProfessorId) // o próprio post
    expect(ids).toContain(postOutroId) // post PUBLICO de outro autor

    const curtir = await app.inject({ method: 'POST', url: `/social/mural/${postOutroId}/curtir`, headers: auth() })
    expect(curtir.statusCode).toBeLessThan(300)
    const comentar = await app.inject({
      method: 'POST',
      url: `/social/mural/${postOutroId}/comentar`,
      headers: auth(),
      payload: { texto: 'Bom treino!' },
    })
    expect(comentar.statusCode).toBeLessThan(300)
  })

  it('professor acessa amizades e clubes como um aluno', async () => {
    const amigos = await app.inject({ method: 'GET', url: '/social/amizades', headers: auth() })
    expect(amigos.statusCode).toBe(200)
    const clubes = await app.inject({ method: 'GET', url: '/social/clubes', headers: auth() })
    expect(clubes.statusCode).toBe(200)
  })

  it('professor pode ser encontrado por e-mail e receber pedido de amizade de um aluno', async () => {
    const tokenOutro = app.jwt.sign({ sub: outroUsuarioId, email: `outro-mural-${sufixo}@teste.com`, role: Role.ALUNO })
    const res = await app.inject({
      method: 'POST',
      url: '/social/amizades/solicitar',
      headers: { authorization: `Bearer ${tokenOutro}` },
      payload: { email: professor.email },
    })
    expect(res.statusCode).toBe(200)
    const amizade = await prisma.socialFriendship.findFirst({
      where: { aluno_id: outroAluno.id, amigo_id: alunoDoProfessor.id },
    })
    expect(amizade?.status).toBe('PENDENTE')
    await prisma.socialFriendship.deleteMany({ where: { aluno_id: outroAluno.id } })
  })
})
