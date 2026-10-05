export const SITE_PADRAO: string
export function montarPayloadIndexNow(site: string, chave: string, caminhos: string[]): { host: string; key: string; keyLocation: string; urlList: string[] }
export function lerContaDeServico(valor?: string): { client_email: string; private_key: string } | null
export function montarJwt(conta: { client_email: string; private_key: string }, escopo: string, agora?: number): string
export function tokenGoogle(conta: { client_email: string; private_key: string }, escopo: string): Promise<string>
export function propriedade(site: string): string
