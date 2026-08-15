import { TreinoStatus, TreinoAtor } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import {
  NotFoundError,
  TenantAccessError,
  ValidationError,
  ConflictError,
} from '../../../domain/errors/AppError.js'
import { assertTransicaoValida } from '../../../domain/entities/TreinoStateMachine.js'

function execucoesDaSessao(iniciadoEm: Date | null | undefined) {
  if (!iniciadoEm) return {}
  return { registrado_em: { gte: iniciadoEm } }
}

// ─── UC-11: Criar ficha de treino ─────────────────────────────────────────────

export async function criarTreino(professorId: string, input: {
  alunoId: string
  nome: string
  diasSemana: number[]
  exercicios: Array<{
    exercicioId: string
    ordem: number
    series: number
    repeticoes: number
    cargaSugeridaKg?: number
  }>
}) {
  // Verifica que o aluno pertence ao professor (isolamento de tenant)
  const aluno = await prisma.aluno.findUnique({ where: { id: input.alunoId } })
  if (!aluno) throw new NotFoundError('Aluno')
  if (aluno.professor_id !== professorId) throw new TenantAccessError()

  return prisma.treino.create({
    data: {
      aluno_id: input.alunoId,
      nome: input.nome,
      dias_semana: input.diasSemana,
      status: TreinoStatus.CADASTRADO,
      exercicios: {
        create: input.exercicios.map((e) => ({
          exercicio_id: e.exercicioId,
          ordem: e.ordem,
          series: e.series,
          repeticoes: e.repeticoes,
          carga_sugerida_kg: e.cargaSugeridaKg,
        })),
      },
      historico: {
        create: {
          status_anterior: TreinoStatus.CADASTRADO,
          status_novo: TreinoStatus.CADASTRADO,
          ator_id: professorId,
          ator_tipo: TreinoAtor.PROFESSOR,
        },
      },
    },
    include: { exercicios: true },
  })
}

// ─── UC-18: Autogerenciar treino (aluno sem professor) ──────────────────────

export async function criarTreinoAutogestao(alunoId: string, input: {
  nome: string
  diasSemana: number[]
  exercicios: Array<{
    exercicioId: string
    ordem: number
    series: number
    repeticoes: number
    cargaSugeridaKg?: number
  }>
}) {
  const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } })
  if (!aluno) throw new NotFoundError('Aluno')

  assertTransicaoValida(TreinoStatus.CADASTRADO, TreinoStatus.ACEITO, TreinoAtor.ALUNO)

  return prisma.treino.create({
    data: {
      aluno_id: alunoId,
      nome: input.nome,
      dias_semana: input.diasSemana,
      status: TreinoStatus.ACEITO,
      exercicios: {
        create: input.exercicios.map((e) => ({
          exercicio_id: e.exercicioId,
          ordem: e.ordem,
          series: e.series,
          repeticoes: e.repeticoes,
          carga_sugerida_kg: e.cargaSugeridaKg,
        })),
      },
      historico: {
        create: {
          status_anterior: TreinoStatus.CADASTRADO,
          status_novo: TreinoStatus.ACEITO,
          ator_id: alunoId,
          ator_tipo: TreinoAtor.ALUNO,
        },
      },
    },
    include: { exercicios: true },
  })
}

// ─── UC-13: Enviar treino para aceite ────────────────────────────────────────

export async function enviarTreinoParaAceite(treinoId: string, professorId: string) {
  const treino = await prisma.treino.findUnique({ where: { id: treinoId } })
  if (!treino) throw new NotFoundError('Treino')

  // Garante que o professor tem acesso ao aluno
  const aluno = await prisma.aluno.findUnique({ where: { id: treino.aluno_id } })
  if (aluno?.professor_id !== professorId) throw new TenantAccessError()

  assertTransicaoValida(treino.status, TreinoStatus.ENVIADO, TreinoAtor.PROFESSOR)

  return prisma.$transaction(async (tx) => {
    const atualizado = await tx.treino.update({
      where: { id: treinoId },
      data: { status: TreinoStatus.ENVIADO },
    })
    await tx.treinoHistorico.create({
      data: {
        treino_id: treinoId,
        status_anterior: treino.status,
        status_novo: TreinoStatus.ENVIADO,
        ator_id: professorId,
        ator_tipo: TreinoAtor.PROFESSOR,
      },
    })
    return atualizado
  })
}

// ─── UC-19: Aceitar / Recusar treino (Aluno) ────────────────────────────────

