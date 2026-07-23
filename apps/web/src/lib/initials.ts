/** Iniciais seguras a partir do nome (evita "EUNDEFINED" com espaços extras). */
export function getInitials(nome?: string | null): string {
  if (!nome?.trim()) return '?'
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  if (!first) return '?'
  if (parts.length === 1) {
    const second = parts[0][1]
    return (first + (second || '')).toUpperCase() || '?'
  }
  const last = parts[parts.length - 1][0]
  return (first + (last || '')).toUpperCase()
}
