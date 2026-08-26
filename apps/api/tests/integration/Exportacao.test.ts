import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma } from '../../src/infrastructure/database/prisma.js'
import { TreinoStatus, TreinoAtor } from '@prisma/client'
import type { FastifyInstance } from 'fastify'

// ─── UX-017: Exportação de dados (LGPD — portabilidade) ──────────────────────
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
let outroAlunoToken: string
let alunoId: string
let outroAlunoId: string

const ts = Date.now()
const email = `export-aluno-${ts}@t.com`
const outroEmail = `export-outro-${ts}@t.com`

async function registerAndLogin(nome: string, email: string, senha: string, role: string) {
  const regRes = await app.inject({ method: 'POST', url: '/auth/register', payload: { nome, email, senha, role } })
  if (regRes.statusCode >= 400) throw new Error(`Register failed (${role}): ${regRes.body}`)
  await prisma.usuario.update({ where: { email }, data: { email_verified: true } })
  const loginRes = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, senha } })
  if (loginRes.statusCode >= 400) throw new Error(`Login failed (${role}): ${loginRes.body}`)
  return JSON.parse(loginRes.body).accessToken as string
}

async function criarAluno(token: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/alunos/perfil',
    headers: { authorization: `Bearer ${token}` },
    payload: { pesoKg: 80, alturaCm: 180 },
  })
  expect(res.statusCode).toBe(201)
  return JSON.parse(res.body).id
}

let treinoId = ''
let treinoOutroId = ''
let exercicioId = ''

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  alunoToken = await registerAndLogin('Aluno Export Teste', email, 'Abc12345', 'ALUNO')
  outroAlunoToken = await registerAndLogin('Outro Aluno Export', outroEmail, 'Abc12345', 'ALUNO')
  alunoId = await criarAluno(alunoToken)
  outroAlunoId = await criarAluno(outroAlunoToken)

  // Seed de dados do aluno A (o dono da exportação)
  exercicioId = await prisma.exercicio.create({
    data: { nome: 'Supino Export Teste', grupo_muscular: 'PEITORAL', equipamento: 'Halter' },
  }).then((e) => e.id)

  const treino = await prisma.treino.create({
    data: {
      aluno_id: alunoId,
      nome: 'Treino Export Teste',
      dias_semana: [1, 3, 5],
      status: TreinoStatus.CONCLUIDO,
      finalizado_em: new Date(),
    },
  })
  treinoId = treino.id

  await prisma.treinoExercicio.create({
    data: {
      treino_id: treinoId,
      exercicio_id: exercicioId,
      ordem: 1,
      series: 3,
      repeticoes: 10,
      carga_sugerida_kg: 20,
    },
  })

  await prisma.execucaoExercicio.create({
    data: {
      treino_id: treinoId,
      exercicio_id: exercicioId,
      serie_numero: 1,
      repeticoes: 10,
      carga_kg: 20,
      rpe: 7,
    },
  })

  await prisma.medidaCorporal.create({
    data: { aluno_id: alunoId, peso_kg: 80, altura_cm: 180, imc: 24.69, observacao: 'Medida Export Teste' },
  })

  await prisma.treinoHistorico.create({
    data: {
      treino_id: treinoId,
      status_anterior: TreinoStatus.CADASTRADO,
      status_novo: TreinoStatus.CONCLUIDO,
      ator_id: alunoId,
      ator_tipo: TreinoAtor.ALUNO,
      duracao_segundos: 1800,
    },
  })

  // Seed de dados do aluno B — NUNCA deve aparecer na exportação do A
  const treinoOutro = await prisma.treino.create({
    data: {
      aluno_id: outroAlunoId,
      nome: 'Treino Secreto Outro Aluno',
      dias_semana: [2, 4],
      status: TreinoStatus.CADASTRADO,
    },
  })
  treinoOutroId = treinoOutro.id

  await prisma.execucaoExercicio.create({
    data: {
      treino_id: treinoOutroId,
      exercicio_id: exercicioId,
      serie_numero: 1,
      repeticoes: 5,
      carga_kg: 999,
    },
  })
})

