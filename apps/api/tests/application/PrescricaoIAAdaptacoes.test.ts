import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma, mockListarPlanos } = vi.hoisted(() => {
  return {
    mockPrisma: {
      aluno: { findUnique: vi.fn() },
      treino: { findMany: vi.fn() },
    },
    mockListarPlanos: vi.fn(),
  }
})

vi.mock('../../src/infrastructure/database/prisma.js', () => ({
  prisma: mockPrisma,
}))

vi.mock('../../src/application/usecases/planos/PlanoService.js', () => ({
  listarPlanos: mockListarPlanos,
  adotarPlano: vi.fn(),
}))

import { gerarTreinoIA } from '../../src/application/usecases/treino/PrescricaoIAService.js'

const ALUNO = { id: 'aluno-1', sexo: 'MASCULINO', restricoes: [] }

type Overrides = Record<string, unknown> & {
  ordem?: number
  series?: number
  carga_sugerida_kg?: number | null
}

function fazerExercicio(overrides: Overrides = {}) {
  return {
    id: `ex-${overrides.ordem ?? 1}`,
    sessao_id: 'sessao-1',
    exercicio_id: `exercicio-${overrides.ordem ?? 1}`,
    ordem: overrides.ordem ?? 1,
    tipo: 'PRINCIPAL',
    series: overrides.series ?? 3,
    repeticoes_min: 8,
    repeticoes_max: 12,
    carga_sugerida_kg: overrides.carga_sugerida_kg ?? null,
    restricoes_incompativeis: [],
    alternativo_id: null,
    exercicio: {
      id: `exercicio-${overrides.ordem ?? 1}`,
      nome: `Exercicio ${overrides.ordem ?? 1}`,
      grupo_muscular: 'Peito',
      equipamento: 'Barra',
      gif_url: null,
      imagem_url: null,
    },
    alternativo: null,
    ...overrides,
  }
}

function fazerPlano() {
  return [
    {
      id: 'plano-1',
      codigo: 'FULLBODY_INICIANTE_2X',
      nome: 'Full Body Iniciante',
      descricao: null,
      objetivo: 'HIPERTROFIA',
      nivel: 'INICIANTE',
      sexo_alvo: 'AMBOS',
      dias_por_semana: 2,
      split_tipo: 'FULL_BODY',
      ativo: true,
      criado_em: new Date(),
      sessoes: [
        {
          id: 'sessao-1',
          plano_id: 'plano-1',
          nome: 'Treino A',
          dia_label: 'A',
          ordem: 1,
          exercicios: [
            fazerExercicio({ ordem: 1, series: 3, carga_sugerida_kg: 30 }),
            fazerExercicio({ ordem: 2, series: 4, carga_sugerida_kg: null }),
            fazerExercicio({ ordem: 3, series: 2, carga_sugerida_kg: 20 }),
          ],
        },
      ],
    },
  ]
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.aluno.findUnique.mockResolvedValue(ALUNO)
  mockPrisma.treino.findMany.mockResolvedValue([])
  mockListarPlanos.mockResolvedValue(fazerPlano())
})

interface ResultadoGeracao {
  adaptacoes: string[]
  sessoes: Array<{
    exercicios: Array<{ series: number; carga_sugerida_kg: number | null }>
  }>
}

async function gerarComFeedback(feedback: string[]): Promise<ResultadoGeracao> {
  mockPrisma.treino.findMany.mockResolvedValue(
    feedback.map((avaliacao_dificuldade) => ({ avaliacao_dificuldade })),
  )
  return (await gerarTreinoIA('aluno-1', {
    objetivo: 'HIPERTROFIA',
    nivel: 'INICIANTE',
    diasPorSemana: 2,
  })) as ResultadoGeracao
}

// ─── UX-007: Adaptações explicáveis na geração (feedback-loop) ────────────────
describe('gerarTreinoIA — adaptações por feedback (UX-007)', () => {
  it('busca as últimas avaliações de dificuldade finalizadas do aluno', async () => {
    await gerarComFeedback(['MUITO_INTENSO', 'MUITO_INTENSO'])

    expect(mockPrisma.treino.findMany).toHaveBeenCalledWith({
      where: { aluno_id: 'aluno-1', avaliacao_dificuldade: { not: null } },
      orderBy: { finalizado_em: 'desc' },
      take: 5,
      select: { avaliacao_dificuldade: true },
    })
  })

  it('regra 1: [MUITO_INTENSO, MUITO_INTENSO] reduz 1 série por exercício (min 2)', async () => {
    const res = await gerarComFeedback(['MUITO_INTENSO', 'MUITO_INTENSO'])

    expect(res.adaptacoes).toHaveLength(1)
    expect(res.adaptacoes[0]).toContain('esforço muito alto')
    // 3 → 2
    expect(res.sessoes[0].exercicios[0].series).toBe(2)
    // 4 → 3
    expect(res.sessoes[0].exercicios[1].series).toBe(3)
    // 2 → 2 (respeita o mínimo de 2 séries)
    expect(res.sessoes[0].exercicios[2].series).toBe(2)
  })

  it('regra 1: NÃO dispara com [MUITO_INTENSO, INTENSO]', async () => {
    const res = await gerarComFeedback(['MUITO_INTENSO', 'INTENSO'])

    expect(res.adaptacoes).toEqual([])
    expect(res.sessoes[0].exercicios[0].series).toBe(3)
    expect(res.sessoes[0].exercicios[1].series).toBe(4)
  })

  it('regra 2: [FACIL, FACIL, FACIL] aumenta carga (+5% arredondado p/ 2,5kg) e mantém null', async () => {
    const res = await gerarComFeedback(['FACIL', 'FACIL', 'FACIL'])

    expect(res.adaptacoes).toHaveLength(1)
    expect(res.adaptacoes[0]).toContain('aumento de carga')
    // 30 × 1.05 = 31.5 → ceil(31.5 / 2.5) × 2.5 = 32.5
    expect(res.sessoes[0].exercicios[0].carga_sugerida_kg).toBe(32.5)
    // 20 × 1.05 = 21 → ceil(21 / 2.5) × 2.5 = 22.5
    expect(res.sessoes[0].exercicios[2].carga_sugerida_kg).toBe(22.5)
    // null permanece null
    expect(res.sessoes[0].exercicios[1].carga_sugerida_kg).toBeNull()
    // séries não são alteradas pela regra 2
    expect(res.sessoes[0].exercicios[0].series).toBe(3)
  })

  it('regra 2: NÃO dispara com [FACIL, FACIL, MODERADO]', async () => {
    const res = await gerarComFeedback(['FACIL', 'FACIL', 'MODERADO'])

    expect(res.adaptacoes).toEqual([])
    expect(res.sessoes[0].exercicios[0].carga_sugerida_kg).toBe(30)
    expect(res.sessoes[0].exercicios[0].series).toBe(3)
  })

  it('sem histórico de avaliações → nenhuma adaptação e array vazio', async () => {
    const res = await gerarComFeedback([])

    expect(res.adaptacoes).toEqual([])
    expect(res.sessoes[0].exercicios[0].series).toBe(3)
    expect(res.sessoes[0].exercicios[0].carga_sugerida_kg).toBe(30)
  })
})
