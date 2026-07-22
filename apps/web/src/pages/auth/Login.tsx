import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../api/client'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [notVerified, setNotVerified] = useState(false)
  const [resending, setResending] = useState(false)
  const { login, loading, error } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNotVerified(false)
    try {
      await login(email, senha)
      navigate('/')
    } catch (err: any) {
      if (err?.message?.includes('não verificado') || err?.message?.includes('verificado')) {
        setNotVerified(true)
      }
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await api.resendCode(email)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-surface-card p-6">
        <h1 className="text-2xl font-bold text-text">GymApp</h1>
        <p className="text-sm text-text-muted">Entre na sua conta</p>

        {error && !notVerified && <p className="rounded bg-red-500/10 p-2 text-sm text-red-400">{error}</p>}

        {notVerified && (
          <div className="rounded bg-amber-500/10 border border-amber-500/20 p-3 space-y-2">
            <p className="text-xs text-amber-400">E-mail não verificado. Verifique sua caixa de entrada ou reenvie o código.</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
            >
              {resending ? 'Reenviando...' : 'Reenviar código'}
            </button>
          </div>
        )}

        <input
          type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          required
        />
        <input
          type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          required
        />
        <button
          type="submit" disabled={loading}
          className="w-full rounded bg-primary py-2 text-sm font-medium text-white disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="text-center text-xs text-text-muted">
          Nao tem conta? <Link to="/register" className="text-primary">Cadastre-se</Link>
        </p>
      </form>
    </div>
  )
}
