import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { MedidaCorporal } from '../../types/api'

export default function AlunoMedidas() {
  const [medidas, setMedidas] = useState<MedidaCorporal[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<MedidaCorporal | null>(null)
  const [mostrarNovo, setMostrarNovo] = useState(false)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [pesoKg, setPesoKg] = useState('')
  const [alturaCm, setAlturaCm] = useState('')
  const [percentualBf, setPercentualBf] = useState('')
  const [massaMagraKg, setMassaMagraKg] = useState('')
  const [observacao, setObservacao] = useState('')

  useEffect(() => {
    Promise.all([
      api.getMedidas(),
      api.getPerfilAluno(),
    ]).then(([mData, pData]) => {
      setMedidas(mData)
      if (mData.length === 0 && pData.peso_kg && pData.altura_cm) {
        setPesoKg(pData.peso_kg.toString())
        setAlturaCm(pData.altura_cm.toString())
        setMostrarNovo(true)
      }
    }).finally(() => setLoading(false))
  }, [])

  function resetForm() {
    setPesoKg('')
    setAlturaCm('')
    setPercentualBf('')
    setMassaMagraKg('')
    setObservacao('')
    setEditando(null)
    setMostrarNovo(false)
  }

  function preencherEdicao(m: MedidaCorporal) {
    setEditando(m)
    setMostrarNovo(false)
    setPesoKg(m.peso_kg?.toString() || '')
    setAlturaCm(m.altura_cm?.toString() || '')
    setPercentualBf(m.percentual_bf?.toString() || '')
    setMassaMagraKg(m.massa_magra_kg?.toString() || '')
    setObservacao(m.observacao || '')
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!pesoKg && !alturaCm && !percentualBf && !massaMagraKg) return
    setSaving(true)
    try {
      await api.criarMedida({
        pesoKg: pesoKg ? Number(pesoKg) : undefined,
        alturaCm: alturaCm ? Number(alturaCm) : undefined,
        percentualBf: percentualBf ? Number(percentualBf) : undefined,
        massaMagraKg: massaMagraKg ? Number(massaMagraKg) : undefined,
        observacao: observacao || undefined,
      })
      setSucesso('Medida registrada com sucesso!')
      resetForm()
      const data = await api.getMedidas()
      setMedidas(data)
    } catch {
      setSucesso('Erro ao registrar medida.')
    } finally {
      setSaving(false)
      setTimeout(() => setSucesso(null), 3000)
    }
  }

  async function handleAtualizar(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    setSaving(true)
    try {
      await api.updateMedida(editando.id, {
        pesoKg: pesoKg ? Number(pesoKg) : undefined,
        alturaCm: alturaCm ? Number(alturaCm) : undefined,
        percentualBf: percentualBf ? Number(percentualBf) : undefined,
        massaMagraKg: massaMagraKg ? Number(massaMagraKg) : undefined,
        observacao: observacao || undefined,
      })
      setSucesso('Medida atualizada com sucesso!')
      resetForm()
      const data = await api.getMedidas()
      setMedidas(data)
    } catch {
      setSucesso('Erro ao atualizar medida.')
    } finally {
      setSaving(false)
      setTimeout(() => setSucesso(null), 3000)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Medidas Corporais</h1>
        {!mostrarNovo && !editando && (
          <button
            onClick={() => setMostrarNovo(true)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 transition-all cursor-pointer"
          >
            + Nova
          </button>
        )}
      </div>

      {sucesso && (
        <div className={`rounded-xl p-3 text-sm text-center font-medium ${
          sucesso.includes('Erro') ? 'bg-red-500/10 text-red-400' : 'bg-success/10 text-success'
        }`}>
          {sucesso}
        </div>
      )}

      {/* Formulário (Novo ou Edição) */}
      {(mostrarNovo || editando) && (
        <form onSubmit={editando ? handleAtualizar : handleCriar} className="rounded-2xl bg-surface-card border border-surface-input p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text">
              {editando ? 'Editar Medida' : 'Nova Medida'}
            </h3>
            <button type="button" onClick={resetForm} className="text-text-muted hover:text-text text-sm cursor-pointer">Cancelar</button>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">Peso (kg)</label>
              <input type="number" step="0.1" placeholder="70.5" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)}
                className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">Altura (cm)</label>
              <input type="number" step="1" placeholder="175" value={alturaCm} onChange={(e) => setAlturaCm(e.target.value)}
                className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">% Gordura (BF)</label>
              <input type="number" step="0.1" placeholder="15.5" value={percentualBf} onChange={(e) => setPercentualBf(e.target.value)}
                className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">Massa Magra (kg)</label>
              <input type="number" step="0.1" placeholder="60" value={massaMagraKg} onChange={(e) => setMassaMagraKg(e.target.value)}
                className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" />
            </div>
          </div>
          <input type="text" placeholder="Observação (opcional)" value={observacao} onChange={(e) => setObservacao(e.target.value)}
            className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" />
          <button type="submit" disabled={saving || (!pesoKg && !alturaCm && !percentualBf && !massaMagraKg)}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer">
            {saving ? 'Salvando...' : editando ? 'Atualizar medida' : 'Registrar medida'}
          </button>
        </form>
      )}

      {/* Tabela / Lista de Medidas */}
      {medidas.length === 0 && !(mostrarNovo || editando) ? (
        <p className="text-sm text-text-muted bg-surface-card rounded-2xl p-6 border border-surface-input text-center">
          Nenhuma medida registrada ainda. Clique em "+ Nova" para começar.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-surface-card border border-surface-input">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-input bg-surface/50 text-xs font-semibold text-text-muted uppercase tracking-wider">
                <th className="p-3">Data</th>
                <th className="p-3">Peso</th>
                <th className="p-3">Altura</th>
                <th className="p-3">IMC</th>
                <th className="p-3">% BF</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-input">
              {medidas.map((m) => (
                <tr key={m.id} className="hover:bg-surface/30 transition-colors">
                  <td className="p-3 text-xs text-text-muted">{formatDate(m.data)}</td>
                  <td className="p-3 text-sm text-text">{m.peso_kg ? `${m.peso_kg} kg` : '-'}</td>
                  <td className="p-3 text-sm text-text">{m.altura_cm ? `${m.altura_cm} cm` : '-'}</td>
                  <td className="p-3 text-sm text-text">{m.imc ? m.imc.toFixed(1) : '-'}</td>
                  <td className="p-3 text-sm text-text">{m.percentual_bf ? `${m.percentual_bf}%` : '-'}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => preencherEdicao(m)}
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
