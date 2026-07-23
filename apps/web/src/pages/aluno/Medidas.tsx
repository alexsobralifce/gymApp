import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { MedidaCorporal, PerfilAluno } from '../../types/api'

interface IMCClassification {
  label: string
  min: number | null
  max: number | null
  color: string
  bgClass: string
}

const IMC_TABLE: IMCClassification[] = [
  { label: 'Abaixo do peso', min: 0, max: 18.49, color: '#3b82f6', bgClass: 'bg-blue-500/20 text-blue-400' },
  { label: 'Peso normal', min: 18.5, max: 24.99, color: '#22c55e', bgClass: 'bg-success/20 text-success' },
  { label: 'Sobrepeso', min: 25, max: 29.99, color: '#f59e0b', bgClass: 'bg-amber-500/20 text-warning' },
  { label: 'Obesidade grau I', min: 30, max: 34.99, color: '#f97316', bgClass: 'bg-orange-500/20 text-orange-400' },
  { label: 'Obesidade grau II', min: 35, max: 39.99, color: '#ef4444', bgClass: 'bg-red-500/20 text-destructive' },
  { label: 'Obesidade grau III', min: 40, max: null, color: '#dc2626', bgClass: 'bg-red-700/30 text-red-500' },
]

const IMC_MIN = 10
const IMC_MAX = 45

function getIMCClassificacao(imc: number): IMCClassification {
  return IMC_TABLE.find(c =>
    (c.min === null || imc >= c.min) && (c.max === null || imc <= c.max)
  ) || IMC_TABLE[0]
}

function imcBarPosition(imc: number): number {
  return Math.max(0, Math.min(100, ((imc - IMC_MIN) / (IMC_MAX - IMC_MIN)) * 100))
}

function pesoAlturaDoPerfil(perfil: PerfilAluno | null, ultimaMedida: MedidaCorporal | null) {
  const peso = ultimaMedida?.peso_kg ?? perfil?.peso_kg ?? null
  const altura = ultimaMedida?.altura_cm ?? perfil?.altura_cm ?? null
  return { peso, altura }
}

export default function AlunoMedidas() {
  const [medidas, setMedidas] = useState<MedidaCorporal[]>([])
  const [perfil, setPerfil] = useState<PerfilAluno | null>(null)
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

  const carregarDados = useCallback(async () => {
    const [mData, pData] = await Promise.all([
      api.getMedidas(),
      api.getPerfilAluno(),
    ])
    setMedidas(mData)
    setPerfil(pData)
    return { mData, pData }
  }, [])

  useEffect(() => {
    carregarDados().then(({ mData, pData }) => {
      if (mData.length === 0 && pData.peso_kg && pData.altura_cm) {
        setPesoKg(pData.peso_kg.toString())
        setAlturaCm(pData.altura_cm.toString())
        setMostrarNovo(true)
      }
    }).finally(() => setLoading(false))
  }, [carregarDados])

  function abrirNovo() {
    const ultima = medidas.length > 0 ? medidas[medidas.length - 1] : null
    const { peso, altura } = pesoAlturaDoPerfil(perfil, ultima)
    setPesoKg(peso?.toString() || '')
    setAlturaCm(altura?.toString() || '')
    setPercentualBf('')
    setMassaMagraKg('')
    setObservacao('')
    setEditando(null)
    setMostrarNovo(true)
  }

  const ultimaMedida = medidas.length > 0 ? medidas[medidas.length - 1] : null
  const classificacao = ultimaMedida?.imc ? getIMCClassificacao(ultimaMedida.imc) : null
  const posicaoBarra = ultimaMedida?.imc ? imcBarPosition(ultimaMedida.imc) : 0

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
      await carregarDados()
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
      await carregarDados()
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
            onClick={abrirNovo}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 transition-all cursor-pointer"
          >
            + Nova
          </button>
        )}
      </div>

      {sucesso && (
        <div className={`rounded-xl p-3 text-sm text-center font-medium ${
          sucesso.includes('Erro') ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
        }`}>
          {sucesso}
        </div>
      )}

      {/* IMC Card – última medida */}
      {classificacao && ultimaMedida && (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Seu IMC</p>
              <p className="text-3xl font-bold text-text mt-0.5">
                {ultimaMedida.imc?.toFixed(1)}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {ultimaMedida.peso_kg} kg &middot; {ultimaMedida.altura_cm} cm
              </p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${classificacao.bgClass}`}>
              {classificacao.label}
            </div>
          </div>

          {/* IMC scale bar */}
          <div className="space-y-1.5">
            <div className="relative h-2 rounded-full bg-surface overflow-hidden">
              {IMC_TABLE.map((cat) => {
                const left = cat.min != null ? ((cat.min - IMC_MIN) / (IMC_MAX - IMC_MIN)) * 100 : 0
                const right = cat.max != null ? ((cat.max - IMC_MIN) / (IMC_MAX - IMC_MIN)) * 100 : 100
                const width = right - left
                return (
                  <div
                    key={cat.label}
                    className="absolute h-full"
                    style={{ left: `${left}%`, width: `${width}%`, backgroundColor: cat.color, opacity: 0.45 }}
                  />
                )
              })}
              <div
                className="absolute top-0 h-full w-1 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.6)] transition-all duration-500"
                style={{ left: `${posicaoBarra}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-text-muted">
              <span>{IMC_MIN}</span>
              <span>{IMC_MAX}</span>
            </div>
          </div>
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
              {medidas.map((m) => {
                const cat = m.imc ? getIMCClassificacao(m.imc) : null
                return (
                  <tr key={m.id} className="hover:bg-surface/30 transition-colors">
                    <td className="p-3 text-xs text-text-muted">{formatDate(m.data)}</td>
                    <td className="p-3 text-sm text-text">{m.peso_kg ? `${m.peso_kg} kg` : '-'}</td>
                    <td className="p-3 text-sm text-text">{m.altura_cm ? `${m.altura_cm} cm` : '-'}</td>
                    <td className="p-3 text-sm">
                      {m.imc ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cat?.bgClass}`}>
                          {m.imc.toFixed(1)}
                        </span>
                      ) : '-'}
                    </td>
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
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabela de Classificação IMC (OMS) */}
      <div className="rounded-2xl bg-surface-card border border-surface-input overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-input bg-surface/50">
          <h3 className="text-sm font-bold text-text">Classificação IMC (OMS)</h3>
        </div>
        <div className="divide-y divide-surface-input">
          {IMC_TABLE.map((cat) => {
            const range = cat.max === null
              ? `≥ ${cat.min}`
              : `${cat.min} – ${cat.max}`
            const isActive = classificacao?.label === cat.label
            return (
              <div
                key={cat.label}
                className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-white/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className={`${isActive ? 'text-text font-semibold' : 'text-text-muted'}`}>
                    {cat.label}
                    {isActive && (
                      <span className="ml-1.5 text-xs text-text-muted font-normal">(você)</span>
                    )}
                  </span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.bgClass}`}>
                  {range}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
