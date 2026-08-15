import 'dotenv/config'
import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma } from '../../src/infrastructure/database/prisma.js'
import type { FastifyInstance } from 'fastify'

// Verifica conexão com o banco de dados antes de rodar os testes
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

async function registerAndLoginAluno(nome: string, email: string, senha: string) {
  const regRes = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { nome, email, senha, role: 'ALUNO' },
  })
  if (regRes.statusCode >= 400) throw new Error(`Register failed: ${regRes.body}`)

  const loginRes = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, senha },
  })
  if (loginRes.statusCode >= 400) throw new Error(`Login failed: ${loginRes.body}`)

  const data = JSON.parse(loginRes.body)
  return {
    token: data.accessToken,
    alunoId: data.usuario.id,
  }
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  if (dbOk) {
    const ts = Date.now()
    const result = await registerAndLoginAluno('Aluno Teste Wearable', `aluno-w-${ts}@t.com`, 'Abc12345')
    alunoToken = result.token
    
    // Resolve o aluno_id correspondente
    const alunoProfile = await prisma.aluno.findFirst({
      where: { usuario_id: result.alunoId }
    })
    alunoId = alunoProfile!.id
  }
})

describe.skipIf(!dbOk)('Integração de Telemetria e Webhooks do Smartwatch', () => {
  it('deve simular o recebimento de eventos reais do relógio via Webhook e agregar os valores', async () => {
    // 1. Simula envio de leitura de FC = 65 bpm e Calorias = 350 kcal do relógio
    const webhookRes1 = await app.inject({
      method: 'POST',
      url: '/integrations/openwearables/webhook',
      payload: {
        userId: alunoId,
        provider: 'huawei',
        type: 'heart_rate',
        data: {
          heartRateAvg: 64,
          activeCalories: 350
        }
      }
    })

    expect(webhookRes1.statusCode).toBe(200)
    expect(JSON.parse(webhookRes1.body).processed).toBe(true)

    // 2. Simula segunda amostragem de batimentos: 66 bpm e Calorias = 362 kcal
    const webhookRes2 = await app.inject({
      method: 'POST',
      url: '/integrations/openwearables/webhook',
      payload: {
        userId: alunoId,
        provider: 'huawei',
        type: 'heart_rate',
        data: {
          heartRateAvg: 66,
          activeCalories: 362
        }
      }
    })

    expect(webhookRes2.statusCode).toBe(200)

    // 3. Consulta a agregação no endpoint do aluno no frontend (/integrations/wearables)
    const getRes = await app.inject({
      method: 'GET',
      url: '/integrations/wearables',
      headers: { authorization: `Bearer ${alunoToken}` }
    })

    expect(getRes.statusCode).toBe(200)
    
    const body = JSON.parse(getRes.body)
    
    // Média de 64 e 66 bpm deve ser exatamente 65 bpm
    expect(body.fcMediaDia).toBe(65)
    
    // Calorias ativas totais do dia deve ser o acumulado/máximo enviado pelo relógio (362 kcal)
    expect(body.caloriasAtivasDia).toBe(362)
    
    // Total de amostras diárias registradas hoje deve ser 2
    expect(body.amostrasDiaCount).toBe(2)
  })
})
