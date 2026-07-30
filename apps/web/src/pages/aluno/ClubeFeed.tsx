import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import PostCard from '../../components/social/PostCard'
import { SkeletonCard } from '../../components/ui/LoadingSpinner'
import { TrophyIcon, UsersIcon, LogOutIcon, ChevronLeftIcon } from '../../components/icons/Icon'
import Toast from '../../components/ui/Toast'
import type { SocialPost, ClubeDetalhe } from '../../types/api'

export default function ClubeFeed() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [clube, setClube] = useState<ClubeDetalhe | null>(null)
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const observerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.getClubeDetalhe(id).catch(() => null),
      api.getMuralClube(id),
    ]).then(([clubeData, mural]) => {
      if (clubeData) setClube(clubeData)
      if (mural) {
        setPosts(mural.items)
        setNextCursor(mural.nextCursor)
      }
    }).finally(() => setLoading(false))
  }, [id])

  const carregarMais = useCallback(async () => {
    if (!id || loadingMore || !nextCursor) return
    setLoadingMore(true)
    try {
      const res = await api.getMuralClube(id, nextCursor)
      setPosts((prev) => [...prev, ...res.items])
      setNextCursor(res.nextCursor)
    } catch { /* ok */ }
    setLoadingMore(false)
  }, [id, nextCursor, loadingMore])

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) carregarMais() },
      { threshold: 0.5 },
    )
    if (observerRef.current) obs.observe(observerRef.current)
    return () => obs.disconnect()
  }, [carregarMais])

  async function handleCurtir(postId: string) {
    await api.curtirPost(postId).catch(() => {})
  }

  async function handleDescurtir(postId: string) {
    await api.descurtirPost(postId).catch(() => {})
  }

  async function handleComentar(postId: string, texto: string) {
    await api.comentarPost(postId, texto)
  }

  async function handleSair() {
    if (!id) return
    try {
      await api.sairClube(id)
      setToast('Saiu do clube.')
      navigate('/clubes')
    } catch { setToast('Erro ao sair do clube.') }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-4">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/clubes')}
          className="rounded-xl p-2 text-text-muted hover:text-text hover:bg-surface-input transition-all cursor-pointer"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <TrophyIcon className="h-6 w-6 text-accent" />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-text truncate">{clube?.nome || 'Clube'}</h1>
          {clube && (
            <p className="text-xs text-text-muted flex items-center gap-1">
              <UsersIcon className="h-3 w-3" />
              {(clube as any).totalMembros || (clube as any).total_membros || 0} membros
            </p>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <button
          onClick={() => navigate('/clubes')}
          className="flex-1 rounded-xl border border-surface-input bg-surface-card py-2.5 text-xs font-bold text-text hover:bg-surface-input/50 transition-all cursor-pointer"
        >
          Voltar para Clubes
        </button>
        <button
          onClick={handleSair}
          className="rounded-xl border border-destructive/20 px-3 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/10 transition-all cursor-pointer flex items-center gap-1"
        >
          <LogOutIcon className="h-4 w-4" />
          Sair
        </button>
      </div>

      {/* Feed */}
      {posts.length === 0 ? (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-10 text-center">
          <TrophyIcon className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-30" />
          <p className="text-sm text-text-muted mb-1">Nenhuma atividade no clube ainda</p>
          <p className="text-xs text-text-muted">Os posts de treino dos membros aparecerão aqui.</p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onCurtir={handleCurtir}
              onDescurtir={handleDescurtir}
              onComentar={handleComentar}
            />
          ))}

          {nextCursor && (
            <div ref={observerRef} className="flex justify-center py-4">
              {loadingMore ? (
                <span className="text-xs text-text-muted">Carregando...</span>
              ) : (
                <span className="text-xs text-text-muted opacity-0">.</span>
              )}
            </div>
          )}

          {!nextCursor && posts.length > 0 && (
            <p className="text-center text-xs text-text-muted py-4">Voce viu tudo!</p>
          )}
        </>
      )}
    </div>
  )
}
