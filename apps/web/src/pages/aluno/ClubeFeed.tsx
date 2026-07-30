import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import PostCard from '../../components/social/PostCard'
import { SkeletonCard } from '../../components/ui/LoadingSpinner'
import {
  TrophyIcon,
  UsersIcon,
  LogOutIcon,
  ChevronLeftIcon,
  UserPlusIcon,
  CheckIcon,
  XIcon,
} from '../../components/icons/Icon'
import Toast from '../../components/ui/Toast'
import type { SocialPost, ClubeDetalhe, MembroClube } from '../../types/api'
import { getInitials } from '../../lib/initials'
import { resolveMediaUrl } from '../../lib/media'

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

  // Membros
  const [membros, setMembros] = useState<MembroClube[]>([])
  const [membrosOpen, setMembrosOpen] = useState(false)
  const [membrosLoading, setMembrosLoading] = useState(false)

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

  async function abrirMembros() {
    if (!id) return
    setMembrosOpen(true)
    setMembrosLoading(true)
    try {
      const data = await api.getMembrosClube(id)
      setMembros(data)
    } catch { /* ok */ }
    setMembrosLoading(false)
  }

  async function handleSeguir(alunoId: string) {
    try {
      await api.solicitarAmizadePorId(alunoId)
      setMembros((prev) => prev.map((m) =>
        m.alunoId === alunoId ? { ...m, seguindo: true } : m
      ))
      setToast('Solicitação enviada!')
    } catch { setToast('Erro ao seguir.') }
  }

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
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-text truncate">{clube?.nome || 'Clube'}</h1>
            {/* Badge: Membro do Clube */}
            <span className="shrink-0 rounded-full bg-accent/10 border border-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
              Membro
            </span>
          </div>
          {clube && (
            <button
              onClick={abrirMembros}
              className="text-xs text-text-muted flex items-center gap-1 hover:text-text transition-colors cursor-pointer"
            >
              <UsersIcon className="h-3 w-3" />
              {(clube as any).totalMembros || (clube as any).total_membros || 0} membros
            </button>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <button
          onClick={abrirMembros}
          className="flex-1 rounded-xl border border-surface-input bg-surface-card py-2.5 text-xs font-bold text-text hover:bg-surface-input/50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <UsersIcon className="h-4 w-4" />
          Membros
        </button>
        <button
          onClick={handleSair}
          className="rounded-xl border border-destructive/20 px-3 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/10 transition-all cursor-pointer flex items-center gap-1"
        >
          <LogOutIcon className="h-4 w-4" />
          Sair
        </button>
      </div>

      {/* Feed do Clube */}
      {posts.length === 0 ? (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-10 text-center">
          <TrophyIcon className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-30" />
          <p className="text-sm text-text-muted mb-1">Nenhuma atividade no clube ainda</p>
          <p className="text-xs text-text-muted">Os posts de treino dos membros aparecerão aqui automaticamente.</p>
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

      {/* Bottom Sheet: Membros */}
      {membrosOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setMembrosOpen(false)}
          />
          <div className="relative bg-surface-card border-t border-surface-input rounded-t-3xl shadow-2xl animate-modal-pop z-10 safe-bottom overflow-hidden max-h-[75vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-input shrink-0">
              <h3 className="text-base font-bold text-text flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-accent" />
                Membros do Clube
              </h3>
              <button
                onClick={() => setMembrosOpen(false)}
                className="rounded-full bg-surface-input p-2 text-text-muted hover:text-text cursor-pointer"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {membrosLoading ? (
                <p className="text-center text-sm text-text-muted py-4">Carregando...</p>
              ) : membros.length === 0 ? (
                <p className="text-center text-sm text-text-muted py-4">Nenhum membro encontrado.</p>
              ) : (
                <div className="space-y-0.5">
                  {membros.map((m) => (
                    <div
                      key={m.alunoId}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-input/50 transition-colors"
                    >
                      {resolveMediaUrl(m.fotoUrl) ? (
                        <img src={resolveMediaUrl(m.fotoUrl)!} alt="" className="h-8 w-8 rounded-full object-cover border border-surface-input shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-surface-input flex items-center justify-center text-xs font-bold text-text-muted shrink-0">
                          {getInitials(m.nome)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-text truncate">{m.nome}</p>
                          {m.role === 'CRIADOR' && (
                            <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">Criador</span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted">{m.xpSemana} XP na semana</p>
                      </div>
                      {m.role !== 'CRIADOR' && (
                        m.seguindo ? (
                          <span className="flex items-center gap-1 text-xs text-text-muted">
                            <CheckIcon className="h-3.5 w-3.5 text-success" />
                            Seguindo
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSeguir(m.alunoId)}
                            className="rounded-lg bg-primary/10 hover:bg-primary px-2.5 py-1 text-xs font-bold text-primary hover:text-primary-foreground transition-all shrink-0 cursor-pointer"
                          >
                            <UserPlusIcon className="h-3.5 w-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop modal for membros */}
      {membrosOpen && (
        <div className="hidden md:block fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMembrosOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-surface-card border border-surface-input shadow-2xl animate-modal-pop max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-input shrink-0">
              <h3 className="text-base font-bold text-text flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-accent" />
                Membros do Clube
              </h3>
              <button
                onClick={() => setMembrosOpen(false)}
                className="rounded-full bg-surface-input p-2 text-text-muted hover:text-text cursor-pointer"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {membros.map((m) => (
                <div key={m.alunoId} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-input/50 transition-colors">
                  {resolveMediaUrl(m.fotoUrl) ? (
                    <img src={resolveMediaUrl(m.fotoUrl)!} alt="" className="h-8 w-8 rounded-full object-cover border border-surface-input shrink-0" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-surface-input flex items-center justify-center text-xs font-bold text-text-muted shrink-0">
                      {getInitials(m.nome)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-text truncate">{m.nome}</p>
                      {m.role === 'CRIADOR' && (
                        <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">Criador</span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">{m.xpSemana} XP na semana</p>
                  </div>
                  {m.role !== 'CRIADOR' && (
                    m.seguindo ? (
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <CheckIcon className="h-3.5 w-3.5 text-success" />
                        Seguindo
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSeguir(m.alunoId)}
                        className="rounded-lg bg-primary/10 hover:bg-primary px-2.5 py-1 text-xs font-bold text-primary hover:text-primary-foreground transition-all shrink-0 cursor-pointer"
                      >
                        <UserPlusIcon className="h-3.5 w-3.5" />
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
