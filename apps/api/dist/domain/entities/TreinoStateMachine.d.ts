import { TreinoStatus, TreinoAtor } from '@prisma/client';
/**
 * Valida se a transição de statusAtual para statusNovo é permitida
 * para o ator informado. Lança InvalidStateTransitionError se inválida.
 */
export declare function assertTransicaoValida(statusAtual: TreinoStatus, statusNovo: TreinoStatus, ator: TreinoAtor): void;
/**
 * Retorna os próximos status possíveis a partir do status atual
 */
export declare function proximosStatusPossiveis(statusAtual: TreinoStatus): TreinoStatus[];
/**
 * Retorna true se um treino pode ser iniciado pelo aluno
 */
export declare function podeIniciarTreino(status: TreinoStatus): boolean;
//# sourceMappingURL=TreinoStateMachine.d.ts.map