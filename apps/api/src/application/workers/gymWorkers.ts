import { Queue, Worker, Job } from 'bullmq'
import { Prisma, TreinoStatus, TreinoAtor } from '@prisma/client'
import { prisma } from '../../infrastructure/database/prisma.js'
import { assertTransicaoValida } from '../../domain/entities/TreinoStateMachine.js'
import { sendDualPush } from '../../infrastructure/push/sendDualPush.js'
import { calcularEAtualizar } from '../../application/usecases/correlacao/CorrelacaoService.js'
import { env } from '../../shared/env.js'
import { connection as socialConnection } from '../../jobs/social/queues.js'
import { handleFanoutPost } from '../../jobs/social/fanout-post.worker.js'
import { handleNotifyFriends } from '../../jobs/social/notify-friends.worker.js'
import { handleAwardBadges } from '../../jobs/social/award-badges.worker.js'
import { handleUpdateXp } from '../../jobs/social/update-xp.worker.js'

let connection: { url: string } | null = null

let inatividade30minQueue: Queue | null = null
let treinoEmAbertoQueue: Queue | null = null
let mensagemMotivaicionalQueue: Queue | null = null
let correlacaoQueue: Queue | null = null
let newsFetchQueue: Queue | null = null
let newsPushQueue: Queue | null = null

let inatividade30minWorker: Worker | null = null
let treinoEmAbertoWorker: Worker | null = null
let mensagemMotivacionalWorker: Worker | null = null
let correlacaoWorker: Worker | null = null
let newsFetchWorker: Worker | null = null
let newsPushWorker: Worker | null = null

let socialFanoutWorker: Worker | null = null
let socialNotifyWorker: Worker | null = null
let socialBadgeWorker: Worker | null = null
let socialLeaderboardWorker: Worker | null = null

let started = false

const IDLE_MS = 10 * 60 * 1000
const LONGO_MS = 60 * 60 * 1000
const LEMBRETE_MS = 30 * 60 * 1000

