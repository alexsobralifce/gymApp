import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Resumo diário (RESUMO_DIARIO) ───────────────────────────────────────────
// Unit tests do worker `resumo-diario` com Prisma e sendDualPush mockados
// (mesmo padrão de EvolucaoMensalMetaSemanal.test.ts).

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      notificacao: { findMany: vi.fn() },
      aluno: { findMany: vi.fn() },
      usuario: { update: vi.fn() },
    },
  }
})

const { sendDualPushMock } = vi.hoisted(() => {
  return { sendDualPushMock: vi.fn().mockResolvedValue(undefined) }
})

vi.mock('../../src/infrastructure/database/prisma.js', () => ({
  prisma: mockPrisma,
}))

vi.mock('../../src/infrastructure/push/sendDualPush.js', () => ({
  sendDualPush: sendDualPushMock,
}))

import { handleResumoDiario } from '../../src/application/workers/gymWorkers.js'

const JOB = {} as any

function notif(id: string, alunoId: string, tipo: string, criadoEm: Date) {
  return { id, aluno_id: alunoId, tipo, criado_em: criadoEm }
}

function usuarioResumoDiario(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    nome: 'Ana',
    expo_push_token: 'ExponentPushToken[teste]',
    web_push_subscription: null,
    preferencias_notificacao: {
      lembreteTreino: true,
      social: true,
      motivacional: true,
      conquistas: true,
      horarioSilencioso: { ativo: false, inicio: '22:00', fim: '07:00' },
      frequencia: 'RESUMO_DIARIO',
      ...overrides,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('handleResumoDiario — digest diário para frequência RESUMO_DIARIO', () => {
  it('compõe digest com contagens/labels corretos e registra marcador (sem marcar lida)', async () => {
    const agora = new Date()
    mockPrisma.notificacao.findMany.mockResolvedValue([
      notif('n1', 'aluno-1', 'NOVO_TREINO', agora),
      notif('n2', 'aluno-1', 'NOVO_TREINO', agora),
      notif('n3', 'aluno-1', 'SOCIAL_CURTIDA', agora),
    ])
    mockPrisma.aluno.findMany.mockResolvedValue([
      { id: 'aluno-1', usuario: usuarioResumoDiario() },
    ])
    mockPrisma.usuario.update.mockResolvedValue({})

    await handleResumoDiario(JOB)

    expect(sendDualPushMock).toHaveBeenCalledTimes(1)
    const [usuario, titulo, corpo, data] = sendDualPushMock.mock.calls[0]
    expect(usuario.id).toBe('user-1')
    expect(titulo).toBe('Seu resumo do dia')
    expect(corpo).toBe('2 lembretes de treino e 1 novidade social esperam por você.')
    expect(data).toEqual({ url: '/' })

    // Decisão de design: linhas NÃO são marcadas como lidas (a lista in-app
    // filtra lida:false). O dedupe é feito pelo marcador ultimoResumoEnviadoEm
    // persistido em preferencias_notificacao.
    expect(mockPrisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        preferencias_notificacao: expect.objectContaining({
          frequencia: 'RESUMO_DIARIO',
          ultimoResumoEnviadoEm: expect.any(String),
        }),
      },
    })
  })

  it('usuário IMEDIATA não é incluído no digest', async () => {
    mockPrisma.notificacao.findMany.mockResolvedValue([
      notif('n1', 'aluno-1', 'NOVO_TREINO', new Date()),
    ])
    mockPrisma.aluno.findMany.mockResolvedValue([
      { id: 'aluno-1', usuario: usuarioResumoDiario({ frequencia: 'IMEDIATA' }) },
    ])

    await handleResumoDiario(JOB)

    expect(sendDualPushMock).not.toHaveBeenCalled()
    expect(mockPrisma.usuario.update).not.toHaveBeenCalled()
  })

  it('RESUMO_DIARIO em horário silencioso no horário de envio (19:00) é pulado', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1, 19, 0, 0)) // 19:00 — janela do digest

    mockPrisma.notificacao.findMany.mockResolvedValue([
      notif('n1', 'aluno-1', 'NOVO_TREINO', new Date(2026, 0, 1, 12, 0, 0)),
    ])
    mockPrisma.aluno.findMany.mockResolvedValue([
      {
        id: 'aluno-1',
        usuario: usuarioResumoDiario({
          horarioSilencioso: { ativo: true, inicio: '18:00', fim: '23:00' },
        }),
      },
    ])

    try {
      await handleResumoDiario(JOB)
    } finally {
      vi.useRealTimers()
    }

    expect(sendDualPushMock).not.toHaveBeenCalled()
    expect(mockPrisma.usuario.update).not.toHaveBeenCalled()
  })

  it('sem notificações não lidas hoje → nenhum push nem consulta de alunos', async () => {
    mockPrisma.notificacao.findMany.mockResolvedValue([])

    await handleResumoDiario(JOB)

    expect(sendDualPushMock).not.toHaveBeenCalled()
    expect(mockPrisma.aluno.findMany).not.toHaveBeenCalled()
    expect(mockPrisma.usuario.update).not.toHaveBeenCalled()
  })

  it('não re-envia notificações já cobertas pelo último digest do dia (marcador)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 26, 19, 0, 0)) // 19:00 de 26/08/2026

    mockPrisma.notificacao.findMany.mockResolvedValue([
      notif('n1', 'aluno-1', 'NOVO_TREINO', new Date(2026, 7, 26, 10, 0, 0)), // antes do marcador
    ])
    mockPrisma.aluno.findMany.mockResolvedValue([
      {
        id: 'aluno-1',
        usuario: usuarioResumoDiario({ ultimoResumoEnviadoEm: new Date(2026, 7, 26, 12, 0, 0).toISOString() }),
      },
    ])

    try {
      await handleResumoDiario(JOB)
    } finally {
      vi.useRealTimers()
    }

    expect(sendDualPushMock).not.toHaveBeenCalled()
    expect(mockPrisma.usuario.update).not.toHaveBeenCalled()
  })

  it('notificações criadas após o marcador no mesmo dia entram no digest', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 26, 19, 0, 0))

    mockPrisma.notificacao.findMany.mockResolvedValue([
      notif('n1', 'aluno-1', 'NOVO_TREINO', new Date(2026, 7, 26, 10, 0, 0)),
      notif('n2', 'aluno-1', 'NOVO_TREINO', new Date(2026, 7, 26, 14, 0, 0)),
    ])
    mockPrisma.aluno.findMany.mockResolvedValue([
      {
        id: 'aluno-1',
        usuario: usuarioResumoDiario({ ultimoResumoEnviadoEm: new Date(2026, 7, 26, 8, 0, 0).toISOString() }),
      },
    ])

    try {
      await handleResumoDiario(JOB)
    } finally {
      vi.useRealTimers()
    }

    expect(sendDualPushMock).toHaveBeenCalledTimes(1)
    const [, titulo, corpo] = sendDualPushMock.mock.calls[0]
    expect(titulo).toBe('Seu resumo do dia')
    expect(corpo).toBe('2 lembretes de treino esperam por você.')
  })
})
