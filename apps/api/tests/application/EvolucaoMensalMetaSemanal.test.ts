import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      treinoHistorico: { findMany: vi.fn() },
      execucaoExercicio: { findMany: vi.fn() },
      aluno: { findUnique: vi.fn() },
    },
  }
})

vi.mock('../../src/infrastructure/database/prisma.js', () => ({
  prisma: mockPrisma,
}))

import { obterEvolucaoMensal } from '../../src/application/usecases/treino/TreinoService.js'

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.treinoHistorico.findMany.mockResolvedValue([])
  mockPrisma.execucaoExercicio.findMany.mockResolvedValue([])
})

// ─── UX-003: Consumo da meta_semanal em obterEvolucaoMensal ──────────────────
describe('obterEvolucaoMensal — fallback e clamp da meta semanal', () => {
  it('usa aluno.meta_semanal quando definido', async () => {
    mockPrisma.aluno.findUnique.mockResolvedValue({ meta_semanal: 5 })

    const resultado = await obterEvolucaoMensal('aluno-1')

    expect(resultado.metaSemanal).toBe(5)
  })

  it('cai para 3 quando o registro do aluno não existe (null)', async () => {
    mockPrisma.aluno.findUnique.mockResolvedValue(null)

    const resultado = await obterEvolucaoMensal('aluno-1')

    expect(resultado.metaSemanal).toBe(3)
  })

  it('cai para 3 quando meta_semanal é undefined', async () => {
    mockPrisma.aluno.findUnique.mockResolvedValue({})

    const resultado = await obterEvolucaoMensal('aluno-1')

    expect(resultado.metaSemanal).toBe(3)
  })

  it('clampa 99 → 7 (limite superior)', async () => {
    mockPrisma.aluno.findUnique.mockResolvedValue({ meta_semanal: 99 })

    const resultado = await obterEvolucaoMensal('aluno-1')

    expect(resultado.metaSemanal).toBe(7)
  })

  it('clampa 0 → 1 (limite inferior)', async () => {
    mockPrisma.aluno.findUnique.mockResolvedValue({ meta_semanal: 0 })

    const resultado = await obterEvolucaoMensal('aluno-1')

    expect(resultado.metaSemanal).toBe(1)
  })

  it('seleciona apenas meta_semanal do aluno', async () => {
    mockPrisma.aluno.findUnique.mockResolvedValue({ meta_semanal: 4 })

    await obterEvolucaoMensal('aluno-1')

    expect(mockPrisma.aluno.findUnique).toHaveBeenCalledWith({
      where: { id: 'aluno-1' },
      select: { meta_semanal: true },
    })
  })
})
