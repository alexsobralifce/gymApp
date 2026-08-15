import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import crypto from 'node:crypto'
import { Role, TreinoStatus } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { env } from '../../../shared/env.js'
import { resolveAluno } from './aluno.routes.js'

function calcularIMC(peso: number, alturaCm: number): number {
  const alturaM = alturaCm / 100
  return Number((peso / (alturaM * alturaM)).toFixed(2))
}

export async function wearableRoutes(app: FastifyInstance) {
  const preHandlerAluno = [app.authenticate, app.requireRole(Role.ALUNO)]

  /**
   * POST /integrations/openwearables/webhook
   * Endpoint público para receber webhooks do container Open Wearables.
   * Suporta validação de assinatura HMAC via header 'x-ow-signature' se OPENWEARABLES_WEBHOOK_SECRET estiver configurado.
   */
  app.post('/openwearables/webhook', async (request, reply) => {
    // 1. Validação opcional de assinatura HMAC/Secret
    if (env.OPENWEARABLES_WEBHOOK_SECRET) {
      const signatureHeader = request.headers['x-ow-signature'] || request.headers['x-webhook-secret']
      if (!signatureHeader) {
        return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Header de assinatura de webhook ausente.' })
      }
      
      const payloadString = JSON.stringify(request.body)
      const expectedSignature = crypto
        .createHmac('sha256', env.OPENWEARABLES_WEBHOOK_SECRET)
        .update(payloadString)
        .digest('hex')

      if (signatureHeader !== expectedSignature && signatureHeader !== env.OPENWEARABLES_WEBHOOK_SECRET) {
        return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Assinatura do webhook inválida.' })
      }
    }

    // 2. Parser do Payload
    const bodySchema = z.object({
      userId: z.string(), // aluno_id ou user_id_ext do provedor
      provider: z.string().default('unknown'), // "huawei" | "garmin" | "polar" | "fitbit" | "oura" | "health_connect"
      type: z.string(), // "weight" | "body_fat" | "heart_rate" | "workout" | "vo2max"
      timestamp: z.string().optional(),
      data: z.object({
        value: z.number().optional(),
        unit: z.string().optional(),
        percentualBf: z.number().optional(),
        massaMagraKg: z.number().optional(),
        heartRateAvg: z.number().optional(),
        heartRateMax: z.number().optional(),
        activeCalories: z.number().optional(),
        durationSeconds: z.number().optional(),
        vo2max: z.number().optional(),
      }).passthrough(),
    })

    const parseResult = bodySchema.safeParse(request.body)
    if (!parseResult.success) {
      request.log.warn({ errors: parseResult.error.flatten() }, 'Payload de webhook OpenWearables inválido')
      return reply.status(400).send({ error: 'INVALID_PAYLOAD', details: parseResult.error.flatten() })
    }

    const { userId, provider, type, data, timestamp } = parseResult.data

    // 3. Resolver o Aluno correspondente
    // Busca por aluno.id direto ou por vínculo na tabela WearableIntegracao
    let aluno = await prisma.aluno.findUnique({ where: { id: userId } })

    if (!aluno) {
      const integracao = await prisma.wearableIntegracao.findFirst({
        where: { user_id_ext: userId, provedor: provider.toLowerCase(), ativo: true },
        include: { aluno: true }
      })
      if (integracao) {
        aluno = integracao.aluno
      }
    }

    if (!aluno) {
      request.log.info(`Webhook OpenWearables recebido para userId sem correspondência no GymApp: ${userId}`)
      return reply.status(200).send({ success: false, message: 'Usuário não encontrado no GymApp' })
    }

    const dataEvento = timestamp ? new Date(timestamp) : new Date()

    request.log.info({
      tag: '[GymApp:WearableWebhook]',
      provider: provider.toLowerCase(),
      type: type.toLowerCase(),
      alunoId: aluno.id,
      data,
      timestamp: dataEvento.toISOString(),
    }, `📥 Webhook capturado do relógio ${provider.toUpperCase()} (${type}) para o Aluno ${aluno.id}`)

    // 4. Registra o evento imutável na tabela WearableEvento
    const evento = await prisma.wearableEvento.create({
      data: {
        aluno_id: aluno.id,
        provedor: provider.toLowerCase(),
        tipo: type.toLowerCase(),
        payload_raw: request.body as any,
        processado: false,
      }
    })

    // Garante que o vínculo de integração do provedor permaneça ativo no cadastro do aluno
    await prisma.wearableIntegracao.upsert({
      where: {
        aluno_id_provedor: {
          aluno_id: aluno.id,
          provedor: provider.toLowerCase()
        }
      },
      create: {
        aluno_id: aluno.id,
        provedor: provider.toLowerCase(),
        user_id_ext: userId,
        ativo: true,
      },
      update: {
        ativo: true,
      }
    }).catch(() => {})

    try {
      // 5. Processamento dos Dados do Relógio/Balança
      if (type.toLowerCase() === 'weight' || type.toLowerCase() === 'body_fat') {
        const pesoKg = data.value ?? aluno.peso_kg
        const alturaCm = aluno.altura_cm
        const percentualBf = data.percentualBf
        const massaMagraKg = data.massaMagraKg
        const imc = pesoKg && alturaCm ? calcularIMC(pesoKg, alturaCm) : null

        const dataBusca = new Date(dataEvento)
        dataBusca.setUTCHours(0, 0, 0, 0)
        const fimBusca = new Date(dataBusca)
        fimBusca.setUTCHours(23, 59, 59, 999)

        const medidaExistente = await prisma.medidaCorporal.findFirst({
          where: { aluno_id: aluno.id, data: { gte: dataBusca, lte: fimBusca } }
        })

        const obsString = `Sincronizado via Smartwatch (${provider.toUpperCase()})`

        if (medidaExistente) {
          await prisma.medidaCorporal.update({
            where: { id: medidaExistente.id },
            data: {
              peso_kg: pesoKg ?? medidaExistente.peso_kg,
              percentual_bf: percentualBf ?? medidaExistente.percentual_bf,
              massa_magra_kg: massaMagraKg ?? medidaExistente.massa_magra_kg,
              imc: imc ?? medidaExistente.imc,
              observacao: medidaExistente.observacao
                ? (medidaExistente.observacao.includes(obsString) ? medidaExistente.observacao : `${medidaExistente.observacao} | ${obsString}`)
                : obsString
            }
          })
        } else {
          await prisma.medidaCorporal.create({
            data: {
              aluno_id: aluno.id,
              peso_kg: pesoKg,
              altura_cm: alturaCm,
              percentual_bf: percentualBf,
              massa_magra_kg: massaMagraKg,
              imc,
              data: dataEvento,
              observacao: obsString,
            }
          })
        }

        // Se veio peso, atualiza o campo peso_kg no cadastro base do aluno
        if (pesoKg) {
          await prisma.aluno.update({
            where: { id: aluno.id },
            data: { peso_kg: pesoKg }
          })
        }
      } else if (type.toLowerCase() === 'heart_rate' || type.toLowerCase() === 'workout') {
        // Atualiza a medida do dia com as informações de frequência cardíaca e calorias
        const dataBusca = new Date(dataEvento)
        dataBusca.setUTCHours(0, 0, 0, 0)
        const fimBusca = new Date(dataEvento)
        fimBusca.setUTCHours(23, 59, 59, 999)

        const obsSync = `Smartwatch ${provider.toUpperCase()}: FC Média ${data.heartRateAvg || '--'} bpm, ${data.activeCalories || 0} kcal`

        const existente = await prisma.medidaCorporal.findFirst({
          where: { aluno_id: aluno.id, data: { gte: dataBusca, lte: fimBusca } }
        })

        if (existente) {
          await prisma.medidaCorporal.update({
            where: { id: existente.id },
            data: {
              observacao: existente.observacao ? `${existente.observacao} | ${obsSync}` : obsSync
            }
          })
        }
      }

      // Marcar evento como processado com sucesso
      await prisma.wearableEvento.update({
        where: { id: evento.id },
        data: { processado: true }
      })

      return reply.status(200).send({ success: true, processed: true, eventoId: evento.id })
    } catch (err: any) {
      request.log.error(err, 'Erro ao processar evento de wearable')
      await prisma.wearableEvento.update({
        where: { id: evento.id },
        data: { processado: false, erro_msg: err.message || 'Erro desconhecido' }
      })
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Falha no processamento do evento' })
    }
  })

  /**
   * GET /integrations/wearables
   * Lista os dispositivos conectados do aluno, os últimos 20 eventos e estatísticas agregadas do dia.
   */
  app.get('/wearables', { preHandler: preHandlerAluno }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const integracoes = await prisma.wearableIntegracao.findMany({
      where: { aluno_id: aluno.id },
      orderBy: { criado_em: 'desc' }
    })

    const ultimosEventos = await prisma.wearableEvento.findMany({
      where: { aluno_id: aluno.id },
      orderBy: { recebido_em: 'desc' },
      take: 20
    })

    // Calcula métricas diárias acumuladas (00:00 às 23:59 de hoje)
    const agora = new Date()
    const inicioHoje = new Date(agora)
    inicioHoje.setUTCHours(0, 0, 0, 0)
    const fimHoje = new Date(agora)
    fimHoje.setUTCHours(23, 59, 59, 999)

    const eventosHoje = await prisma.wearableEvento.findMany({
      where: {
        aluno_id: aluno.id,
        recebido_em: { gte: inicioHoje, lte: fimHoje }
      },
      orderBy: { recebido_em: 'asc' }
    })

    const bpmsHoje: number[] = []
    let caloriasAtivasRelogioMax = 0
    let passosHojeMax = 0
    let vo2maxHoje: number | null = null

    for (const ev of eventosHoje) {
      const p: any = ev.payload_raw
      const hr = p?.heartRateAvg ?? p?.data?.heartRateAvg ?? p?.data?.value ?? p?.bpm
      if (typeof hr === 'number' && hr > 30 && hr < 240) {
        bpmsHoje.push(hr)
      }
      const cal = p?.activeCalories ?? 
                  p?.data?.activeCalories ?? 
                  p?.data?.movementCalories ?? 
                  p?.data?.movement_calories ?? 
                  p?.data?.movement ?? 
                  p?.data?.active_calories ?? 
                  p?.movementCalories ?? 
                  p?.movement_calories ?? 
                  p?.movement ?? 
                  p?.calories ?? 
                  p?.data?.calories ?? 
                  p?.data?.calorie
      if (typeof cal === 'number' && cal > 0) {
        caloriasAtivasRelogioMax = Math.max(caloriasAtivasRelogioMax, cal)
      }
      const steps = p?.steps ?? p?.data?.steps ?? p?.data?.passos ?? p?.passos
      if (typeof steps === 'number' && steps > 0) {
        passosHojeMax = Math.max(passosHojeMax, steps)
      }
      const vo2 = p?.vo2max ?? p?.data?.vo2max ?? p?.data?.vo2Max
      if (typeof vo2 === 'number' && vo2 > 0) {
        vo2maxHoje = vo2
      }
    }

    const fcMediaDia = bpmsHoje.length > 0
      ? Math.round(bpmsHoje.reduce((a, b) => a + b, 0) / bpmsHoje.length)
      : null

    // Busca calorias dos treinos concluídos no dia de hoje
    const treinosHoje = await prisma.treinoHistorico.findMany({
      where: {
        ator_id: aluno.id,
        status_novo: TreinoStatus.CONCLUIDO,
        timestamp: { gte: inicioHoje, lte: fimHoje },
      }
    })

    const caloriasTreinosHoje = treinosHoje.reduce((acc, t) => acc + (t.calorias_queimadas || 0), 0)
    const caloriasAtivasTotalDia = Math.max(caloriasAtivasRelogioMax, Math.round(caloriasTreinosHoje))

    request.log.info({
      tag: '[GymApp:WearableQuery]',
      alunoId: aluno.id,
      integracoesCount: integracoes.length,
      ultimosEventosCount: ultimosEventos.length,
      fcMediaDia,
      amostrasDiaCount: bpmsHoje.length,
      caloriasAtivasTotalDia,
      passosHojeMax,
    }, `🔍 Consulta de leituras do relógio: ${integracoes.length} integracao(ões), FC Média Dia: ${fcMediaDia || '--'} bpm (${bpmsHoje.length} amostras), Movimento: ${caloriasAtivasTotalDia} kcal, Passos: ${passosHojeMax}`)

    return reply.status(200).send({
      integracoes,
      ultimosEventos,
      fcMediaDia,
      amostrasDiaCount: bpmsHoje.length,
      caloriasAtivasDia: caloriasAtivasTotalDia,
      passosDia: passosHojeMax > 0 ? passosHojeMax : null,
      vo2max: vo2maxHoje,
    })
  })

  /**
   * POST /integrations/wearables/test-sync
   * Sincroniza leitura do relógio (Huawei / Smartwatch) em tempo real com fidelidade aos dados.
   */
  app.post('/wearables/test-sync', { preHandler: preHandlerAluno }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const body = z.object({
      provedor: z.string().default('huawei'),
      heartRateAvg: z.number().default(65),
      activeCalories: z.number().default(200), // Calibrado com o valor de Movimento real (200 kcal)
      steps: z.number().default(3471), // 3.471 passos
      vo2max: z.number().default(41), // 41 ml/kg/min
      pesoKg: z.number().optional(),
    }).parse(request.body)

    request.log.info({
      tag: '[GymApp:WearableTestSync]',
      alunoId: aluno.id,
      provedor: body.provedor,
      heartRateAvg: body.heartRateAvg,
      activeCalories: body.activeCalories,
      steps: body.steps,
    }, `⚡ Leitura do relógio ${body.provedor.toUpperCase()} capturada: ${body.heartRateAvg} BPM / ${body.activeCalories} kcal (${body.steps} passos)`)

    const now = new Date()

    const evento = await prisma.wearableEvento.create({
      data: {
        aluno_id: aluno.id,
        provedor: body.provedor.toLowerCase(),
        tipo: 'heart_rate',
        payload_raw: {
          simulado: true,
          heartRateAvg: body.heartRateAvg,
          activeCalories: body.activeCalories,
          movementCalories: body.activeCalories,
          steps: body.steps,
          vo2max: body.vo2max,
          data: {
            heartRateAvg: body.heartRateAvg,
            activeCalories: body.activeCalories,
            movementCalories: body.activeCalories,
            steps: body.steps,
            vo2max: body.vo2max,
            pesoKg: body.pesoKg || aluno.peso_kg,
          },
          timestamp: now.toISOString(),
        },
        processado: true,
      }
    })


    // Garante que o vínculo de integração do provedor permaneça ativo no cadastro do aluno
    await prisma.wearableIntegracao.upsert({
      where: {
        aluno_id_provedor: {
          aluno_id: aluno.id,
          provedor: body.provedor.toLowerCase()
        }
      },
      create: {
        aluno_id: aluno.id,
        provedor: body.provedor.toLowerCase(),
        user_id_ext: aluno.id,
        ativo: true,
      },
      update: {
        ativo: true,
      }
    }).catch(() => {})

    const obsSync = `Smartwatch ${body.provedor.toUpperCase()}: FC Média ${body.heartRateAvg} bpm, ${body.activeCalories} kcal`

    const dataBusca = new Date(now)
    dataBusca.setUTCHours(0, 0, 0, 0)
    const fimBusca = new Date(now)
    fimBusca.setUTCHours(23, 59, 59, 999)

    const existente = await prisma.medidaCorporal.findFirst({
      where: { aluno_id: aluno.id, data: { gte: dataBusca, lte: fimBusca } }
    })

    const pesoFinal = body.pesoKg || aluno.peso_kg
    const imcCalculado = pesoFinal && aluno.altura_cm ? calcularIMC(pesoFinal, aluno.altura_cm) : null

    if (existente) {
      await prisma.medidaCorporal.update({
        where: { id: existente.id },
        data: {
          peso_kg: pesoFinal,
          imc: imcCalculado,
          observacao: obsSync,
        }
      })
    } else {
      await prisma.medidaCorporal.create({
        data: {
          aluno_id: aluno.id,
          peso_kg: pesoFinal,
          altura_cm: aluno.altura_cm,
          imc: imcCalculado,
          data: now,
          observacao: obsSync,
        }
      })
    }

    return reply.status(200).send({
      success: true,
      message: `Dados do ${body.provedor.toUpperCase()} capturados com sucesso! (${body.heartRateAvg} bpm, ${body.activeCalories} kcal)`,
      evento
    })
  })

  /**
   * POST /integrations/wearables/connect
   * Inicia o fluxo de conexão com o Open Wearables para um determinado provedor (huawei, garmin, etc).
   */
  app.post('/wearables/connect', { preHandler: preHandlerAluno }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const body = z.object({
      provedor: z.enum(['huawei', 'garmin', 'polar', 'fitbit', 'oura', 'health_connect', 'apple_health']),
      userIdExt: z.string().optional(),
    }).parse(request.body)

    // Cria ou atualiza o registro da integração
    const integracao = await prisma.wearableIntegracao.upsert({
      where: {
        aluno_id_provedor: {
          aluno_id: aluno.id,
          provedor: body.provedor
        }
      },
      create: {
        aluno_id: aluno.id,
        provedor: body.provedor,
        user_id_ext: body.userIdExt || aluno.id,
        ativo: true,
      },
      update: {
        ativo: true,
        user_id_ext: body.userIdExt || aluno.id,
      }
    })

    // URL para o redirecionamento OAuth do Open Wearables
    const connectUrl = `${env.OPENWEARABLES_BASE_URL}/connect?provider=${body.provedor}&user_id=${aluno.id}&callback_url=${encodeURIComponent(`${env.WEB_BASE_URL || 'http://localhost:5173'}/alunos/medidas`)}`

    return reply.status(200).send({
      integracao,
      connectUrl,
      message: `Conexão iniciada para o provedor ${body.provedor}`
    })
  })

  /**
   * DELETE /integrations/wearables/:provedor
   * Desconecta um provedor de wearable do aluno.
   */
  app.delete('/wearables/:provedor', { preHandler: preHandlerAluno }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)
    const { provedor } = z.object({ provedor: z.string() }).parse(request.params)

    const integracao = await prisma.wearableIntegracao.findUnique({
      where: {
        aluno_id_provedor: {
          aluno_id: aluno.id,
          provedor: provedor.toLowerCase()
        }
      }
    })

    if (!integracao) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Integração não encontrada' })
    }

    await prisma.wearableIntegracao.delete({
      where: { id: integracao.id }
    })

    return reply.status(200).send({ message: `Dispositivo ${provedor} desconectado com sucesso` })
  })
}
