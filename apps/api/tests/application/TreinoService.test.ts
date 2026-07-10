import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TreinoStatus, TreinoAtor } from '@prisma/client'

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      aluno: { findUnique: vi.fn() },
      treino: { create: vi.fn() },
    },
  }
})

vi.mock('../../src/infrastructure/database/prisma.js', () => ({
  prisma: mockPrisma,
}))

import { criarTreinoAutogestao } from '../../src/application/usecases/treino/TreinoService.js'
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
