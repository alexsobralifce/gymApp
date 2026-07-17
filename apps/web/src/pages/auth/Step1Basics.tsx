import { formatPhone } from '../../lib/phone'

interface Step1BasicsProps {
  nome: string
  setNome: (v: string) => void
  email: string
  setEmail: (v: string) => void
  senha: string
  setSenha: (v: string) => void
  telefone: string
  setTelefone: (v: string) => void
  role: string
  setRole: (v: string) => void
}

export default function Step1Basics({
  nome, setNome, email, setEmail, senha, setSenha,
  telefone, setTelefone, role, setRole,
}: Step1BasicsProps) {
  return (
    <div className="space-y-4">
      <input
        type="text" placeholder="Nome completo" value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
        required minLength={2}
      />
      <input
        type="email" placeholder="Email" value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
        required
      />
      <input
        type="password" placeholder="Senha (mínimo 8 caracteres)" value={senha}
        onChange={(e) => setSenha(e.target.value)}
        className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
        required minLength={8}
      />
      <input
        type="tel" placeholder="WhatsApp (opcional)" value={telefone}
        onChange={(e) => setTelefone(formatPhone(e.target.value))}
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
    </div>
  )
}
