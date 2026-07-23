import { Queue, Worker, Job } from 'bullmq'
import { TreinoStatus, TreinoAtor } from '@prisma/client'
import { prisma } from '../../infrastructure/database/prisma.js'
import { assertTransicaoValida } from '../../domain/entities/TreinoStateMachine.js'
import { sendPushNotification } from '../../infrastructure/push/expoPush.js'
import { sendWebPush } from '../../infrastructure/push/webPush.js'
import { calcularEAtualizar } from '../../application/usecases/correlacao/CorrelacaoService.js'
import { env } from '../../shared/env.js'
import type { PushSubscription } from 'web-push'
import { connection as socialConnection } from '../../jobs/social/queues.js'
import { handleFanoutPost } from '../../jobs/social/fanout-post.worker.js'
import { handleNotifyFriends } from '../../jobs/social/notify-friends.worker.js'
import { handleAwardBadges } from '../../jobs/social/award-badges.worker.js'

let connection: { url: string } | null = null

let inatividade30minQueue: Queue | null = null
let treinoEmAbertoQueue: Queue | null = null
let mensagemMotivaicionalQueue: Queue | null = null
let correlacaoQueue: Queue | null = null

let inatividade30minWorker: Worker | null = null
let treinoEmAbertoWorker: Worker | null = null
let mensagemMotivacionalWorker: Worker | null = null
let correlacaoWorker: Worker | null = null

let socialFanoutWorker: Worker | null = null
let socialNotifyWorker: Worker | null = null
let socialBadgeWorker: Worker | null = null

let started = false

const IDLE_MS = 10 * 60 * 1000
const LONGO_MS = 60 * 60 * 1000

// ─── Push dual-channel helper ──────────────────────────────────────────────────

async function sendDualPush(
  expoToken: string | null | undefined,
  webSubscription: PushSubscription | null,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  const promises: Promise<void>[] = []
  if (expoToken) promises.push(sendPushNotification(expoToken, title, body, data))
  if (webSubscription) promises.push(sendWebPush(webSubscription, title, body, data))
  await Promise.allSettled(promises)
}

function execUrl(treinoId: string) {
  return `/treino/${treinoId}/execucao`
}

// ─── Work handlers ────────────────────────────────────────────────────────────

/** Ociosidade real (sem série) + lembrete de treino longo (>60min) */
async function handleInatividade30min(_job: Job) {
  const agora = Date.now()
  const limiteIdle = new Date(agora - IDLE_MS)
  const limiteLongo = new Date(agora - LONGO_MS)

  const treinosAtivos = await prisma.treino.findMany({
    where: {
      status: TreinoStatus.EM_EXECUCAO,
      finalizado_em: null,
      iniciado_em: { not: null },
    },
    include: {
      aluno: {
        include: {
          usuario: { select: { expo_push_token: true, web_push_subscription: true, nome: true } },
          professor: { include: { usuario: { select: { expo_push_token: true, web_push_subscription: true } } } },
        },
      },
    },
  })

  for (const treino of treinosAtivos) {
    const nomeAluno = treino.aluno.usuario.nome
    const ultima = treino.ultima_atividade_em ?? treino.iniciado_em
    if (!ultima || !treino.iniciado_em) continue

    const url = execUrl(treino.id)
    const expo = treino.aluno.usuario.expo_push_token
    const web = treino.aluno.usuario.web_push_subscription as PushSubscription | null

    // 1) Away: sem atividade há >= 10 min (1 push até registrar nova série)
    const ocioso = ultima <= limiteIdle
    const jaNotificouIdle =
      treino.notificado_inatividade_em != null &&
      treino.notificado_inatividade_em >= ultima

    if (ocioso && !jaNotificouIdle) {
      console.log(`[Worker] Ociosidade treino ${treino.id} — aluno: ${nomeAluno}`)
      await sendDualPush(
        expo,
        web,
        'Treino te esperando 💪',
        'Você saiu no meio do treino. Volte e continue de onde parou!',
        { url, url_estudo: url },
      )

      const professorToken = treino.aluno.professor?.usuario.expo_push_token
      const professorWeb = treino.aluno.professor?.usuario.web_push_subscription as PushSubscription | null
      if (professorToken || professorWeb) {
        await sendDualPush(
          professorToken,
          professorWeb,
          'Aluno ocioso no treino',
          `${nomeAluno} está há mais de 10 min sem registrar séries.`,
          { url: '/' },
        )
      }

      await prisma.treino.update({
        where: { id: treino.id },
        data: { notificado_inatividade_em: new Date() },
      })
    }

    // 2) Longo: sessão > 60 min (1 push por sessão)
    const longo = treino.iniciado_em <= limiteLongo
    if (longo && !treino.notificado_longo_em) {
      console.log(`[Worker] Treino longo 60min ${treino.id} — aluno: ${nomeAluno}`)
      await sendDualPush(
        expo,
        web,
        'Treino longo demais ⏱️',
        'Já se passou mais de 1 hora. Finalize o treino ou continue focado!',
        { url, url_estudo: url },
      )
      await prisma.treino.update({
        where: { id: treino.id },
        data: { notificado_longo_em: new Date() },
      })
    }
  }
}

