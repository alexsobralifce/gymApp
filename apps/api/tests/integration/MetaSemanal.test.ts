import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma } from '../../src/infrastructure/database/prisma.js'
import type { FastifyInstance } from 'fastify'

// ─── UX-003: Meta semanal editável ───────────────────────────────────────────
// Teste de integração real (HTTP + Postgres). Sem banco acessível, pula
// explicitamente em vez de quebrar o `npm test`.
let dbOk = false
try {
  await prisma.$connect()
  await prisma.$queryRaw`SELECT 1`
  dbOk = true
} catch {
  dbOk = false
}

let app: FastifyInstance
let alunoToken: string
let alunoId: string

const ts = Date.now()
const email = `meta-aluno-${ts}@t.com`

async function registerAndLogin(nome: string, email: string, senha: string, role: string) {
  const regRes = await app.inject({ method: 'POST', url: '/auth/register', payload: { nome, email, senha, role } })
  if (regRes.statusCode >= 400) throw new Error(`Register failed (${role}): ${regRes.body}`)
  await prisma.usuario.update({ where: { email }, data: { email_verified: true } })
  const loginRes = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, senha } })
  if (loginRes.statusCode >= 400) throw new Error(`Login failed (${role}): ${loginRes.body}`)
  return JSON.parse(loginRes.body).accessToken as string
}

async function setMetaSemanalApi(metaSemanal: unknown) {
  return app.inject({
    method: 'POST',
    url: '/alunos/perfil',
    headers: { authorization: `Bearer ${alunoToken}` },
    payload: metaSemanal === undefined ? {} : { metaSemanal },
  })
}

async function getPerfil() {
  const res = await app.inject({
    method: 'GET',
    url: '/alunos/perfil',
    headers: { authorization: `Bearer ${alunoToken}` },
  })
  expect(res.statusCode).toBe(200)
  return JSON.parse(res.body)
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  alunoToken = await registerAndLogin('Meta Aluno', email, 'Abc12345', 'ALUNO')

  // Cria o registro de aluno (branch create do perfil). O update seguinte cai
  // no branch que persiste meta_semanal.
  const res = await app.inject({
    method: 'POST',
    url: '/alunos/perfil',
    headers: { authorization: `Bearer ${alunoToken}` },
    payload: {},
  })
  expect(res.statusCode).toBe(201)
  alunoId = JSON.parse(res.body).id
})

afterAll(async () => {
  const u = await prisma.usuario.findUnique({ where: { email } })
  if (u) {
    await prisma.refreshToken.deleteMany({ where: { usuario_id: u.id } })
    await prisma.aluno.deleteMany({ where: { usuario_id: u.id } })
    await prisma.usuario.delete({ where: { id: u.id } })
  }
  await app.close()
  await prisma.$disconnect()
})

describe.skipIf(!dbOk)('UX-003 — POST /alunos/perfil metaSemanal', () => {
  it('aceita e persiste metaSemanal=1', async () => {
    const res = await setMetaSemanalApi(1)
    expect(res.statusCode).toBe(200)
    const perfil = await getPerfil()
    expect(perfil.meta_semanal).toBe(1)
  })

  it('aceita e persiste metaSemanal=7', async () => {
    const res = await setMetaSemanalApi(7)
    expect(res.statusCode).toBe(200)
    const perfil = await getPerfil()
    expect(perfil.meta_semanal).toBe(7)
  })

  it.each([0, 8, -1, 2.5, 'tres', null])(
    'rejeita metaSemanal=%p com 422 e não persiste o campo',
    async (invalido) => {
      // Reseta para um valor conhecido
      const reset = await setMetaSemanalApi(3)
      expect(reset.statusCode).toBe(200)

      const res = await setMetaSemanalApi(invalido)
      expect(res.statusCode).toBe(422)
      expect(JSON.parse(res.body).error).toBe('VALIDATION_ERROR')
      expect(JSON.parse(res.body).details.metaSemanal).toBeTruthy()

      // Campo NÃO foi alterado
      const perfil = await getPerfil()
      expect(perfil.meta_semanal).toBe(3)
    },
  )

  it('persiste metaSemanal também na PRIMEIRA criação do perfil (create branch)', async () => {
    // Usuário novo: o primeiro POST /alunos/perfil cai no branch create.
    // O contrato da API deve persistir o campo também nesse caminho.
    const emailFirst = `meta-first-${ts}@t.com`
    const token = await registerAndLogin('Meta Aluno First', emailFirst, 'Abc12345', 'ALUNO')

    const res = await app.inject({
      method: 'POST',
      url: '/alunos/perfil',
      headers: { authorization: `Bearer ${token}` },
      payload: { metaSemanal: 5 },
    })
    expect(res.statusCode).toBe(201)
    const perfil = JSON.parse(res.body)
    expect(perfil.meta_semanal).toBe(5)

    // limpeza
    const u = await prisma.usuario.findUnique({ where: { email: emailFirst } })
    if (u) {
      await prisma.refreshToken.deleteMany({ where: { usuario_id: u.id } })
      await prisma.aluno.deleteMany({ where: { usuario_id: u.id } })
      await prisma.usuario.delete({ where: { id: u.id } })
    }
  })

  it('campo proibido: professor_id enviado no payload é ignorado', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/alunos/perfil',
      headers: { authorization: `Bearer ${alunoToken}` },
      payload: { professor_id: 'prof-fake-123', metaSemanal: 4 },
    })
    expect(res.statusCode).toBe(200)

    const perfil = await getPerfil()
    expect(perfil.professor_id).toBeNull() // não foi alterado
    expect(perfil.meta_semanal).toBe(4) // campo permitido segue funcionando
  })

  it('campo proibido: role enviado no payload é ignorado (usuário continua ALUNO)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/alunos/perfil',
      headers: { authorization: `Bearer ${alunoToken}` },
      payload: { role: 'ROOT' },
    })
    expect(res.statusCode).toBe(200)

    const u = await prisma.usuario.findUnique({ where: { email } })
    expect(u?.role).toBe('ALUNO')
  })

  it('obterEvolucaoMensal usa aluno.meta_semanal quando definido', async () => {
    await prisma.aluno.update({ where: { id: alunoId }, data: { meta_semanal: 5 } })
    const res = await app.inject({
      method: 'GET',
      url: '/alunos/evolucao/mensal',
      headers: { authorization: `Bearer ${alunoToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).metaSemanal).toBe(5)
  })

  it('obterEvolucaoMensal clampa meta 99 armazenada direto no banco para 7', async () => {
    await prisma.aluno.update({ where: { id: alunoId }, data: { meta_semanal: 99 } })
    const res = await app.inject({
      method: 'GET',
      url: '/alunos/evolucao/mensal',
      headers: { authorization: `Bearer ${alunoToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).metaSemanal).toBe(7)
  })

  it('obterEvolucaoMensal clampa meta 0 armazenada direto no banco para 1', async () => {
    await prisma.aluno.update({ where: { id: alunoId }, data: { meta_semanal: 0 } })
    const res = await app.inject({
      method: 'GET',
      url: '/alunos/evolucao/mensal',
      headers: { authorization: `Bearer ${alunoToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).metaSemanal).toBe(1)
  })
})
