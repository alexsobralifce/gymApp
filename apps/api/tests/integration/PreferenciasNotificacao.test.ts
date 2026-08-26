import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma } from '../../src/infrastructure/database/prisma.js'
import type { FastifyInstance } from 'fastify'

// ─── UX-005: Preferências de notificação ─────────────────────────────────────
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

const ts = Date.now()
const email = `prefs-aluno-${ts}@t.com`

async function registerAndLogin(nome: string, email: string, senha: string, role: string) {
  const regRes = await app.inject({ method: 'POST', url: '/auth/register', payload: { nome, email, senha, role } })
  if (regRes.statusCode >= 400) throw new Error(`Register failed (${role}): ${regRes.body}`)
  await prisma.usuario.update({ where: { email }, data: { email_verified: true } })
  const loginRes = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, senha } })
  if (loginRes.statusCode >= 400) throw new Error(`Login failed (${role}): ${loginRes.body}`)
  return JSON.parse(loginRes.body).accessToken as string
}

function getPrefs() {
  return app.inject({
    method: 'GET',
    url: '/alunos/notificacoes/preferencias',
    headers: { authorization: `Bearer ${alunoToken}` },
  })
}

function patchPrefs(payload: Record<string, unknown>) {
  return app.inject({
    method: 'PATCH',
    url: '/alunos/notificacoes/preferencias',
    headers: { authorization: `Bearer ${alunoToken}` },
    payload,
  })
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
  alunoToken = await registerAndLogin('Prefs Aluno', email, 'Abc12345', 'ALUNO')
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

describe.skipIf(!dbOk)('UX-005 — /alunos/notificacoes/preferencias', () => {
  it('GET retorna os defaults quando nunca configurado', async () => {
    const res = await getPrefs()
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual({
      lembreteTreino: true,
      social: true,
      motivacional: true,
      conquistas: true,
      horarioSilencioso: { ativo: false, inicio: '22:00', fim: '07:00' },
      frequencia: 'IMEDIATA',
    })
  })

  it('PATCH persiste toggles e faz deep-merge com o valor armazenado', async () => {
    const res = await patchPrefs({ lembreteTreino: false, horarioSilencioso: { ativo: true } })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toMatchObject({
      lembreteTreino: false,
      social: true, // não enviado no PATCH → mantém default
      motivacional: true,
      conquistas: true,
      horarioSilencioso: { ativo: true, inicio: '22:00', fim: '07:00' }, // horários não enviados → mantidos
      frequencia: 'IMEDIATA',
    })

    // Persistido no banco
    const u = await prisma.usuario.findUnique({ where: { email } })
    expect(u?.preferencias_notificacao).toMatchObject({ lembreteTreino: false })

    // Deep-merge em atualização posterior: toggles novos não apagam o anterior
    const res2 = await patchPrefs({ social: false, horarioSilencioso: { fim: '08:00' } })
    expect(res2.statusCode).toBe(200)
    expect(JSON.parse(res2.body)).toMatchObject({
      lembreteTreino: false, // preservado
      social: false,
      horarioSilencioso: { ativo: true, inicio: '22:00', fim: '08:00' },
    })

    // Limpa para não contaminar os demais testes
    await prisma.usuario.update({ where: { email }, data: { preferencias_notificacao: null } })
  })

  it('PATCH aceita frequencia válida e persiste', async () => {
    const res = await patchPrefs({ frequencia: 'RESUMO_DIARIO' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).frequencia).toBe('RESUMO_DIARIO')

    const res2 = await patchPrefs({ frequencia: 'DESATIVADA' })
    expect(res2.statusCode).toBe(200)
    expect(JSON.parse(res2.body).frequencia).toBe('DESATIVADA')

    await prisma.usuario.update({ where: { email }, data: { preferencias_notificacao: null } })
  })

  it('rejeita hora inválida "25:99" com 422 e não persiste', async () => {
    const res = await patchPrefs({ horarioSilencioso: { inicio: '25:99' } })
    expect(res.statusCode).toBe(422)
    expect(JSON.parse(res.body).error).toBe('VALIDATION_ERROR')
    expect(JSON.parse(res.body).details.horarioSilencioso).toBeTruthy()

    const u = await prisma.usuario.findUnique({ where: { email } })
    expect(u?.preferencias_notificacao).toBeNull()
  })

  it('rejeita frequencia inválida com 422', async () => {
    const res = await patchPrefs({ frequencia: 'TODA_HORA' })
    expect(res.statusCode).toBe(422)
    expect(JSON.parse(res.body).error).toBe('VALIDATION_ERROR')
  })

  it('rejeita tipo inválido no horário silencioso com 422', async () => {
    const res = await patchPrefs({ horarioSilencioso: { ativo: 'sim' } })
    expect(res.statusCode).toBe(422)
    expect(JSON.parse(res.body).error).toBe('VALIDATION_ERROR')
  })

  it('sem autenticação → 401 (GET e PATCH)', async () => {
    const resGet = await app.inject({ method: 'GET', url: '/alunos/notificacoes/preferencias' })
    expect(resGet.statusCode).toBe(401)

    const resPatch = await app.inject({ method: 'PATCH', url: '/alunos/notificacoes/preferencias', payload: {} })
    expect(resPatch.statusCode).toBe(401)
  })
})
