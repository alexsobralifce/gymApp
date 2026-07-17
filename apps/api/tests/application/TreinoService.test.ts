import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TreinoStatus, TreinoAtor } from '@prisma/client'

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      aluno: { findUnique: vi.fn() },
      treino: { create: vi.fn(), findUnique: vi.fn() },
    },
  }
})

vi.mock('../../src/infrastructure/database/prisma.js', () => ({
  prisma: mockPrisma,
}))

import { criarTreinoAutogestao, clonarTreino } from '../../src/application/usecases/treino/TreinoService.js'
import { NotFoundError, TenantAccessError } from '../../src/domain/errors/AppError.js'

const alunoAutogestao = {
  id: 'aluno-1',
  usuario_id: 'user-1',
  professor_id: null,
  academia_id: null,
  criado_em: new Date(),
  atualizado_em: new Date(),
}

const alunoComProfessor = {
  id: 'aluno-2',
  usuario_id: 'user-2',
  professor_id: 'prof-1',
  academia_id: null,
  criado_em: new Date(),
  atualizado_em: new Date(),
}

const inputBase = {
  nome: 'Treino A — Peito',
  diasSemana: [1, 3, 5],
  exercicios: [
    {
      exercicioId: 'ex-1',
      ordem: 1,
      series: 3,
      repeticoes: 12,
      cargaSugeridaKg: 20,
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('criarTreinoAutogestao', () => {
  it('cria treino ACEITO para aluno em modo autogestão', async () => {
    mockPrisma.aluno.findUnique.mockResolvedValue(alunoAutogestao)
    const treinoCriado = { id: 'treino-1', nome: inputBase.nome, status: TreinoStatus.ACEITO, exercicios: [] }
    mockPrisma.treino.create.mockResolvedValue(treinoCriado)

    const result = await criarTreinoAutogestao('aluno-1', inputBase)

    expect(mockPrisma.aluno.findUnique).toHaveBeenCalledWith({ where: { id: 'aluno-1' } })
    expect(mockPrisma.treino.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aluno_id: 'aluno-1',
          nome: inputBase.nome,
          dias_semana: inputBase.diasSemana,
          status: TreinoStatus.ACEITO,
          historico: {
            create: expect.objectContaining({
              status_anterior: TreinoStatus.CADASTRADO,
              status_novo: TreinoStatus.ACEITO,
              ator_id: 'aluno-1',
              ator_tipo: TreinoAtor.ALUNO,
            }),
          },
        }),
      })
    )
    expect(result).toEqual(treinoCriado)
  })

  it('lança NotFoundError se aluno não existe', async () => {
    mockPrisma.aluno.findUnique.mockResolvedValue(null)

    await expect(criarTreinoAutogestao('inexistente', inputBase))
      .rejects.toThrow(NotFoundError)
  })

  it('lança TenantAccessError se aluno tem professor vinculado', async () => {
    mockPrisma.aluno.findUnique.mockResolvedValue(alunoComProfessor)

    await expect(criarTreinoAutogestao('aluno-2', inputBase))
      .rejects.toThrow(TenantAccessError)
  })
})

// ─── clonarTreino ──────────────────────────────────────────────────────────────

const treinoFonte = {
  id: 'treino-fonte',
  nome: 'Treino A',
  dias_semana: [1, 3, 5],
  status: TreinoStatus.CADASTRADO,
  aluno_id: 'aluno-1',
  aluno: { professor_id: 'prof-1', academia_id: 'acad-1' },
  exercicios: [
    { exercicio_id: 'ex-1', ordem: 1, series: 3, repeticoes: 12, carga_sugerida_kg: 20 },
    { exercicio_id: 'ex-2', ordem: 2, series: 4, repeticoes: 10, carga_sugerida_kg: null },
  ],
}

const alunoDestino = {
  id: 'aluno-2',
  professor_id: 'prof-1',
  academia_id: 'acad-1',
  criado_em: new Date(),
  atualizado_em: new Date(),
}

const alunoOutroProf = {
  id: 'aluno-3',
  professor_id: 'prof-99',
  academia_id: 'acad-99',
  criado_em: new Date(),
  atualizado_em: new Date(),
}

describe('clonarTreino', () => {
  it('clona treino com sucesso (PROFESSOR)', async () => {
    mockPrisma.treino.findUnique.mockResolvedValue(treinoFonte)
    mockPrisma.aluno.findUnique.mockResolvedValue(alunoDestino)
    const treinoClonado = { id: 'clone-1', nome: 'Treino A (cópia)', status: TreinoStatus.CADASTRADO, exercicios: [] }
    mockPrisma.treino.create.mockResolvedValue(treinoClonado)

    const result = await clonarTreino('treino-fonte', 'aluno-2', 'prof-1', TreinoAtor.PROFESSOR)

    expect(mockPrisma.treino.findUnique).toHaveBeenCalledWith({
      where: { id: 'treino-fonte' },
      include: expect.objectContaining({ exercicios: expect.anything(), aluno: expect.anything() }),
    })
    expect(mockPrisma.aluno.findUnique).toHaveBeenCalledWith({ where: { id: 'aluno-2' } })
    expect(mockPrisma.treino.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aluno_id: 'aluno-2',
          nome: 'Treino A (cópia)',
          dias_semana: [1, 3, 5],
          status: TreinoStatus.CADASTRADO,
          exercicios: {
            create: expect.arrayContaining([
              expect.objectContaining({ exercicio_id: 'ex-1', ordem: 1 }),
              expect.objectContaining({ exercicio_id: 'ex-2', ordem: 2 }),
            ]),
          },
          historico: {
            create: expect.objectContaining({
              status_anterior: TreinoStatus.CADASTRADO,
              status_novo: TreinoStatus.CADASTRADO,
              ator_id: 'prof-1',
              ator_tipo: TreinoAtor.PROFESSOR,
            }),
          },
        }),
      })
    )
    expect(result).toEqual(treinoClonado)
  })

  it('lança NotFoundError se treino fonte não existe', async () => {
    mockPrisma.treino.findUnique.mockResolvedValue(null)

    await expect(clonarTreino('inexistente', 'aluno-2', 'prof-1', TreinoAtor.PROFESSOR))
      .rejects.toThrow(NotFoundError)
  })

  it('lança TenantAccessError se treino fonte é de outro professor', async () => {
    const treinoOutroProf = { ...treinoFonte, aluno: { professor_id: 'prof-99', academia_id: 'acad-99' } }
    mockPrisma.treino.findUnique.mockResolvedValue(treinoOutroProf)
    mockPrisma.aluno.findUnique.mockResolvedValue(alunoDestino)

    await expect(clonarTreino('treino-fonte', 'aluno-2', 'prof-1', TreinoAtor.PROFESSOR))
      .rejects.toThrow(TenantAccessError)
  })

  it('lança NotFoundError se aluno destino não existe', async () => {
    mockPrisma.treino.findUnique.mockResolvedValue(treinoFonte)
    mockPrisma.aluno.findUnique.mockResolvedValue(null)

    await expect(clonarTreino('treino-fonte', 'inexistente', 'prof-1', TreinoAtor.PROFESSOR))
      .rejects.toThrow(NotFoundError)
  })

  it('lança TenantAccessError se aluno destino é de outro professor', async () => {
    mockPrisma.treino.findUnique.mockResolvedValue(treinoFonte)
    mockPrisma.aluno.findUnique.mockResolvedValue(alunoOutroProf)

    await expect(clonarTreino('treino-fonte', 'aluno-3', 'prof-1', TreinoAtor.PROFESSOR))
      .rejects.toThrow(TenantAccessError)
  })
})
