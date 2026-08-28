import { Queue, Worker, Job } from 'bullmq'
import { Prisma, TreinoStatus, TreinoAtor } from '@prisma/client'
import { prisma } from '../../infrastructure/database/prisma.js'
import { assertTransicaoValida } from '../../domain/entities/TreinoStateMachine.js'
import { sendDualPush } from '../../infrastructure/push/sendDualPush.js'
import { calcularEAtualizar } from '../../application/usecases/correlacao/CorrelacaoService.js'
import { podeEnviar, mergeComDefaults, podeEnviarResumoDiarioComPrefs } from '../../application/usecases/notificacoes/NotificacaoPreferencesService.js'
import { env } from '../../shared/env.js'
import { connection as socialConnection } from '../../jobs/social/queues.js'
import { handleFanoutPost } from '../../jobs/social/fanout-post.worker.js'
import { handleNotifyFriends } from '../../jobs/social/notify-friends.worker.js'
import { handleAwardBadges } from '../../jobs/social/award-badges.worker.js'
import { handleUpdateXp } from '../../jobs/social/update-xp.worker.js'
import { NoticiasService } from '../../application/usecases/noticias/NoticiasService.js'
import { verificarAssinaturasExpiradas } from '../../application/usecases/assinaturas/AssinaturaService.js'
import Redis from 'ioredis'

let connection: { url: string } | null = null

let inatividade30minQueue: Queue | null = null
let treinoEmAbertoQueue: Queue | null = null
let mensagemMotivaicionalQueue: Queue | null = null
let correlacaoQueue: Queue | null = null
let newsFetchQueue: Queue | null = null
let newsPushQueue: Queue | null = null
let resumoDiarioQueue: Queue | null = null
let assinaturasQueue: Queue | null = null

