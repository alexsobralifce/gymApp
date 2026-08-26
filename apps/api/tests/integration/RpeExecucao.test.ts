import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma } from '../../src/infrastructure/database/prisma.js'
import type { FastifyInstance } from 'fastify'

// ─── UX-010: RPE numérico opcional por série ─────────────────────────────────
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
let alunoAToken: string
let alunoBToken: string
let treinoId: string
let exercicioId: string

const ts = Date.now()
const emails: string[] = []
const treinosIds: string[] = []
const exerciciosIds: string[] = []

async function registerAndLogin(nome: string, email: string, senha: string, role: string) {
  const regRes = await app.inject({ method: 'POST', url: '/auth/register', payload: { nome, email, senha, role } })
  if (regRes.statusCode >= 400) throw new Error(`Register failed (${role}): ${regRes.body}`)
  await prisma.usuario.update({ where: { email }, data: { email_verified: true } })
  const loginRes = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, senha } })
  if (loginRes.statusCode >= 400) throw new Error(`Login failed (${role}): ${loginRes.body}`)
  return JSON.parse(loginRes.body).accessToken as string
}

async function criarTreinoEmExecucao(token: string): Promise<string> {
  const ex = await prisma.exercicio.create({
    data: { nome: `Supino RPE ${ts}`, grupo_muscular: 'PEITO', passos_pt: [] },
  })
  exerciciosIds.push(ex.id)
  exercicioId = ex.id

  const criar = await app.inject({
    method: 'POST',
    url: '/treinos/autogestao',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      nome: `Treino RPE ${ts}`,
      diasSemana: [1, 3, 5],
      exercicios: [{ exercicioId: ex.id, ordem: 1, series: 3, repeticoes: 10, cargaSugeridaKg: 30 }],
    },
  })
  expect(criar.statusCode).toBe(201)
  const body = JSON.parse(criar.body)
  treinosIds.push(body.id)

  const iniciar = await app.inject({
    method: 'POST',
    url: `/treinos/${body.id}/iniciar`,
    headers: { authorization: `Bearer ${token}` },
  })
  expect(iniciar.statusCode).toBe(200)
  return body.id as string
}

async function logarSerie(token: string, rpe: unknown, serieNumero = 1) {
  return app.inject({
    method: 'POST',
    url: `/treinos/${treinoId}/execucoes`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      exercicioId,
      serieNumero,
      repeticoes: 10,
      cargaKg: 30,
      ...(rpe === undefined ? {} : { rpe }),
    },
  })
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  alunoAToken = await registerAndLogin('Aluno A RPE', `rpe-aluno-a-${ts}@t.com`, 'Abc12345', 'ALUNO')
  alunoBToken = await registerAndLogin('Aluno B RPE', `rpe-aluno-b-${ts}@t.com`, 'Abc12345', 'ALUNO')
  emails.push(`rpe-aluno-a-${ts}@t.com`, `rpe-aluno-b-${ts}@t.com`)

  // Cria registro de aluno para B (para exercitar o tenant check de verdade,
  // em vez do ramo "aluno não encontrado")
  const perfilB = await app.inject({
    method: 'POST',
    url: '/alunos/perfil',
    headers: { authorization: `Bearer ${alunoBToken}` },
    payload: {},
  })
  expect(perfilB.statusCode).toBe(201)

  treinoId = await criarTreinoEmExecucao(alunoAToken)
})

afterAll(async () => {
  // Limpeza na ordem de dependência (FKs)
  await prisma.execucaoExercicio.deleteMany({ where: { treino_id: { in: treinosIds } } })
  await prisma.treinoHistorico.deleteMany({ where: { treino_id: { in: treinosIds } } })
  await prisma.treinoExercicio.deleteMany({ where: { treino_id: { in: treinosIds } } })
  await prisma.socialPost.deleteMany({ where: { treino_id: { in: treinosIds } } })
  await prisma.treino.deleteMany({ where: { id: { in: treinosIds } } })
  await prisma.exercicio.deleteMany({ where: { id: { in: exerciciosIds } } })

  for (const email of emails) {
    const u = await prisma.usuario.findUnique({ where: { email } })
    if (!u) continue
    await prisma.refreshToken.deleteMany({ where: { usuario_id: u.id } })
    await prisma.aluno.deleteMany({ where: { usuario_id: u.id } })
    await prisma.usuario.delete({ where: { id: u.id } })
  }

  await app.close()
  await prisma.$disconnect()
})

describe.skipIf(!dbOk)('UX-010 — POST /treinos/:id/execucoes com RPE', () => {
  it('feliz: registra série com rpe=8, persiste e devolve no detalhe da sessão', async () => {
    const res = await logarSerie(alunoAToken, 8, 1)
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.rpe).toBe(8)

    // Persistido no banco
    const noBanco = await prisma.execucaoExercicio.findFirst({
      where: { treino_id: treinoId, serie_numero: 1 },
    })
    expect(noBanco?.rpe).toBe(8)

    // Detalhe da sessão devolve o rpe
    const detalhe = await app.inject({
      method: 'GET',
      url: `/treinos/${treinoId}`,
      headers: { authorization: `Bearer ${alunoAToken}` },
    })
    expect(detalhe.statusCode).toBe(200)
    const execucoes = JSON.parse(detalhe.body).execucoes
    expect(execucoes).toHaveLength(1)
    expect(execucoes[0].rpe).toBe(8)
  })

  it('sem rpe: registra série normalmente com rpe null', async () => {
    const res = await logarSerie(alunoAToken, undefined, 2)
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.rpe).toBeNull()

    const noBanco = await prisma.execucaoExercicio.findFirst({
      where: { treino_id: treinoId, serie_numero: 2 },
    })
    expect(noBanco?.rpe).toBeNull()
  })

  it.each([0, 11])('rejeita rpe=%p com 422 e não persiste nada', async (rpeInvalido) => {
    const antes = await prisma.execucaoExercicio.count({ where: { treino_id: treinoId } })

    const res = await logarSerie(alunoAToken, rpeInvalido, 3)
    expect(res.statusCode).toBe(422)
    expect(JSON.parse(res.body).error).toBe('VALIDATION_ERROR')
    expect(JSON.parse(res.body).details.rpe).toBeTruthy()

    const depois = await prisma.execucaoExercicio.count({ where: { treino_id: treinoId } })
    expect(depois).toBe(antes)
    const comRpeInvalido = await prisma.execucaoExercicio.findFirst({
      where: { treino_id: treinoId, rpe: rpeInvalido as number },
    })
    expect(comRpeInvalido).toBeNull()
  })

  it('IDOR: ALUNO B não pode registrar série no treino de ALUNO A → 403', async () => {
    const res = await logarSerie(alunoBToken, 5, 3)
    expect(res.statusCode).toBe(403)
    expect(JSON.parse(res.body).error).toBe('TENANT_ACCESS_DENIED')

    // Nada foi persistido
    const noBanco = await prisma.execucaoExercicio.findFirst({
      where: { treino_id: treinoId, serie_numero: 3 },
    })
    expect(noBanco).toBeNull()
  })
})
