/** Iniciais seguras (máx. 2 letras). Nunca retorna "undefined". */
export function getInitials(nome?: string | null): string {
  if (nome == null) return '?'
  const cleaned = String(nome)
    .replace(/\bundefined\b/gi, ' ')
    .replace(/\bnull\b/gi, ' ')
    .trim()
  if (!cleaned) return '?'

  const parts = cleaned.split(/\s+/).filter((p) => p.length > 0)
  if (parts.length === 0) return '?'

  const a = parts[0]?.charAt(0)
  if (!a || a === 'u' && parts[0].toLowerCase() === 'undefined') return '?'

  if (parts.length === 1) {
    const b = parts[0].charAt(1)
    return (a + (b || '')).toUpperCase().slice(0, 2)
  }

  const lastPart = parts[parts.length - 1]
  const b = lastPart?.charAt(0)
  if (!b || lastPart.toLowerCase() === 'undefined') {
    return a.toUpperCase()
  }

  return (a + b).toUpperCase().slice(0, 2)
}