async function handleTreinoEmAberto(_job: Job) {
  const hoje = new Date()
  const diaSemanaHoje = hoje.getDay()

  const treinos = await prisma.treino.findMany({
    where: {
      status: TreinoStatus.ACEITO,
      dias_semana: { has: diaSemanaHoje },
      iniciado_em: null,
    },
    include: {
      aluno: {
        include: {
          usuario: { select: { nome: true } },
          professor: { include: { usuario: { select: { expo_push_token: true, web_push_subscription: true } } } },
        },
      },
    },
  })

  for (const treino of treinos) {
    assertTransicaoValida(treino.status, TreinoStatus.EM_ABERTO, TreinoAtor.SISTEMA)

    await prisma.$transaction(async (tx) => {
      await tx.treino.update({
        where: { id: treino.id },
        data: { status: TreinoStatus.EM_ABERTO },
      })
      await tx.treinoHistorico.create({
        data: {
          treino_id: treino.id,
          status_anterior: TreinoStatus.ACEITO,
          status_novo: TreinoStatus.EM_ABERTO,
          ator_id: 'SISTEMA',
          ator_tipo: TreinoAtor.SISTEMA,
        },
      })
    })

    const nomeAluno = treino.aluno.usuario.nome
    const p = treino.aluno.professor
    if (p) {
      await sendDualPush(
        p.usuario.expo_push_token,
        p.usuario.web_push_subscription as PushSubscription | null,
        'Treino em aberto',
        `${nomeAluno} não iniciou o treino programado para hoje.`,
      )
    }
  }

  console.log(`[Worker] ${treinos.length} treinos marcados como EM_ABERTO`)
}

async function handleMensagemMotivacional(job: Job<{ alunoId: string }>) {
  const { alunoId } = job.data

  const [todasMensagens, mensagensEnviadas, aluno] = await Promise.all([
    prisma.mensagemMotivacional.findMany(),
    prisma.mensagemMotivacionalEnviada.findMany({
      where: { aluno_id: alunoId },
      select: { mensagem_id: true },
    }),
    prisma.aluno.findUnique({
      where: { id: alunoId },
      include: { usuario: { select: { expo_push_token: true, web_push_subscription: true } } },
    }),
  ])

  const idsEnviados = new Set(mensagensEnviadas.map((m) => m.mensagem_id))
  let disponiveis = todasMensagens.filter((m) => !idsEnviados.has(m.id))

  if (disponiveis.length === 0) {
    await prisma.mensagemMotivacionalEnviada.deleteMany({ where: { aluno_id: alunoId } })
    disponiveis = todasMensagens
  }

  const mensagem = disponiveis[Math.floor(Math.random() * disponiveis.length)]
  if (!mensagem) return

  await prisma.mensagemMotivacionalEnviada.create({
    data: { aluno_id: alunoId, mensagem_id: mensagem.id },
  })

  console.log(`[Worker] Mensagem motivacional: "${mensagem.titulo}" → aluno ${alunoId}`)

  if (aluno) {
    await sendDualPush(
      aluno.usuario.expo_push_token,
      aluno.usuario.web_push_subscription as PushSubscription | null,
      mensagem.titulo,
      mensagem.resumo,
      { url: mensagem.url_estudo, url_estudo: mensagem.url_estudo },
    )
  }
}

