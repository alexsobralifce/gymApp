import { useState } from 'react'

interface UsuarioItem {
  id: string
  nome: string
  role: string
}

export default function RootUsuarios() {
  const [usuarios] = useState<UsuarioItem[]>([])

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Gerenciar Usuários</h1>

      {usuarios.length === 0 && (
        <p className="text-text-muted">Nenhum usuário encontrado.</p>
      )}

      {usuarios.map((u) => (
        <div key={u.id} className="flex items-center justify-between rounded-lg bg-surface-card p-3 mb-2">
          <div>
            <span className="text-sm font-medium text-text">{u.nome}</span>
            <span className="ml-2 text-xs text-text-muted">{u.role}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
