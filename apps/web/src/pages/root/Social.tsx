import { useEffect, useState, useCallback } from 'react'
import { api } from '../../api/client'

type SocialTab = 'mural' | 'clubes' | 'amizades'

interface PostItem {
  id: string
  aluno_id: string
  autor_nome: string
  texto: string | null
  tipo: string
  visibilidade: string
  curtidas_count: number
  comentarios_count: number
  criado_em: string
}

interface ClubeItem {
  id: string
  nome: string
  tipo: string
  totalMembros: number
  criado_em: string
}

interface AmizadeItem {
  id: string
  aluno_id: string
  amigo_id: string
  status: string
  aluno_nome: string
  amigo_nome: string
  criado_em: string
}

interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const inputClass =
  'w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none'

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (p: number) => void
}) {
  if (totalPages <= 1) return null
  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }
  return (
    <div className="mt-4 flex items-center justify-center gap-1">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="rounded px-3 py-1 text-sm text-text-muted hover:bg-surface-input disabled:opacity-30"
      >
        Anterior
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="px-2 text-text-muted">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`rounded px-3 py-1 text-sm ${p === page ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:bg-surface-input'}`}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded px-3 py-1 text-sm text-text-muted hover:bg-surface-input disabled:opacity-30"
      >
        Proximo
      </button>
    </div>
  )
}

export default function RootSocial() {
  const [tab, setTab] = useState<SocialTab>('mural')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [mural, setMural] = useState<PaginatedData<PostItem> | null>(null)
  const [clubes, setClubes] = useState<PaginatedData<ClubeItem> | null>(null)
  const [amizades, setAmizades] = useState<PaginatedData<AmizadeItem> | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; nome: string } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20, search: search || undefined }
      if (tab === 'mural') {
        const result = await api.getRootSocialMural(params)
        setMural(result)
      } else if (tab === 'clubes') {
        const result = await api.getRootSocialClubes({ page, limit: 20 })
        setClubes(result)
      } else {
        const result = await api.getRootSocialAmizades({ page, limit: 20 })
        setAmizades(result)
      }
    } catch {
      showFeedback('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [tab, page, search])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    setPage(1)
  }, [tab, search])

  function showFeedback(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  async function handleDeletePost(postId: string) {
    try {
      await api.deleteRootPost(postId)
      showFeedback('Post removido com sucesso!')
      setDeleteConfirm(null)
      await loadData()
    } catch {
      showFeedback('Erro ao remover post.')
    }
  }

  async function handleDeleteClube(id: string) {
    try {
      await api.deleteRootClube(id)
      showFeedback('Clube removido com sucesso!')
      setDeleteConfirm(null)
      await loadData()
    } catch {
      showFeedback('Erro ao remover clube.')
    }
  }

  const tabs: { key: SocialTab; label: string }[] = [
    { key: 'mural', label: 'Mural' },
    { key: 'clubes', label: 'Clubes' },
    { key: 'amizades', label: 'Amizades' },
  ]

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Moderacao Social</h1>

      {feedback && (
        <div className={`mb-4 rounded p-3 text-sm ${feedback.includes('Erro') ? 'bg-destructive/10 text-destructive' : 'bg-surface-card text-success'}`}>
          {feedback}
        </div>
      )}

      <div className="mb-6 flex gap-1 rounded-lg bg-surface-card p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded px-3 py-2 text-sm font-medium ${
              tab === t.key ? 'bg-surface-input text-text' : 'text-text-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'amizades' && (
        <div className="mb-4">
          <input
            type="text"
            placeholder={tab === 'mural' ? 'Buscar por autor ou texto...' : 'Buscar...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass}
          />
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-text-muted">Carregando...</div>
      ) : (
        <>
          {tab === 'mural' && mural && (
            <>
              <p className="mb-3 text-xs text-text-muted">{mural.total} posts encontrados</p>
              {mural.items.length === 0 ? (
                <p className="py-8 text-center text-text-muted">Nenhum post encontrado.</p>
              ) : (
                <div className="space-y-2">
                  {mural.items.map((post) => (
                    <div key={post.id} className="rounded-lg bg-surface-card p-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text">{post.autor_nome}</span>
                            <span className="rounded-full bg-surface-input px-2 py-0.5 text-xs text-text-muted">
                              {post.tipo}
                            </span>
                            <span className="rounded-full bg-surface-input px-2 py-0.5 text-xs text-text-muted">
                              {post.visibilidade}
                            </span>
                          </div>
                          {post.texto && (
                            <p className="mt-1 text-sm text-text">{post.texto}</p>
                          )}
                          <div className="mt-2 flex gap-3 text-xs text-text-muted">
                            <span>{post.curtidas_count} curtidas</span>
                            <span>{post.comentarios_count} comentarios</span>
                            <span>{new Date(post.criado_em).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'post', id: post.id, nome: post.autor_nome })}
                          className="shrink-0 rounded bg-destructive/10 px-3 py-1 text-sm text-destructive"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Pagination page={mural.page} totalPages={mural.totalPages} onChange={setPage} />
            </>
          )}

          {tab === 'clubes' && clubes && (
            <>
              <p className="mb-3 text-xs text-text-muted">{clubes.total} clubes encontrados</p>
              {clubes.items.length === 0 ? (
                <p className="py-8 text-center text-text-muted">Nenhum clube encontrado.</p>
              ) : (
                <div className="space-y-2">
                  {clubes.items.map((clube) => (
                    <div key={clube.id} className="flex items-center justify-between rounded-lg bg-surface-card p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-text">{clube.nome}</h3>
                          <span className="rounded-full bg-surface-input px-2 py-0.5 text-xs text-text-muted">
                            {clube.tipo}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted">
                          {clube.totalMembros} membros | Criado em {new Date(clube.criado_em).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'clube', id: clube.id, nome: clube.nome })}
                        className="rounded bg-destructive/10 px-3 py-1 text-sm text-destructive"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Pagination page={clubes.page} totalPages={clubes.totalPages} onChange={setPage} />
            </>
          )}

          {tab === 'amizades' && amizades && (
            <>
              <p className="mb-3 text-xs text-text-muted">{amizades.total} amizades encontradas</p>
              {amizades.items.length === 0 ? (
                <p className="py-8 text-center text-text-muted">Nenhuma amizade encontrada.</p>
              ) : (
                <div className="space-y-2">
                  {amizades.items.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg bg-surface-card p-4">
                      <div>
                        <p className="font-semibold text-text">
                          {a.aluno_nome} <span className="text-text-muted">-</span> {a.amigo_nome}
                        </p>
                        <div className="flex gap-2 text-xs text-text-muted">
                          <span className={`rounded-full px-2 py-0.5 ${a.status === 'ACEITO' ? 'bg-success/10 text-success' : 'bg-yellow-500/10 text-yellow-400'}`}>
                            {a.status}
                          </span>
                          <span>{new Date(a.criado_em).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Pagination page={amizades.page} totalPages={amizades.totalPages} onChange={setPage} />
            </>
          )}
        </>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-lg bg-surface-card p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-bold text-text">Confirmar remocao</h2>
            <p className="mb-6 text-sm text-text-muted">
              Tem certeza que deseja remover{' '}
              <strong className="text-text">{deleteConfirm.nome}</strong>?
              Esta acao nao pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded border border-surface-input px-4 py-2 text-sm text-text-muted"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'post') handleDeletePost(deleteConfirm.id)
                  else if (deleteConfirm.type === 'clube') handleDeleteClube(deleteConfirm.id)
                }}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