async function handleCorrelacaoDesempenho(job: Job<{ alunoId: string }>) {
  const { alunoId } = job.data

  const resultado = await calcularEAtualizar(alunoId)

  if (resultado) {
    console.log(`[Worker] Correlações calculadas para aluno ${alunoId}: r(peso) = ${resultado.peso_volume_r}, r(bf) = ${resultado.bf_volume_r}, r(massa magra) = ${resultado.massa_magra_volume_r}`)
  } else {
    console.log(`[Worker] Correlações insuficientes para aluno ${alunoId} — dados insuficientes`)
  }
}

// ─── Agendamento de jobs recorrentes ─────────────────────────────────────────

async function scheduleRecurringJobs() {
  if (!inatividade30minQueue || !treinoEmAbertoQueue) return

  await inatividade30minQueue.add('check-inatividade', {}, {
    repeat: { every: 2 * 60 * 1000 },
    removeOnComplete: true,
  })

  await treinoEmAbertoQueue.add('mark-em-aberto', {}, {
    repeat: { pattern: '30 23 * * *' },
    removeOnComplete: true,
  })

  console.log('✅ Workers agendados')
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────

export async function startWorkers() {
  if (started) return
  started = true

  connection = { url: env.REDIS_URL }

  inatividade30minQueue = new Queue('inatividade-30min', { connection })
  treinoEmAbertoQueue = new Queue('treino-em-aberto', { connection })
  mensagemMotivaicionalQueue = new Queue('mensagem-motivacional', { connection })
  correlacaoQueue = new Queue('correlacao-desempenho', { connection })

  inatividade30minWorker = new Worker('inatividade-30min', handleInatividade30min, { connection })
  treinoEmAbertoWorker = new Worker('treino-em-aberto', handleTreinoEmAberto, { connection })
  mensagemMotivacionalWorker = new Worker('mensagem-motivacional', handleMensagemMotivacional, { connection })
  correlacaoWorker = new Worker('correlacao-desempenho', handleCorrelacaoDesempenho, { connection })

  socialFanoutWorker = new Worker('social-fanout', handleFanoutPost, { connection: socialConnection })
  socialNotifyWorker = new Worker('social-notify', handleNotifyFriends, { connection: socialConnection })
  socialBadgeWorker = new Worker('social-badge', handleAwardBadges, { connection: socialConnection })

  socialFanoutWorker.on('failed', (job, err) => console.error('[Social Fanout] Job failed after retries:', job?.id, err.message))
  socialNotifyWorker.on('failed', (job, err) => console.error('[Social Notify] Job failed after retries:', job?.id, err.message))
  socialBadgeWorker.on('failed', (job, err) => console.error('[Social Badge] Job failed after retries:', job?.id, err.message))

  await scheduleRecurringJobs()
}

export async function stopWorkers() {
  if (!started) return
  started = false

  const workers = [inatividade30minWorker, treinoEmAbertoWorker, mensagemMotivacionalWorker, correlacaoWorker,
    socialFanoutWorker, socialNotifyWorker, socialBadgeWorker]
  const queues = [inatividade30minQueue, treinoEmAbertoQueue, mensagemMotivaicionalQueue, correlacaoQueue]

  await Promise.all([
    ...workers.map((w) => w?.close()),
    ...queues.map((q) => q?.close()),
  ])

  console.log('✅ Workers finalizados')
}
