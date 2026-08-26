import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      treino: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
    },
  }
})

vi.mock('../../src/infrastructure/database/prisma.js', () => ({
  prisma: mockPrisma,
}))

import { GamificationService } from '../../src/application/usecases/gamification/GamificationService.js'

/** Data de N dias atrás ao meio-dia — evita virada de dia/fuso na comparação. */
function diaAtras(dias: number): Date {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - dias)
  return d
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.treino.findUnique.mockResolvedValue({
    iniciado_em: diaAtras(0),
    finalizado_em: diaAtras(0),
    execucoes: [],
  })
})

// ─── UX-008: Streak não-punitiva (descanso programado não quebra a sequência) ──
describe('GamificationService — calcularXp streak (UX-008)', () => {
  it('dias consecutivos continuam a sequência', async () => {
    mockPrisma.treino.findMany.mockResolvedValue([
      { finalizado_em: diaAtras(0) },
      { finalizado_em: diaAtras(1) },
      { finalizado_em: diaAtras(2) },
      { finalizado_em: diaAtras(3) },
    ])

    const res = await GamificationService.calcularXp('treino-1', 'aluno-1')

    expect(res.streak).toBe(4)
  })

  it('um dia de descanso (gap de 2 dias) mantém a sequência', async () => {
    // Treinos seg/qua/sex → 1 dia de descanso entre cada sessão
    mockPrisma.treino.findMany.mockResolvedValue([
      { finalizado_em: diaAtras(0) },
      { finalizado_em: diaAtras(2) },
      { finalizado_em: diaAtras(4) },
    ])

    const res = await GamificationService.calcularXp('treino-1', 'aluno-1')

    expect(res.streak).toBe(3)
    expect(res.streakMultiplier).toBe(1.5)
  })

  it('2+ dias sem treinar (última sessão há mais de 2 dias) zera a sequência', async () => {
    mockPrisma.treino.findMany.mockResolvedValue([
      { finalizado_em: diaAtras(3) },
      { finalizado_em: diaAtras(5) },
    ])

    const res = await GamificationService.calcularXp('treino-1', 'aluno-1')

    expect(res.streak).toBe(0)
    expect(res.streakMultiplier).toBe(1)
  })

  it('gap interno maior que 2 dias interrompe o acúmulo', async () => {
    // Treino hoje + treino há 4 dias → o buraco de 3+ dias quebra a contagem
    mockPrisma.treino.findMany.mockResolvedValue([
      { finalizado_em: diaAtras(0) },
      { finalizado_em: diaAtras(4) },
    ])

    const res = await GamificationService.calcularXp('treino-1', 'aluno-1')

    expect(res.streak).toBe(1)
  })

  it('histórico vazio → streak 0', async () => {
    mockPrisma.treino.findMany.mockResolvedValue([])

    const res = await GamificationService.calcularXp('treino-1', 'aluno-1')

    expect(res.streak).toBe(0)
    expect(res.streakMultiplier).toBe(1)
  })

  it('multiplicador 1.5x continua aplicando para streak >= 3', async () => {
    mockPrisma.treino.findMany.mockResolvedValue([
      { finalizado_em: diaAtras(0) },
      { finalizado_em: diaAtras(1) },
      { finalizado_em: diaAtras(2) },
    ])

    const res = await GamificationService.calcularXp('treino-1', 'aluno-1')

    expect(res.streak).toBe(3)
    expect(res.streakMultiplier).toBe(1.5)
    expect(res.total).toBe(Math.round(100 * 1.5))
  })
})
