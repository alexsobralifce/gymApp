import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'

export default function ProfessorVincularAluno() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.vincularAluno(undefined, email)
      setFeedback('Aluno vinculado com sucesso!')
      setEmail('')
      setTimeout(() => { setFeedback(null); navigate('/') }, 2000)
    } catch (err: any) {
      setFeedback(err.message || 'Erro ao vincular aluno. Verifique o email.')
    }
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Vincular Aluno</h1>

      <p className="mb-4 text-sm text-text-muted">
        Informe o email do aluno com role ALUNO para vinculá-lo ao seu perfil.
      </p>

      {feedback && (
        <div className={`mb-4 rounded p-3 text-sm ${feedback.includes('Erro') ? 'bg-destructive/10 text-destructive' : 'bg-surface-card text-success'}`}>
          {feedback}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-md space-y-3">
        <input
          type="email"
          placeholder="Email do aluno"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          required
        />
        <button
          type="submit"
          disabled={loading || !email}
          className="w-full rounded bg-primary py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {loading ? 'Vinculando...' : 'Vincular Aluno'}
        </button>
      </form>
    </div>
  )
}
