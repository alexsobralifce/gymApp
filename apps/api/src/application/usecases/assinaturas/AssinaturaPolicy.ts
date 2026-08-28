export const TRIAL_DIAS = 15
export const LIMITE_ALUNOS_PROFESSOR = 10
export const CONVITE_VALIDADE_DIAS = 7

export type AssinaturaStatus = 'ATIVA' | 'EM_CARENCIA' | 'EXPIRADA' | 'CANCELADA' | 'REVOGADA'
export type AssinaturaOrigem = 'PROPRIA' | 'PATROCINADA' | 'MANUAL'

export interface AssinaturaLike {
  status: AssinaturaStatus
  expires_at: Date | null
  trial_fim_em: Date | null
  origem: AssinaturaOrigem
}

export interface UsuarioLike {
  role: string
  professor_id: string | null
  premium_manual_em: Date | null
}

export interface ProfessorLike {
  usuario_id: string
}

export function isAssinaturaValida(assinatura: AssinaturaLike | null, agora: Date = new Date()): boolean {
  if (!assinatura) return false
  if (assinatura.status !== 'ATIVA' && assinatura.status !== 'EM_CARENCIA') return false
  if (assinatura.expires_at && assinatura.expires_at <= agora) return false
  if (assinatura.trial_fim_em && assinatura.trial_fim_em <= agora && !assinatura.expires_at) return false
  return true
}

export function isTrialAtivo(assinatura: AssinaturaLike | null, agora: Date = new Date()): boolean {
  if (!assinatura) return false
  if (assinatura.trial_fim_em && assinatura.trial_fim_em > agora) return true
  return false
}

export function isPremiumManualAtivo(usuario: UsuarioLike): boolean {
  return usuario.premium_manual_em !== null
}

export function hasActiveAccess(
  usuario: UsuarioLike,
  propriaAssinatura: AssinaturaLike | null,
  professorAssinatura: AssinaturaLike | null,
  agora: Date = new Date(),
): { hasAccess: boolean; origem: AssinaturaOrigem | 'MANUAL' | null; isTrial: boolean } {
  if (isPremiumManualAtivo(usuario)) {
    return { hasAccess: true, origem: 'MANUAL', isTrial: false }
  }

  if (isAssinaturaValida(propriaAssinatura, agora)) {
    return {
      hasAccess: true,
      origem: propriaAssinatura!.origem,
      isTrial: isTrialAtivo(propriaAssinatura, agora),
    }
  }

  if (
    usuario.role === 'ALUNO' &&
    usuario.professor_id &&
    isAssinaturaValida(professorAssinatura, agora)
  ) {
    return { hasAccess: true, origem: 'PATROCINADA', isTrial: isTrialAtivo(professorAssinatura, agora) }
  }

  return { hasAccess: false, origem: null, isTrial: false }
}

export function canAddStudent(
  professorAssinatura: AssinaturaLike | null,
  professorPremiumManual: Date | null,
  alunosAtivosCount: number,
  limite: number = LIMITE_ALUNOS_PROFESSOR,
  agora: Date = new Date(),
): { pode: boolean; motivo: string } {
  const professorLike: UsuarioLike = {
    role: 'PROFESSOR',
    professor_id: null,
    premium_manual_em: professorPremiumManual,
  }

  const professorAtivo =
    isPremiumManualAtivo(professorLike) || isAssinaturaValida(professorAssinatura, agora)

  if (!professorAtivo) {
    return { pode: false, motivo: 'Professor sem assinatura ativa' }
  }

  if (alunosAtivosCount >= limite) {
    return { pode: false, motivo: `Limite de ${limite} alunos atingido` }
  }

  return { pode: true, motivo: 'OK' }
}
