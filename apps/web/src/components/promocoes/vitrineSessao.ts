const CHAVE = 'vitrine-promocoes-vista'

/** A vitrine aparece uma vez por sessão do navegador. */
export function vitrineJaVista(): boolean {
  try {
    return sessionStorage.getItem(CHAVE) === '1'
  } catch {
    return false
  }
}

export function marcarVitrineVista(): void {
  try {
    sessionStorage.setItem(CHAVE, '1')
  } catch { /* storage indisponível: aceita reexibir */ }
}
