import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { CorrelacaoResponse } from '../../types/api'

export default function ProfessorAlunoCorrelacoes() {
  const { alunoId } = useParams<{ alunoId: string }>()
  const [data, setData] = useState<CorrelacaoResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!alunoId) return
    api.getAlunoCorrelacoes(alunoId).then(setData).finally(() => setLoading(false))
  }, [alunoId])

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>
  if (!data?.dados) return <div className="p-4 text-text-muted">Nenhuma correlação disponível.</div>

  const { dados } = data

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Evolução do Aluno</h1>

      {/* Correlações */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {Object.entries(dados.correlacoes).map(([key, val]) => (
          <div key={key} className="rounded-lg bg-surface-card p-4 text-center">
            <div className="text-3xl font-bold text-primary">{val.r !== null ? val.r.toFixed(2) : '?'}</div>
            <div className="mt-1 text-xs text-text-muted">{key.replace(/Vs/g, ' vs ')}</div>
            <div className="mt-1 text-xs text-text-muted">{val.interpretacao}</div>
          </div>
        ))}
      </div>

      {/* Volume semanal */}
      <h2 className="mb-3 text-sm font-semibold text-text-muted">Volume Semanal (kg)</h2>
      <div className="mb-6 space-y-2">
        {dados.volumeSemanal.map((v) => (
          <div key={v.semana} className="flex items-center justify-between rounded bg-surface-card px-3 py-2">
            <span className="text-sm text-text-muted">{v.semana}</span>
            <div className="flex gap-3 text-sm">
              <span className="text-text font-medium">{v.volumeTotalKg.toLocaleString()} kg</span>
              <span className="text-text-muted">{v.treinos} treinos</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pontos de correlação */}
      {dados.pontos.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold text-text-muted">Detalhamento</h2>
          <div className="space-y-2">
            {dados.pontos.map((p, i) => (
              <div key={i} className="rounded bg-surface-card p-3 text-sm">
                <div className="text-text-muted">{new Date(p.data).toLocaleDateString('pt-BR')}</div>
                <div className="mt-1 flex gap-3 text-xs">
                  {p.deltaPesoKg !== null && <span className="text-text">Δ Peso: {p.deltaPesoKg > 0 ? '+' : ''}{p.deltaPesoKg}kg</span>}
                  {p.deltaBf !== null && <span className="text-text">Δ BF: {p.deltaBf > 0 ? '+' : ''}{p.deltaBf}%</span>}
                  <span className="text-text-muted">Volume: {p.volumeAcumuladoKg.toLocaleString()}kg</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