export async function responderTreino(treinoId: string, alunoId: string, acao: 'ACEITAR' | 'RECUSAR') {
  const treino = await prisma.treino.findUnique({ where: { id: treinoId } })
  if (!treino) throw new NotFoundError('Treino')
  if (treino.aluno_id !== alunoId) throw new TenantAccessError()

  const novoStatus = acao === 'ACEITAR' ? TreinoStatus.ACEITO : TreinoStatus.RECUSADO
  assertTransicaoValida(treino.status, novoStatus, TreinoAtor.ALUNO)

  return prisma.$transaction(async (tx) => {
    const atualizado = await tx.treino.update({
      where: { id: treinoId },
      data: { status: novoStatus },
    })
    await tx.treinoHistorico.create({
      data: {
        treino_id: treinoId,
        status_anterior: treino.status,
        status_novo: novoStatus,
        ator_id: alunoId,
        ator_tipo: TreinoAtor.ALUNO,
      },
    })
    return atualizado
  })
}

// ─── UC-20: Iniciar treino ────────────────────────────────────────────────────

export async function buscarUltimasCargas(alunoId: string, exercicioIds: string[]) {
  if (exercicioIds.length === 0) return [] as Array<{
    exercicio_id: string
    serie_numero: number
    carga_kg: number
    repeticoes: number
  }>

  const recent = await prisma.execucaoExercicio.findMany({
    where: {
      exercicio_id: { in: exercicioIds },
      treino: { aluno_id: alunoId },
    },
    orderBy: { registrado_em: 'desc' },
    take: 400,
    select: {
      exercicio_id: true,
      serie_numero: true,
      carga_kg: true,
      repeticoes: true,
    },
  })

  const seen = new Set<string>()
  const ultimas: Array<{
    exercicio_id: string
    serie_numero: number
    carga_kg: number
    repeticoes: number
  }> = []

  for (const row of recent) {
    const key = `${row.exercicio_id}-${row.serie_numero}`
    if (seen.has(key)) continue
    seen.add(key)
    ultimas.push(row)
  }
  return ultimas
}

async function carregarTreinoComSessao(treinoId: string, iniciadoEm?: Date | null) {
  const treino = await prisma.treino.findUnique({
    where: { id: treinoId },
    include: {
      exercicios: { include: { exercicio: true }, orderBy: { ordem: 'asc' } },
      execucoes: {
        where: execucoesDaSessao(iniciadoEm),
        orderBy: { registrado_em: 'asc' },
      },
    },
  })
  if (!treino) throw new NotFoundError('Treino')

  const exercicioIds = treino.exercicios.map((e) => e.exercicio_id)
  const ultimas_cargas = await buscarUltimasCargas(treino.aluno_id, exercicioIds)
  return { ...treino, ultimas_cargas }
}

export async function iniciarTreino(treinoId: string, alunoId: string) {
  const treino = await prisma.treino.findUnique({ where: { id: treinoId } })
  if (!treino) throw new NotFoundError('Treino')
  if (treino.aluno_id !== alunoId) throw new TenantAccessError()

  // Retoma sessão em andamento sem resetar timer/iniciado_em
  if (treino.status === TreinoStatus.EM_EXECUCAO) {
    return carregarTreinoComSessao(treinoId, treino.iniciado_em)
  }

  if (treino.status === TreinoStatus.CONCLUIDO) {
    assertTransicaoValida(treino.status, TreinoStatus.ACEITO, TreinoAtor.SISTEMA)
  }

  assertTransicaoValida(
    treino.status === TreinoStatus.CONCLUIDO ? TreinoStatus.ACEITO : treino.status,
    TreinoStatus.EM_EXECUCAO,
    TreinoAtor.ALUNO,
  )

  const iniciadoEm = new Date()

  await prisma.$transaction(async (tx) => {
    if (treino.status === TreinoStatus.CONCLUIDO) {
      await tx.treino.update({
        where: { id: treinoId },
        data: { status: TreinoStatus.ACEITO, iniciado_em: null, finalizado_em: null },
      })
      await tx.treinoHistorico.create({
        data: {
          treino_id: treinoId,
          status_anterior: TreinoStatus.CONCLUIDO,
          status_novo: TreinoStatus.ACEITO,
          ator_id: 'SISTEMA',
          ator_tipo: TreinoAtor.SISTEMA,
        },
      })
    }

    await tx.treino.update({
      where: { id: treinoId },
      data: {
        status: TreinoStatus.EM_EXECUCAO,
        iniciado_em: iniciadoEm,
        ultima_atividade_em: iniciadoEm,
        notificado_inatividade_em: null,
        notificado_longo_em: null,
      },
    })
    await tx.treinoHistorico.create({
      data: {
        treino_id: treinoId,
        status_anterior: treino.status === TreinoStatus.CONCLUIDO ? TreinoStatus.ACEITO : treino.status,
        status_novo: TreinoStatus.EM_EXECUCAO,
        ator_id: alunoId,
        ator_tipo: TreinoAtor.ALUNO,
      },
    })
  })

  return carregarTreinoComSessao(treinoId, iniciadoEm)
}

