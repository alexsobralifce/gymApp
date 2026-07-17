import type { Academia } from '../../types/api'

interface Step3AcademyProps {
  academiaId: string
  setAcademiaId: (v: string) => void
  academias: Academia[]
}

export default function Step3Academy({ academiaId, setAcademiaId, academias }: Step3AcademyProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-text-muted mb-1">Academia</label>
        <select
          value={academiaId}
          onChange={(e) => setAcademiaId(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          required
        >
          <option value="">Selecionar...</option>
          <option value="AUTOGESTAO">Autogestão (sem academia)</option>
          {academias.map((a) => (
            <option key={a.id} value={a.id}>{a.nome}</option>
          ))}
        </select>
      </div>
      {academiaId === 'AUTOGESTAO' && (
        <div className="rounded-xl bg-surface-card border border-surface-input p-4 text-sm text-text-muted">
          No modo <strong className="text-text">Autogestão</strong>, você monta seus próprios treinos
          e não tem vínculo com professor ou academia. Ideal para quem treina por conta própria.
        </div>
      )}
    </div>
  )
}
