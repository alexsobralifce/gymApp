import { TreinoStatus, TreinoAtor } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError, TenantAccessError } from '../../../domain/errors/AppError.js'
import { assertTransicaoValida } from '../../../domain/entities/TreinoStateMachine.js'

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
  if (aluno.professor_id !== null) throw new TenantAccessError()

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

export async function iniciarTreino(treinoId: string, alunoId: string) {
  const treino = await prisma.treino.findUnique({ where: { id: treinoId } })
  if (!treino) throw new NotFoundError('Treino')
  if (treino.aluno_id !== alunoId) throw new TenantAccessError()

  if (treino.status === TreinoStatus.EM_EXECUCAO) {
    return treino
  }

  if (treino.status === TreinoStatus.CONCLUIDO) {
    assertTransicaoValida(treino.status, TreinoStatus.ACEITO, TreinoAtor.SISTEMA)
  }

  assertTransicaoValida(
    treino.status === TreinoStatus.CONCLUIDO ? TreinoStatus.ACEITO : treino.status,
    TreinoStatus.EM_EXECUCAO,
    TreinoAtor.ALUNO,
  )

  return prisma.$transaction(async (tx) => {
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

    const atualizado = await tx.treino.update({
      where: { id: treinoId },
      data: { status: TreinoStatus.EM_EXECUCAO, iniciado_em: new Date() },
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
    return atualizado
  })
}

// ─── UC-22: Registrar carga/repetições ───────────────────────────────────────

export async function registrarExecucao(treinoId: string, alunoId: string, input: {
  exercicioId: string
  serieNumero: number
  repeticoes: number
  cargaKg: number
}) {
  const treino = await prisma.treino.findUnique({ where: { id: treinoId } })
  if (!treino) throw new NotFoundError('Treino')
  if (treino.aluno_id !== alunoId) throw new TenantAccessError()

  return prisma.execucaoExercicio.create({
    data: {
      treino_id: treinoId,
      exercicio_id: input.exercicioId,
      serie_numero: input.serieNumero,
      repeticoes: input.repeticoes,
      carga_kg: input.cargaKg,
    },
  })
}

// ─── UC-23: Finalizar treino ──────────────────────────────────────────────────

export async function finalizarTreino(treinoId: string, alunoId: string) {
  const treino = await prisma.treino.findUnique({ where: { id: treinoId } })
  if (!treino) throw new NotFoundError('Treino')
  if (treino.aluno_id !== alunoId) throw new TenantAccessError()

  assertTransicaoValida(treino.status, TreinoStatus.CONCLUIDO, TreinoAtor.ALUNO)

  return prisma.$transaction(async (tx) => {
    await tx.treino.update({
      where: { id: treinoId },
      data: { status: TreinoStatus.CONCLUIDO, finalizado_em: new Date() },
    })
    await tx.treinoHistorico.create({
      data: {
        treino_id: treinoId,
        status_anterior: treino.status,
        status_novo: TreinoStatus.CONCLUIDO,
        ator_id: alunoId,
        ator_tipo: TreinoAtor.ALUNO,
      },
    })

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

    return tx.treino.findUnique({
      where: { id: treinoId },
      include: { exercicios: { include: { exercicio: true } } },
    })
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
