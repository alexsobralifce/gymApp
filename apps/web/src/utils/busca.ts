/** Remove acentos e caixa para comparar textos ("João" casa com "joao"). */
export function normalizarTexto(valor: string | null | undefined): string {
  return (valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Filtra itens cujo texto (campos extraídos por `campos`) contém todos os termos da busca.
 * Busca vazia devolve a lista original.
 */
export function filtrarPorTexto<T>(
  itens: T[],
  busca: string,
  campos: (item: T) => Array<string | null | undefined>,
): T[] {
  const termos = normalizarTexto(busca).split(/\s+/).filter(Boolean)
  if (termos.length === 0) return itens
  return itens.filter((item) => {
    const texto = campos(item).map(normalizarTexto).join(' ')
    return termos.every((t) => texto.includes(t))
  })
}
