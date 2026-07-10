import { useState } from 'react'
import { api } from '../../api/client'

export default function AlunoMedidas() {
  const [pesoKg, setPesoKg] = useState('')
  const [percentualBf, setPercentualBf] = useState('')
  const [massaMagraKg, setMassaMagraKg] = useState('')
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await api.criarMedida({
      pesoKg: pesoKg ? Number(pesoKg) : undefined,
      percentualBf: percentualBf ? Number(percentualBf) : undefined,
      massaMagraKg: massaMagraKg ? Number(massaMagraKg) : undefined,
      observacao: observacao || undefined,
    })
    setSucesso(true)
    setLoading(false)
    setPesoKg('')
    setPercentualBf('')
    setMassaMagraKg('')
    setObservacao('')
    setTimeout(() => setSucesso(false), 3000)
  }

  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-xl font-bold text-text">Registrar Medidas</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="number" step="0.1" placeholder="Peso (kg)" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" />
        <input type="number" step="0.1" placeholder="% Gordura Corporal (BF)" value={percentualBf} onChange={(e) => setPercentualBf(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" />
        <input type="number" step="0.1" placeholder="Massa Magra (kg)" value={massaMagraKg} onChange={(e) => setMassaMagraKg(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" />
        <input type="text" placeholder="Observação (opcional)" value={observacao} onChange={(e) => setObservacao(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" />

        <button type="submit" disabled={loading || (!pesoKg && !percentualBf && !massaMagraKg)}
          className="w-full rounded bg-primary py-2 text-sm font-medium text-white disabled:opacity-40">
          {loading ? 'Salvando...' : 'Salvar medida'}
        </button>
        {sucesso && <p className="text-center text-sm text-success">Medida registrada!</p>}
      </form>
    </div>
  )
}