const NEWS_FETCH_QUERY = 'exercício físico%20endorfina%20bem estar%20felicidade%20atividade física'

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

    // 1) Away: sem atividade há >= 10 min (1 push até registrar nova série)
    const ocioso = ultima <= limiteIdle
    const jaNotificouIdle =
      treino.notificado_inatividade_em != null &&
      treino.notificado_inatividade_em >= ultima

    if (ocioso && !jaNotificouIdle) {
      console.log(`[Worker] Ociosidade treino ${treino.id} — aluno: ${nomeAluno}`)
      await sendDualPush(
        treino.aluno.usuario,
        'Treino te esperando 💪',
        'Você saiu no meio do treino. Volte e continue de onde parou!',
        { url, url_estudo: url },
      )

      const professor = treino.aluno.professor
      if (professor) {
        await sendDualPush(
          professor.usuario,
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
        treino.aluno.usuario,
        'Treino longo demais ⏱️',
        'Já se passou mais de 1 hora. Finalize o treino ou continue focado!',
        { url, url_estudo: url },
      )
      await prisma.treino.update({
        where: { id: treino.id },
        data: { notificado_longo_em: new Date() },
      })
    }

    // 3) Lembrete 30 min: treino parado pede conclusão (1 push até finalizar)
    const limiteConcluir = new Date(agora - LEMBRETE_MS)
    if (!treino.notificado_concluir_em && ultima <= limiteConcluir) {
      console.log(`[Worker] Lembrete 30min treino ${treino.id} — aluno: ${nomeAluno}`)
      const urlConcluir = `${env.WEB_BASE_URL ?? ''}${url}`
      await sendDualPush(
        treino.aluno.usuario,
        'Treino em andamento',
        'Seu treino está parado há 30 minutos. Volte e conclua! 💪',
        { url: urlConcluir },
      )
      const professor = treino.aluno.professor
      if (professor) {
        await sendDualPush(
          professor.usuario,
          'Treino do aluno parado',
          `${nomeAluno} está com treino parado há 30 min`,
          { url: urlConcluir },
        )
      }
      await prisma.treino.update({
        where: { id: treino.id },
        data: { notificado_concluir_em: new Date() },
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
        p.usuario,
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
      aluno.usuario,
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

// ─── News engine (RSS fetch + push rotativo) ─────────────────────────────────

async function handleNewsFetch(job: Job) {
  const RSS_URL = `https://news.google.com/rss/search?q=${NEWS_FETCH_QUERY}&hl=pt-BR&gl=BR&ceid=BR:pt-419&when=30d`

  try {
    const response = await fetch(RSS_URL, { signal: AbortSignal.timeout(30000) })
    const xml = await response.text()

    const agora = Date.now()
    const MAX_IDADE_MS = 30 * 24 * 60 * 60 * 1000 // 30 dias
    const PRUNE_IDADE_MS = 60 * 24 * 60 * 60 * 1000 // 60 dias (remoção de notícias muito antigas)

    // Parse RSS items with regex (no external deps)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    let inseridas = 0
    let puladasData = 0
    while ((match = itemRegex.exec(xml)) !== null) {
      const item = match[1]
      const titulo = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1]?.trim()
      const link = (item.match(/<link>(.*?)<\/link>/))?.[1]?.trim()
      const desc = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/))?.[1]?.trim()
      const fonte = (item.match(/<source.*?>(.*?)<\/source>/))?.[1]?.trim()
      const pubDateRaw = (item.match(/<pubDate>(.*?)<\/pubDate>/))?.[1]?.trim()

      if (!titulo || !link) continue

      // Filtrar por data de publicação: só notícias recentes (últimos 30 dias)
      let dataPublicacao: Date | null = null
      if (pubDateRaw) {
        const parsed = new Date(pubDateRaw)
        if (!isNaN(parsed.getTime())) {
          dataPublicacao = parsed
        }
      }

      if (dataPublicacao && agora - dataPublicacao.getTime() > MAX_IDADE_MS) {
        puladasData++
        continue // muito antiga, não insere
      }
      // Se não tem pubDate válida, insere assim mesmo (pode ser conteúdo evergreen do Google News)

      await prisma.noticia.upsert({
        where: { url: link },
        create: {
          titulo: titulo.slice(0, 200),
          resumo: (desc || titulo).replace(/<[^>]*>/g, '').slice(0, 300),
          url: link,
          fonte: fonte || 'Google News',
          data_publicacao: dataPublicacao,
        },
        update: {
          data_publicacao: dataPublicacao,
        },
      })
      inseridas++
    }

    // Podar notícias muito antigas (60+ dias) para manter a lista enxuta
    const cortePrune = new Date(agora - PRUNE_IDADE_MS)
    const { count } = await prisma.noticia.deleteMany({
      where: {
        OR: [
          { data_publicacao: { lt: cortePrune } },
        ],
      },
    })
    if (count > 0) console.log(`[News Fetch] Removidas ${count} notícias antigas (anteriores a ${cortePrune.toISOString().slice(0, 10)})`)

    job.log(`Fetched RSS: ${inseridas} inserted/updated, ${puladasData} skipped (old)`)
  } catch (err) {
    job.log(`RSS fetch error: ${(err as Error).message}`)
  }
}

async function handleNewsPush(job: Job) {
  const now = new Date()

  // Only push during business hours (08:00-18:00 BRT = 11:00-21:00 UTC)
  const horaUTC = now.getUTCHours()
  if (horaUTC < 11 || horaUTC >= 21) {
    return // skip outside business hours — worker runs every 30min, will retry in window
  }

  // Users with push tokens whose schedule is due
  const usuarios = await prisma.usuario.findMany({
    where: {
      OR: [
        { expo_push_token: { not: null } },
        { web_push_subscription: { not: Prisma.DbNull } },
      ],
      proxima_noticia_em: { lte: now },
    },
    take: 20, // batch processing
  })

  for (const usuario of usuarios) {
    // Só envia notícias frescas (últimos 30 dias), não reenvia antigas
    const corteFrescor = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Find fresh news not yet sent to this user
    const enviadas = await prisma.noticiaEnviada.findMany({
      where: { usuario_id: usuario.id },
      select: { noticia_id: true },
    })
    const idsEnviados = enviadas.map((e) => e.noticia_id)

    const noticia = await prisma.noticia.findFirst({
      where: {
        ...(idsEnviados.length > 0 ? { id: { notIn: idsEnviados } } : {}),
        // só notícias recentes (últimos 30 dias ou sem data — recém-inseridas)
        OR: [
          { data_publicacao: { gte: corteFrescor } },
          { data_publicacao: null }, // fallback para notícias sem pubDate (inseridas recentemente)
        ],
      },
      orderBy: { data_publicacao: 'desc' },
    })

    // Se não há notícia fresca não enviada, pula este usuário (sem reenvio de antigas)
    if (!noticia) {
      // Agenda próximo check em 1-7 dias mesmo sem push
      const dias = 1 + Math.floor(Math.random() * 7)
      const proxima = new Date()
      proxima.setDate(proxima.getDate() + dias)
      proxima.setUTCHours(11, 0, 0, 0)
      const randomMin = Math.floor(Math.random() * 600)
      proxima.setUTCMinutes(randomMin)

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { proxima_noticia_em: proxima },
      })
      continue
    }

    await prisma.noticiaEnviada.create({
      data: { usuario_id: usuario.id, noticia_id: noticia.id },
    })

    // Schedule next: in random 1-7 days, at random time between 08:00-18:00 BRT (11:00-21:00 UTC)
    const dias = 1 + Math.floor(Math.random() * 7)
    const proxima = new Date()
    proxima.setDate(proxima.getDate() + dias)
    proxima.setUTCHours(11, 0, 0, 0) // 08:00 BRT
    const randomMin = Math.floor(Math.random() * 600) // 0-599 min → 08:00 to 17:59 BRT
    proxima.setUTCMinutes(randomMin)

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { proxima_noticia_em: proxima },
    })

    await sendDualPush(usuario, noticia.titulo, noticia.resumo, { url: noticia.url }).catch(() => {})
  }

  job.log(`News push: processed ${usuarios.length} users`)
}

