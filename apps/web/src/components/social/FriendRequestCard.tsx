import { XIcon, CheckIcon } from '../icons/Icon'
import type { AmizadePendente } from '../../types/api'
import { getInitials } from '../../lib/initials'

interface FriendRequestCardProps {
  amizade: AmizadePendente
  onResponder: (id: string, acao: 'ACEITAR' | 'RECUSAR') => void
}

export default function FriendRequestCard({ amizade, onResponder }: FriendRequestCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-card border border-surface-input p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-bold text-white">
        {getInitials(amizade.nome)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text">{amizade.nome}</p>
        <p className="text-xs text-text-muted">Quer ser seu amigo</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onResponder(amizade.id, 'ACEITAR')}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-success text-white hover:brightness-110 transition-all cursor-pointer"
        >
          <CheckIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => onResponder(amizade.id, 'RECUSAR')}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 text-primary-light hover:bg-primary/10 transition-all cursor-pointer"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
