import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma } from '../../src/infrastructure/database/prisma.js'
import type { FastifyInstance } from 'fastify'

// ─── UX-006: Retomada pós-ausência (≥14 dias sem treino concluído) ───────────
// Teste de integração real (HTTP + Postgres). Sem banco acessível, pula
// explicitamente em vez de quebrar o `npm test`.
// Obs.: reutiliza 2 usuários (A e B) — /auth/register tem rate limit de 5/min.
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
let alunoAId: string

const ts = Date.now()
const emails: string[] = []
const exerciciosIds: string[] = []
const treinosIds: string[] = []
let nomeCounter = 0

async function registerAndLogin(nome: string, email: string, senha: string, role: string) {
  const regRes = await app.inject({ method: 'POST', url: '/auth/register', payload: { nome, email, senha, role } })
  if (regRes.statusCode >= 400) throw new Error(`Register failed (${role}): ${regRes.body}`)
  await prisma.usuario.update({ where: { email }, data: { email_verified: true } })
  const loginRes = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, senha } })
  if (loginRes.statusCode >= 400) throw new Error(`Login failed (${role}): ${loginRes.body}`)
  return JSON.parse(loginRes.body).accessToken as string
}

async function criarExercicio(nome: string): Promise<string> {
  const ex = await prisma.exercicio.create({
    data: { nome, passos_pt: [] },
  })
  exerciciosIds.push(ex.id)
  return ex.id
}

/**
 * Cria um treino autogestão (status ACEITO) para um usuário já registrado.
 * Não faz register (evita o rate limit de /auth/register nos testes).
 */
async function criarTreinoAutogestao(token: string, seriesList: number[], nomeTreino?: string) {
  nomeCounter += 1
  const nome = nomeTreino ?? `Treino Base ${ts}-${nomeCounter}`
  const exercicios = []
  for (let i = 0; i < seriesList.length; i++) {
    const exercicioId = await criarExercicio(`Exercicio ${ts}-${nomeCounter}-${i}`)
    exercicios.push({ exercicioId, ordem: i + 1, series: seriesList[i], repeticoes: 10, cargaSugeridaKg: 30 })
  }

  const res = await app.inject({
    method: 'POST',
    url: '/treinos/autogestao',
    headers: { authorization: `Bearer ${token}` },
    payload: { nome, diasSemana: [1, 3, 5], exercicios },
  })
  expect(res.statusCode).toBe(201)
  const treinoId = JSON.parse(res.body).id
  treinosIds.push(treinoId)
  return { treinoId, nome }
}

/** Insere um registro de conclusão (CONCLUIDO) com timestamp customizado. */
async function inserirConclusao(alunoId: string, treinoId: string, timestamp: Date) {
  await prisma.treinoHistorico.create({
    data: {
      treino_id: treinoId,
      status_anterior: 'EM_EXECUCAO',
      status_novo: 'CONCLUIDO',
      ator_id: alunoId,
      ator_tipo: 'ALUNO',
      timestamp,
    },
  })
}

