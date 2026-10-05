// Envio das curadorias para a API do blog (a API grava no banco e agenda o redeploy do site).

/** Formato aceito por POST /blog/bot/artigos. */
export function payloadApi(artigo, slug, status) {
  return {
    slug,
    tipo: 'CURADORIA',
    status,
    titulo: artigo.titulo,
    descricao: artigo.descricao,
    categoria: artigo.categoria,
    autor: artigo.autor,
    resumo: artigo.resumo,
    secoes: artigo.secoes,
    fontes: artigo.fontes,
    origem: artigo.origem,
    cta: artigo.cta,
    publicadoEm: status === 'PUBLICADO' ? artigo.publicadoEm : null,
  }
}

function cabecalhos(token) {
  return { 'Content-Type': 'application/json', 'x-blog-bot-token': token }
}

export async function linksUsados(apiUrl, token) {
  const res = await fetch(`${apiUrl}/blog/bot/links`, { headers: cabecalhos(token), signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`GET /blog/bot/links: HTTP ${res.status}`)
  return (await res.json()).links
}

export async function enviarArtigos(apiUrl, token, artigos) {
  const res = await fetch(`${apiUrl}/blog/bot/artigos`, {
    method: 'POST',
    headers: cabecalhos(token),
    body: JSON.stringify({ artigos }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`POST /blog/bot/artigos: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`)
  return (await res.json()).artigos
}
