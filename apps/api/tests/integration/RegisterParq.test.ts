import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma } from '../../src/infrastructure/database/prisma.js'
import type { FastifyInstance } from 'fastify'

// ─── UX-009: Triagem simplificada PAR-Q+ no cadastro ────────────────────────
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

// Rate limit do /auth/register é 3/min POR instância (store em memória).
// Usamos duas instâncias: uma para os casos válidos (2 registros) e outra
// para os shapes inválidos (3 registros), sem estourar o limite.
let app: FastifyInstance
let appValidation: FastifyInstance
// 3ª instância para o 2º caso de persistência (rate limit do /auth/register é
// 3/min POR instância — app já usa 3 registros válidos).
let appPersist: FastifyInstance

const ts = Date.now()
const emailsCriados: string[] = []

function registerReq(appRef: FastifyInstance, payload: Record<string, unknown>) {
  return appRef.inject({ method: 'POST', url: '/auth/register', payload })
}

async function loginAndCreatePerfil(
  appRef: FastifyInstance,
  email: string,
  senha: string,
  payload: Record<string, unknown> = {},
) {
  await prisma.usuario.update({ where: { email }, data: { email_verified: true } })
  const loginRes = await appRef.inject({ method: 'POST', url: '/auth/login', payload: { email, senha } })
  expect(loginRes.statusCode).toBe(200)
  const token = JSON.parse(loginRes.body).accessToken as string
  // A linha Aluno é criada pelo POST /alunos/perfil (mesmo fluxo do wizard)
  const perfilRes = await appRef.inject({
    method: 'POST',
    url: '/alunos/perfil',
    headers: { authorization: `Bearer ${token}` },
    payload,
  })
  expect(perfilRes.statusCode).toBe(201)
}

async function cleanupUsuarios() {
  for (const email of emailsCriados) {
    const u = await prisma.usuario.findUnique({ where: { email } })
    if (u) {
      await prisma.refreshToken.deleteMany({ where: { usuario_id: u.id } })
      await prisma.aluno.deleteMany({ where: { usuario_id: u.id } })
      await prisma.usuario.delete({ where: { id: u.id } })
    }
  }
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
  appValidation = await buildApp()
  await appValidation.ready()
  appPersist = await buildApp()
  await appPersist.ready()
})

afterAll(async () => {
  await cleanupUsuarios()
  await app.close()
  await appValidation.close()
  await appPersist.close()
  await prisma.$disconnect()
})