// ─── UC-Cancel: Cancelar/Abandonar treino em execução (reset de timer e status) ─

export async function cancelarTreino(treinoId: string, alunoId: string) {
  const treino = await prisma.treino.findUnique({ where: { id: treinoId } })
  if (!treino) throw new NotFoundError('Treino')
  if (treino.aluno_id !== alunoId) throw new TenantAccessError()

  if (treino.status !== TreinoStatus.EM_EXECUCAO) {
    return carregarTreinoComSessao(treinoId)
  }

  assertTransicaoValida(treino.status, TreinoStatus.ACEITO, TreinoAtor.ALUNO)

  const iniciadoEm = treino.iniciado_em

  await prisma.$transaction(async (tx) => {
    // 1. Limpa execuções registradas durante essa sessão cancelada
    if (iniciadoEm) {
      await tx.execucaoExercicio.deleteMany({
        where: {
          treino_id: treinoId,
          registrado_em: { gte: iniciadoEm },
        },
      })
    }

    // 2. Retorna status para ACEITO e limpa timestamps de sessão
    await tx.treino.update({
      where: { id: treinoId },
      data: {
        status: TreinoStatus.ACEITO,
        iniciado_em: null,
        finalizado_em: null,
        ultima_atividade_em: null,
        notificado_inatividade_em: null,
        notificado_longo_em: null,
      },
    })

    // 3. Registra log em treinoHistorico
    await tx.treinoHistorico.create({
      data: {
        treino_id: treinoId,
        status_anterior: TreinoStatus.EM_EXECUCAO,
        status_novo: TreinoStatus.ACEITO,
        ator_id: alunoId,
        ator_tipo: TreinoAtor.ALUNO,
      },
    })
  })

  return carregarTreinoComSessao(treinoId)
}

// ─── UC-22: Registrar carga/repetições ───────────────────────────────────────


export async function registrarExecucao(treinoId: string, alunoId: string, input: {
  exercicioId: string
  serieNumero: number
  repeticoes: number
  cargaKg: number
}) {
  const treino = await prisma.treino.findUnique({
    where: { id: treinoId },
    include: { exercicios: true },
  })
  if (!treino) throw new NotFoundError('Treino')
  if (treino.aluno_id !== alunoId) throw new TenantAccessError()

  if (treino.status !== TreinoStatus.EM_EXECUCAO) {
    throw new ValidationError('Só é possível registrar séries com o treino em execução')
  }

  const treinoExercicio = treino.exercicios.find((e) => e.exercicio_id === input.exercicioId)
  if (!treinoExercicio) {
    throw new ValidationError('Exercício não pertence a este treino')
  }
  if (input.serieNumero < 1 || input.serieNumero > treinoExercicio.series) {
    throw new ValidationError(`Série inválida (máx. ${treinoExercicio.series})`)
  }
  if (input.repeticoes < 1) {
    throw new ValidationError('Repetições devem ser no mínimo 1')
  }
  if (input.cargaKg < 0) {
    throw new ValidationError('Carga não pode ser negativa')
  }

  const jaRegistrada = await prisma.execucaoExercicio.findFirst({
    where: {
      treino_id: treinoId,
      exercicio_id: input.exercicioId,
      serie_numero: input.serieNumero,
      ...execucoesDaSessao(treino.iniciado_em),
    },
  })
  if (jaRegistrada) {
    throw new ConflictError('Série já registrada nesta sessão')
  }

  const agora = new Date()
  const [execucao] = await prisma.$transaction([
    prisma.execucaoExercicio.create({
      data: {
        treino_id: treinoId,
        exercicio_id: input.exercicioId,
        serie_numero: input.serieNumero,
        repeticoes: input.repeticoes,
        carga_kg: input.cargaKg,
      },
    }),
    prisma.treino.update({
      where: { id: treinoId },
      data: {
        ultima_atividade_em: agora,
        // permite novo lembrete se ficar ocioso de novo
        notificado_inatividade_em: null,
      },
    }),
  ])
  return execucao
}

