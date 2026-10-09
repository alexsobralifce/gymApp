import { useId, type ReactNode } from 'react'

/** Converte "70,5" ou "70.5" em número; vazio vira NaN. */
export function numero(texto: string): number {
  return texto.trim() === '' ? NaN : Number(texto.replace(',', '.'))
}

interface CampoNumeroProps {
  rotulo: string
  unidade: string
  valor: string
  aoMudar: (v: string) => void
  dica?: string
  inteiro?: boolean
}

/** Campo numérico: rótulo acima, 16px (sem zoom no iOS), altura de toque de 44px e teclado decimal. */
export function CampoNumero({ rotulo, unidade, valor, aoMudar, dica, inteiro }: CampoNumeroProps) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold mb-1.5">{rotulo}</label>
      <div className="flex h-11 items-stretch rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-ring">
        <input
          id={id}
          value={valor}
          onChange={(e) => aoMudar(e.target.value.replace(inteiro ? /[^\d]/g : /[^\d.,]/g, ''))}
          inputMode={inteiro ? 'numeric' : 'decimal'}
          autoComplete="off"
          aria-describedby={dica ? `${id}-dica` : undefined}
          className="min-w-0 flex-1 bg-transparent px-3 text-base outline-none"
        />
        <span className="flex items-center px-3 text-sm text-muted-foreground" aria-hidden="true">{unidade}</span>
      </div>
      {dica && <p id={`${id}-dica`} className="mt-1 text-xs text-muted-foreground">{dica}</p>}
    </div>
  )
}

interface OpcaoEscolha<T extends string> { valor: T; rotulo: string; dica?: string }

/** Grupo de opções excludentes (radio) em botões grandes. */
export function Escolha<T extends string>({ rotulo, opcoes, valor, aoMudar, colunas = 2 }: { rotulo: string; opcoes: OpcaoEscolha<T>[]; valor: T; aoMudar: (v: T) => void; colunas?: 1 | 2 }) {
  return (
    <fieldset>
      <legend className="block text-sm font-semibold mb-1.5">{rotulo}</legend>
      <div role="radiogroup" className={`grid gap-2 ${colunas === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {opcoes.map((o) => {
          const ativo = o.valor === valor
          return (
            <label
              key={o.valor}
              className={`flex min-h-11 cursor-pointer flex-col justify-center rounded-xl border px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring ${
                ativo ? 'border-primary bg-primary/10 font-semibold' : 'border-border bg-background hover:bg-surface-card'
              }`}
            >
              <input type="radio" className="sr-only" checked={ativo} onChange={() => aoMudar(o.valor)} />
              <span>{o.rotulo}</span>
              {o.dica && <span className="text-xs font-normal text-muted-foreground">{o.dica}</span>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export function Cartao({ children, titulo }: { children: ReactNode; titulo?: string }) {
  return (
    <section className="rounded-2xl border border-border bg-surface-card p-5 sm:p-6">
      {titulo && <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">{titulo}</h2>}
      {children}
    </section>
  )
}

export function Numero({ rotulo, valor, unidade, dica, destaque }: { rotulo: string; valor: string | number; unidade?: string; dica?: string; destaque?: boolean }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{rotulo}</p>
      <p className={`font-black leading-tight ${destaque ? 'text-5xl text-primary' : 'text-3xl'}`}>
        {valor}
        {unidade && <span className="ml-1.5 text-base font-semibold text-muted-foreground">{unidade}</span>}
      </p>
      {dica && <p className="text-xs text-muted-foreground mt-0.5">{dica}</p>}
    </div>
  )
}

/** Região anunciada por leitores de tela quando o resultado muda. */
export function Resultado({ children }: { children: ReactNode }) {
  return <div aria-live="polite" className="min-h-40">{children}</div>
}

export function Mensagem({ children, alerta }: { children: ReactNode; alerta?: boolean }) {
  return <p role={alerta ? 'alert' : undefined} className={`text-sm ${alerta ? 'text-destructive' : 'text-muted-foreground'}`}>{children}</p>
}
