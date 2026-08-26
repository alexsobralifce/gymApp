import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma } from '../../src/infrastructure/database/prisma.js'
import { TreinoStatus } from '@prisma/client'
import type { FastifyInstance } from 'fastify'

// ─── UX-013: Histórico de desempenho por exercício ────────────────────────────
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
let tokenA: string
let tokenB: string
let alunoAId: string
let usuarioAId: string
let usuarioBId: string
let exercicioId: string
let treinoAId: string
let treinoBId: string

const ts = Date.now()
const emailA = `hist-a-${ts}@t.com`
const emailB = `hist-b-${ts}@t.com`

function diasAtras(dias: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  d.setHours(10, 0, 0, 0)
  return d
}

function dataISO(dias: number): string {
  return diasAtras(dias).toISOString().slice(0, 10)
}

async function registerAndLogin(nome: string, email: string, senha: string, role: string) {
  const regRes = await app.inject({ method: 'POST', url: '/auth/register', payload: { nome, email, senha, role } })
  if (regRes.statusCode >= 400) throw new Error(`Register failed (${role}): ${regRes.body}`)
  await prisma.usuario.update({ where: { email }, data: { email_verified: true } })
  const loginRes = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, senha } })
  if (loginRes.statusCode >= 400) throw new Error(`Login failed (${role}): ${loginRes.body}`)
  return JSON.parse(loginRes.body).accessToken as string
}

async function getHistorico(token: string, exercicio: string, periodo?: string) {
  return app.inject({
    method: 'GET',
    url: `/alunos/exercicios/${exercicio}/historico${periodo ? `?periodo=${periodo}` : ''}`,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  })
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  tokenA = await registerAndLogin('Hist Aluno A', emailA, 'Abc12345', 'ALUNO')
  tokenB = await registerAndLogin('Hist Aluno B', emailB, 'Abc12345', 'ALUNO')

  // Cria o registro de aluno A via API (mesmo caminho de produção)
  const perfilRes = await app.inject({
    method: 'POST',
    url: '/alunos/perfil',
    headers: { authorization: `Bearer ${tokenA}` },
    payload: {},
  })
  expect(perfilRes.statusCode).toBe(201)
  alunoAId = JSON.parse(perfilRes.body).id

  const usuarioA = await prisma.usuario.findUniqueOrThrow({ where: { email: emailA } })
  const usuarioB = await prisma.usuario.findUniqueOrThrow({ where: { email: emailB } })
  usuarioAId = usuarioA.id
  usuarioBId = usuarioB.id

  // Aluno B (cross-tenant) ganha registro direto no banco
  const alunoB = await prisma.aluno.create({ data: { usuario_id: usuarioBId } })

  // Exercício dedicado (isolado do seed de 963 exercícios)
  const exercicio = await prisma.exercicio.create({ data: { nome: `Exercicio-Historico-${ts}` } })
  exercicioId = exercicio.id

  // Treinos: um para cada aluno
  const treinoA = await prisma.treino.create({
    data: { aluno_id: alunoAId, nome: 'Treino Hist A', dias_semana: [1, 3, 5], status: TreinoStatus.ACEITO },
  })
  const treinoB = await prisma.treino.create({
    data: { aluno_id: alunoB.id, nome: 'Treino Hist B', dias_semana: [2, 4], status: TreinoStatus.ACEITO },
  })
  treinoAId = treinoA.id
  treinoBId = treinoB.id

  // Execuções do aluno A em 3 datas com cargas crescentes (dentro de 90d)
  await prisma.execucaoExercicio.createMany({
    data: [
      { treino_id: treinoAId, exercicio_id: exercicioId, serie_numero: 1, repeticoes: 10, carga_kg: 20, registrado_em: diasAtras(40) },
      { treino_id: treinoAId, exercicio_id: exercicioId, serie_numero: 2, repeticoes: 8, carga_kg: 20, registrado_em: diasAtras(40) },
      { treino_id: treinoAId, exercicio_id: exercicioId, serie_numero: 1, repeticoes: 8, carga_kg: 40, registrado_em: diasAtras(10) },
      { treino_id: treinoAId, exercicio_id: exercicioId, serie_numero: 2, repeticoes: 12, carga_kg: 35, registrado_em: diasAtras(10) },
      { treino_id: treinoAId, exercicio_id: exercicioId, serie_numero: 1, repeticoes: 6, carga_kg: 60, registrado_em: diasAtras(1) },
    ],
  })

  // Execução do aluno B (cross-tenant) — com carga MAIOR que qualquer uma do A.
  // Nunca pode aparecer no histórico de A.
  await prisma.execucaoExercicio.createMany({
    data: [
      { treino_id: treinoBId, exercicio_id: exercicioId, serie_numero: 1, repeticoes: 3, carga_kg: 120, registrado_em: diasAtras(2) },
    ],
  })
})

