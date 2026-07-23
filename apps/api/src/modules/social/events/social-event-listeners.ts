import { eventBus } from '../../../shared/events/event-bus.js'
import { socialFanoutQueue, socialBadgeQueue, socialLeaderboardQueue } from '../../../jobs/social/queues.js'

export function registerSocialEventListeners() {
  eventBus.on('treino.iniciado', async (event) => {
    if (event.type !== 'treino.iniciado') return
    try {
      await socialFanoutQueue.add('fanout-post', {
        treinoId: event.payload.treinoId,
        alunoId: event.payload.alunoId,
        gruposMusculares: event.payload.gruposMusculares,
        timestamp: event.payload.timestamp,
        eventType: 'treino.iniciado',
      }, {
        jobId: `fanout:${event.payload.treinoId}:iniciado`,
      })
    } catch (err) {
      console.warn('[Social] Falha ao enfileirar treino.iniciado:', err)
    }
  })

  eventBus.on('treino.concluido', async (event) => {
    if (event.type !== 'treino.concluido') return
    try {
      await socialFanoutQueue.add('fanout-post', {
        treinoId: event.payload.treinoId,
        alunoId: event.payload.alunoId,
        gruposMusculares: [],
        timestamp: event.payload.timestamp,
        eventType: 'treino.concluido',
      }, {
        jobId: `fanout:${event.payload.treinoId}:concluido`,
      })

      await socialBadgeQueue.add('award-badge', {
        alunoId: event.payload.alunoId,
        badgeTipo: 'primeiros_10_treinos',
      }, {
        jobId: `badge:${event.payload.alunoId}:10treinos`,
      })

      await socialLeaderboardQueue.add('update-xp', {
        treinoId: event.payload.treinoId,
        alunoId: event.payload.alunoId,
      }, {
        jobId: `xp:${event.payload.treinoId}`,
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
        jobId: `fanout:${event.payload.alunoId}:${event.payload.exercicioId}:recorde`,
      })
    } catch (err) {
      console.warn('[Social] Falha ao enfileirar recorde_pessoal:', err)
    }
  })
}