afterAll(async () => {
  const usuarioIds = [email, outroEmail]
    .map((e) => e)
  const users = await prisma.usuario.findMany({ where: { email: { in: usuarioIds } }, select: { id: true } })
  const ids = users.map((u) => u.id)

  if (ids.length > 0) {
    await prisma.execucaoExercicio.deleteMany({ where: { treino: { aluno: { usuario_id: { in: ids } } } } })
    await prisma.treinoExercicio.deleteMany({ where: { treino: { aluno: { usuario_id: { in: ids } } } } })
    await prisma.treinoHistorico.deleteMany({ where: { treino: { aluno: { usuario_id: { in: ids } } } } })
    await prisma.treino.deleteMany({ where: { aluno: { usuario_id: { in: ids } } } })
    await prisma.medidaCorporal.deleteMany({ where: { aluno: { usuario_id: { in: ids } } } })
    await prisma.avaliacaoFisica.deleteMany({ where: { aluno: { usuario_id: { in: ids } } } })
    await prisma.aluno.deleteMany({ where: { usuario_id: { in: ids } } })
    await prisma.refreshToken.deleteMany({ where: { usuario_id: { in: ids } } })
    await prisma.usuario.deleteMany({ where: { id: { in: ids } } })
  }

  if (exercicioId) {
    await prisma.exercicio.delete({ where: { id: exercicioId } }).catch(() => {})
  }

  await app.close()
  await prisma.$disconnect()
})

describe.skipIf(!dbOk)('UX-017 — GET /alunos/exportar', () => {
  it('formato=csv retorna 200, text/csv, BOM, valores seed e Content-Disposition', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/alunos/exportar?formato=csv',
      headers: { authorization: `Bearer ${alunoToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.headers['content-disposition']).toContain('attachment')
    expect(res.headers['content-disposition']).toMatch(/gymapp-export-\d{8}\.csv/)

    const body = res.body
    expect(body.startsWith('\uFEFF')).toBe(true)
    expect(body).toContain('# TREINOS')
    expect(body).toContain('# EXECUCOES')
    expect(body).toContain('# MEDIDAS')
    expect(body).toContain('# AVALIACOES')
    expect(body).toContain('# HISTORICO')
    expect(body).toContain('Treino Export Teste')
    expect(body).toContain('Supino Export Teste')
    expect(body).toContain('Medida Export Teste')
    expect(body).toContain('Aluno Export Teste')
  })

  it('formato=json retorna JSON parseável com o treino seed', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/alunos/exportar?formato=json',
      headers: { authorization: `Bearer ${alunoToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('application/json')
    expect(res.headers['content-disposition']).toMatch(/gymapp-export-\d{8}\.json/)

    const dados = JSON.parse(res.body)
    expect(dados.exportado_em).toBeTruthy()
    expect(dados.perfil.nome).toBe('Aluno Export Teste')
    expect(dados.treinos.some((t: { nome: string }) => t.nome === 'Treino Export Teste')).toBe(true)
    expect(dados.treinos[0].execucoes[0].repeticoes).toBe(10)
    expect(dados.treinos[0].exercicios[0].exercicio.nome).toBe('Supino Export Teste')
    expect(dados.medidas.some((m: { observacao: string | null }) => m.observacao === 'Medida Export Teste')).toBe(true)
    expect(dados.historico.length).toBeGreaterThanOrEqual(1)
  })

  it('isolamento de tenant: dados de outro aluno NUNCA aparecem (csv)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/alunos/exportar?formato=csv',
      headers: { authorization: `Bearer ${alunoToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.body).not.toContain('Treino Secreto Outro Aluno')
    expect(res.body).not.toContain('Outro Aluno Export')
  })

  it('isolamento de tenant: dados de outro aluno NUNCA aparecem (json)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/alunos/exportar?formato=json',
      headers: { authorization: `Bearer ${alunoToken}` },
    })
    expect(res.statusCode).toBe(200)
    const dados = JSON.parse(res.body)
    expect(dados.treinos.some((t: { nome: string }) => t.nome === 'Treino Secreto Outro Aluno')).toBe(false)
    expect(JSON.stringify(dados)).not.toContain('Outro Aluno Export')
  })

  it('sem token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/alunos/exportar?formato=csv' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /alunos/exportar/relatorio retorna HTML com nome do perfil e treino seed', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/alunos/exportar/relatorio',
      headers: { authorization: `Bearer ${alunoToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.body).toContain('<html')
    expect(res.body).toContain('Aluno Export Teste')
    expect(res.body).toContain('Treino Export Teste')
    expect(res.body).toContain('Treinos concluídos')
    expect(res.body).toContain('@media print')
  })

  it('relatorio sem token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/alunos/exportar/relatorio' })
    expect(res.statusCode).toBe(401)
  })
})
