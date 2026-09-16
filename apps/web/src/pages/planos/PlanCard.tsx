import { CheckIcon, UsersIcon } from '../../components/icons/Icon'
import { formatarBRL, type PlanoPublico } from './plansData'

interface PlanCardProps {
  plano: PlanoPublico
  onSelecionar: (codigo: string) => void
}

export function PlanCard({ plano, onSelecionar }: PlanCardProps) {
  const semCusto = plano.precoMensal === 0
  const sobConsulta = plano.precoMensal === null

  return (
    <article
      className={[
        'relative flex flex-col rounded-2xl border bg-surface-card p-5 transition-transform',
        plano.destaque
          ? 'border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10'
          : 'border-border hover:border-primary/40',
      ].join(' ')}
      aria-label={`Plano ${plano.nome}`}
    >
      {plano.selo && (
        <span className="absolute -top-3 left-5 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
          {plano.selo}
        </span>
      )}

      <header className="mb-4">
        <h3 className="text-lg font-bold text-text">{plano.nome}</h3>
        <p className="mt-1 text-xs text-text-muted">{plano.subtitulo}</p>
      </header>

      <div className="mb-3">
        {sobConsulta ? (
          <p className="text-2xl font-extrabold text-text">Sob consulta</p>
        ) : semCusto ? (
          <p className="text-2xl font-extrabold text-text">Grátis</p>
        ) : (
          <p className="flex items-baseline gap-1 text-text">
            <span className="text-2xl font-extrabold">{formatarBRL(plano.precoMensal as number)}</span>
            <span className="text-xs text-text-muted">/mês</span>
          </p>
        )}

        {plano.porAluno !== null && plano.porAluno > 0 && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/12 px-3 py-1 text-xs font-bold text-primary">
            {formatarBRL(plano.porAluno)} por aluno
          </span>
        )}
      </div>

      <ul className="mb-5 space-y-1 text-xs text-text-muted">
        <li className="flex items-start gap-2">
          <UsersIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="font-semibold text-text">{plano.alunosLabel}</span>
        </li>
        {plano.professoresLabel && (
          <li className="flex items-start gap-2">
            <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="font-semibold text-text">{plano.professoresLabel}</span>
          </li>
        )}
        {plano.unidadesLabel && (
          <li className="flex items-start gap-2">
            <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="font-semibold text-text">{plano.unidadesLabel}</span>
          </li>
        )}
      </ul>

      <ul className="mb-6 flex-1 space-y-2 text-sm text-text-muted">
        {plano.recursos.map((recurso) => (
          <li key={recurso} className="flex items-start gap-2">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>{recurso}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onSelecionar(plano.codigo)}
        className={[
          'w-full rounded-xl px-4 py-3 text-sm font-bold transition-colors cursor-pointer',
          plano.destaque
            ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
            : 'border border-primary/50 text-primary hover:bg-primary/10',
        ].join(' ')}
      >
        {plano.ctaLabel}
      </button>
    </article>
  )
}

export default PlanCard