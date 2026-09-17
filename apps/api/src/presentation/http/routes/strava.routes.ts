import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { env } from '../../../shared/env.js'
import { encryptSecret, decryptSecret } from '../../../shared/crypto.js'
import { resolveAluno } from './aluno.routes.js'

type StravaIntegracao = {
  id: string
  aluno_id: string
  provedor: string
  user_id_ext: string
  access_token_enc: string | null
  refresh_token_enc: string | null
  token_expira_em: Date | null
  ativo: boolean
}

type TokenResponse = {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete?: { id: number }
}

type StravaActivity = {
  id: number
  name: string
  type: string
  sport_type?: string
  start_date: string
  average_heartrate?: number
  max_heartrate?: number
  has_heartrate: boolean
  moving_time: number
  elapsed_time?: number
  calories?: number
}

const TIPOS_ACADEMIA = new Set(['WeightTraining', 'Workout', 'HighIntensityIntervalTraining', 'Crossfit'])

/**
 * Obtém um token Strava válido, renovando via refresh_token quando necessário.
 * Tokens são armazenados criptografados (AES-256-GCM) — nunca em texto puro.
 */
async function getValidStravaToken(integracao: StravaIntegracao): Promise<string> {
  const expira = integracao.token_expira_em
  const agora = new Date()

  if (expira && expira.getTime() > agora.getTime() + 60 * 1000 && integracao.access_token_enc) {
    return decryptSecret(integracao.access_token_enc)
  }

  if (!integracao.refresh_token_enc) {
    throw new Error('Integração Strava sem refresh_token — reconecte a conta.')
  }

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: decryptSecret(integracao.refresh_token_enc),
    }),
  })

  if (!res.ok) {
    throw new Error(`Falha ao renovar token Strava: HTTP ${res.status}`)
  }

  const data = (await res.json()) as TokenResponse

  await prisma.wearableIntegracao.update({
    where: { id: integracao.id },
    data: {
      access_token_enc: encryptSecret(data.access_token),
      refresh_token_enc: encryptSecret(data.refresh_token),
      token_expira_em: new Date(data.expires_at * 1000),
    },
  })

  return data.access_token
}

function inicioFimHoje() {
  const inicio = new Date()
  inicio.setUTCHours(0, 0, 0, 0)
  const fim = new Date()
  fim.setUTCHours(23, 59, 59, 999)
  return { inicio, fim }
}

