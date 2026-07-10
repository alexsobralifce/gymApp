import 'dotenv/config'
import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let professorToken: string
let academiaToken: string
let rootToken: string
let academiaId: string

async function registerAndLogin(nome: string, email: string, senha: string, role: string) {
  const regRes = await app.inject({ method: 'POST', url: '/auth/register', payload: { nome, email, senha, role } })
  if (regRes.statusCode >= 400) throw new Error(`Register failed (${role}): ${regRes.body}`)
  const loginRes = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, senha } })
  if (loginRes.statusCode >= 400) throw new Error(`Login failed (${role}): ${loginRes.body}`)
  return JSON.parse(loginRes.body).accessToken
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  const ts = Date.now()

  const rootLogin = await app.inject({
    method: 'POST', url: '/auth/login',
    payload: { email: 'root@gymapp.com', senha: 'Root@12345' },
  })
  rootToken = JSON.parse(rootLogin.body).accessToken

  academiaToken = await registerAndLogin('Academia TopUp', `acad-v-${ts}@t.com`, '12345678', 'ACADEMIA')

  const cnpj = `${ts}${String(Math.random()).slice(2, 6)}`.slice(0, 14)
  const resCreate = await app.inject({
    method: 'POST', url: '/academias',
    headers: { authorization: `Bearer ${academiaToken}` },
    payload: { nome: 'Academia TopUp', cnpj },
  })
  academiaId = JSON.parse(resCreate.body).id

  const approvalRes = await app.inject({
    method: 'PATCH', url: `/root/academias/${academiaId}/aprovacao`,
    headers: { authorization: `Bearer ${rootToken}` },
    payload: { acao: 'APROVAR' },
  })
  if (approvalRes.statusCode !== 200) {
    throw new Error(`Root approval failed: ${approvalRes.statusCode} ${approvalRes.body}`)
  }

  professorToken = await registerAndLogin('Prof Test', `prof-v-${ts}@t.com`, '12345678', 'PROFESSOR')
})

describe('UC-09 — Professor vincular a academia', () => {
  it('lista academias ativas', async () => {
    const res = await app.inject({
      method: 'GET', url: '/academias',
      headers: { authorization: `Bearer ${professorToken}` },
    })
    expect(res.statusCode).toBe(200)
    const academias: Array<{ id: string }> = JSON.parse(res.body)
    expect(academias.length).toBeGreaterThan(0)
    expect(academias.find((a) => a.id === academiaId)).toBeTruthy()
  })

  it('cria perfil professor automaticamente (upsert)', async () => {
    const res = await app.inject({
      method: 'GET', url: '/professores/dashboard',
      headers: { authorization: `Bearer ${professorToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toBeInstanceOf(Array)
  })

  it('vincular professor a academia funciona', async () => {
    const res = await app.inject({
      method: 'POST', url: `/professores/vincular/${academiaId}`,
      headers: { authorization: `Bearer ${professorToken}` },
    })
    expect(res.statusCode).toBe(201)
    const vinculo = JSON.parse(res.body)
    expect(vinculo.professor_id).toBeTruthy()
    expect(vinculo.academia_id).toBe(academiaId)
    expect(vinculo.jaVinculado).toBe(false)
    expect(vinculo.status).toBe('PENDENTE_ACADEMIA')
  })

  it('vincular novamente a mesma academia retorna jaVinculado', async () => {
    const res = await app.inject({
      method: 'POST', url: `/professores/vincular/${academiaId}`,
      headers: { authorization: `Bearer ${professorToken}` },
    })
    expect(res.statusCode).toBe(200)
    const vinculo = JSON.parse(res.body)
    expect(vinculo.jaVinculado).toBe(true)
  })
})
