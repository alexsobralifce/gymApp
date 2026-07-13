import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../api/client'
import type { Academia } from '../../types/api'
import { formatPhone } from '../../lib/phone'

export default function Register() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState('ALUNO')
  const [academias, setAcademias] = useState<Academia[]>([])
  const [academiaId, setAcademiaId] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  const { register, loading, error } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (role === 'ALUNO') {
      api.getAcademias().then(setAcademias).catch(() => {})
    }
  }, [role])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await register(
      nome, email, senha, role,
      role === 'ALUNO' ? academiaId : undefined,
      telefone.replace(/\D/g, '') || undefined,
      dataNascimento || undefined,
      peso ? Number(peso) : undefined,
      altura ? Number(altura) : undefined,
    )
    navigate('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-surface-card p-6">
        <h1 className="text-2xl font-bold text-text">Cadastro</h1>

        {error && <p className="rounded bg-red-500/10 p-2 text-sm text-red-400">{error}</p>}

        <input
          type="text" placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          required
        />
        <input
          type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          required
        />
        <input
          type="password" placeholder="Senha (mínimo 8 caracteres)" value={senha} onChange={(e) => setSenha(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          required minLength={8}
        />
        <input
          type="tel" placeholder="WhatsApp (opcional)" value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          maxLength={16}
        />
        <select
          value={role} onChange={(e) => setRole(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
        >
          <option value="ALUNO">Aluno</option>
          <option value="PROFESSOR">Professor</option>
          <option value="ACADEMIA">Academia</option>
        </select>

        {role === 'ALUNO' && (
          <>
            <div>
              <label className="block text-xs text-text-muted mb-1">Data de nascimento</label>
              <input
                type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-text-muted mb-1">Peso (kg)</label>
                <input
                  type="number" step="0.1" min="0" placeholder="70.5" value={peso} onChange={(e) => setPeso(e.target.value)}
                  className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-text-muted mb-1">Altura (cm)</label>
                <input
                  type="number" step="1" min="0" placeholder="175" value={altura} onChange={(e) => setAltura(e.target.value)}
                  className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
                  required
                />
              </div>
            </div>
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
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <button
          type="submit" disabled={loading}
          className="w-full rounded bg-primary py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </button>
        <p className="text-center text-xs text-text-muted">
          Já tem conta? <Link to="/login" className="text-primary">Entrar</Link>
        </p>
      </form>
    </div>
  )
}
