import { SearchIcon, XIcon } from '../icons/Icon'

interface BarraBuscaProps {
  value: string
  onChange: (valor: string) => void
  placeholder?: string
  /** Total de itens após o filtro; exibe "X de Y" quando há busca ativa. */
  total?: number
  filtrados?: number
  className?: string
}

export default function BarraBusca({
  value,
  onChange,
  placeholder = 'Buscar...',
  total,
  filtrados,
  className = '',
}: BarraBuscaProps) {
  const ativa = value.trim().length > 0
  return (
    <div className={`mb-4 ${className}`}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="input-base pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {ativa && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-text-muted hover:text-text cursor-pointer"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {ativa && total !== undefined && filtrados !== undefined && (
        <p className="mt-1.5 text-xs text-text-muted" aria-live="polite">
          {filtrados} de {total} resultado{total !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