function calcularIdadeAnos(dataNascimento?: Date | string | null): number {
  if (!dataNascimento) return 30
  const today = new Date()
  const birth = new Date(dataNascimento)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age > 0 ? age : 30
}

/**
 * Fórmula fisiológica de Keytel et al. para cálculo de gasto calórico baseado em FC média.
 */
function calcularCaloriasKeytelBackend({
  bpm,
  pesoKg,
  idade,
  sexo,
  duracaoSegundos,
}: {
  bpm: number
  pesoKg?: number | null
  idade?: number | null
  sexo?: string | null
  duracaoSegundos: number
}): number {
  const p = pesoKg && pesoKg > 0 ? pesoKg : 75
  const i = idade && idade > 0 ? idade : 30
  const minutos = duracaoSegundos / 60
  if (minutos <= 0) return 0

  let calPerMin = 0
  if (sexo === 'FEMININO') {
    calPerMin = (-20.4022 + 0.4472 * bpm - 0.1263 * p + 0.074 * i) / 4.184
  } else {
    calPerMin = (-55.0969 + 0.6309 * bpm + 0.1988 * p + 0.2017 * i) / 4.184
  }

  const result = Math.max(0, calPerMin * minutos)
  return parseFloat(result.toFixed(1))
}

// ─── UC-23: Finalizar treino ──────────────────────────────────────────────────

export async function finalizarTreino(
  treinoId: string,
  alunoId: string,
  avaliacao?: string,
  caloriasQueimadas?: number,
  frequenciaCardiacaMedia?: number,
  frequenciaCardiacaMaxima?: number,
) {
  const treino = await prisma.treino.findUnique({ where: { id: treinoId } })
  if (!treino) throw new NotFoundError('Treino')
  if (treino.aluno_id !== alunoId) throw new TenantAccessError()

  assertTransicaoValida(treino.status, TreinoStatus.CONCLUIDO, TreinoAtor.ALUNO)

  const finalizadoEm = new Date()
  const duracaoSegundos = treino.iniciado_em
    ? Math.max(0, Math.round((finalizadoEm.getTime() - treino.iniciado_em.getTime()) / 1000))
    : null

  // ─── Busca eventos de telemetria / batimentos do relógio durante a sessão ─────
  let calcCalorias = caloriasQueimadas ?? null
  let calcFcMedia = frequenciaCardiacaMedia ?? null
  let calcFcMax = frequenciaCardiacaMaxima ?? null

  try {
    if (treino.iniciado_em && duracaoSegundos && duracaoSegundos > 0) {
      const eventos = await prisma.wearableEvento.findMany({
        where: {
          aluno_id: alunoId,
          recebido_em: {
            gte: treino.iniciado_em,
            lte: finalizadoEm,
          },
        },
        orderBy: { recebido_em: 'asc' },
      })

      const bpms: number[] = []
      let maxCaloriasEvento = 0
      let encontrouCaloriasEvento = false

      for (const ev of eventos) {
        const payload: any = ev.payload_raw
        const hr = payload?.heartRateAvg || payload?.data?.heartRateAvg || payload?.data?.value
        if (typeof hr === 'number' && hr > 30 && hr < 240) {
          bpms.push(hr)
        }
        const cals = payload?.activeCalories || payload?.data?.activeCalories
        if (typeof cals === 'number' && cals > 0) {
          maxCaloriasEvento = Math.max(maxCaloriasEvento, cals)
          encontrouCaloriasEvento = true
        }
      }

      const aluno = await prisma.aluno.findUnique({
        where: { id: alunoId },
        select: { data_nascimento: true, peso_kg: true, sexo: true },
      })

      if (bpms.length > 0) {
        const avgBpm = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length)
        const maxBpm = Math.max(...bpms)
        calcFcMedia = avgBpm
        calcFcMax = maxBpm

        const idade = calcularIdadeAnos(aluno?.data_nascimento)
        const keytelCal = calcularCaloriasKeytelBackend({
          bpm: avgBpm,
          pesoKg: aluno?.peso_kg,
          idade,
          sexo: aluno?.sexo,
          duracaoSegundos,
        })

        calcCalorias = encontrouCaloriasEvento ? maxCaloriasEvento : keytelCal
      }
    }
  } catch (err) {
    // Fallback gracioso para os valores passados pelo frontend
  }

  // Detecção de "primeiro treino": conta conclusões anteriores (via treino_historico,
  // pois treinos.status recicla CONCLUIDO → ACEITO) ANTES da atualização.
  const conclusoesAnteriores = await prisma.treinoHistorico.count({
    where: {
      treino: { aluno_id: alunoId },
      status_novo: TreinoStatus.CONCLUIDO,
    },
  })
  const primeiroTreino = conclusoesAnteriores === 0

  const treinoAtualizado = await prisma.$transaction(async (tx) => {
    await tx.treino.update({
      where: { id: treinoId },
      data: {
        status: TreinoStatus.CONCLUIDO,
        finalizado_em: finalizadoEm,
        ...(avaliacao ? { avaliacao_dificuldade: avaliacao } : {}),
      },
    })
    await tx.treinoHistorico.create({
      data: {
        treino_id: treinoId,
        status_anterior: treino.status,
        status_novo: TreinoStatus.CONCLUIDO,
        ator_id: alunoId,
        ator_tipo: TreinoAtor.ALUNO,
        duracao_segundos: duracaoSegundos,
        calorias_queimadas: calcCalorias,
        frequencia_cardiaca_media: calcFcMedia,
        frequencia_cardiaca_maxima: calcFcMax,
      },
    })

    // Recicla ficha para reuso (CONCLUIDO → ACEITO), preservando avaliacao
    await tx.treino.update({
      where: { id: treinoId },
      data: {
        status: TreinoStatus.ACEITO,
        iniciado_em: null,
        finalizado_em: null,
        ultima_atividade_em: null,
        notificado_inatividade_em: null,
        notificado_longo_em: null,
      },
    })
    await tx.treinoHistorico.create({
      data: {
        treino_id: treinoId,
        status_anterior: TreinoStatus.CONCLUIDO,
        status_novo: TreinoStatus.ACEITO,
        ator_id: 'SISTEMA',
        ator_tipo: TreinoAtor.SISTEMA,
      },
    })

    return tx.treino.findUnique({
      where: { id: treinoId },
      include: { exercicios: { include: { exercicio: true }, orderBy: { ordem: 'asc' } } },
    })
  })

  return { ...treinoAtualizado, primeiroTreino }
}

