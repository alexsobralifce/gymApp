import { useState } from 'react'
import { api } from '../../api/client'

export default function AcademiaDashboard() {
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [cadastrada, setCadastrada] = useState(false)

  async function handleCadastrar(e: React.FormEvent) {
    e.preventDefault()
    try {
      const a = await api.cadastrarAcademia({ nome, cnpj: cnpj.replace(/\D/g, '') })
      setFeedback(`Academia "${a.nome}" cadastrada! Aguardando aprovação do Root.`)
      setCadastrada(true)
    } catch {
      setFeedback('Erro ao cadastrar. Verifique o CNPJ (14 dígitos).')
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-md">
      <h1 className="mb-6 text-xl font-bold text-text">Cadastrar Academia</h1>

      {feedback && (
        <div className={`mb-4 rounded p-3 text-sm ${cadastrada ? 'bg-surface-card text-success' : 'bg-red-500/10 text-red-400'}`}>
          {feedback}
        </div>
      )}

      <form onSubmit={handleCadastrar} className="space-y-3">
        <div>
          <label className="block text-xs text-text-muted mb-1">Nome da academia</label>
          <input type="text" placeholder="Ex: Academia Iron Body" value={nome} onChange={(e) => setNome(e.target.value)}
            className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" required />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">CNPJ (apenas números)</label>
          <input type="text" placeholder="00000000000000" value={cnpj} onChange={(e) => setCnpj(e.target.value)}
            className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" required maxLength={14} />
        </div>
        <button type="submit" disabled={!nome || cnpj.replace(/\D/g, '').length !== 14}
          className="w-full rounded bg-primary py-2 text-sm font-medium text-white disabled:opacity-40">
          Cadastrar
        </button>
      </form>
    </div>
  )
}
