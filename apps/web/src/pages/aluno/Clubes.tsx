import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { TrophyIcon, Building2Icon } from '../../components/icons/Icon'
import type { LeaderboardEntry } from '../../types/api'
import { getInitials } from '../../lib/initials'

export default function Clubes() {
  const [academia, setAcademia] = useState<{ nome: string; id: string } | null>(null)
  const [leaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const p = await api.getPerfilAluno().catch(() => null)
        if (p?.academia) {
          setAcademia({ nome: p.academia.nome, id: p.academia.id || '' })
        }
      } catch { /* ok */ }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-xl mx-auto w-full">
        <p className="text-sm text-text-muted">Carregando...</p>
      </div>
    )
  }

  if (!academia) {
    return (
      <div className="px-4 py-6 max-w-xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <Building2Icon className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold text-text">Clubes</h1>
        </div>
        <div className="rounded-2xl bg-surface-card border border-surface-input p-8 text-center">
          <Building2Icon className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-30" />
          <p className="text-sm text-text-muted">Você não está vinculado a uma academia.</p>
          <p className="text-xs text-text-muted mt-1">Vincule-se a uma academia para participar do clube e do leaderboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-3">
        <TrophyIcon className="h-6 w-6 text-accent" />
        <h1 className="text-lg font-bold text-text">Clubes</h1>
      </div>

      <div className="rounded-2xl gradient-card border border-surface-input p-5">
        <div className="flex items-center gap-3">
          <Building2Icon className="h-8 w-8 text-accent" />
          <div>
            <h2 className="text-base font-bold text-text">{academia.nome}</h2>
            <p className="text-xs text-text-muted">Clube da academia</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-text mb-3 uppercase tracking-wider">Leaderboard Semanal</h3>
        {leaderboard.length === 0 ? (
          <div className="rounded-2xl bg-surface-card border border-surface-input p-8 text-center">
            <TrophyIcon className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-30" />
            <p className="text-sm text-text-muted">Leaderboard em breve.</p>
            <p className="text-xs text-text-muted mt-1">A pontuacao semanal esta sendo implementada. Treine para garantir sua posicao!</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-card border border-surface-input overflow-hidden">
            {leaderboard.map((entry, i) => {
              const medal = i === 0 ? 'text-accent' : i === 1 ? 'text-text-muted' : i === 2 ? 'text-primary-light' : ''
              return (
                <div key={entry.aluno_id} className="flex items-center gap-3 px-4 py-3 border-b border-surface-input last:border-0 hover:bg-white/5 transition-colors">
                  <span className={`w-7 text-center text-sm font-bold ${medal || 'text-text-muted'}`}>{i + 1}</span>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
                    {getInitials(entry.nome)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text">{entry.nome}</p>
                  </div>
                  <span className="text-sm font-bold text-accent">{entry.xp_semana} XP</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