// ─── Clonar Treino ─────────────────────────────────────────────────────────────

export async function clonarTreino(treinoId: string, alunoDestinoId: string, atorId: string, atorTipo: TreinoAtor) {
  const treino = await prisma.treino.findUnique({
    where: { id: treinoId },
    include: {
      exercicios: {
        orderBy: { ordem: 'asc' },
      },
      aluno: { select: { professor_id: true, academia_id: true } },
    },
  })
  if (!treino) throw new NotFoundError('Treino')

  if (atorTipo === TreinoAtor.PROFESSOR) {
    if (treino.aluno.professor_id !== atorId) throw new TenantAccessError()
  } else if (atorTipo === TreinoAtor.ACADEMIA) {
    if (treino.aluno.academia_id !== atorId) throw new TenantAccessError()
  }

  const alunoDestino = await prisma.aluno.findUnique({ where: { id: alunoDestinoId } })
  if (!alunoDestino) throw new NotFoundError('Aluno destino')

  if (atorTipo === TreinoAtor.PROFESSOR) {
    if (alunoDestino.professor_id !== atorId) throw new TenantAccessError()
  } else if (atorTipo === TreinoAtor.ACADEMIA) {
    if (alunoDestino.academia_id !== atorId) throw new TenantAccessError()
  }

  return prisma.treino.create({
    data: {
      aluno_id: alunoDestinoId,
      nome: treino.nome,
      dias_semana: treino.dias_semana,
      status: TreinoStatus.CADASTRADO,
      exercicios: {
        create: treino.exercicios.map((e) => ({
          exercicio_id: e.exercicio_id,
          ordem: e.ordem,
          series: e.series,
          repeticoes: e.repeticoes,
          carga_sugerida_kg: e.carga_sugerida_kg,
        })),
      },
      historico: {
        create: {
          status_anterior: TreinoStatus.CADASTRADO,
          status_novo: TreinoStatus.CADASTRADO,
          ator_id: atorId,
          ator_tipo: atorTipo,
        },
      },
    },
    include: { exercicios: true },
  })
}

