import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma } from '../../src/infrastructure/database/prisma.js'
import type { FastifyInstance } from 'fastify'

// ─── UX-004: Substituição de exercício durante execução ──────────────────────
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

const ts = Date.now()
const emails: string[] = []
const exerciciosIds: string[] = []
const treinosIds: string[] = []

async function registerAndLogin(nome: string, email: string, senha: string, role: string) {
  const regRes = await app.inject({ method: 'POST', url: '/auth/register', payload: { nome, email, senha, role } })
  if (regRes.statusCode >= 400) throw new Error(`Register failed (${role}): ${regRes.body}`)
  await prisma.usuario.update({ where: { email }, data: { email_verified: true } })
  const loginRes = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, senha } })
  if (loginRes.statusCode >= 400) throw new Error(`Login failed (${role}): ${loginRes.body}`)
  return JSON.parse(loginRes.body).accessToken as string
}

async function criarExercicio(nome: string, grupoMuscular: string | null): Promise<string> {
  const ex = await prisma.exercicio.create({
    data: { nome, grupo_muscular: grupoMuscular, passos_pt: [] },
  })
  exerciciosIds.push(ex.id)
  return ex.id
}

async function criarTreinoAutogestao(token: string, exercicioId: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/treinos/autogestao',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      nome: `Treino Substituição ${exercicioId.slice(-6)}`,
      diasSemana: [1, 3, 5],
      exercicios: [{ exercicioId, ordem: 1, series: 4, repeticoes: 10, cargaSugeridaKg: 30 }],
    },
  })
  expect(res.statusCode).toBe(201)
  const body = JSON.parse(res.body)
  treinosIds.push(body.id)
  return { treinoId: body.id as string, treinoExercicioId: body.exercicios[0].id as string }
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  alunoAToken = await registerAndLogin('Aluno A Subst', `aluno-a-subst-${ts}@t.com`, 'Abc12345', 'ALUNO')
  alunoBToken = await registerAndLogin('Aluno B Subst', `aluno-b-subst-${ts}@t.com`, 'Abc12345', 'ALUNO')
  emails.push(`aluno-a-subst-${ts}@t.com`, `aluno-b-subst-${ts}@t.com`)

  // Cria registro de aluno para B (para exercitar o tenant check de verdade,
  // em vez do ramo "aluno não encontrado")
  const perfilB = await app.inject({
    method: 'POST',
    url: '/alunos/perfil',
    headers: { authorization: `Bearer ${alunoBToken}` },
    payload: {},
  })
  expect(perfilB.statusCode).toBe(201)
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

