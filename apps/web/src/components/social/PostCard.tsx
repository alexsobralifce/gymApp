import { useState } from 'react'
import { HeartIcon, MessageCircleIcon } from '../../components/icons/Icon'
import type { SocialPost, SocialComment } from '../../types/api'
import { api } from '../../api/client'

function tempoRelativo(data: string): string {
  const agora = Date.now()
  const post = new Date(data).getTime()
  const diff = Math.floor((agora - post) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return new Date(data).toLocaleDateString('pt-BR')
}

interface PostCardProps {
  post: SocialPost
  onCurtir: (postId: string) => void
  onDescurtir: (postId: string) => void
  onComentar: (postId: string, texto: string) => Promise<void>
}

const tipoBadge: Record<string, { label: string; color: string }> = {
  TREINO_INICIADO: { label: 'Treino iniciado', color: 'text-accent' },
  TREINO_CONCLUIDO: { label: 'Treino concluido', color: 'text-success' },
  RECORDE_PESSOAL: { label: 'Recorde pessoal', color: 'text-primary' },
  BADGE_CONQUISTADO: { label: 'Conquista', color: 'text-accent' },
  DESAFIO_COMPLETO: { label: 'Desafio completo', color: 'text-primary-light' },
}

export default function PostCard({ post, onCurtir, onDescurtir, onComentar }: PostCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [comentarios, setComentarios] = useState<SocialComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [novoTexto, setNovoTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [curtiu, setCurtiu] = useState(post.curtiu || false)
  const [curtidasCount, setCurtidasCount] = useState(post.curtidas_count)

  const badge = tipoBadge[post.tipo] || { label: post.tipo, color: 'text-text-muted' }

  const getInitials = (nome?: string) => {
    if (!nome) return '?'
    const parts = nome.split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return nome.slice(0, 2).toUpperCase()
  }

  async function handleCurtir() {
    try {
      if (curtiu) {
        await onDescurtir(post.id)
        setCurtidasCount((c) => c - 1)
      } else {
        await onCurtir(post.id)
        setCurtidasCount((c) => c + 1)
      }
      setCurtiu(!curtiu)
    } catch { /* ok */ }
  }

  async function handleToggleComments() {
    const novoEstado = !showComments
    setShowComments(novoEstado)
    if (novoEstado && comentarios.length === 0) {
      setLoadingComments(true)
      try {
        const res = await api.getComentarios(post.id)
        setComentarios(res.items)
      } catch { /* ok */ }
      setLoadingComments(false)
    }
  }

  async function handleComentar() {
    if (!novoTexto.trim() || enviando) return
    setEnviando(true)
    try {
      await onComentar(post.id, novoTexto.trim())
      setComentarios((prev) => [
        { id: String(Date.now()), post_id: post.id, aluno_id: '', autor_nome: 'Voce', texto: novoTexto.trim(), criado_em: new Date().toISOString() },
        ...prev,
      ])
      setNovoTexto('')
    } catch { /* ok */ }
    setEnviando(false)
  }

  return (
    <div className="rounded-2xl bg-surface-card border border-surface-input p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-bold text-white">
          {getInitials(post.autor_nome)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">{post.autor_nome}</p>
          <p className="text-xs text-text-muted">{tempoRelativo(post.criado_em)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.color} bg-white/5`}>
          {badge.label}
        </span>
      </div>

      {/* Grupo muscular */}
      {post.grupo_muscular_resumo && (
        <p className="text-xs text-text-muted mb-2">
          Grupos: {post.grupo_muscular_resumo}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-surface-input">
        <button
          onClick={handleCurtir}
          className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${curtiu ? 'text-primary' : 'text-text-muted hover:text-text'}`}
        >
          <HeartIcon className={`h-4 w-4 ${curtiu ? 'fill-primary text-primary' : ''}`} />
          {curtidasCount > 0 && <span>{curtidasCount}</span>}
        </button>
        <button
          onClick={handleToggleComments}
          className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${showComments ? 'text-text' : 'text-text-muted hover:text-text'}`}
        >
          <MessageCircleIcon className="h-4 w-4" />
          {post.comentarios_count > 0 && <span>{post.comentarios_count}</span>}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-surface-input space-y-3">
          {loadingComments ? (
            <p className="text-xs text-text-muted">Carregando...</p>
          ) : comentarios.length === 0 ? (
            <p className="text-xs text-text-muted">Nenhum comentario ainda.</p>
          ) : (
            comentarios.map((c) => (
              <div key={c.id} className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-input text-[10px] font-bold text-text-muted">
                  {c.autor_nome.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text">{c.autor_nome}</p>
                  <p className="text-xs text-text-muted break-words">{c.texto}</p>
                </div>
              </div>
            ))
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={novoTexto}
              onChange={(e) => setNovoTexto(e.target.value)}
              placeholder="Escreva um comentario..."
              maxLength={280}
              className="flex-1 rounded-xl border border-surface-input bg-surface-input px-3 py-2 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter') handleComentar() }}
            />
            <button
              onClick={handleComentar}
              disabled={!novoTexto.trim() || enviando}
              className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
            >
              {enviando ? '...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
