import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { MedidaCorporal, CorrelacaoResponse } from '../../types/api'

export default function AlunoEvolucao() {
  const [medidas, setMedidas] = useState<MedidaCorporal[]>([])
  const [correlacao, setCorrelacao] = useState<CorrelacaoResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getMedidas(),
      api.getCorrelacoes(),
    ]).then(([m, c]) => {
      setMedidas(m)
      setCorrelacao(c)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-text">Evolução</h1>

      {/* Correlações */}
      {correlacao?.dados && (
        <div className="mb-6 space-y-2">
          <h2 className="text-sm font-semibold text-text-muted">Correlações Peso x Volume</h2>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(correlacao.dados.correlacoes).map(([key, val]) => (
              <div key={key} className="rounded bg-surface-card p-3 text-center">
                <div className="text-2xl font-bold text-primary">{val.r !== null ? val.r.toFixed(2) : '?'}</div>
                <div className="text-xs text-text-muted">{key.replace('Vs', ' vs ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {correlacao?.sugerirAtualizacao && (
        <button
          onClick={() => api.calcularCorrelacoes().then(setCorrelacao)}
          className="mb-4 w-full rounded bg-surface-card py-2 text-sm text-text-muted"
        >
          Dados desatualizados. Recalcular?
        </button>
      )}

      {/* Histórico de medidas */}
      <h2 className="mb-3 text-sm font-semibold text-text-muted">Histórico de Medidas</h2>
      {medidas.length === 0 && <p className="text-text-muted text-sm">Nenhuma medida registrada.</p>}
      <div className="space-y-2">
        {medidas.map((m) => (
          <div key={m.id} className="rounded bg-surface-card p-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">{new Date(m.data).toLocaleDateString('pt-BR')}</span>
              <span className="text-text font-medium">{m.peso_kg ? `${m.peso_kg}kg` : ''}</span>
            </div>
            <div className="mt-1 flex gap-3 text-xs text-text-muted">
              {m.percentual_bf != null && <span>BF: {m.percentual_bf}%</span>}
              {m.massa_magra_kg != null && <span>MM: {m.massa_magra_kg}kg</span>}
            </div>
            {m.observacao && <p className="mt-1 text-xs text-text-muted italic">{m.observacao}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
