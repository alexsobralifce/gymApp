export declare function criarTreino(professorId: string, input: {
    alunoId: string;
    nome: string;
    diasSemana: number[];
    exercicios: Array<{
        exercicioId: string;
        ordem: number;
        series: number;
        repeticoes: number;
        cargaSugeridaKg?: number;
    }>;
}): Promise<{
    exercicios: {
        id: string;
        ordem: number;
        series: number;
        repeticoes: number;
        carga_sugerida_kg: number | null;
        exercicio_id: string;
        treino_id: string;
    }[];
} & {
    status: import(".prisma/client").$Enums.TreinoStatus;
    id: string;
    nome: string;
    criado_em: Date;
    atualizado_em: Date;
    aluno_id: string;
    dias_semana: number[];
    iniciado_em: Date | null;
    finalizado_em: Date | null;
}>;
export declare function criarTreinoAutogestao(alunoId: string, input: {
    nome: string;
    diasSemana: number[];
    exercicios: Array<{
        exercicioId: string;
        ordem: number;
        series: number;
        repeticoes: number;
        cargaSugeridaKg?: number;
    }>;
}): Promise<{
    exercicios: {
        id: string;
        ordem: number;
        series: number;
        repeticoes: number;
        carga_sugerida_kg: number | null;
        exercicio_id: string;
        treino_id: string;
    }[];
} & {
    status: import(".prisma/client").$Enums.TreinoStatus;
    id: string;
    nome: string;
    criado_em: Date;
    atualizado_em: Date;
    aluno_id: string;
    dias_semana: number[];
    iniciado_em: Date | null;
    finalizado_em: Date | null;
}>;
export declare function enviarTreinoParaAceite(treinoId: string, professorId: string): Promise<{
    status: import(".prisma/client").$Enums.TreinoStatus;
    id: string;
    nome: string;
    criado_em: Date;
    atualizado_em: Date;
    aluno_id: string;
    dias_semana: number[];
    iniciado_em: Date | null;
    finalizado_em: Date | null;
}>;
export declare function responderTreino(treinoId: string, alunoId: string, acao: 'ACEITAR' | 'RECUSAR'): Promise<{
    status: import(".prisma/client").$Enums.TreinoStatus;
    id: string;
    nome: string;
    criado_em: Date;
    atualizado_em: Date;
    aluno_id: string;
    dias_semana: number[];
    iniciado_em: Date | null;
    finalizado_em: Date | null;
}>;
export declare function iniciarTreino(treinoId: string, alunoId: string): Promise<{
    status: import(".prisma/client").$Enums.TreinoStatus;
    id: string;
    nome: string;
    criado_em: Date;
    atualizado_em: Date;
    aluno_id: string;
    dias_semana: number[];
    iniciado_em: Date | null;
    finalizado_em: Date | null;
}>;
export declare function registrarExecucao(treinoId: string, alunoId: string, input: {
    exercicioId: string;
    serieNumero: number;
    repeticoes: number;
    cargaKg: number;
}): Promise<{
    id: string;
    repeticoes: number;
    exercicio_id: string;
    serie_numero: number;
    carga_kg: number;
    registrado_em: Date;
    treino_id: string;
}>;
export declare function finalizarTreino(treinoId: string, alunoId: string): Promise<{
    status: import(".prisma/client").$Enums.TreinoStatus;
    id: string;
    nome: string;
    criado_em: Date;
    atualizado_em: Date;
    aluno_id: string;
    dias_semana: number[];
    iniciado_em: Date | null;
    finalizado_em: Date | null;
}>;
export declare function dashboardProfessor(professorId: string): Promise<{
    usuario: {
        email: string;
        nome: string;
    };
    id: string;
    treinos: {
        status: import(".prisma/client").$Enums.TreinoStatus;
        id: string;
        nome: string;
        atualizado_em: Date;
        iniciado_em: Date | null;
        finalizado_em: Date | null;
    }[];
}[]>;
//# sourceMappingURL=TreinoService.d.ts.map