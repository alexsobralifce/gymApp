import { Queue, Worker, Job } from 'bullmq'
import { TreinoStatus, TreinoAtor } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { assertTransicaoValida } from '../../../domain/entities/TreinoStateMachine.js'
import { env } from '../../../shared/env.js'

const connection = { url: env.REDIS_URL }

// ─── Filas ────────────────────────────────────────────────────────────────────

export const inatividade30minQueue = new Queue('inatividade-30min', { connection })
export const treinoEmAbertoQueue = new Queue('treino-em-aberto', { connection })
export const mensagemMotivaicionalQueue = new Queue('mensagem-motivacional', { connection })
export const correlacaoQueue = new Queue('correlacao-desempenho', { connection })

// ─── UC-29 + UC-30: Worker de inatividade 30 min ─────────────────────────────
// Job roda a cada 5 minutos verificando treinos EM_EXECUCAO sem conclusão após 30min

export const inatividade30minWorker = new Worker(
  'inatividade-30min',
  async (_job: Job) => {
    const limite = new Date(Date.now() - 30 * 60 * 1000)

    const treinosInativos = await prisma.treino.findMany({
      where: {
        status: TreinoStatus.EM_EXECUCAO,
        iniciado_em: { lte: limite },
        finalizado_em: null,
      },
      include: {
        aluno: {
          include: {
            usuario: { select: { fcm_token: true, nome: true } },
            professor: { include: { usuario: { select: { fcm_token: true } } } },
          },
        },
      },
    })

    for (const treino of treinosInativos) {
      console.log(`[Worker] Treino inativo: ${treino.id} — aluno: ${treino.aluno.usuario.nome}`)
      // TODO: disparar push via FCM para aluno e professor
      // await sendPushNotification(treino.aluno.usuario.fcm_token, ...)
      // await sendPushNotification(treino.aluno.professor?.usuario.fcm_token, ...)
    }
  },
  { connection },
)

// ─── UC-31: Marcar treino como "em aberto" ao fim do dia ─────────────────────

export const treinoEmAbertoWorker = new Worker(
  'treino-em-aberto',
  async (_job: Job) => {
    const hoje = new Date()
    const diaSemanaHoje = hoje.getDay() // 0=Dom...6=Sáb

    // Treinos ACEITOS que deveriam ter sido iniciados hoje e não foram
    const treinos = await prisma.treino.findMany({
      where: {
        status: TreinoStatus.ACEITO,
        dias_semana: { has: diaSemanaHoje },
        iniciado_em: null,
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
    }

    console.log(`[Worker] ${treinos.length} treinos marcados como EM_ABERTO`)
  },
  { connection },
)

// ─── UC-28 + UC-33: Worker de mensagem motivacional ──────────────────────────

export const mensagemMotivacionalWorker = new Worker(
  'mensagem-motivacional',
  async (job: Job<{ alunoId: string }>) => {
    const { alunoId } = job.data

    const todasMensagens = await prisma.mensagemMotivacional.findMany()
    const mensagensEnviadas = await prisma.mensagemMotivacionalEnviada.findMany({
      where: { aluno_id: alunoId },
      select: { mensagem_id: true },
    })

    const idsEnviados = new Set(mensagensEnviadas.map((m) => m.mensagem_id))
    let disponiveis = todasMensagens.filter((m) => !idsEnviados.has(m.id))

    // UC-33: resetar ciclo se todas foram enviadas
    if (disponiveis.length === 0) {
      await prisma.mensagemMotivacionalEnviada.deleteMany({ where: { aluno_id: alunoId } })
      disponiveis = todasMensagens
    }

    const mensagem = disponiveis[Math.floor(Math.random() * disponiveis.length)]
    if (!mensagem) return

    await prisma.mensagemMotivacionalEnviada.create({
      data: { aluno_id: alunoId, mensagem_id: mensagem.id },
    })

    console.log(`[Worker] Mensagem motivacional enviada para aluno ${alunoId}: "${mensagem.titulo}"`)
    // TODO: push FCM com mensagem.titulo + mensagem.url_estudo
  },
  { connection },
)

// ─── UC-32: Worker de correlações de desempenho ───────────────────────────────

export const correlacaoWorker = new Worker(
  'correlacao-desempenho',
  async (job: Job<{ alunoId: string }>) => {
    const { alunoId } = job.data

    const medidas = await prisma.medidaCorporal.findMany({
      where: { aluno_id: alunoId },
      orderBy: { data: 'asc' },
    })

    const execucoes = await prisma.execucaoExercicio.findMany({
      where: { treino: { aluno_id: alunoId } },
      orderBy: { registrado_em: 'asc' },
    })

    // Dados processados disponíveis para o frontend via endpoint /alunos/correlacoes
    console.log(`[Worker] Correlações calculadas: ${medidas.length} medidas, ${execucoes.length} execuções`)
    // Persistir resultado calculado em tabela de cache (futuro)
  },
  { connection },
)

// ─── Agendamento dos jobs periódicos ─────────────────────────────────────────

export async function scheduleRecurringJobs() {
  // Verificar inatividade a cada 5 minutos
  await inatividade30minQueue.add('check-inatividade', {}, {
    repeat: { every: 5 * 60 * 1000 },
    removeOnComplete: true,
  })

  // Marcar treinos em aberto às 23:30 todos os dias
  await treinoEmAbertoQueue.add('mark-em-aberto', {}, {
    repeat: { cron: '30 23 * * *' },
    removeOnComplete: true,
  })

  console.log('✅ Workers agendados')
}
