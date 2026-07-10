import { AcademiaStatus } from '@prisma/client';
export declare function cadastrarAcademia(usuarioId: string, input: {
    nome: string;
    cnpj: string;
}): Promise<{
    status: import(".prisma/client").$Enums.AcademiaStatus;
    id: string;
    nome: string;
    criado_em: Date;
    atualizado_em: Date;
    usuario_id: string;
    cnpj: string;
    max_professores: number;
    rejeitado_motivo: string | null;
}>;
export declare function aprovacaoAcademia(academiaId: string, acao: 'APROVAR' | 'REJEITAR', motivo?: string): Promise<{
    status: import(".prisma/client").$Enums.AcademiaStatus;
    id: string;
    nome: string;
    criado_em: Date;
    atualizado_em: Date;
    usuario_id: string;
    cnpj: string;
    max_professores: number;
    rejeitado_motivo: string | null;
}>;
export declare function definirLimiteProfessores(academiaId: string, limite: number): Promise<{
    status: import(".prisma/client").$Enums.AcademiaStatus;
    id: string;
    nome: string;
    criado_em: Date;
    atualizado_em: Date;
    usuario_id: string;
    cnpj: string;
    max_professores: number;
    rejeitado_motivo: string | null;
}>;
export declare function painelGlobal(): Promise<{
    totalAcademias: number;
    academiasPendentes: number;
    totalProfessores: number;
    totalAlunos: number;
    academias: {
        status: import(".prisma/client").$Enums.AcademiaStatus;
        id: string;
        nome: string;
        criado_em: Date;
        _count: {
            professores: number;
            alunos: number;
        };
        cnpj: string;
        max_professores: number;
    }[];
}>;
export declare function autorizarProfessorPrimeiraEtapa(academiaId: string, professorId: string): Promise<{
    status: import(".prisma/client").$Enums.VinculoStatus;
    id: string;
    criado_em: Date;
    atualizado_em: Date;
    professor_id: string;
    academia_id: string;
}>;
export declare function aprovacaoVinculoProfessor(vinculoId: string, acao: 'APROVAR' | 'REJEITAR'): Promise<{
    status: import(".prisma/client").$Enums.VinculoStatus;
    id: string;
    criado_em: Date;
    atualizado_em: Date;
    professor_id: string;
    academia_id: string;
}>;
export declare function removerProfessor(academiaId: string, professorId: string): Promise<{
    status: import(".prisma/client").$Enums.VinculoStatus;
    id: string;
    criado_em: Date;
    atualizado_em: Date;
    professor_id: string;
    academia_id: string;
}>;
export declare function dashboardAlunosAcademia(academiaId: string): Promise<{
    usuario: {
        email: string;
        nome: string;
    };
    professor: {
        usuario: {
            nome: string;
        };
    } | null;
    id: string;
    treinos: {
        status: import(".prisma/client").$Enums.TreinoStatus;
        atualizado_em: Date;
    }[];
}[]>;
export declare function alterarStatusAcademia(academiaId: string, status: AcademiaStatus): Promise<{
    status: import(".prisma/client").$Enums.AcademiaStatus;
    id: string;
    nome: string;
    criado_em: Date;
    atualizado_em: Date;
    usuario_id: string;
    cnpj: string;
    max_professores: number;
    rejeitado_motivo: string | null;
}>;
//# sourceMappingURL=AcademiaService.d.ts.map