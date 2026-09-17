import { prisma } from '../../../infrastructure/database/prisma.js'
import { LimiteAlunosExcedidoError } from '../../../domain/errors/AppError.js'

/**
 * Uso e limite de alunos de um professor, derivados da assinatura própria vigente
 * (snapshot `faixa_alunos_max` gravado no checkout — ver BillingService.iniciarCheckout).
 * `limite: null` = ilimitado (isenção manual, ou plano sem teto). Sem assinatura própria
 * ativa, o limite é 0 (não deveria acontecer hoje, já que o cadastro exige trial+cartão,
 * mas cobre contas antigas/grandfathered sem assinatura).
 */
export async function obterLimiteEUsoProfessor(professorId: string): Promise<{ usados: number; limite: number | null }> {
  const usados = await prisma.aluno.count({ where: { professor_id: professorId } })

  const professor = await prisma.professor.findUnique({ where: { id: professorId }, select: { usuario_id: true } })
  if (!professor) return { usados, limite: 0 }

  const usuario = await prisma.usuario.findUnique({
    where: { id: professor.usuario_id },
    select: { premium_manual_em: true },
  })
  if (usuario?.premium_manual_em) return { usados, limite: null }

  const assinatura = await prisma.assinatura.findFirst({
    where: { usuario_id: professor.usuario_id, origem: 'PROPRIA', status: { in: ['ATIVA', 'EM_CARENCIA'] } },
    orderBy: { criado_em: 'desc' },
    select: { faixa_alunos_max: true },
  })
  if (!assinatura) return { usados, limite: 0 }

  return { usados, limite: assinatura.faixa_alunos_max ?? null }
}

/** Lança LimiteAlunosExcedidoError se vincular este aluno ao professor estourar a faixa
 *  contratada. `alunoProfessorIdAtual` é o professor_id do aluno ANTES da operação — se já
 *  for o mesmo professor, não conta como vaga nova (idempotente para re-vínculo). */
export async function assertProfessorPodeReceberAluno(
  professorId: string,
  alunoProfessorIdAtual: string | null,
): Promise<void> {
  if (alunoProfessorIdAtual === professorId) return

  const { usados, limite } = await obterLimiteEUsoProfessor(professorId)
  if (limite === null) return
  if (usados >= limite) throw new LimiteAlunosExcedidoError(limite)
}

/** Idem, para o total de alunos de uma Academia (faixa do plano da Academia — não há coluna
 *  dedicada como `max_professores`, o teto vem sempre da assinatura vigente). */
export async function obterLimiteEUsoAcademia(academiaId: string): Promise<{ usados: number; limite: number | null }> {
  const usados = await prisma.aluno.count({ where: { academia_id: academiaId } })

  const academia = await prisma.academia.findUnique({ where: { id: academiaId }, select: { usuario_id: true } })
  if (!academia) return { usados, limite: 0 }

  const usuario = await prisma.usuario.findUnique({
    where: { id: academia.usuario_id },
    select: { premium_manual_em: true },
  })
  if (usuario?.premium_manual_em) return { usados, limite: null }

  const assinatura = await prisma.assinatura.findFirst({
    where: { usuario_id: academia.usuario_id, origem: 'PROPRIA', status: { in: ['ATIVA', 'EM_CARENCIA'] } },
    orderBy: { criado_em: 'desc' },
    select: { faixa_alunos_max: true },
  })
  if (!assinatura) return { usados, limite: 0 }

  return { usados, limite: assinatura.faixa_alunos_max ?? null }
}

export async function assertAcademiaPodeReceberAluno(
  academiaId: string,
  alunoAcademiaIdAtual: string | null,
): Promise<void> {
  if (alunoAcademiaIdAtual === academiaId) return

  const { usados, limite } = await obterLimiteEUsoAcademia(academiaId)
  if (limite === null) return
  if (usados >= limite) throw new LimiteAlunosExcedidoError(limite)
}
