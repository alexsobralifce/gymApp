// Filtro, pontuação e escolha dos itens (funções puras, testadas em src/curadoria.test.ts).
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function pontuar(item, config, peso = 1) {
  const titulo = norm(item.titulo)
  const corpo = norm(`${item.trecho} ${item.categorias.join(' ')}`)
  const conta = (texto, lista) => lista.filter((p) => texto.includes(norm(p))).length
  if (conta(`${titulo} ${corpo}`, config.negativas) > 0) return 0
  const pontos = conta(titulo, config.positivas) * 2 + conta(corpo, config.positivas)
  return pontos >= 2 ? pontos * peso : 0
}

export function ehRecente(item, janelaDias, agora = new Date()) {
  return item.data && agora - item.data <= janelaDias * 86400000 && item.data <= agora
}

export function canonicalizarLink(url) {
  try {
    const u = new URL(url)
    u.hash = ''
    ;['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((p) => u.searchParams.delete(p))
    return u.toString().replace(/\/$/, '')
  } catch {
    return url
  }
}

/** Ordena candidatos por pontuação, sem repetir links do histórico. */
export function rankear(itensPorFonte, config, historico, agora = new Date()) {
  const jaUsados = new Set(historico.map(canonicalizarLink))
  const vistos = new Set()
  const candidatos = []
  for (const { fonte, itens } of itensPorFonte) {
    for (const item of itens) {
      const link = canonicalizarLink(item.link)
      if (jaUsados.has(link) || vistos.has(link) || !ehRecente(item, config.janelaDias, agora)) continue
      vistos.add(link)
      const pontos = pontuar(item, config, fonte.peso)
      if (pontos > 0) candidatos.push({ fonte, item: { ...item, link }, pontos })
    }
  }
  return candidatos.sort((a, b) => b.pontos - a.pontos)
}

/** Prefere variedade: no máximo um por fonte e, se possível, países diferentes. */
export function escolher(candidatos, quantidade = 2) {
  const escolhidos = []
  for (const c of candidatos) {
    if (escolhidos.length >= quantidade) break
    if (escolhidos.some((e) => e.fonte.id === c.fonte.id)) continue
    if (escolhidos.length > 0 && escolhidos.every((e) => e.fonte.pais === c.fonte.pais) && quantidade - escolhidos.length === 1) {
      const outroPais = candidatos.find((x) => x.fonte.pais !== c.fonte.pais && x.fonte.id !== c.fonte.id && !escolhidos.some((e) => e.fonte.id === x.fonte.id))
      if (outroPais) {
        escolhidos.push(outroPais)
        continue
      }
    }
    escolhidos.push(c)
  }
  return escolhidos
}
