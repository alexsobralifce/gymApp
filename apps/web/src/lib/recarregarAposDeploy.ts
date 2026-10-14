// Depois de um deploy os arquivos com hash mudam; quem está com o HTML antigo pede um chunk que não existe mais.
// Recarregar uma única vez busca o HTML novo. A trava em sessionStorage evita laço se o erro for outro.
const CHAVE = 'endorfinapp:recarregou-apos-deploy'
const JANELA_MS = 30_000

export function ehErroDeChunk(erro: unknown): boolean {
  const msg = erro instanceof Error ? erro.message : String(erro ?? '')
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(msg)
}

/** Recarrega a página se ainda não recarregou nos últimos 30 s. Devolve true quando recarregou. */
export function recarregarUmaVez(agora = Date.now()): boolean {
  try {
    const ultima = Number(sessionStorage.getItem(CHAVE) ?? 0)
    if (agora - ultima < JANELA_MS) return false
    sessionStorage.setItem(CHAVE, String(agora))
  } catch {
    return false
  }
  window.location.reload()
  return true
}

export function instalarRecargaAposDeploy() {
  window.addEventListener('vite:preloadError', (e) => {
    if (recarregarUmaVez()) e.preventDefault()
  })
}