afterAll(async () => {
  await prisma.execucaoExercicio.deleteMany({ where: { treino_id: { in: [treinoAId, treinoBId] } } })
  await prisma.treino.deleteMany({ where: { id: { in: [treinoAId, treinoBId] } } })
  if (exercicioId) await prisma.exercicio.delete({ where: { id: exercicioId } })
  await prisma.aluno.deleteMany({ where: { usuario_id: { in: [usuarioAId, usuarioBId] } } })
  await prisma.refreshToken.deleteMany({ where: { usuario_id: { in: [usuarioAId, usuarioBId] } } })
  await prisma.usuario.deleteMany({ where: { id: { in: [usuarioAId, usuarioBId] } } })
  await app.close()
  await prisma.$disconnect()
})

describe.skipIf(!dbOk)('UX-013 — GET /alunos/exercicios/:exercicioId/historico', () => {
  it('agrupa por sessão com carga máxima, volume e 1RM (Brzycki)', async () => {
    const res = await getHistorico(tokenA, exercicioId)
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.exercicio.id).toBe(exercicioId)
    expect(body.exercicio.nome).toBe(`Exercicio-Historico-${ts}`)

    expect(body.sessoes).toHaveLength(3)

    const [s1, s2, s3] = body.sessoes
    expect(s1.data).toBe(dataISO(40))
    expect(s1.cargaMaxima).toBe(20)
    expect(s1.repsTop).toBe(10)
    expect(s1.seriesCount).toBe(2)
    expect(s1.volumeTotal).toBe(360) // 20×10 + 20×8

    expect(s2.data).toBe(dataISO(10))
    expect(s2.cargaMaxima).toBe(40)
    expect(s2.volumeTotal).toBe(740) // 40×8 + 35×12

    expect(s3.data).toBe(dataISO(1))
    expect(s3.cargaMaxima).toBe(60)
    expect(s3.volumeTotal).toBe(360) // 60×6

    // Spot-check Brzycki: 1RM = carga × 36 / (37 − reps) → 60 × 36 / 31 ≈ 69.7
    expect(s3.estimativa1RM).toBeCloseTo((60 * 36) / 31, 1)

    // Recorde pessoal: a última sessão (60kg) superou a melhor anterior (40kg)
    expect(body.recordePessoal).toBe(true)
    expect(body.cargaAnterior).toBe(40)

    expect(body.estatisticas.melhorCarga).toBe(60)
    expect(body.estatisticas.volumeTotalPeriodo).toBe(1460)
    expect(body.estatisticas.sessoesCount).toBe(3)
    expect(body.estatisticas.estimativa1RMAtual).toBeCloseTo((60 * 36) / 31, 1)
  })

  it('periodo=7d exclui sessões mais antigas que 7 dias', async () => {
    const res = await getHistorico(tokenA, exercicioId, '7d')
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.sessoes).toHaveLength(1)
    expect(body.sessoes[0].data).toBe(dataISO(1))
    expect(body.sessoes[0].cargaMaxima).toBe(60)
    expect(body.estatisticas.sessoesCount).toBe(1)
    expect(body.estatisticas.melhorCarga).toBe(60)
  })

  it('periodo=30d mantém apenas sessões dos últimos 30 dias', async () => {
    const res = await getHistorico(tokenA, exercicioId, '30d')
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.sessoes).toHaveLength(2)
    expect(body.sessoes.map((s: { data: string }) => s.data)).toEqual([dataISO(10), dataISO(1)])
  })

  it('isola tenant: execuções de outro aluno nunca aparecem', async () => {
    const res = await getHistorico(tokenA, exercicioId)
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    const cargas = body.sessoes.map((s: { cargaMaxima: number }) => s.cargaMaxima)
    expect(Math.max(...cargas)).toBe(60) // os 120kg do aluno B NÃO aparecem
    expect(body.estatisticas.melhorCarga).toBe(60)
  })

  it('aluno B enxerga apenas as próprias execuções (120kg, não as do A)', async () => {
    const res = await getHistorico(tokenB, exercicioId)
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.sessoes).toHaveLength(1)
    expect(body.sessoes[0].cargaMaxima).toBe(120)
  })

  it('exercicioId inexistente → 404', async () => {
    const res = await getHistorico(tokenA, 'cm0000000000000000000000')
    expect(res.statusCode).toBe(404)
  })

  it('sem autenticação → 401', async () => {
    const res = await getHistorico('', exercicioId)
    expect(res.statusCode).toBe(401)
  })

  it('periodo inválido → 422', async () => {
    const res = await getHistorico(tokenA, exercicioId, '999d')
    expect(res.statusCode).toBe(422)
  })
})
