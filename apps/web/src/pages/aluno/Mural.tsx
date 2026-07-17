import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '../../api/client'
import { MessageCircleIcon } from '../../components/icons/Icon'
import PostCard from '../../components/social/PostCard'
import { SkeletonCard } from '../../components/ui/LoadingSpinner'
import type { SocialPost } from '../../types/api'

export default function Mural() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const observerRef = useRef<HTMLDivElement>(null)

  const carregarMais = useCallback(async () => {
    if (loadingMore || (!nextCursor && posts.length > 0)) return
    setLoadingMore(true)
    try {
      const res = await api.getMural(nextCursor || undefined)
      setPosts((prev) => [...prev, ...res.items])
      setNextCursor(res.nextCursor)
    } catch { /* ok */ }
    setLoadingMore(false)
  }, [nextCursor, loadingMore, posts.length])

  useEffect(() => {
    api.getMural()
      .then((res) => {
        setPosts(res.items)
        setNextCursor(res.nextCursor)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-4">
      <div className="flex items-center gap-3">
        <MessageCircleIcon className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-bold text-text">Mural</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-10 text-center">
          <MessageCircleIcon className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-30" />
          <p className="text-sm text-text-muted mb-1">Nenhum post no mural</p>
          <p className="text-xs text-text-muted">
            Siga amigos e treine para ver a atividade deles aqui.
          </p>
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