export async function clonarTreinoEmLote(treinoId: string, alunoIds: string[], atorId: string, atorTipo: TreinoAtor) {
  const treino = await prisma.treino.findUnique({
    where: { id: treinoId },
    include: {
      exercicios: { orderBy: { ordem: 'asc' } },
      aluno: { select: { professor_id: true, academia_id: true } },
    },
  })
  if (!treino) throw new NotFoundError('Treino')

  if (atorTipo === TreinoAtor.PROFESSOR) {
    if (treino.aluno.professor_id !== atorId) throw new TenantAccessError()
  } else if (atorTipo === TreinoAtor.ACADEMIA) {
    if (treino.aluno.academia_id !== atorId) throw new TenantAccessError()
  }

  const alunos = await prisma.aluno.findMany({
    where: { id: { in: alunoIds } },
  })

  if (alunos.length !== alunoIds.length) throw new NotFoundError('Um ou mais alunos destino')

  for (const a of alunos) {
    if (atorTipo === TreinoAtor.PROFESSOR) {
      if (a.professor_id !== atorId) throw new TenantAccessError()
    } else if (atorTipo === TreinoAtor.ACADEMIA) {
      if (a.academia_id !== atorId) throw new TenantAccessError()
    }
  }

  return prisma.$transaction(async (tx) => {
    const treinos = []

    for (const alunoId of alunoIds) {
      const novoTreino = await tx.treino.create({
        data: {
          aluno_id: alunoId,
          nome: treino.nome,
          dias_semana: treino.dias_semana,
          status: TreinoStatus.CADASTRADO,
          exercicios: {
            create: treino.exercicios.map((e) => ({
              exercicio_id: e.exercicio_id,
              ordem: e.ordem,
              series: e.series,
              repeticoes: e.repeticoes,
              carga_sugerida_kg: e.carga_sugerida_kg,
            })),
          },
          historico: {
            create: {
              status_anterior: TreinoStatus.CADASTRADO,
              status_novo: TreinoStatus.CADASTRADO,
              ator_id: atorId,
              ator_tipo: atorTipo,
            },
          },
        },
        include: { exercicios: true },
      })
      treinos.push(novoTreino)
    }

    return treinos
  })
}

// ─── UC-14: Dashboard professor ───────────────────────────────────────────────

export async function dashboardProfessor(professorId: string, academiaId?: string) {
  const where: Record<string, any> = { professor_id: professorId }
  if (academiaId) where.academia_id = academiaId

  return prisma.aluno.findMany({
    where,
    select: {
      id: true,
      sexo: true,
      usuario: { select: { nome: true, email: true, telefone: true } },
      academia: { select: { nome: true, id: true } },
      treinos: {
        orderBy: { atualizado_em: 'desc' },
        select: {
          id: true,
          nome: true,
          status: true,
          dias_semana: true,
          iniciado_em: true,
          finalizado_em: true,
          atualizado_em: true,
          is_template: true,
        },
      },
    },
  })
}

export async function historicoDiasTreino(alunoId: string, mes: string) {
  const [ano, mesNum] = mes.split('-').map(Number)
  const inicio = new Date(Date.UTC(ano, mesNum - 1, 1))
  const fim = new Date(Date.UTC(ano, mesNum, 0, 23, 59, 59, 999))

  const execucoes = await prisma.execucaoExercicio.findMany({
    where: {
      treino: { aluno_id: alunoId },
      registrado_em: { gte: inicio, lte: fim },
    },
    include: {
      treino: { select: { id: true, nome: true } },
      exercicio: { select: { id: true, nome: true, grupo_muscular: true } },
    },
    orderBy: { registrado_em: 'asc' },
  })

  const mapa: Record<string, Record<string, { nome: string; grupos: string[] }>> = {}

  for (const exec of execucoes) {
    const data = exec.registrado_em.toISOString().slice(0, 10)
    if (!mapa[data]) mapa[data] = {}

    const t = mapa[data]
    if (!t[exec.treino.id]) {
      t[exec.treino.id] = { nome: exec.treino.nome, grupos: [] }
    }
    if (exec.exercicio.grupo_muscular && !t[exec.treino.id].grupos.includes(exec.exercicio.grupo_muscular)) {
      t[exec.treino.id].grupos.push(exec.exercicio.grupo_muscular)
    }
  }

  return Object.entries(mapa).map(([data, treinos]) => ({
    data,
    treinos: Object.entries(treinos).map(([id, info]) => ({
      id,
      nome: info.nome,
      grupos: info.grupos,
    })),
  }))
}

// ─── UC-Evolucao: Obter Resumo Mensal do Aluno ──────────────────────────────

