import { useEffect } from 'react'
import { useIdiomaStore, useT } from '../../i18n'
import type { Idioma } from '../../lib/i18n'

const OPCOES: { id: Idioma; rotulo: string; sigla: string }[] = [
  { id: 'pt', rotulo: 'Português', sigla: 'PT' },
  { id: 'en', rotulo: 'English', sigla: 'EN' },
]

/** Mantém <html lang> igual ao idioma do app logado (as páginas públicas definem o próprio em useSeo). */
export function useLangDoApp(): void {
  const { idioma, locale } = useT()
  useEffect(() => {
    document.documentElement.lang = locale
  }, [idioma, locale])
}

export default function SeletorIdioma() {
  const { idioma, t } = useT()
  const definir = useIdiomaStore((s) => s.definir)
  return (
    <div role="group" aria-label={t('Idioma')} className="grid grid-cols-2 gap-1.5">
      {OPCOES.map((o) => (
        <button
          key={o.id}
          type="button"
          lang={o.id}
          aria-pressed={idioma === o.id}
          onClick={() => definir(o.id)}
          className={`min-h-9 rounded-xl border px-2 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            idioma === o.id
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-surface text-text-muted hover:bg-secondary hover:text-text'
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}
