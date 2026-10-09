import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { alternativaDe, idiomaDoCaminho } from '../../lib/i18n'

const CHAVE = 'aviso-idioma-dispensado'

const TEXTO = {
  en: { msg: 'This page is available in English.', ver: 'View in English', fechar: 'Dismiss' },
  pt: { msg: 'Esta página está disponível em português.', ver: 'Ver em português', fechar: 'Dispensar' },
}

function lerDispensado(): boolean {
  try { return sessionStorage.getItem(CHAVE) === '1' } catch { return false }
}

/**
 * Sugere a outra versão quando o idioma do navegador difere do da página. É só um convite:
 * não redireciona (o Google recomenda uma URL por idioma) e não aparece no pré-render (navigator.webdriver).
 */
export default function AvisoIdioma({ caminho }: { caminho: string }) {
  const [alvo, setAlvo] = useState<{ idioma: 'pt' | 'en'; caminho: string } | null>(null)

  useEffect(() => {
    if (navigator.webdriver || lerDispensado()) return
    const alt = alternativaDe(caminho)
    if (!alt) return
    const navegadorEmIngles = navigator.language.toLowerCase().startsWith('en')
    const paginaEmIngles = idiomaDoCaminho(caminho) === 'en'
    if (navegadorEmIngles !== paginaEmIngles) setAlvo(alt)
    else setAlvo(null)
  }, [caminho])

  if (!alvo) return null
  const t = TEXTO[alvo.idioma]
  return (
    <div role="region" aria-label={t.ver} className="border-b border-border bg-surface-card">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">{t.msg}</span>
        <Link to={alvo.caminho} className="font-semibold text-primary underline">{t.ver}</Link>
        <button
          type="button"
          onClick={() => { try { sessionStorage.setItem(CHAVE, '1') } catch { /* sem storage: o aviso só some até recarregar */ } setAlvo(null) }}
          className="ml-auto min-h-11 min-w-11 text-muted-foreground hover:text-foreground"
          aria-label={t.fechar}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
