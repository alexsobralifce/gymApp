export function aplicarArtigos(dir: string, resposta: { total: number; artigos: Array<{ slug: string }> } | null): { gravados: string[]; removidos: string[]; mantido: boolean }
