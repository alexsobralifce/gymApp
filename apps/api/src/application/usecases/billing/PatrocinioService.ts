import { prisma } from '../../../infrastructure/database/prisma.js'

type AssinaturaLike = { status: string; expires_at: Date | null } | null

function isAssinaturaValida(assinatura: AssinaturaLike, agora: Date = new Date()): boolean {
  if (!assinatura) return false
  if (assinatura.status !== 'ATIVA' && assinatura.status !== 'EM_CARENCIA') return false
  if (assinatura.expires_at && assinatura.expires_at <= agora) return false
  return true
}

async function payerTemAcessoAtivo(payerUsuarioId: string): Promise<boolean> {
  const payer = await prisma.usuario.findUnique({
    where: { id: payerUsuarioId },
    select: { premium_manual_em: true },
  })
  if (payer?.premium_manual_em) return true

  const assinatura = await prisma.assinatura.findFirst({
    where: { usuario_id: payerUsuarioId, origem: 'PROPRIA' },
    orderBy: { criado_em: 'desc' },
    select: { status: true, expires_at: true },
  })
  return isAssinaturaValida(assinatura)
}

/**
 * Reavalia se um aluno deve ser patrocinado (acesso grátis) pelo professor ou, na ausência
 * dele, pela academia a que está vinculado. Deve ser chamado sempre que `Aluno.professor_id`
 * ou `Aluno.academia_id` mudam, e também quando a assinatura do professor/academia patrocinador
 * muda de status (cancelamento, expiração, webhook do gateway).
 *
 * - Patrocinador com acesso ativo (assinatura própria válida ou isenção manual): garante uma
 *   Assinatura do aluno com origem=PATROCINADA (R$0) e cancela a assinatura própria do aluno,
 *   se houver uma rodando, para não cobrar duas vezes pelo mesmo acesso.
 * - Sem patrocinador ativo: revoga qualquer PATROCINADA vigente — o aluno volta a depender da
 *   própria assinatura (não é recobrado automaticamente; precisaria refazer o checkout).
 */
export async function sincronizarPatrocinioAluno(alunoId: string): Promise<void> {
  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
    select: {
      id: true,
      usuario_id: true,
      professor: { select: { usuario_id: true } },
      academia: { select: { usuario_id: true } },
    },
  })
  if (!aluno) return

  const candidatoPatrocinadorId = aluno.professor?.usuario_id ?? aluno.academia?.usuario_id ?? null
  const patrocinadorAtivo = candidatoPatrocinadorId ? await payerTemAcessoAtivo(candidatoPatrocinadorId) : false

  const patrocinadaAtual = await prisma.assinatura.findFirst({
    where: { usuario_id: aluno.usuario_id, origem: 'PATROCINADA', status: { in: ['ATIVA', 'EM_CARENCIA'] } },
  })

  if (patrocinadorAtivo && candidatoPatrocinadorId) {
    if (patrocinadaAtual?.patrocinada_por_usuario_id === candidatoPatrocinadorId) {
      return // já patrocinado pelo mesmo professor/academia — nada a fazer
    }

    if (patrocinadaAtual) {
      await prisma.assinatura.update({
        where: { id: patrocinadaAtual.id },
        data: { status: 'REVOGADA', cancelada_em: new Date(), motivo_revogacao: { motivo: 'troca_de_patrocinador' } },
      })
    }

    const plano = await prisma.planoAssinatura.findFirst({ where: { papel_alvo: 'ALUNO', ativo: true } })
    if (!plano) return // catálogo sem plano de aluno — nada a fazer, evita criar assinatura sem plano_id

    await prisma.assinatura.create({
      data: {
        usuario_id: aluno.usuario_id,
        plano_id: plano.id,
        loja: 'MANUAL',
        origem: 'PATROCINADA',
        status: 'ATIVA',
        tenant_tipo: 'ALUNO',
        tenant_id: aluno.id,
        patrocinada_por_usuario_id: candidatoPatrocinadorId,
        valor_mensal_cents: 0,
        inicio_em: new Date(),
      },
    })

    // Cancela a assinatura própria do aluno, se tiver uma rodando — evita cobrar quem passou a ser patrocinado.
    await prisma.assinatura.updateMany({
      where: { usuario_id: aluno.usuario_id, origem: 'PROPRIA', status: { in: ['ATIVA', 'PENDENTE', 'EM_CARENCIA'] } },
      data: { status: 'CANCELADA', cancelada_em: new Date(), motivo_revogacao: { motivo: 'aluno_patrocinado' } },
    })
    return
  }

  if (patrocinadaAtual) {
    await prisma.assinatura.update({
      where: { id: patrocinadaAtual.id },
      data: { status: 'REVOGADA', cancelada_em: new Date(), motivo_revogacao: { motivo: 'patrocinador_sem_acesso_ativo' } },
    })
  }
}

/** Reavalia o patrocínio de todos os alunos vinculados a um professor — usado quando a
 *  assinatura do próprio professor muda de status (cancelamento, expiração, webhook). */
export async function sincronizarPatrocinioPorProfessor(professorId: string): Promise<void> {
  const alunos = await prisma.aluno.findMany({ where: { professor_id: professorId }, select: { id: true } })
  for (const a of alunos) await sincronizarPatrocinioAluno(a.id)
}

/** Idem, para alunos vinculados diretamente a uma academia (sem professor). */
export async function sincronizarPatrocinioPorAcademia(academiaId: string): Promise<void> {
  const alunos = await prisma.aluno.findMany({
    where: { academia_id: academiaId, professor_id: null },
    select: { id: true },
  })
  for (const a of alunos) await sincronizarPatrocinioAluno(a.id)
}