// ─── Agendamento de jobs recorrentes ─────────────────────────────────────────

async function scheduleRecurringJobs() {
  if (!inatividade30minQueue || !treinoEmAbertoQueue || !newsFetchQueue || !newsPushQueue) return

  await inatividade30minQueue.add('check-inatividade', {}, {
    repeat: { every: 2 * 60 * 1000 },
    removeOnComplete: true,
  })

  await treinoEmAbertoQueue.add('mark-em-aberto', {}, {
    repeat: { pattern: '30 23 * * *' },
    removeOnComplete: true,
  })

  await newsFetchQueue.add('fetch-rss', {}, {
    repeat: { every: 6 * 3600 * 1000 },
    removeOnComplete: true,
  })

  await newsPushQueue.add('push-news', {}, {
    repeat: { every: 30 * 60 * 1000 },
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
  newsFetchQueue = new Queue('news-fetch', { connection })
  newsPushQueue = new Queue('news-push', { connection })

  inatividade30minWorker = new Worker('inatividade-30min', handleInatividade30min, { connection })
  treinoEmAbertoWorker = new Worker('treino-em-aberto', handleTreinoEmAberto, { connection })
  mensagemMotivacionalWorker = new Worker('mensagem-motivacional', handleMensagemMotivacional, { connection })
  correlacaoWorker = new Worker('correlacao-desempenho', handleCorrelacaoDesempenho, { connection })
  newsFetchWorker = new Worker('news-fetch', handleNewsFetch, { connection })
  newsPushWorker = new Worker('news-push', handleNewsPush, { connection })

  socialFanoutWorker = new Worker('social-fanout', handleFanoutPost, { connection: socialConnection })
  socialNotifyWorker = new Worker('social-notify', handleNotifyFriends, { connection: socialConnection })
  socialBadgeWorker = new Worker('social-badge', handleAwardBadges, { connection: socialConnection })

  socialLeaderboardWorker = new Worker('social-leaderboard', handleUpdateXp, { connection: socialConnection })

  socialFanoutWorker.on('failed', (job, err) => console.error('[Social Fanout] Job failed after retries:', job?.id, err.message))
  socialNotifyWorker.on('failed', (job, err) => console.error('[Social Notify] Job failed after retries:', job?.id, err.message))
  socialBadgeWorker.on('failed', (job, err) => console.error('[Social Badge] Job failed after retries:', job?.id, err.message))
  socialLeaderboardWorker.on('failed', (job, err) => console.error('[Social Leaderboard] Job failed after retries:', job?.id, err.message))

  newsFetchWorker.on('failed', (job, err) => console.error('[News Fetch] Job failed after retries:', job?.id, err.message))
  newsPushWorker.on('failed', (job, err) => console.error('[News Push] Job failed after retries:', job?.id, err.message))

  await scheduleRecurringJobs()
}

export async function stopWorkers() {
  if (!started) return
  started = false

  const workers = [inatividade30minWorker, treinoEmAbertoWorker, mensagemMotivacionalWorker, correlacaoWorker,
    newsFetchWorker, newsPushWorker,
    socialFanoutWorker, socialNotifyWorker, socialBadgeWorker, socialLeaderboardWorker]
  const queues = [inatividade30minQueue, treinoEmAbertoQueue, mensagemMotivaicionalQueue, correlacaoQueue,
    newsFetchQueue, newsPushQueue]

  await Promise.all([
    ...workers.map((w) => w?.close()),
    ...queues.map((q) => q?.close()),
  ])

  console.log('✅ Workers finalizados')
}
