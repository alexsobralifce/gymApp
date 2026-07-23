import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import { Building2Icon } from '../icons/Icon'
import { resolveMediaUrl } from '../../lib/media'
import { getInitials } from '../../lib/initials'

interface Colega {
  id: string
  nome: string
  fotoUrl: string | null
}

function AvatarColega({ nome, fotoUrl }: { nome: string; fotoUrl: string | null }) {
  const [imgOk, setImgOk] = useState(true)
  const src = resolveMediaUrl(fotoUrl)
  const iniciais = getInitials(nome)

  if (src && imgOk) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setImgOk(false)}
        className="h-7 w-7 rounded-full object-cover border border-surface-input shrink-0"
      />
    )
  }

  return (
    <div className="h-7 w-7 rounded-full bg-surface-input flex items-center justify-center text-[10px] font-bold text-text-muted shrink-0 overflow-hidden">
      <span className="truncate max-w-full px-0.5">{iniciais}</span>
    </div>
  )
}

export default function AcademySidebar() {
  const user = useAuthStore((s) => s.user)
  const [colegas, setColegas] = useState<Colega[]>([])
  const [solicitados, setSolicitados] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user?.role !== 'ALUNO') return
    api.getColegasAcademia()
      .then(setColegas)
      .catch(() => {})
  }, [user])

  if (!user || user.role !== 'ALUNO' || colegas.length === 0) return null

  async function handleSeguir(alunoId: string) {
    try {
      await api.solicitarAmizadePorId(alunoId)
      setSolicitados((prev) => new Set(prev).add(alunoId))
    } catch {
      // silent
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-input">
        <Building2Icon className="h-4 w-4 text-text-muted" />
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Alunos da Academia</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-hide">
        {colegas.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-surface-input/50 transition-colors min-w-0"
          >
            <AvatarColega nome={c.nome} fotoUrl={c.fotoUrl} />
            <span className="text-xs text-text truncate flex-1 min-w-0">{c.nome}</span>
            {solicitados.has(c.id) ? (
              <span className="text-xs text-text-muted shrink-0">Enviado</span>
            ) : (
              <button
                onClick={() => handleSeguir(c.id)}
                className="rounded-lg bg-primary/10 hover:bg-primary px-2 py-0.5 text-xs font-bold text-primary hover:text-primary-foreground transition-all shrink-0 cursor-pointer"
              >
                Seguir
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
