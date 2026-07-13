import { AcademiaStatus, VinculoStatus } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import {
  NotFoundError,
  ConflictError,
  LimiteProfessoresExcedidoError,
  ForbiddenError,
} from '../../../domain/errors/AppError.js'

// ─── UC-05: Cadastrar academia ───────────────────────────────────────────────

export async function cadastrarAcademia(usuarioId: string, input: {
  nome: string
  cnpj: string
}) {
  const academiaExistente = await prisma.academia.findUnique({ where: { usuario_id: usuarioId } })
  if (academiaExistente) throw new ConflictError('Este usuário já possui uma academia cadastrada')

  const cnpjExistente = await prisma.academia.findUnique({ where: { cnpj: input.cnpj } })
  if (cnpjExistente) throw new ConflictError('CNPJ já cadastrado')

  return prisma.academia.create({
    data: {
      usuario_id: usuarioId,
      nome: input.nome,
      cnpj: input.cnpj,
      status: AcademiaStatus.PENDENTE,
    },
  })
}

// ─── UC-01: Aprovar / Rejeitar cadastro de academia (Root) ───────────────────

export async function aprovacaoAcademia(academiaId: string, acao: 'APROVAR' | 'REJEITAR', motivo?: string) {
  const academia = await prisma.academia.findUnique({ where: { id: academiaId } })
  if (!academia) throw new NotFoundError('Academia')
  if (academia.status !== AcademiaStatus.PENDENTE) {
    throw new ConflictError(`Academia já está com status: ${academia.status}`)
  }

  return prisma.academia.update({
    where: { id: academiaId },
    data: {
      status: acao === 'APROVAR' ? AcademiaStatus.ATIVO : AcademiaStatus.REJEITADO,
      rejeitado_motivo: acao === 'REJEITAR' ? motivo : null,
    },
  })
}

// ─── UC-02: Definir limite de professores (Root) ─────────────────────────────

export async function definirLimiteProfessores(academiaId: string, limite: number) {
  const academia = await prisma.academia.findUnique({ where: { id: academiaId } })
  if (!academia) throw new NotFoundError('Academia')

  return prisma.academia.update({
    where: { id: academiaId },
    data: { max_professores: limite },
  })
}

// ─── UC-04: Painel global (Root) ─────────────────────────────────────────────

export async function painelGlobal() {
  const [totalAcademias, academiasPendentes, totalProfessores, totalAlunos] = await Promise.all([
    prisma.academia.count({ where: { status: AcademiaStatus.ATIVO } }),
    prisma.academia.count({ where: { status: AcademiaStatus.PENDENTE } }),
    prisma.professor.count(),
    prisma.aluno.count(),
  ])

  const academias = await prisma.academia.findMany({
    orderBy: { criado_em: 'desc' },
    take: 20,
    select: {
      id: true,
      nome: true,
      cnpj: true,
      status: true,
      max_professores: true,
      criado_em: true,
      _count: { select: { professores: true, alunos: true } },
    },
  })

  return { totalAcademias, academiasPendentes, totalProfessores, totalAlunos, academias }
}

// ─── UC-06: Autorizar professor (1ª camada — Academia) ───────────────────────

export async function autorizarProfessorPrimeiraEtapa(academiaId: string, professorId: string) {
  const academia = await prisma.academia.findUnique({
    where: { id: academiaId },
    include: { _count: { select: { professores: { where: { status: VinculoStatus.ATIVO } } } } },
  })
  if (!academia) throw new NotFoundError('Academia')
  if (academia.status !== AcademiaStatus.ATIVO) throw new ForbiddenError('Academia inativa')

  if (academia._count.professores >= academia.max_professores) {
    throw new LimiteProfessoresExcedidoError(academia.max_professores)
  }

  const vinculoExistente = await prisma.professorAcademia.findUnique({
    where: { professor_id_academia_id: { professor_id: professorId, academia_id: academiaId } },
  })

  if (vinculoExistente) {
    if (vinculoExistente.status === VinculoStatus.ATIVO) {
      throw new ConflictError('Professor já está ativo nesta academia')
    }
    return prisma.professorAcademia.update({
      where: { id: vinculoExistente.id },
      data: { status: VinculoStatus.PENDENTE_ROOT },
    })
  }

  return prisma.professorAcademia.create({
    data: {
      professor_id: professorId,
      academia_id: academiaId,
      status: VinculoStatus.PENDENTE_ROOT,
    },
  })
}

// ─── UC-03: Aprovar vínculo professor (2ª camada — Root) ─────────────────────

export async function aprovacaoVinculoProfessor(vinculoId: string, acao: 'APROVAR' | 'REJEITAR') {
  const vinculo = await prisma.professorAcademia.findUnique({ where: { id: vinculoId } })
  if (!vinculo) throw new NotFoundError('Vínculo professor-academia')
  if (vinculo.status !== VinculoStatus.PENDENTE_ROOT) {
    throw new ConflictError('Vínculo não está aguardando aprovação do Root')
  }

  return prisma.professorAcademia.update({
    where: { id: vinculoId },
    data: { status: acao === 'APROVAR' ? VinculoStatus.ATIVO : VinculoStatus.REJEITADO },
  })
}

// ─── UC-07: Remover professor ─────────────────────────────────────────────────

export async function removerProfessor(academiaId: string, professorId: string) {
  const vinculo = await prisma.professorAcademia.findUnique({
    where: { professor_id_academia_id: { professor_id: professorId, academia_id: academiaId } },
  })
  if (!vinculo || vinculo.status !== VinculoStatus.ATIVO) {
    throw new NotFoundError('Vínculo ativo')
  }

  await prisma.$transaction([
    prisma.professorAcademia.update({
      where: { id: vinculo.id },
      data: { status: VinculoStatus.REMOVIDO },
    }),
    prisma.aluno.updateMany({
      where: { professor_id: professorId, academia_id: academiaId },
      data: { professor_id: null },
    }),
  ])
}

// ─── UC-08: Dashboard alunos da academia ─────────────────────────────────────

export async function dashboardAlunosAcademia(academiaId: string) {
  return prisma.aluno.findMany({
    where: { academia_id: academiaId },
    select: {
      id: true,
      usuario: { select: { nome: true, email: true, telefone: true } },
      professor: { select: { id: true, usuario: { select: { nome: true } } } },
      treinos: {
        orderBy: { atualizado_em: 'desc' },
        select: { id: true, nome: true, status: true, dias_semana: true, atualizado_em: true },
      },
    },
  })
}

export async function alterarStatusAcademia(academiaId: string, status: AcademiaStatus) {
  const academia = await prisma.academia.findUnique({ where: { id: academiaId } })
  if (!academia) throw new NotFoundError('Academia')

  return prisma.academia.update({
    where: { id: academiaId },
    data: { status },
  })
}
