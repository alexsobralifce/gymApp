import { TreinoStatus, TreinoAtor } from '@prisma/client';
import { InvalidStateTransitionError } from '../errors/AppError.js';
const TRANSICOES = [
    {
        de: TreinoStatus.CADASTRADO,
        para: [TreinoStatus.ENVIADO],
        atoresPermitidos: [TreinoAtor.PROFESSOR, TreinoAtor.SISTEMA],
    },
    {
        de: TreinoStatus.CADASTRADO,
        para: [TreinoStatus.ACEITO],
        atoresPermitidos: [TreinoAtor.ALUNO],
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
];
// ─── Funções públicas da state machine ───────────────────────────────────────
/**
 * Valida se a transição de statusAtual para statusNovo é permitida
 * para o ator informado. Lança InvalidStateTransitionError se inválida.
 */
export function assertTransicaoValida(statusAtual, statusNovo, ator) {
    const configs = TRANSICOES.filter((t) => t.de === statusAtual);
    const permitida = configs.some((c) => c.para.includes(statusNovo) && c.atoresPermitidos.includes(ator));
    if (!permitida) {
        throw new InvalidStateTransitionError(statusAtual, statusNovo);
    }
}
/**
 * Retorna os próximos status possíveis a partir do status atual
 */
export function proximosStatusPossiveis(statusAtual) {
    return [...new Set(TRANSICOES.filter((t) => t.de === statusAtual).flatMap((t) => t.para))];
}
/**
 * Retorna true se um treino pode ser iniciado pelo aluno
 */
export function podeIniciarTreino(status) {
    return status === TreinoStatus.ACEITO || status === TreinoStatus.EM_ABERTO;
}
//# sourceMappingURL=TreinoStateMachine.js.map