export async function stravaRoutes(app: FastifyInstance) {
  const preHandlerAluno = [app.authenticate, app.requireRole(Role.ALUNO, Role.PROFESSOR)]

  /**
   * GET /integrations/strava/status
   * Estado da conexão do aluno com o Strava + calorias já sincronizadas hoje.
   */
  app.get('/status', { preHandler: preHandlerAluno }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const integracao = await prisma.wearableIntegracao.findUnique({
      where: { aluno_id_provedor: { aluno_id: aluno.id, provedor: 'strava' } },
    })

    const { inicio, fim } = inicioFimHoje()
    const eventosHoje = await prisma.wearableEvento.findMany({
      where: { aluno_id: aluno.id, provedor: 'strava', recebido_em: { gte: inicio, lte: fim } },
    })
    const caloriasHoje = eventosHoje.reduce((acc, ev) => {
      const cal = (ev.payload_raw as any)?.calories
      return acc + (typeof cal === 'number' ? cal : 0)
    }, 0)

    const ultimoEvento = await prisma.wearableEvento.findFirst({
      where: { aluno_id: aluno.id, provedor: 'strava' },
      orderBy: { recebido_em: 'desc' },
    })

    return reply.send({
      conectado: Boolean(integracao?.ativo),
      atletaId: integracao?.user_id_ext || null,
      ultimaSincronizacaoEm: ultimoEvento?.recebido_em || null,
      caloriasHoje,
      configurado: Boolean(env.STRAVA_CLIENT_ID && env.STRAVA_CALLBACK_URL),
    })
  })

  /**
   * GET /integrations/strava/authorize
   * Inicia o fluxo OAuth do Strava, retornando a URL de autorização para o frontend.
   */
  app.get('/authorize', { preHandler: preHandlerAluno }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CALLBACK_URL) {
      return reply.status(500).send({ error: 'STRAVA_NOT_CONFIGURED', message: 'Strava não configurado no servidor.' })
    }

    const state = app.jwt.sign({ aluno_id: aluno.id, purpose: 'strava_oauth' }, { expiresIn: '10m' })
    const authorizeUrl = `https://www.strava.com/oauth/authorize?client_id=${env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(env.STRAVA_CALLBACK_URL)}&approval_prompt=auto&scope=${encodeURIComponent('read,activity:read_all')}&state=${encodeURIComponent(state)}`

    return reply.send({ authorizeUrl })
  })

  /**
   * GET /integrations/strava/callback
   * Endpoint público (redirect target do Strava) que troca o code por tokens e persiste a integração.
   */
  app.get('/callback', async (request, reply) => {
    const querySchema = z.object({
      code: z.string().optional(),
      state: z.string().optional(),
      error: z.string().optional(),
    })
    const query = querySchema.parse(request.query)

    const webBase = env.WEB_BASE_URL || 'http://localhost:5173'

    if (query.error || !query.code || !query.state) {
      return reply.redirect(`${webBase}/wearables?strava=error`)
    }

    let payload: { aluno_id: string }
    try {
      payload = app.jwt.verify(query.state) as { aluno_id: string }
    } catch {
      return reply.redirect(`${webBase}/wearables?strava=error`)
    }

    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: env.STRAVA_CLIENT_ID,
        client_secret: env.STRAVA_CLIENT_SECRET,
        code: query.code,
        grant_type: 'authorization_code',
      }),
    })

    if (!res.ok) {
      return reply.redirect(`${webBase}/wearables?strava=error`)
    }

    const data = (await res.json()) as TokenResponse
    const { access_token, refresh_token, expires_at, athlete } = data

    await prisma.wearableIntegracao.upsert({
      where: { aluno_id_provedor: { aluno_id: payload.aluno_id, provedor: 'strava' } },
      create: {
        aluno_id: payload.aluno_id,
        provedor: 'strava',
        user_id_ext: String(athlete?.id ?? ''),
        access_token_enc: encryptSecret(access_token),
        refresh_token_enc: encryptSecret(refresh_token),
        token_expira_em: new Date(expires_at * 1000),
        ativo: true,
      },
      update: {
        user_id_ext: String(athlete?.id ?? ''),
        access_token_enc: encryptSecret(access_token),
        refresh_token_enc: encryptSecret(refresh_token),
        token_expira_em: new Date(expires_at * 1000),
        ativo: true,
      },
    })

    request.log.info({ tag: '[GymApp:Strava]', alunoId: payload.aluno_id, athleteId: athlete?.id }, 'Strava conectado')

    return reply.redirect(`${webBase}/wearables?strava=connected`)
  })

  /**
   * DELETE /integrations/strava
   * Desconecta a conta Strava do aluno.
   */
  app.delete('/', { preHandler: preHandlerAluno }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const integracao = await prisma.wearableIntegracao.findUnique({
      where: { aluno_id_provedor: { aluno_id: aluno.id, provedor: 'strava' } },
    })
    if (!integracao) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Strava não estava conectado.' })
    }

    await prisma.wearableIntegracao.delete({ where: { id: integracao.id } })
    return reply.send({ message: 'Strava desconectado com sucesso.' })
  })

  /**
   * POST /integrations/strava/sync
   * Sincroniza as últimas atividades do Strava (treinos de força e cardio) como eventos de workout,
   * capturando o gasto calórico (`calories`) reportado pelo relógio/app de origem.
   */
  app.post('/sync', { preHandler: preHandlerAluno }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const integracao = await prisma.wearableIntegracao.findUnique({
      where: { aluno_id_provedor: { aluno_id: aluno.id, provedor: 'strava' } },
    })

    if (!integracao || !integracao.ativo) {
      return reply.status(404).send({ error: 'STRAVA_NOT_CONNECTED', message: 'Strava não conectado.' })
    }

    let accessToken: string
    try {
      accessToken = await getValidStravaToken(integracao)
    } catch (err: any) {
      return reply.status(401).send({ error: 'STRAVA_AUTH_EXPIRED', message: err.message })
    }

    const activitiesRes = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=15', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (activitiesRes.status === 401) {
      return reply.status(401).send({ error: 'STRAVA_AUTH_EXPIRED' })
    }

    if (!activitiesRes.ok) {
      return reply.status(502).send({ error: 'STRAVA_API_ERROR', message: `Falha ao buscar atividades: HTTP ${activitiesRes.status}` })
    }

    const activities = (await activitiesRes.json()) as StravaActivity[]

    const existentes = await prisma.wearableEvento.findMany({
      where: { aluno_id: aluno.id, provedor: 'strava' },
      select: { payload_raw: true },
      take: 200,
    })
    const idsExistentes = new Set(
      existentes.map((e) => (e.payload_raw as any)?.activityId).filter((id) => id != null)
    )

    let synced = 0

    for (const activity of activities) {
      const relevante = activity.has_heartrate || TIPOS_ACADEMIA.has(activity.type) || (activity.calories ?? 0) > 0
      if (!relevante || idsExistentes.has(activity.id)) {
        continue
      }

      let heartRateAvg = activity.average_heartrate ?? null
      let heartRateMax = activity.max_heartrate ?? null

      if (activity.has_heartrate) {
        try {
          const streamRes = await fetch(
            `https://www.strava.com/api/v3/activities/${activity.id}/streams?keys=heartrate,time&key_by_type=true`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )

          if (streamRes.ok) {
            const stream = (await streamRes.json()) as {
              heartrate?: { data: number[] }
              time?: { data: number[] }
            }
            if (stream.heartrate?.data?.length) {
              const dados = stream.heartrate.data
              heartRateAvg = Math.round(dados.reduce((a, b) => a + b, 0) / dados.length)
              heartRateMax = Math.max(...dados)
            }
          }
        } catch (err) {
          request.log.warn(
            { tag: '[GymApp:Strava]', activityId: activity.id, err },
            'Falha ao buscar stream de batimentos do Strava'
          )
        }
      }

      await prisma.wearableEvento.create({
        data: {
          aluno_id: aluno.id,
          provedor: 'strava',
          tipo: 'workout',
          payload_raw: {
            activityId: activity.id,
            name: activity.name,
            type: activity.type,
            sportType: activity.sport_type,
            startDate: activity.start_date,
            heartRateAvg,
            heartRateMax,
            durationSeconds: activity.moving_time,
            calories: activity.calories ?? null,
            source: 'strava',
          },
          processado: true,
        },
      })

      synced += 1
    }

    request.log.info(
      { tag: '[GymApp:Strava]', alunoId: aluno.id, synced, total: activities.length },
      `Sincronização Strava concluída: ${synced} atividade(s) nova(s) de ${activities.length}`
    )

    // Strava retorna as atividades em ordem cronológica reversa — a mais recente é a[0].
    const maisRecente = activities[0] ?? null

    return reply.send({
      success: true,
      synced,
      total: activities.length,
      ultimaAtividade: maisRecente
        ? {
            nome: maisRecente.name,
            tipo: maisRecente.type,
            calorias: maisRecente.calories ?? null,
            duracaoSegundos: maisRecente.moving_time,
            inicioEm: maisRecente.start_date,
          }
        : null,
    })
  })
}
