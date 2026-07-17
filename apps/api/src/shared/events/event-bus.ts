import { EventEmitter } from 'events'

export type DomainEvent =
  | { type: 'treino.iniciado'; payload: { treinoId: string; alunoId: string; gruposMusculares: string[]; timestamp: string } }
  | { type: 'treino.concluido'; payload: { treinoId: string; alunoId: string; timestamp: string } }
  | { type: 'aluno.recorde_pessoal'; payload: { alunoId: string; exercicioId: string; novoRecorde: number } }

type EventHandler = (event: DomainEvent) => void | Promise<void>

class EventBus {
  private emitter = new EventEmitter()

  on(eventType: DomainEvent['type'], handler: EventHandler) {
    this.emitter.on(eventType, handler)
  }

  emit(event: DomainEvent) {
    this.emitter.emit(event.type, event)
  }
}

export const eventBus = new EventBus()
