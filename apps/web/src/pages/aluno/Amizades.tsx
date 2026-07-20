import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { UserSearchIcon, UsersIcon, XIcon } from '../../components/icons/Icon'
import FriendRequestCard from '../../components/social/FriendRequestCard'
import type { Amizade, AmizadePendente } from '../../types/api'

function getInitials(nome?: string): string {
  if (!nome) return '?'
  const parts = nome.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return nome.slice(0, 2).toUpperCase()
}

export default function Amizades() {
  const [tab, setTab] = useState<'amigos' | 'solicitacoes' | 'adicionar'>('amigos')
  const [amigos, setAmigos] = useState<Amizade[]>([])
  const [pendentes, setPendentes] = useState<AmizadePendente[]>([])
  const [emailBusca, setEmailBusca] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function carregar() {
    try {
      const [amigosRes, pendentesRes] = await Promise.all([
        api.getAmizades(),
        api.getAmizadesPendentes().catch(() => []),
      ])
      setAmigos(amigosRes)
      setPendentes(pendentesRes)
    } catch { /* ok */ }
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function handleSolicitar() {
    if (!emailBusca.trim()) return
    try {
      const res = await api.solicitarAmizade(emailBusca.trim())
      setFeedback(res.message || 'Solicitacao enviada!')
      setEmailBusca('')
      setTimeout(() => setFeedback(null), 3000)
    } catch (err: any) {
      setFeedback(err.message || 'Erro ao enviar solicitacao')
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  async function handleResponder(id: string, acao: 'ACEITAR' | 'RECUSAR') {
    await api.responderAmizade(id, acao)
    await carregar()
  }

  async function handleDesfazer(id: string) {
    await api.desfazerAmizade(id)
    setAmigos((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-4">
      <h1 className="text-lg font-bold text-text">Amigos</h1>

      {feedback && (
        <div className="rounded-xl bg-accent/10 border border-accent/20 p-3 text-sm text-accent text-center animate-slide-up">
          {feedback}
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl bg-surface-card border border-surface-input overflow-hidden">
        {[
          { key: 'amigos', label: 'Amigos', icon: UsersIcon },
          { key: 'solicitacoes', label: `Solicitacoes${pendentes.length > 0 ? ` (${pendentes.length})` : ''}`, icon: UserSearchIcon },
          { key: 'adicionar', label: 'Adicionar', icon: UserSearchIcon },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all cursor-pointer ${
              tab === key ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'amigos' && (
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-text-muted text-center py-4">Carregando...</p>
          ) : amigos.length === 0 ? (
            <div className="rounded-2xl bg-surface-card border border-surface-input p-8 text-center">
              <UsersIcon className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-30" />
              <p className="text-sm text-text-muted">Voce ainda nao tem amigos.</p>
              <p className="text-xs text-text-muted mt-1">Va para a aba Adicionar e encontre pessoas pelo email.</p>
            </div>
          ) : (
            amigos.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl bg-surface-card border border-surface-input p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-bold text-white">
                  {getInitials(a.nome)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text">{a.nome}</p>
                </div>
                <button
                  onClick={() => handleDesfazer(a.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 text-primary-light hover:bg-primary/10 transition-all cursor-pointer"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'solicitacoes' && (
        <div className="space-y-2">
          {pendentes.length === 0 ? (
            <div className="rounded-2xl bg-surface-card border border-surface-input p-8 text-center">
              <p className="text-sm text-text-muted">Nenhuma solicitacao pendente.</p>
            </div>
          ) : (
            pendentes.map((p) => (
              <FriendRequestCard key={p.id} amizade={p} onResponder={handleResponder} />
            ))
          )}
        </div>
      )}

      {tab === 'adicionar' && (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-4 space-y-3">
          <p className="text-xs text-text-muted">
            Encontre amigos pelo email cadastrado no GymApp.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailBusca}
              onChange={(e) => setEmailBusca(e.target.value)}
              placeholder="email@exemplo.com"
              className="flex-1 rounded-xl border border-surface-input bg-surface-input px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSolicitar() }}
            />
            <button
              onClick={handleSolicitar}
              disabled={!emailBusca.trim()}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
            >
              Solicitar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
