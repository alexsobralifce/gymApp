import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'

export default function AlterarSenha() {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)

    if (novaSenha.length < 8) {
      setFeedback({ tipo: 'erro', texto: 'A nova senha deve conter pelo menos 8 caracteres.' })
      return
    }

    if (novaSenha !== confirmarSenha) {
      setFeedback({ tipo: 'erro', texto: 'A confirmação de senha não coincide.' })
      return
    }

    try {
      setSaving(true)
      await api.alterarSenha(senhaAtual, novaSenha)
      setFeedback({ tipo: 'sucesso', texto: 'Senha alterada com sucesso! Redirecionando...' })
      setTimeout(() => navigate('/'), 2000)
    } catch (err: any) {
      console.error(err)
      const msg = err.response?.data?.message || 'Erro ao alterar senha. Verifique sua senha atual.'
      setFeedback({ tipo: 'erro', texto: msg })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Alterar Senha</h1>
        <p className="text-sm text-text-muted">Mantenha sua conta segura atualizando sua senha de acesso</p>
      </div>

      {feedback && (
        <div className={`rounded-xl p-4 text-sm font-semibold border ${
          feedback.tipo === 'erro' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-success/10 text-success border-success/20'
        }`}>
          {feedback.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-surface-card border border-surface-input rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-muted uppercase tracking-wider">Senha Atual</label>
          <input
            type="password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            className="w-full rounded-xl border border-surface-input bg-surface px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
            placeholder="Digite sua senha atual"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-muted uppercase tracking-wider">Nova Senha</label>
          <input
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            className="w-full rounded-xl border border-surface-input bg-surface px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
            placeholder="Nova senha (mínimo 8 caracteres)"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-muted uppercase tracking-wider">Confirmar Nova Senha</label>
          <input
            type="password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            className="w-full rounded-xl border border-surface-input bg-surface px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
            placeholder="Confirme a nova senha"
            required
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 rounded-xl border border-surface-input py-3 text-sm font-bold text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            {saving ? 'Salvando...' : 'Salvar Senha'}
          </button>
        </div>
      </form>
    </div>
  )
}
