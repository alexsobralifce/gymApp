import { useEffect, useState } from 'react'
import { api } from '../../api/client'

export default function RootUsuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  
  // Modal state
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  function fetchUsers() {
    setLoading(true)
    api.getUsuarios().then(setUsuarios).finally(() => setLoading(false))
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return
    try {
      await api.resetPassword(selectedUser.id, newPassword)
      setFeedback(`Senha do usuário "${selectedUser.nome}" resetada com sucesso!`)
      setSelectedUser(null)
      setNewPassword('')
    } catch {
      setFeedback('Erro ao resetar senha. Tente novamente.')
    }
    setTimeout(() => setFeedback(null), 3000)
  }

  const filtered = usuarios.filter(u => 
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="p-4 text-text-muted">Carregando usuários...</div>

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Gerenciar Usuários</h1>

      {feedback && (
        <div className={`mb-4 rounded p-3 text-sm ${feedback.includes('Erro') ? 'bg-red-500/10 text-red-400' : 'bg-surface-card text-success'}`}>
          {feedback}
        </div>
      )}

      <div className="mb-4">
        <input 
          type="text" 
          placeholder="Pesquisar por nome, e-mail ou tipo..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-lg bg-surface-card border border-surface-input">
        <table className="w-full text-left text-sm text-text">
          <thead className="bg-surface-input text-xs text-text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Tipo (Role)</th>
              <th className="px-4 py-3">ID do Usuário</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-input">
            {filtered.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-semibold">{u.nome}</td>
                <td className="px-4 py-3 text-text-muted">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-surface px-2 py-0.5 text-xs text-text">{u.role}</span>
                </td>
                <td className="px-4 py-3 text-xs text-text-muted font-mono">{u.id}</td>
                <td className="px-4 py-3">
                  {u.role !== 'ROOT' && (
                    <button 
                      onClick={() => setSelectedUser(u)} 
                      className="rounded bg-primary/10 px-2 py-1 text-xs text-primary font-medium"
                    >
                      Resetar Senha
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset Password Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleResetPassword} className="w-full max-w-sm rounded-lg bg-surface-card p-6 border border-surface-input space-y-4">
            <h2 className="text-lg font-bold text-text">Resetar Senha</h2>
            <p className="text-xs text-text-muted">
              Defina a nova senha para o usuário: <span className="font-semibold text-text">{selectedUser.nome}</span> ({selectedUser.email})
            </p>
            <div>
              <input 
                type="password" 
                placeholder="Nova senha (mínimo 8 caracteres)" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
                required
                minLength={8}
              />
            </div>
            <div className="flex gap-2">
              <button 
                type="submit" 
                className="flex-1 rounded bg-primary py-2 text-sm font-medium text-white"
              >
                Confirmar
              </button>
              <button 
                type="button" 
                onClick={() => setSelectedUser(null)}
                className="flex-1 rounded border border-surface-input py-2 text-sm font-medium text-text hover:bg-surface-input"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
