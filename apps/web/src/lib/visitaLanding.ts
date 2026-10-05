const CHAVE_VISITANTE = 'endorfin-visitor-id'
const CHAVE_SESSAO = 'endorfin-visita-registrada'

export function idDoVisitante(): string {
  try {
    const salvo = localStorage.getItem(CHAVE_VISITANTE)
    if (salvo) return salvo
    const novo = crypto.randomUUID()
    localStorage.setItem(CHAVE_VISITANTE, novo)
    return novo
  } catch {
    return crypto.randomUUID()
  }
}

/** Decide se esta sessão ainda precisa registrar a visita (uma por sessão do navegador). */
export function deveRegistrarVisita(): boolean {
  try {
    if (sessionStorage.getItem(CHAVE_SESSAO) === '1') return false
    sessionStorage.setItem(CHAVE_SESSAO, '1')
  } catch { /* storage bloqueado: registra mesmo assim */ }
  return true
}

/** Conta uma visita à landing. Falhas são silenciosas: métrica nunca atrapalha a página. */
export function registrarVisitaLanding(enviar: (visitorId: string) => Promise<unknown>): void {
  if (!deveRegistrarVisita()) return
  enviar(idDoVisitante()).catch(() => {})
}
