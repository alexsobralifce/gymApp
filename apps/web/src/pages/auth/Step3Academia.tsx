import type { Academia } from '../../types/api'
import Select from '../../components/ui/Select'
import FormField from '../../components/ui/FormField'

interface Step3AcademyProps {
  modoVinculo: 'AUTOGESTAO' | 'ACADEMIA' | ''
  setModoVinculo: (v: 'AUTOGESTAO' | 'ACADEMIA' | '') => void
  academiaId: string
  setAcademiaId: (v: string) => void
  academias: Academia[]
  error?: string
}

export default function Step3Academy({
  modoVinculo,
  setModoVinculo,
  academiaId,
  setAcademiaId,
  academias,
  error,
}: Step3AcademyProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => { setModoVinculo('AUTOGESTAO'); setAcademiaId('AUTOGESTAO') }}
          className={`rounded-2xl border p-4 text-center transition-all cursor-pointer ${
            modoVinculo === 'AUTOGESTAO'
              ? 'border-primary bg-primary/10 ring-1 ring-primary'
              : error && modoVinculo === ''
              ? 'border-destructive/60 bg-surface-card hover:border-destructive'
              : 'border-surface-input bg-surface-card hover:border-text-muted'
          }`}
        >
          <div className="text-2xl mb-1">🎯</div>
          <p className="text-sm font-semibold text-text">Autogestão</p>
          <p className="text-xs text-text-muted mt-1 leading-tight">
            Monte seus treinos sem professor ou academia
          </p>
        </button>

        <button
          type="button"
          onClick={() => { setModoVinculo('ACADEMIA'); setAcademiaId('') }}
          className={`rounded-2xl border p-4 text-center transition-all cursor-pointer ${
            modoVinculo === 'ACADEMIA'
              ? 'border-primary bg-primary/10 ring-1 ring-primary'
              : error && modoVinculo === ''
              ? 'border-destructive/60 bg-surface-card hover:border-destructive'
              : 'border-surface-input bg-surface-card hover:border-text-muted'
          }`}
        >
          <div className="text-2xl mb-1">🏋️</div>
          <p className="text-sm font-semibold text-text">Academia</p>
          <p className="text-xs text-text-muted mt-1 leading-tight">
            Vinculado a uma academia e professor
          </p>
        </button>
      </div>

      {error && (
        <p className="text-xs text-destructive text-center font-medium">{error}</p>
      )}

      {modoVinculo === 'ACADEMIA' && (
        <FormField label="Selecione a academia" htmlFor="academia" error={error && !academiaId ? error : undefined} required>
          <Select
            id="academia"
            value={academiaId}
            onChange={(e) => setAcademiaId(e.target.value)}
            error={error && !academiaId ? error : undefined}
            required
          >
            <option value="">Selecionar...</option>
            {academias.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </Select>
        </FormField>
      )}

      {modoVinculo === 'AUTOGESTAO' && (
        <div className="rounded-xl bg-surface-card border border-surface-input p-4 text-sm text-text-muted">
          No modo <strong className="text-text">Autogestão</strong>, você monta seus próprios treinos
          e não tem vínculo com professor ou academia. Ideal para quem treina por conta própria.
        </div>
      )}
    </div>
  )
}