describe.skipIf(!dbOk)('UX-009 — POST /auth/register parqRespostas', () => {
  it('registro SEM parqRespostas funciona e a coluna parq_respostas fica null', async () => {
    const email = `parq-sem-${ts}@t.com`
    emailsCriados.push(email)

    const res = await registerReq(app, { nome: 'Parq Sem', email, senha: 'Abc12345', role: 'ALUNO' })
    expect(res.statusCode).toBe(201)

    await loginAndCreatePerfil(app, email, 'Abc12345')

    const aluno = await prisma.aluno.findFirst({ where: { usuario: { email } } })
    expect(aluno).not.toBeNull()
    expect(aluno?.parq_respostas).toBeNull()
  })

  it('registro COM parqRespostas válido é aceito (201) e cria a conta', async () => {
    const email = `parq-com-${ts}@t.com`
    emailsCriados.push(email)

    const res = await registerReq(app, {
      nome: 'Parq Com',
      email,
      senha: 'Abc12345',
      role: 'ALUNO',
      parqRespostas: { q1: true, q2: false, q3: false, q4: true },
    })
    expect(res.statusCode).toBe(201)

    const usuario = await prisma.usuario.findUnique({ where: { email } })
    expect(usuario).not.toBeNull()
  })

  it('rejeita parqRespostas com q3 ausente → 422 e NÃO cria conta', async () => {
    const email = `parq-inv1-${ts}@t.com`

    const res = await registerReq(appValidation, {
      nome: 'Parq Inv1',
      email,
      senha: 'Abc12345',
      role: 'ALUNO',
      parqRespostas: { q1: false, q2: false, q4: false },
    })
    expect(res.statusCode).toBe(422)
    expect(JSON.parse(res.body).error).toBe('VALIDATION_ERROR')

    const usuario = await prisma.usuario.findUnique({ where: { email } })
    expect(usuario).toBeNull()
  })

  it('rejeita parqRespostas com campo extra → 422 e NÃO cria conta', async () => {
    const email = `parq-inv2-${ts}@t.com`

    const res = await registerReq(appValidation, {
      nome: 'Parq Inv2',
      email,
      senha: 'Abc12345',
      role: 'ALUNO',
      parqRespostas: { q1: false, q2: false, q3: false, q4: false, q5: true },
    })
    expect(res.statusCode).toBe(422)
    expect(JSON.parse(res.body).error).toBe('VALIDATION_ERROR')

    const usuario = await prisma.usuario.findUnique({ where: { email } })
    expect(usuario).toBeNull()
  })

  it('rejeita parqRespostas com valor não-booleano → 422 e NÃO cria conta', async () => {
    const email = `parq-inv3-${ts}@t.com`

    const res = await registerReq(appValidation, {
      nome: 'Parq Inv3',
      email,
      senha: 'Abc12345',
      role: 'ALUNO',
      parqRespostas: { q1: 'sim', q2: false, q3: false, q4: false },
    })
    expect(res.statusCode).toBe(422)
    expect(JSON.parse(res.body).error).toBe('VALIDATION_ERROR')

    const usuario = await prisma.usuario.findUnique({ where: { email } })
    expect(usuario).toBeNull()
  })

  // UX-009: o POST /auth/register NÃO cria a linha Aluno — ela é criada pelo
  // POST /alunos/perfil (aluno.routes.ts). A persistência de parq_respostas
  // acontece nesse endpoint, então o fluxo é: register → perfil com parqRespostas.
  it('persiste parqRespostas no Aluno com respostas, algumPositivo e respondidoEm (algum sim)', async () => {
    const email = `parq-persist-${ts}@t.com`
    emailsCriados.push(email)

    const res = await registerReq(app, {
      nome: 'Parq Persist',
      email,
      senha: 'Abc12345',
      role: 'ALUNO',
    })
    expect(res.statusCode).toBe(201)

    await loginAndCreatePerfil(app, email, 'Abc12345', {
      parqRespostas: { q1: true, q2: true, q3: false, q4: false },
    })

    const aluno = await prisma.aluno.findFirst({ where: { usuario: { email } } })
    expect(aluno).not.toBeNull()
    expect(aluno?.parq_respostas).toMatchObject({
      respostas: { q1: true, q2: true, q3: false, q4: false },
      algumPositivo: true,
    })
    expect((aluno?.parq_respostas as { respondidoEm?: string })?.respondidoEm).toBeTruthy()
  })

  it('persiste parqRespostas com algumPositivo false quando todas as respostas são "não"', async () => {
    const email = `parq-persist-false-${ts}@t.com`
    emailsCriados.push(email)

    const res = await registerReq(appPersist, {
      nome: 'Parq Persist False',
      email,
      senha: 'Abc12345',
      role: 'ALUNO',
    })
    expect(res.statusCode).toBe(201)

    await loginAndCreatePerfil(appPersist, email, 'Abc12345', {
      parqRespostas: { q1: false, q2: false, q3: false, q4: false },
    })

    const aluno = await prisma.aluno.findFirst({ where: { usuario: { email } } })
    expect(aluno).not.toBeNull()
    expect(aluno?.parq_respostas).toMatchObject({
      respostas: { q1: false, q2: false, q3: false, q4: false },
      algumPositivo: false,
    })
    expect((aluno?.parq_respostas as { respondidoEm?: string })?.respondidoEm).toBeTruthy()
  })
})
