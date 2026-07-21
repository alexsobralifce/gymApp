import { useState } from 'react'
import { HeartIcon, MessageCircleIcon } from '../../components/icons/Icon'
import type { SocialPost, SocialComment } from '../../types/api'
import { api } from '../../api/client'
import { resolveMediaUrl } from '../../lib/media'

function formatHora(dataStr: string): string {
  try {
    const d = new Date(dataStr)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function tempoRelativo(data: string): string {
  const agora = Date.now()
  const post = new Date(data).getTime()
  const diff = Math.floor((agora - post) / 1000)
  const horaStr = formatHora(data)

  if (diff < 60) return `agora (${horaStr})`
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás (${horaStr})`
  if (diff < 86400) return `hoje às ${horaStr}`

  const d = new Date(data)
  const ontem = new Date()
  ontem.setDate(ontem.getDate() - 1)
  if (d.toDateString() === ontem.toDateString()) return `ontem às ${horaStr}`

  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${horaStr}`
}

function gerarMensagemPost(post: SocialPost): string {
  const hora = formatHora(post.criado_em)
  if (post.tipo === 'TREINO_INICIADO') {
    return post.academia_nome
      ? `iniciou o treino às ${hora} na ${post.academia_nome} 🔥`
      : `iniciou o treino às ${hora} 🔥`
  }
  if (post.tipo === 'TREINO_CONCLUIDO') {
    return post.academia_nome
      ? `concluiu o treino às ${hora} na ${post.academia_nome}! 💪`
      : `concluiu o treino às ${hora}! 💪`
  }
  return ''
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
  const [curtidoEm, setCurtidoEm] = useState<string | null>(post.curtido_em ? formatHora(post.curtido_em) : null)

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
        setCurtidasCount((c) => Math.max(c - 1, 0))
        setCurtidoEm(null)
      } else {
        await onCurtir(post.id)
        setCurtidasCount((c) => c + 1)
        setCurtidoEm(formatHora(new Date().toISOString()))
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
    <div className="rounded-2xl bg-surface-card border border-surface-input p-4 animate-fade-in space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        {resolveMediaUrl(post.autor_foto_url) ? (
          <img
            src={resolveMediaUrl(post.autor_foto_url)!}
            alt={post.autor_nome}
            className="h-10 w-10 shrink-0 rounded-full object-cover border border-surface-input"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-bold text-white">
            {getInitials(post.autor_nome)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">{post.autor_nome}</p>
          <p className="text-[11px] text-text-muted">{tempoRelativo(post.criado_em)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${badge.color} bg-white/5 border border-white/10`}>
          {badge.label}
        </span>
      </div>

      {/* Content */}
      {post.grupo_muscular_resumo && (
        <div className="flex flex-wrap gap-1.5">
          {post.grupo_muscular_resumo.split(', ').map((g) => (
            <span key={g} className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {g}
            </span>
          ))}
        </div>
      )}

      <p className="text-sm text-text-muted leading-relaxed">
        <strong className="text-text">{post.autor_nome}</strong> {gerarMensagemPost(post)}
      </p>

      {resolveMediaUrl(post.midia_url) && (
        <div className="overflow-hidden rounded-xl border border-surface-input">
          <img
            src={resolveMediaUrl(post.midia_url)!}
            alt="Foto do treino"
            className="w-full h-auto object-cover"
            style={{ maxHeight: 'min(65vw, 340px)', aspectRatio: '4/3' }}
            loading="lazy"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-surface-input">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleCurtir}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${curtiu ? 'text-primary' : 'text-text-muted hover:text-text'}`}
          >
            <HeartIcon className={`h-4 w-4 ${curtiu ? 'fill-primary text-primary' : ''}`} />
            <span>{curtidasCount > 0 ? curtidasCount : 'Curtir'}</span>
          </button>
          <button
            type="button"
            onClick={handleToggleComments}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${showComments ? 'text-text' : 'text-text-muted hover:text-text'}`}
          >
            <MessageCircleIcon className="h-4 w-4" />
            <span>{post.comentarios_count > 0 ? `${post.comentarios_count} comentários` : 'Comentar'}</span>
          </button>
        </div>

        {curtiu && (
          <span className="text-[10px] text-primary/80 font-medium">
            ✓ Curtido {curtidoEm ? `às ${curtidoEm}` : ''}
          </span>
        )}
      </div>

      {/* Comments */}
      {showComments && (
        <div className="pt-3 border-t border-surface-input space-y-3">
          {loadingComments ? (
            <p className="text-xs text-text-muted">Carregando comentários...</p>
          ) : comentarios.length === 0 ? (
            <p className="text-xs text-text-muted italic">Nenhum comentário ainda. Seja o primeiro!</p>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {comentarios.map((c) => (
                <div key={c.id} className="flex gap-2.5 p-2 rounded-xl bg-surface border border-surface-input">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-input text-[10px] font-bold text-text-muted">
                    {c.autor_nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-text">{c.autor_nome}</p>
                      <span className="text-[9px] text-text-muted">{formatHora(c.criado_em)}</span>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed mt-0.5 break-words">{c.texto}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={novoTexto}
              onChange={(e) => setNovoTexto(e.target.value)}
              placeholder="Escreva um comentário..."
              maxLength={280}
              className="flex-1 rounded-xl border border-surface-input bg-surface-input px-3 py-2 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter') handleComentar() }}
            />
            <button
              type="button"
              onClick={handleComentar}
              disabled={!novoTexto.trim() || enviando}
              className="rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer shrink-0"
            >
              {enviando ? '...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
