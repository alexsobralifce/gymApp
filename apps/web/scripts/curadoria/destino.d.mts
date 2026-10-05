export function payloadApi(artigo: any, slug: string, status: 'PUBLICADO' | 'RASCUNHO'): any
export function linksUsados(apiUrl: string, token: string): Promise<string[]>
export function enviarArtigos(apiUrl: string, token: string, artigos: any[]): Promise<Array<{ slug: string; id: string; criado: boolean }>>
