import { TreinoStatus, TreinoAtor } from '@prisma/client'
import { InvalidStateTransitionError } from '../errors/AppError.js'

// ─── Tabela de transições válidas ─────────────────────────────────────────────
// Toda tentativa de transição fora desta tabela lança InvalidStateTransitionError
// Toda transição DEVE ser registrada em TreinoHistorico (regra de arquitetura)

type TransicaoConfig = {
  de: TreinoStatus
  para: TreinoStatus[]
  atoresPermitidos: TreinoAtor[]
}

const TRANSICOES: TransicaoConfig[] = [
  {
    de: TreinoStatus.CADASTRADO,
    para: [TreinoStatus.ENVIADO],
    atoresPermitidos: [TreinoAtor.PROFESSOR, TreinoAtor.SISTEMA],
  },
  {
    de: TreinoStatus.ENVIADO,
    para: [TreinoStatus.ACEITO, TreinoStatus.RECUSADO],
    atoresPermitidos: [TreinoAtor.ALUNO],
  },
  {
    de: TreinoStatus.ACEITO,
    para: [TreinoStatus.EM_EXECUCAO, TreinoStatus.EM_ABERTO],
    atoresPermitidos: [TreinoAtor.ALUNO, TreinoAtor.SISTEMA],
  },
  {
    de: TreinoStatus.EM_ABERTO,
    para: [TreinoStatus.EM_EXECUCAO],
    atoresPermitidos: [TreinoAtor.ALUNO],
  },
  {
    de: TreinoStatus.EM_EXECUCAO,
    para: [TreinoStatus.CONCLUIDO],
    atoresPermitidos: [TreinoAtor.ALUNO],
  },
]

// ─── Funções públicas da state machine ───────────────────────────────────────

/**
 * Valida se a transição de statusAtual para statusNovo é permitida
 * para o ator informado. Lança InvalidStateTransitionError se inválida.
 */
export function assertTransicaoValida(
  statusAtual: TreinoStatus,
  statusNovo: TreinoStatus,
  ator: TreinoAtor,
): void {
  const config = TRANSICOES.find((t) => t.de === statusAtual)

  if (!config || !config.para.includes(statusNovo)) {
    throw new InvalidStateTransitionError(statusAtual, statusNovo)
  }

  if (!config.atoresPermitidos.includes(ator)) {
    throw new InvalidStateTransitionError(statusAtual, statusNovo)
  }
}

/**
 * Retorna os próximos status possíveis a partir do status atual
 */
export function proximosStatusPossiveis(statusAtual: TreinoStatus): TreinoStatus[] {
  return TRANSICOES.find((t) => t.de === statusAtual)?.para ?? []
}

/**
 * Retorna true se um treino pode ser iniciado pelo aluno
 */
export function podeIniciarTreino(status: TreinoStatus): boolean {
  return status === TreinoStatus.ACEITO || status === TreinoStatus.EM_ABERTO
}