function diasDesde(data: Date): number {
  return Math.max(0, Math.floor((Date.now() - data.getTime()) / (24 * 60 * 60 * 1000)))
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  alunoAToken = await registerAndLogin('Aluno A Retomada', `aluno-a-retomada-${ts}@t.com`, 'Abc12345', 'ALUNO')
  alunoBToken = await registerAndLogin('Aluno B Retomada', `aluno-b-retomada-${ts}@t.com`, 'Abc12345', 'ALUNO')
  emails.push(`aluno-a-retomada-${ts}@t.com`, `aluno-b-retomada-${ts}@t.com`)

  for (const token of [alunoAToken, alunoBToken]) {
    const perfilRes = await app.inject({
      method: 'POST',
      url: '/alunos/perfil',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    })
    expect(perfilRes.statusCode).toBe(201)
  }

  // Resolve o id do aluno A para as fixtures de historico
  const uA = await prisma.usuario.findUniqueOrThrow({ where: { email: `aluno-a-retomada-${ts}@t.com` } })
  const alunoA = await prisma.aluno.findUniqueOrThrow({ where: { usuario_id: uA.id } })
  alunoAId = alunoA.id
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

describe.skipIf(!dbOk)('UX-006 — GET /alunos/retomada', () => {
  /** Garante isolamento: remove conclusões de fixture de testes anteriores. */
  async function limparConclusoes() {
    await prisma.treinoHistorico.deleteMany({
      where: { treino: { aluno_id: alunoAId }, status_novo: 'CONCLUIDO' },
    })
  }

  it('sem nenhum treino concluído → mostrarRetomada false (usuário novo)', async () => {
    await limparConclusoes()
    await criarTreinoAutogestao(alunoAToken, [4])

    const res = await app.inject({
      method: 'GET',
      url: '/alunos/retomada',
      headers: { authorization: `Bearer ${alunoAToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.mostrarRetomada).toBe(false)
    expect(body.diasSemTreinar).toBeNull()
    expect(body.ultimoTreinoEm).toBeNull()
  })

  it('treino concluído recente (<14 dias) → mostrarRetomada false', async () => {
    await limparConclusoes()
    const { treinoId } = await criarTreinoAutogestao(alunoAToken, [4])

    const recente = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    await inserirConclusao(alunoAId, treinoId, recente)

    const res = await app.inject({
      method: 'GET',
      url: '/alunos/retomada',
      headers: { authorization: `Bearer ${alunoAToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.mostrarRetomada).toBe(false)
    expect(body.diasSemTreinar).toBe(diasDesde(recente))
    expect(body.diasSemTreinar).toBeLessThan(14)
    expect(body.ultimoTreinoEm).toBeTruthy()
  })

  it('treino concluído há 20 dias → mostrarRetomada true com diasSemTreinar correto', async () => {
    await limparConclusoes()
    const { treinoId } = await criarTreinoAutogestao(alunoAToken, [4])

    const antigo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
    await inserirConclusao(alunoAId, treinoId, antigo)

    const res = await app.inject({
      method: 'GET',
      url: '/alunos/retomada',
      headers: { authorization: `Bearer ${alunoAToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.mostrarRetomada).toBe(true)
    expect(body.diasSemTreinar).toBe(diasDesde(antigo))
    expect(body.diasSemTreinar).toBeGreaterThanOrEqual(14)
    expect(Math.abs(new Date(body.ultimoTreinoEm).getTime() - antigo.getTime())).toBeLessThan(2000)
  })

  it('usado o treino concluído MAIS recente (2 conclusões)', async () => {
    await limparConclusoes()
    const { treinoId } = await criarTreinoAutogestao(alunoAToken, [4])

    const antigo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recente = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    await inserirConclusao(alunoAId, treinoId, antigo)
    await inserirConclusao(alunoAId, treinoId, recente)

    const res = await app.inject({
      method: 'GET',
      url: '/alunos/retomada',
      headers: { authorization: `Bearer ${alunoAToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    // Última conclusão é recente → sem retomada
    expect(body.mostrarRetomada).toBe(false)
    expect(body.diasSemTreinar).toBe(diasDesde(recente))
  })

  it('sem token → 401 UNAUTHORIZED', async () => {
    const res = await app.inject({ method: 'GET', url: '/alunos/retomada' })
    expect(res.statusCode).toBe(401)
    expect(JSON.parse(res.body).error).toBe('UNAUTHORIZED')
  })
})

describe.skipIf(!dbOk)('UX-006 — POST /treinos/:id/semana-retorno', () => {
  it('feliz: cria cópia leve com séries pela metade, sufixo (Retorno) e original intacto', async () => {
    const { treinoId } = await criarTreinoAutogestao(alunoAToken, [6], 'Treino Base Feliz')

    const res = await app.inject({
      method: 'POST',
      url: `/treinos/${treinoId}/semana-retorno`,
      headers: { authorization: `Bearer ${alunoAToken}` },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    treinosIds.push(body.id)

    expect(body.nome).toBe('Treino Base Feliz (Retorno)')
    expect(body.status).toBe('ACEITO')
    expect(body.criado_por_ia).toBe(false)
    expect(body.dias_semana).toEqual([1, 3, 5])

    // Exercício copiado: séries 6 → 3, mesmas reps/carga/ordem
    expect(body.exercicios).toHaveLength(1)
    expect(body.exercicios[0].series).toBe(3)
    expect(body.exercicios[0].repeticoes).toBe(10)
    expect(body.exercicios[0].carga_sugerida_kg).toBe(30)
    expect(body.exercicios[0].ordem).toBe(1)

    // Original intacto
    const original = await prisma.treino.findUniqueOrThrow({
      where: { id: treinoId },
      include: { exercicios: true },
    })
    expect(original.status).toBe('ACEITO')
    expect(original.nome).toBe('Treino Base Feliz')
    expect(original.exercicios[0].series).toBe(6)
  })

  it('séries nunca abaixo de 2 (série 3 → 2 e série 1 → 2)', async () => {
    const { treinoId } = await criarTreinoAutogestao(alunoAToken, [3, 1], 'Treino Min Series')

    const res = await app.inject({
      method: 'POST',
      url: `/treinos/${treinoId}/semana-retorno`,
      headers: { authorization: `Bearer ${alunoAToken}` },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    treinosIds.push(body.id)
    expect(body.exercicios).toHaveLength(2)
    expect(body.exercicios[0].series).toBe(2) // floor(3/2)=1 → min 2
    expect(body.exercicios[1].series).toBe(2) // floor(1/2)=0 → min 2
  })

  it('IDOR: ALUNO B não pode criar semana-retorno do treino de ALUNO A → 403', async () => {
    const { treinoId, nome } = await criarTreinoAutogestao(alunoAToken, [4], 'Treino IDOR')

    const res = await app.inject({
      method: 'POST',
      url: `/treinos/${treinoId}/semana-retorno`,
      headers: { authorization: `Bearer ${alunoBToken}` },
    })

    expect(res.statusCode).toBe(403)
    expect(JSON.parse(res.body).error).toBe('TENANT_ACCESS_DENIED')

    // Nenhuma cópia foi criada a partir deste treino
    const copias = await prisma.treino.count({ where: { nome: `${nome} (Retorno)` } })
    expect(copias).toBe(0)
  })

  it('status inválido (CONCLUIDO) → 422 VALIDATION_ERROR', async () => {
    const { treinoId } = await criarTreinoAutogestao(alunoAToken, [4], 'Treino Status Concluido')
    await prisma.treino.update({ where: { id: treinoId }, data: { status: 'CONCLUIDO' } })

    const res = await app.inject({
      method: 'POST',
      url: `/treinos/${treinoId}/semana-retorno`,
      headers: { authorization: `Bearer ${alunoAToken}` },
    })

    expect(res.statusCode).toBe(422)
    expect(JSON.parse(res.body).error).toBe('VALIDATION_ERROR')
    expect(JSON.parse(res.body).message).toBe(
      'Só é possível criar a semana de retorno a partir de um treino aceito, em aberto ou em execução',
    )
  })

  it('status inválido (CADASTRADO) → 422 VALIDATION_ERROR', async () => {
    const { treinoId } = await criarTreinoAutogestao(alunoAToken, [4], 'Treino Status Cadastrado')
    await prisma.treino.update({ where: { id: treinoId }, data: { status: 'CADASTRADO' } })

    const res = await app.inject({
      method: 'POST',
      url: `/treinos/${treinoId}/semana-retorno`,
      headers: { authorization: `Bearer ${alunoAToken}` },
    })

    expect(res.statusCode).toBe(422)
    expect(JSON.parse(res.body).error).toBe('VALIDATION_ERROR')
  })

  it('treino inexistente → 404 NOT_FOUND', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/treinos/nao-existe-123/semana-retorno',
      headers: { authorization: `Bearer ${alunoAToken}` },
    })
    expect(res.statusCode).toBe(404)
    expect(JSON.parse(res.body).error).toBe('NOT_FOUND')
  })

  it('sem token → 401 UNAUTHORIZED', async () => {
    const { treinoId } = await criarTreinoAutogestao(alunoAToken, [4], 'Treino Auth')
    const res = await app.inject({
      method: 'POST',
      url: `/treinos/${treinoId}/semana-retorno`,
    })
    expect(res.statusCode).toBe(401)
    expect(JSON.parse(res.body).error).toBe('UNAUTHORIZED')
  })
})
