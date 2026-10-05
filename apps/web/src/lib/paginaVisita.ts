import { idDoVisitante } from './visitaLanding'

// Mesma lista do servidor (UsoService.caminhoPermitido): só páginas públicas indexáveis são contadas.
const FIXOS = new Set(['/', '/planos', '/register', '/politica-privacidade', '/app-para-personal-trainer', '/software-para-academia', '/app-de-treino', '/blog'])
const CHAVE_VISTAS = 'endorfin-paginas-vistas'

export function caminhoRastreavel(caminho: string): boolean {
  return FIXOS.has(caminho) || /^\/blog\/[a-z0-9]+(-[a-z0-9]+)*$/.test(caminho)
}

export interface DadosPagina {
  visitorId: string
  caminho: string
  referrer: string | null
  utm: string | null
}

/**
 * Conta uma visualização por página e por sessão do navegador (atualizar a página não duplica).
 * Anônimo: usa só o id aleatório do navegador; nunca envia IP nem dados pessoais. Falhas são silenciosas.
 */
export function rastrearPagina(
  caminho: string,
  busca: string,
  enviar: (dados: DadosPagina) => Promise<unknown>,
  documento: { referrer: string } = document,
  origemSite: string = window.location.origin,
): void {
  if (!caminhoRastreavel(caminho)) return
  let vistas: string[] = []
  try {
    vistas = JSON.parse(sessionStorage.getItem(CHAVE_VISTAS) ?? '[]')
    if (vistas.includes(caminho)) return
    sessionStorage.setItem(CHAVE_VISTAS, JSON.stringify([...vistas, caminho]))
  } catch {
    /* storage bloqueado: conta mesmo assim */
  }
  const primeira = vistas.length === 0
  enviar({
    visitorId: idDoVisitante(),
    caminho,
    // primeira página da sessão: de onde o visitante veio; as seguintes são navegação interna
    referrer: primeira ? documento.referrer || null : origemSite,
    utm: new URLSearchParams(busca).get('utm_source'),
  }).catch(() => {})
}
