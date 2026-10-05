export function artigosPublicados(): Array<{ slug: string; atualizadoEm: string; tipo?: string }>
export interface Rota { caminho: string; lastmod: string | null; indexavel: boolean }
export function montarRotas(fixas: string[], artigos: Array<{ slug: string; atualizadoEm: string; tipo?: string }>): Rota[]
export function rotasPublicas(): Rota[]
