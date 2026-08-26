import { eventBus } from '../../../shared/events/event-bus.js'
import { socialFanoutQueue, socialBadgeQueue, socialLeaderboardQueue } from '../../../jobs/social/queues.js'
import { buildJobId } from '../../../jobs/social/job-id.js'

export function registerSocialEventListeners() {
  eventBus.on('treino.iniciado', async (event) => {
    if (event.type !== 'treino.iniciado') return
    try {
      const ts = event.payload.timestamp
      await socialFanoutQueue.add('fanout-post', {
        treinoId: event.payload.treinoId,
        alunoId: event.payload.alunoId,
        gruposMusculares: event.payload.gruposMusculares,
        timestamp: ts,
        eventType: 'treino.iniciado',
      }, {
        // jobId único por sessão — permite novo post a cada início de treino
        // (buildJobId sanitiza ":" — BullMQ rejeita ":" em jobIds custom)
        jobId: buildJobId('fanout', event.payload.treinoId, ts, 'iniciado'),
      })
    } catch (err) {
      console.warn('[Social] Falha ao enfileirar treino.iniciado:', err)
    }
  })

  eventBus.on('treino.concluido', async (event) => {
    if (event.type !== 'treino.concluido') return
    try {
      const ts = event.payload.timestamp
      await socialFanoutQueue.add('fanout-post', {
        treinoId: event.payload.treinoId,
        alunoId: event.payload.alunoId,
        gruposMusculares: [],
        timestamp: ts,
        eventType: 'treino.concluido',
      }, {
        jobId: buildJobId('fanout', event.payload.treinoId, ts, 'concluido'),
      })

      await socialBadgeQueue.add('award-badge', {
        alunoId: event.payload.alunoId,
        badgeTipo: 'primeiros_10_treinos',
      }, {
        jobId: buildJobId('badge', event.payload.alunoId, '10treinos'),
      })

      await socialLeaderboardQueue.add('update-xp', {
        treinoId: event.payload.treinoId,
        alunoId: event.payload.alunoId,
      }, {
        jobId: buildJobId('xp', event.payload.treinoId, ts),
      })
    } catch (err) {
      console.warn('[Social] Falha ao enfileirar treino.concluido:', err)
    }
  })

  eventBus.on('aluno.recorde_pessoal', async (event) => {
    if (event.type !== 'aluno.recorde_pessoal') return
    try {
      await socialFanoutQueue.add('fanout-post', {
        treinoId: '',
        alunoId: event.payload.alunoId,
        gruposMusculares: [],
        timestamp: new Date().toISOString(),
        eventType: 'treino.concluido',
      }, {
        jobId: buildJobId('fanout', event.payload.alunoId, event.payload.exercicioId, 'recorde'),
      })
    } catch (err) {
      console.warn('[Social] Falha ao enfileirar recorde_pessoal:', err)
    }
  })
}
