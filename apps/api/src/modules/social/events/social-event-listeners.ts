import { eventBus, DomainEvent } from '../../../shared/events/event-bus.js'

export function registerSocialEventListeners() {
  eventBus.on('treino.iniciado', async (event) => {
    if (event.type !== 'treino.iniciado') return
    try {
      // Prompt 3: enfileirar job BullMQ aqui
      // await socialFanoutQueue.add('fanout-post', event.payload, { ... })
    } catch (err) {
      console.warn('[Social] Falha ao processar treino.iniciado:', err)
    }
  })

  eventBus.on('treino.concluido', async (event) => {
    if (event.type !== 'treino.concluido') return
    try {
      // Prompt 3: enfileirar job BullMQ aqui
      // await socialFanoutQueue.add('fanout-post', event.payload, { ... })
    } catch (err) {
      console.warn('[Social] Falha ao processar treino.concluido:', err)
    }
  })

  eventBus.on('aluno.recorde_pessoal', async (event) => {
    if (event.type !== 'aluno.recorde_pessoal') return
    try {
      // Prompt 3: enfileirar job BullMQ aqui
    } catch (err) {
      console.warn('[Social] Falha ao processar aluno.recorde_pessoal:', err)
    }
  })
}