let inatividade30minWorker: Worker | null = null
let treinoEmAbertoWorker: Worker | null = null
let mensagemMotivacionalWorker: Worker | null = null
let correlacaoWorker: Worker | null = null
let newsFetchWorker: Worker | null = null
let newsPushWorker: Worker | null = null
let resumoDiarioWorker: Worker | null = null
let assinaturasWorker: Worker | null = null

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
          usuario: { select: { id: true, expo_push_token: true, web_push_subscription: true, nome: true } },
          professor: { include: { usuario: { select: { id: true, expo_push_token: true, web_push_subscription: true } } } },
        },
      },
    },
  })

  console.log(`[Worker] Scan: ${treinosAtivos.length} treinos EM_EXECUCAO`)

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
      const temWebSub = !!treino.aluno.usuario.web_push_subscription
      console.log(`[Worker] Ocioso treino ${treino.id} (aluno: ${nomeAluno}) — web_sub=${temWebSub}`)
      console.log(`[Worker] Ociosidade treino ${treino.id} — aluno: ${nomeAluno}`)

      if (await podeEnviar(treino.aluno.usuario.id, 'lembreteTreino')) {
        await sendDualPush(
          treino.aluno.usuario,
          'Treino te esperando 💪',
          'Você saiu no meio do treino. Volte e continue de onde parou!',
          { url, url_estudo: url },
        )
      }

      const professor = treino.aluno.professor
      if (professor && (await podeEnviar(professor.usuario.id, 'lembreteTreino'))) {
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
      if (await podeEnviar(treino.aluno.usuario.id, 'lembreteTreino')) {
        await sendDualPush(
          treino.aluno.usuario,
          'Treino longo demais ⏱️',
          'Já se passou mais de 1 hora. Finalize o treino ou continue focado!',
          { url, url_estudo: url },
        )
      }
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

      if (await podeEnviar(treino.aluno.usuario.id, 'lembreteTreino')) {
        await sendDualPush(
          treino.aluno.usuario,
          'Treino em andamento',
          'Seu treino está parado há 30 minutos. Volte e conclua! 💪',
          { url: urlConcluir },
        )
      }
      const professor = treino.aluno.professor
      if (professor && (await podeEnviar(professor.usuario.id, 'lembreteTreino'))) {
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
          professor: { include: { usuario: { select: { id: true, expo_push_token: true, web_push_subscription: true } } } },
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
    if (p && (await podeEnviar(p.usuario.id, 'lembreteTreino'))) {
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
      include: { usuario: { select: { id: true, expo_push_token: true, web_push_subscription: true } } },
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

  // UX-005: usuário pode desabilitar mensagens motivacionais / notícias
  if (!aluno || !(await podeEnviar(aluno.usuario.id, 'motivacional'))) return

  await prisma.mensagemMotivacionalEnviada.create({
    data: { aluno_id: alunoId, mensagem_id: mensagem.id },
  })

  console.log(`[Worker] Mensagem motivacional: "${mensagem.titulo}" → aluno ${alunoId}`)

  await sendDualPush(
    aluno.usuario,
    mensagem.titulo,
    mensagem.resumo,
    { url: mensagem.url_estudo, url_estudo: mensagem.url_estudo },
  )
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
  try {
    const result = await NoticiasService.fetchAndSyncNews()
    job.log(`Fetched RSS news: ${result.inseridas} processed, total in DB: ${result.total}`)
  } catch (err: any) {
    job.log(`RSS fetch error: ${err?.message || err}`)
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

    // UX-005: usuário pode desabilitar notícias/mensagens motivacionais — agenda
    // o próximo check para não consultá-lo a cada 30min.
    if (!(await podeEnviar(usuario.id, 'motivacional'))) {
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

// ─── Resumo diário (frequência RESUMO_DIARIO) ───────────────────────────────
// Usuários com `frequencia = RESUMO_DIARIO` não recebem pushes individuais
// (podeEnviarComPrefs retorna false). Este worker consolida as notificações
// não lidas do dia em UM push único por usuário, ~19:00.
// Horário espelhado no cron do treino-em-aberto (23:30) — mesma semântica de
// fuso do servidor (America/Sao_Paulo no Railway).

const DIGEST_CRON = '0 19 * * *'
const DIGEST_TITLE = 'Seu resumo do dia'

type CategoriaResumo = 'lembreteTreino' | 'social' | 'motivacional' | 'noticias'

const RESUMO_LABELS: Record<CategoriaResumo, { singular: string; plural: string }> = {
  lembreteTreino: { singular: 'lembrete de treino', plural: 'lembretes de treino' },
  social: { singular: 'novidade social', plural: 'novidades sociais' },
  motivacional: { singular: 'mensagem motivacional', plural: 'mensagens motivacionais' },
  noticias: { singular: 'notícia', plural: 'notícias' },
}

/**
 * Deriva a categoria do resumo a partir do `tipo` da linha em `notificacoes`.
 * O enum atual (NOVO_TREINO | PROFESSOR_ATRIBUIDO) mapeia para "lembrete de
 * treino"; os demais padrões são defensivos/forward-compatible para tipos
 * sociais, motivacionais e de notícias que venham a criar linhas no futuro.
 */
function categoriaResumo(tipo: string): CategoriaResumo {
  const t = tipo.toUpperCase()
  if (/(SOCIAL|CURTIDA|COMENTARIO|AMIZADE|SEGUIR|CLUBE)/.test(t)) return 'social'
  if (/(MOTIVACIONAL|MENSAGEM)/.test(t)) return 'motivacional'
  if (/(NOTICIA|NEWS)/.test(t)) return 'noticias'
  return 'lembreteTreino'
}

/** "3 lembretes de treino e 1 novidade social esperam por você." */
function montarCorpoResumo(counts: Partial<Record<CategoriaResumo, number>>): string {
  const partes: string[] = []
  let total = 0
  for (const categoria of Object.keys(RESUMO_LABELS) as CategoriaResumo[]) {
    const qtd = counts[categoria] ?? 0
    if (qtd === 0) continue
    total += qtd
    partes.push(`${qtd} ${qtd === 1 ? RESUMO_LABELS[categoria].singular : RESUMO_LABELS[categoria].plural}`)
  }
  if (partes.length === 0) return ''
  const verbo = total === 1 ? 'espera' : 'esperam'
  if (partes.length === 1) return `${partes[0]} ${verbo} por você.`
  const ultima = partes.pop()!
  return `${partes.join(', ')} e ${ultima} ${verbo} por você.`
}

/**
 * Digest diário: agrupa as notificações não lidas de hoje por categoria e envia
 * UM push de resumo por usuário RESUMO_DIARIO.
 *
 * Decisão de design — leitura/lida: as linhas NÃO são marcadas como lidas. A
 * lista in-app (`GET /alunos/notificacoes`) filtra `lida: false`, então marcar
 * como lida removeria o histórico do app. Em vez disso, o timestamp do último
 * digest é gravado em `preferencias_notificacao.ultimoResumoEnviadoEm` (campo
 * JSON additivo, sem migração) e usado como dedupe: cada linha entra no digest
 * apenas na primeira execução após sua criação. Linhas não lidas mais antigas
 * que o marcador permanecem no app, mas não são re-digestadas (sem digests
 * repetidos).
 */
export async function handleResumoDiario(_job: Job) {
  const agora = new Date()
  const inicioDoDia = new Date(agora)
  inicioDoDia.setHours(0, 0, 0, 0)

  // Candidatos pragmáticos: em vez de filtrar o JSON aninhado via Prisma
  // (`path` em Json é suportado no Postgres, mas o shape de
  // preferencias_notificacao é irregular), carregamos alunos com notificações
  // não lidas de hoje e filtramos a frequência em JS. Escala atual é pequena —
  // trade-off aceito e documentado.
  const naoLidas = await prisma.notificacao.findMany({
    where: {
      lida: false,
      criado_em: { gte: inicioDoDia },
    },
    select: { id: true, aluno_id: true, tipo: true, criado_em: true },
    orderBy: { criado_em: 'asc' },
  })

  if (naoLidas.length === 0) {
    console.log('[Worker] Resumo diário: nenhuma notificação não lida hoje')
    return
  }

  const alunoIds = [...new Set(naoLidas.map((n) => n.aluno_id))]

  const alunos = await prisma.aluno.findMany({
    where: { id: { in: alunoIds } },
    select: {
      id: true,
      usuario: {
        select: {
          id: true,
          nome: true,
          expo_push_token: true,
          web_push_subscription: true,
          preferencias_notificacao: true,
        },
      },
    },
  })

  const alunoPorId = new Map(alunos.map((a) => [a.id, a]))
  let enviados = 0

  for (const alunoId of alunoIds) {
    const usuario = alunoPorId.get(alunoId)?.usuario
    if (!usuario) continue

    const prefs = mergeComDefaults(usuario.preferencias_notificacao)
    // Frequência + horário silencioso (19:00 dentro da janela → pula o dia)
    if (!podeEnviarResumoDiarioComPrefs(prefs, agora)) continue

    // Dedupe: apenas linhas criadas após o último digest enviado
    const ultimoEnvio = prefs.ultimoResumoEnviadoEm
    const rows = naoLidas.filter(
      (n) =>
        n.aluno_id === alunoId &&
        (!ultimoEnvio || new Date(n.criado_em).getTime() > new Date(ultimoEnvio).getTime()),
    )
    if (rows.length === 0) continue

    const counts: Partial<Record<CategoriaResumo, number>> = {}
    for (const row of rows) {
      const categoria = categoriaResumo(row.tipo)
      counts[categoria] = (counts[categoria] ?? 0) + 1
    }

    const corpo = montarCorpoResumo(counts)
    if (!corpo) continue

    await sendDualPush(usuario, DIGEST_TITLE, corpo, { url: '/' }).catch(() => {})

    // Persiste o marcador (não marca lida — ver doc acima)
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { preferencias_notificacao: { ...prefs, ultimoResumoEnviadoEm: agora.toISOString() } },
    })

    enviados += 1
    console.log(`[Worker] Resumo diário → ${usuario.nome} (${rows.length} notificações): ${corpo}`)
  }

  console.log(`[Worker] Resumo diário: ${enviados} digests enviados`)
}

// ─── Agendamento de jobs recorrentes ─────────────────────────────────────────

async function scheduleRecurringJobs() {
  if (!inatividade30minQueue || !treinoEmAbertoQueue || !newsFetchQueue || !newsPushQueue || !resumoDiarioQueue || !assinaturasQueue) return

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

  await resumoDiarioQueue.add('send-digest', {}, {
    // Idempotência por dia: agendamento único em cron diário (roda 1x/dia).
    // O marcador `preferencias_notificacao.ultimoResumoEnviadoEm` ainda protege
    // contra re-execução manual/backfill no mesmo dia.
    repeat: { pattern: DIGEST_CRON },
    removeOnComplete: true,
  })
  await assinaturasQueue!.add('verificar-expiradas', {}, {
    repeat: { pattern: '0 3 * * *' },
    removeOnComplete: true,
  })


  console.log('✅ Workers agendados')
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────

/** Verifica se o Redis responde antes de subir os workers. */
async function redisDisponivel(url: string): Promise<boolean> {
  const redis = new Redis(url, {
    lazyConnect: true,
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null as any,
  })
  try {
    await redis.connect()
    const pong = await redis.ping()
    return pong === 'PONG'
  } catch {
    return false
  } finally {
    redis.disconnect()
  }
}

export async function startWorkers() {
  if (started) return
  started = true

  // Gate de resiliência: sem Redis, o app sobe em modo degradado (sem jobs de
  // segundo plano) em vez de falhar no boot. Necessário para testes de
  // integração sem Redis e para tolerar queda momentânea do Redis.
  if (!(await redisDisponivel(env.REDIS_URL))) {
    console.warn(`[Workers] Redis indisponível (${env.REDIS_URL}) — workers NÃO iniciados (modo degradado)`)
    return
  }

  connection = { url: env.REDIS_URL }

  inatividade30minQueue = new Queue('inatividade-30min', { connection })
  treinoEmAbertoQueue = new Queue('treino-em-aberto', { connection })
  mensagemMotivaicionalQueue = new Queue('mensagem-motivacional', { connection })
  correlacaoQueue = new Queue('correlacao-desempenho', { connection })
  newsFetchQueue = new Queue('news-fetch', { connection })
  newsPushQueue = new Queue('news-push', { connection })
  resumoDiarioQueue = new Queue('resumo-diario', { connection })
  assinaturasQueue = new Queue('assinaturas-verificacao', { connection })

  inatividade30minWorker = new Worker('inatividade-30min', handleInatividade30min, { connection })
  treinoEmAbertoWorker = new Worker('treino-em-aberto', handleTreinoEmAberto, { connection })
  mensagemMotivacionalWorker = new Worker('mensagem-motivacional', handleMensagemMotivacional, { connection })
  correlacaoWorker = new Worker('correlacao-desempenho', handleCorrelacaoDesempenho, { connection })
  newsFetchWorker = new Worker('news-fetch', handleNewsFetch, { connection })
  newsPushWorker = new Worker('news-push', handleNewsPush, { connection })
  resumoDiarioWorker = new Worker('resumo-diario', handleResumoDiario, { connection })
  assinaturasWorker = new Worker('assinaturas-verificacao', async () => {
    const count = await verificarAssinaturasExpiradas()
    console.log(`[Assinaturas] ${count} assinaturas marcadas como expiradas`)
  }, { connection })

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
  resumoDiarioWorker.on('failed', (job, err) => console.error('[Resumo Diário] Job failed after retries:', job?.id, err.message))
  assinaturasWorker.on('failed', (job, err) => console.error('[Assinaturas] Job failed after retries:', job?.id, err.message))

  await scheduleRecurringJobs()
}

export async function stopWorkers() {
  if (!started) return
  started = false

  const workers = [inatividade30minWorker, treinoEmAbertoWorker, mensagemMotivacionalWorker, correlacaoWorker,
    newsFetchWorker, newsPushWorker, resumoDiarioWorker, assinaturasWorker,
    socialFanoutWorker, socialNotifyWorker, socialBadgeWorker, socialLeaderboardWorker]
  const queues = [inatividade30minQueue, treinoEmAbertoQueue, mensagemMotivaicionalQueue, correlacaoQueue,
    newsFetchQueue, newsPushQueue, resumoDiarioQueue, assinaturasQueue]

  await Promise.all([
    ...workers.map((w) => w?.close()),
    ...queues.map((q) => q?.close()),
  ])

  console.log('✅ Workers finalizados')
}
