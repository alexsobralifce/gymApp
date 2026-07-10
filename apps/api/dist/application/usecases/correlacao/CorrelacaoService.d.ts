export declare function pearson(x: number[], y: number[]): number | null;
export declare function calcularEAtualizar(alunoId: string): Promise<{
    aluno_id: string;
    peso_volume_r: number | null;
    bf_volume_r: number | null;
    massa_magra_volume_r: number | null;
} | null>;
export declare function obterCorrelacoes(alunoId: string): Promise<{
    dados: null;
    sugerirAtualizacao: boolean;
    mensagem: string;
} | {
    dados: {
        alunoId: string;
        correlações: {
            pesoVsVolume: {
                r: number | null;
                interpretacao: string;
            };
            bfVsVolume: {
                r: number | null;
                interpretacao: string;
            };
            massaMagraVsVolume: {
                r: number | null;
                interpretacao: string;
            };
        };
        volumeSemanal: import("@prisma/client/runtime/library").JsonValue;
        pontos: import("@prisma/client/runtime/library").JsonValue;
        calculadoEm: string;
    };
    sugerirAtualizacao: boolean;
    mensagem: string | null;
}>;
//# sourceMappingURL=CorrelacaoService.d.ts.map