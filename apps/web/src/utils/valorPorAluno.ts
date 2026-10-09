import { t as tx } from '../i18n'
/**
 * Valor por aluno exibido no formulário de planos.
 * - Aluno individual (papel ALUNO): 1 aluno, então vale o preço do plano (R$ 12,00).
 * - Personal/Academia: preço mensal dividido pelo teto de alunos ativos da faixa,
 *   igual ao "por aluno" da página pública /planos (arredondado ao centavo).
 * - Plano gratuito ou sem teto (ilimitado/sob consulta): não há valor por aluno.
 */
export interface PlanoParaValorPorAluno {
  papel_alvo: string
  preco_mensal_cents: number
  faixa_max_alunos?: number | null
  limite_alunos?: number | null
}

export function valorPorAlunoCents(plano: PlanoParaValorPorAluno): number | null {
  if (plano.preco_mensal_cents <= 0) return null
  if (plano.papel_alvo === 'ALUNO') return plano.preco_mensal_cents

  const teto = plano.faixa_max_alunos ?? plano.limite_alunos ?? null
  if (!teto || teto <= 0) return null
  return Math.round(plano.preco_mensal_cents / teto)
}

export function rotuloValorPorAluno(plano: PlanoParaValorPorAluno, formatar: (cents: number) => string): string | null {
  const cents = valorPorAlunoCents(plano)
  if (cents === null) return null
  return plano.papel_alvo === 'ALUNO'
    ? tx('{v1} por aluno (uso individual)', { v1: formatar(cents) })
    : tx('{v1} por aluno no limite do plano', { v1: formatar(cents) })
}