describe.skipIf(!dbOk)('UX-004 — POST /treinos/:id/exercicios/:treinoExercicioId/substituir', () => {
  it('feliz: troca exercício do próprio treino e preserva ordem/séries/reps/carga', async () => {
    const exPeito = await criarExercicio('Supino Reto Subst', 'PEITO')
    const exPeito2 = await criarExercicio('Supino Inclinado Subst', 'PEITO')
    const { treinoId, treinoExercicioId } = await criarTreinoAutogestao(alunoAToken, exPeito)

    const res = await app.inject({
      method: 'POST',
      url: `/treinos/${treinoId}/exercicios/${treinoExercicioId}/substituir`,
      headers: { authorization: `Bearer ${alunoAToken}` },
      payload: { novo_exercicio_id: exPeito2 },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)

    // Banco atualizado
    const te = await prisma.treinoExercicio.findUniqueOrThrow({ where: { id: treinoExercicioId } })
    expect(te.exercicio_id).toBe(exPeito2)
    // Campos preservados
    expect(te.ordem).toBe(1)
    expect(te.series).toBe(4)
    expect(te.repeticoes).toBe(10)
    expect(te.carga_sugerida_kg).toBe(30)

    // Resposta contém o detalhe do treino atualizado
    expect(body.id).toBe(treinoId)
    expect(body.exercicios[0].exercicio_id).toBe(exPeito2)
    expect(body.exercicios[0].exercicio.grupo_muscular).toBe('PEITO')
  })

  it('integridade histórica: execucoes registradas com o exercício antigo permanecem intactas', async () => {
    const exPeito = await criarExercicio('Supino Reto Hist', 'PEITO')
    const exPeito2 = await criarExercicio('Supino Inclinado Hist', 'PEITO')
    const { treinoId, treinoExercicioId } = await criarTreinoAutogestao(alunoAToken, exPeito)

    // Registro real de série executada apontando para o exercício ANTIGO
    await prisma.execucaoExercicio.create({
      data: { treino_id: treinoId, exercicio_id: exPeito, serie_numero: 1, repeticoes: 10, carga_kg: 20 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/treinos/${treinoId}/exercicios/${treinoExercicioId}/substituir`,
      headers: { authorization: `Bearer ${alunoAToken}` },
      payload: { novo_exercicio_id: exPeito2 },
    })
    expect(res.statusCode).toBe(200)

    const execucoes = await prisma.execucaoExercicio.findMany({ where: { treino_id: treinoId } })
    expect(execucoes).toHaveLength(1)
    expect(execucoes[0].exercicio_id).toBe(exPeito) // continua apontando para o exercício antigo
    expect(execucoes[0].carga_kg).toBe(20)
    expect(execucoes[0].repeticoes).toBe(10)
  })

  it('grupo muscular: rejeita troca para grupo diferente com 422 VALIDATION_ERROR', async () => {
    const exPeito = await criarExercicio('Supino Grupo', 'PEITO')
    const exCostas = await criarExercicio('Remada Grupo', 'COSTAS')
    const { treinoId, treinoExercicioId } = await criarTreinoAutogestao(alunoAToken, exPeito)

    const res = await app.inject({
      method: 'POST',
      url: `/treinos/${treinoId}/exercicios/${treinoExercicioId}/substituir`,
      headers: { authorization: `Bearer ${alunoAToken}` },
      payload: { novo_exercicio_id: exCostas },
    })

    expect(res.statusCode).toBe(422)
    expect(JSON.parse(res.body).error).toBe('VALIDATION_ERROR')
    // Não alterou o exercício no banco
    const te = await prisma.treinoExercicio.findUniqueOrThrow({ where: { id: treinoExercicioId } })
    expect(te.exercicio_id).toBe(exPeito)
  })

  it('grupo muscular: permite troca quando um dos grupos é null', async () => {
    const exPeito = await criarExercicio('Supino Null', 'PEITO')
    const exSemGrupo = await criarExercicio('Alongamento Null', null)
    const { treinoId, treinoExercicioId } = await criarTreinoAutogestao(alunoAToken, exPeito)

    const res = await app.inject({
      method: 'POST',
      url: `/treinos/${treinoId}/exercicios/${treinoExercicioId}/substituir`,
      headers: { authorization: `Bearer ${alunoAToken}` },
      payload: { novo_exercicio_id: exSemGrupo },
    })

    expect(res.statusCode).toBe(200)
    const te = await prisma.treinoExercicio.findUniqueOrThrow({ where: { id: treinoExercicioId } })
    expect(te.exercicio_id).toBe(exSemGrupo)
  })

  it('IDOR: ALUNO B não pode substituir exercício no treino de ALUNO A', async () => {
    const exPeito = await criarExercicio('Supino IDOR', 'PEITO')
    const exPeito2 = await criarExercicio('Supino IDOR 2', 'PEITO')
    const { treinoId, treinoExercicioId } = await criarTreinoAutogestao(alunoAToken, exPeito)

    const res = await app.inject({
      method: 'POST',
      url: `/treinos/${treinoId}/exercicios/${treinoExercicioId}/substituir`,
      headers: { authorization: `Bearer ${alunoBToken}` },
      payload: { novo_exercicio_id: exPeito2 },
    })

    expect(res.statusCode).toBe(403)
    expect(JSON.parse(res.body).error).toBe('TENANT_ACCESS_DENIED')
    // Nada foi alterado
    const te = await prisma.treinoExercicio.findUniqueOrThrow({ where: { id: treinoExercicioId } })
    expect(te.exercicio_id).toBe(exPeito)
  })

  it('treinoExercicioId inexistente → 404 NOT_FOUND', async () => {
    const exPeito = await criarExercicio('Supino 404 TE', 'PEITO')
    const { treinoId } = await criarTreinoAutogestao(alunoAToken, exPeito)

    const res = await app.inject({
      method: 'POST',
      url: `/treinos/${treinoId}/exercicios/nao-existe-123/substituir`,
      headers: { authorization: `Bearer ${alunoAToken}` },
      payload: { novo_exercicio_id: exPeito },
    })

    expect(res.statusCode).toBe(404)
    expect(JSON.parse(res.body).error).toBe('NOT_FOUND')
  })

  it('novo_exercicio_id inexistente → 404 NOT_FOUND', async () => {
    const exPeito = await criarExercicio('Supino 404 Ex', 'PEITO')
    const { treinoId, treinoExercicioId } = await criarTreinoAutogestao(alunoAToken, exPeito)

    const res = await app.inject({
      method: 'POST',
      url: `/treinos/${treinoId}/exercicios/${treinoExercicioId}/substituir`,
      headers: { authorization: `Bearer ${alunoAToken}` },
      payload: { novo_exercicio_id: 'nao-existe-456' },
    })

    expect(res.statusCode).toBe(404)
    expect(JSON.parse(res.body).error).toBe('NOT_FOUND')
  })

  it('auth: requisição sem token → 401 UNAUTHORIZED', async () => {
    const exPeito = await criarExercicio('Supino 401', 'PEITO')
    const { treinoId, treinoExercicioId } = await criarTreinoAutogestao(alunoAToken, exPeito)

    const res = await app.inject({
      method: 'POST',
      url: `/treinos/${treinoId}/exercicios/${treinoExercicioId}/substituir`,
      payload: { novo_exercicio_id: exPeito },
    })

    expect(res.statusCode).toBe(401)
    expect(JSON.parse(res.body).error).toBe('UNAUTHORIZED')
  })
})