export async function obterEvolucaoMensal(alunoId: string, mes?: string) {
  const agora = new Date()
  const mesAlvoStr = mes || `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

  const [anoStr, mesStr] = mesAlvoStr.split('-')
  const ano = parseInt(anoStr, 10)
  const mesNum = parseInt(mesStr, 10) - 1 // 0-indexed

  const inicioMes = new Date(ano, mesNum, 1, 0, 0, 0, 0)
  const fimMes = new Date(ano, mesNum + 1, 0, 23, 59, 59, 999)

  const inicioMesAnt = new Date(ano, mesNum - 1, 1, 0, 0, 0, 0)
  const fimMesAnt = new Date(ano, mesNum, 0, 23, 59, 59, 999)

  const conclusoesMes = await prisma.treinoHistorico.findMany({
    where: {
      treino: { aluno_id: alunoId },
      status_novo: 'CONCLUIDO',
      timestamp: { gte: inicioMes, lte: fimMes },
    },
    orderBy: { timestamp: 'asc' },
  })

  const conclusoesMesAnt = await prisma.treinoHistorico.findMany({
    where: {
      treino: { aluno_id: alunoId },
      status_novo: 'CONCLUIDO',
      timestamp: { gte: inicioMesAnt, lte: fimMesAnt },
    },
  })

  const treinosIdsMes = [...new Set(conclusoesMes.map((h) => h.treino_id))]

  const execucoesMes = await prisma.execucaoExercicio.findMany({
    where: {
      treino: { aluno_id: alunoId },
      registrado_em: { gte: inicioMes, lte: fimMes },
    },
    include: {
      exercicio: { select: { id: true, nome: true, grupo_muscular: true } },
    },
  })

  const execucoesMesAnt = await prisma.execucaoExercicio.findMany({
    where: {
      treino: { aluno_id: alunoId },
      registrado_em: { gte: inicioMesAnt, lte: fimMesAnt },
    },
  })

  const volumeTotalKg = Math.round(
    execucoesMes.reduce((acc, e) => acc + e.carga_kg * e.repeticoes, 0)
  )

  const volumeMesAnteriorKg = Math.round(
    execucoesMesAnt.reduce((acc, e) => acc + e.carga_kg * e.repeticoes, 0)
  )

  let variacaoVolumePercent = 0
  if (volumeMesAnteriorKg > 0) {
    variacaoVolumePercent = parseFloat(
      (((volumeTotalKg - volumeMesAnteriorKg) / volumeMesAnteriorKg) * 100).toFixed(1)
    )
  } else if (volumeTotalKg > 0) {
    variacaoVolumePercent = 100
  }

  let duracaoTotalMinutos = 0
  let treinosComDuracao = 0

  for (const h of conclusoesMes) {
    if (h.duracao_segundos && h.duracao_segundos >= 60) {
      const diffMin = Math.round(h.duracao_segundos / 60)
      duracaoTotalMinutos += diffMin > 3 && diffMin < 240 ? diffMin : 45
      treinosComDuracao++
    } else {
      duracaoTotalMinutos += 45
      treinosComDuracao++
    }
  }

  const totalTreinos = treinosIdsMes.length
  const duracaoMediaMinutos = treinosComDuracao > 0 ? Math.round(duracaoTotalMinutos / treinosComDuracao) : 0

  const semanasMap = [
    { semana: 'S1', treinos: 0, volumeKg: 0 },
    { semana: 'S2', treinos: 0, volumeKg: 0 },
    { semana: 'S3', treinos: 0, volumeKg: 0 },
    { semana: 'S4', treinos: 0, volumeKg: 0 },
  ]

  for (const h of conclusoesMes) {
    const dia = h.timestamp.getDate()
    const sIdx = dia <= 7 ? 0 : dia <= 14 ? 1 : dia <= 21 ? 2 : 3
    semanasMap[sIdx].treinos++
  }

  for (const e of execucoesMes) {
    const dia = e.registrado_em.getDate()
    const sIdx = dia <= 7 ? 0 : dia <= 14 ? 1 : dia <= 21 ? 2 : 3
    semanasMap[sIdx].volumeKg += Math.round(e.carga_kg * e.repeticoes)
  }

  let maiorCargaExercicio: { nome: string; cargaKg: number; mes_anterior: number } | null = null
  if (execucoesMes.length > 0) {
    const topExec = [...execucoesMes].sort((a, b) => b.carga_kg - a.carga_kg)[0]
    if (topExec && topExec.carga_kg > 0) {
      const topAnt = execucoesMesAnt
        .filter((e) => e.exercicio_id === topExec.exercicio_id)
        .sort((a, b) => b.carga_kg - a.carga_kg)[0]

      maiorCargaExercicio = {
        nome: topExec.exercicio.nome,
        cargaKg: topExec.carga_kg,
        mes_anterior: topAnt ? topAnt.carga_kg : 0,
      }
    }
  }

  const cargasSemanais: { semana: string; exercicio: string; cargaMedia: number; series: number }[] = []
  for (const e of execucoesMes) {
    const dia = e.registrado_em.getDate()
    const semana = dia <= 7 ? 'S1' : dia <= 14 ? 'S2' : dia <= 21 ? 'S3' : 'S4'
    cargasSemanais.push({
      semana,
      exercicio: e.exercicio.nome,
      cargaMedia: e.carga_kg,
      series: 1,
    })
  }

  const metaSemanal = 3
  const frequenciaPercent = Math.min(100, Math.round((totalTreinos / (4 * metaSemanal)) * 100))

  return {
    mes: mesAlvoStr,
    totalTreinos,
    metaSemanal,
    semanas: semanasMap,
    volumeTotalKg,
    volumeMesAnteriorKg,
    variacaoVolumePercent,
    duracaoMediaMinutos,
    duracaoTotalMinutos,
    frequenciaPercent,
    maiorCargaExercicio,
    cargasSemanais,
  }
}

// ─── UC-Evolucao: Obter Timeline Detalhada de Treinos Executados ────────────

export async function obterHistoricoExecucoesDetalhado(alunoId: string, mes?: string) {
  let dateFilter: { gte?: Date; lte?: Date } | undefined = undefined

  if (mes) {
    const [anoStr, mesStr] = mes.split('-')
    const ano = parseInt(anoStr, 10)
    const mesNum = parseInt(mesStr, 10) - 1
    const inicio = new Date(ano, mesNum, 1, 0, 0, 0, 0)
    const fim = new Date(ano, mesNum + 1, 0, 23, 59, 59, 999)
    dateFilter = { gte: inicio, lte: fim }
  }

  const conclusoes = await prisma.treinoHistorico.findMany({
    where: {
      treino: { aluno_id: alunoId },
      status_novo: 'CONCLUIDO',
      ...(dateFilter ? { timestamp: dateFilter } : {}),
    },
    include: {
      treino: { select: { id: true, nome: true } },
    },
    orderBy: { timestamp: 'desc' },
  })

  const execucoes = await prisma.execucaoExercicio.findMany({
    where: {
      treino: { aluno_id: alunoId },
      ...(dateFilter ? { registrado_em: dateFilter } : {}),
    },
    include: {
      exercicio: { select: { id: true, nome: true, grupo_muscular: true } },
      treino: { select: { id: true, nome: true } },
    },
    orderBy: { registrado_em: 'asc' },
  })

  return conclusoes.map((h) => {
    const dataConclusao = h.timestamp
    const inicioJanela = new Date(dataConclusao.getTime() - 24 * 60 * 60 * 1000)

    const execsDaSessao = execucoes.filter(
      (e) => e.treino_id === h.treino_id && e.registrado_em <= dataConclusao && e.registrado_em >= inicioJanela
    )

    const exerciciosMap: Record<string, {
      exercicioId: string
      nome: string
      grupoMuscular: string | null
      series: Array<{
        serieNumero: number
        cargaKg: number
        repeticoes: number
        registradoEm: Date
      }>
    }> = {}

    for (const e of execsDaSessao) {
      if (!exerciciosMap[e.exercicio_id]) {
        exerciciosMap[e.exercicio_id] = {
          exercicioId: e.exercicio_id,
          nome: e.exercicio.nome,
          grupoMuscular: e.exercicio.grupo_muscular,
          series: [],
        }
      }
      exerciciosMap[e.exercicio_id].series.push({
        serieNumero: e.serie_numero,
        cargaKg: e.carga_kg,
        repeticoes: e.repeticoes,
        registradoEm: e.registrado_em,
      })
    }

    const duracaoMinutos = h.duracao_segundos
      ? Math.round(h.duracao_segundos / 60)
      : 45

    return {
      historicoId: h.id,
      treinoId: h.treino_id,
      treinoNome: h.treino.nome,
      dataConclusao: h.timestamp.toISOString(),
      duracaoSegundos: h.duracao_segundos,
      duracaoMinutos,
      exercicios: Object.values(exerciciosMap),
    }
  })
}
