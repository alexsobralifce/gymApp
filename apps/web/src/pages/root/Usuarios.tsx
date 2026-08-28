import { useEffect, useState, useCallback } from 'react'
import { api } from '../../api/client'
import { formatPhone } from '../../lib/phone'
import BatchActionBar from '../../components/ui/BatchActionBar'
import FormField from '../../components/ui/FormField'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import PremiumManagerButton from '../../components/root/PremiumManagerButton'

type Tab = 'academias' | 'professores' | 'alunos'

interface AcademiaItem {
  id: string
  nome: string
  cnpj: string
  status: string
  max_professores: number
  usuario_id: string
  usuario: { id: string; email: string; nome: string; admin?: boolean }
  _count: { professores: number; alunos: number }
}

interface ProfessorItem {
  id: string
  cref: string | null
  usuario_id: string
  usuario: { id: string; email: string; nome: string; admin?: boolean }
  academias: Array<{ id: string; academia: { id: string; nome: string } }>
  _count: { alunos: number }
}

interface AlunoItem {
  id: string
  usuario_id: string
  professor_id: string | null
  academia_id: string | null
  data_nascimento: string | null
  peso_kg: number | null
  altura_cm: number | null
  usuario: { id: string; email: string; nome: string; telefone: string | null; admin?: boolean; premium_manual_em?: string | null }
  academia: { id: string; nome: string } | null
  professor: { id: string; usuario: { nome: string } } | null
}

interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const btnPrimary =
  'rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40 min-h-[36px] inline-flex items-center'

const btnGhost =
  'rounded border border-surface-input px-4 py-2 text-sm text-text-muted min-h-[36px] inline-flex items-center'

const mostrarLimiteProfessores = false

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ATIVO: 'bg-success/10 text-success',
    PENDENTE: 'bg-yellow-500/10 text-yellow-400',
    REJEITADO: 'bg-destructive/10 text-destructive',
  }
  const cls = map[status] || 'bg-surface-input text-text-muted'
  return <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{status}</span>
}

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
        Próximo
      </button>
    </div>
  )
}

export default function RootUsuarios() {
  const [tab, setTab] = useState<Tab>('academias')
  const [feedback, setFeedback] = useState<string | null>(null)

  const [academias, setAcademias] = useState<PaginatedData<AcademiaItem> | null>(null)
  const [professores, setProfessores] = useState<PaginatedData<ProfessorItem> | null>(null)
  const [alunos, setAlunos] = useState<PaginatedData<AlunoItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [batchConfirm, setBatchConfirm] = useState(false)

  const [editAcademia, setEditAcademia] = useState<AcademiaItem | null>(null)
  const [editProfessor, setEditProfessor] = useState<ProfessorItem | null>(null)
  const [editAluno, setEditAluno] = useState<AlunoItem | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: Tab; id: string; nome: string } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20, search: search || undefined }
      if (tab === 'academias') {
        const result = await api.getRootAcademias(params)
        setAcademias(result)
      } else if (tab === 'professores') {
        const result = await api.getRootProfessores(params)
        setProfessores(result)
      } else {
        const result = await api.getRootAlunos(params)
        setAlunos(result)
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
    setSelectedIds([])
  }, [tab, search])

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  function toggleSelectAll(currentItems: { id: string }[]) {
    const currentItemIds = currentItems.map((item) => item.id)
    const allSelected = currentItemIds.every((id) => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentItemIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentItemIds])))
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.length === 0) return
    setBatchDeleting(true)
    try {
      if (tab === 'academias') {
        await Promise.allSettled(selectedIds.map((id) => api.deleteRootAcademia(id)))
      } else if (tab === 'professores') {
        await Promise.allSettled(selectedIds.map((id) => api.deleteRootProfessor(id)))
      } else {
        await Promise.allSettled(selectedIds.map((id) => api.deleteRootAluno(id)))
      }
      showFeedback(`${selectedIds.length} item(s) excluído(s) em cascata!`)
      setSelectedIds([])
      setBatchConfirm(false)
      await loadData()
    } catch {
      showFeedback('Erro ao excluir itens selecionados.')
    } finally {
      setBatchDeleting(false)
    }
  }

  function showFeedback(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    try {
      if (deleteConfirm.type === 'academias') {
        await api.deleteRootAcademia(deleteConfirm.id)
      } else if (deleteConfirm.type === 'professores') {
        await api.deleteRootProfessor(deleteConfirm.id)
      } else {
        await api.deleteRootAluno(deleteConfirm.id)
      }
      showFeedback(`${deleteConfirm.nome} excluido com sucesso!`)
      await loadData()
    } catch {
      showFeedback('Erro ao excluir.')
    }
    setDeleteConfirm(null)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'academias', label: 'Academias' },
    { key: 'professores', label: 'Professores' },
    { key: 'alunos', label: 'Alunos' },
  ]

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Gerenciar Plataforma</h1>

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

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <BatchActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onDeleteSelected={() => setBatchConfirm(true)}
        loading={batchDeleting}
      />

      {loading ? (
        <div className="py-12 text-center text-text-muted">Carregando...</div>
      ) : (
        <>
          {tab === 'academias' && academias && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-text-muted">{academias.total} academias encontradas</p>
                {academias.items.length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={academias.items.every((a) => selectedIds.includes(a.id))}
                      onChange={() => toggleSelectAll(academias.items)}
                      className="rounded border-surface-input text-primary focus:ring-primary"
                    />
                    <span>Selecionar Todos nesta página</span>
                  </label>
                )}
              </div>
              <AcademiasTab
                academias={academias.items}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onEdit={setEditAcademia}
                onDelete={(a) => setDeleteConfirm({ type: 'academias', id: a.id, nome: a.nome })}
              />
              <Pagination page={academias.page} totalPages={academias.totalPages} onChange={setPage} />
            </>
          )}

          {tab === 'professores' && professores && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-text-muted">{professores.total} professores encontrados</p>
                {professores.items.length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={professores.items.every((p) => selectedIds.includes(p.id))}
                      onChange={() => toggleSelectAll(professores.items)}
                      className="rounded border-surface-input text-primary focus:ring-primary"
                    />
                    <span>Selecionar Todos nesta página</span>
                  </label>
                )}
              </div>
              <ProfessoresTab
                professores={professores.items}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onEdit={setEditProfessor}
                onDelete={(p) => setDeleteConfirm({ type: 'professores', id: p.id, nome: p.usuario.nome })}
              />
              <Pagination page={professores.page} totalPages={professores.totalPages} onChange={setPage} />
            </>
          )}

          {tab === 'alunos' && alunos && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-text-muted">{alunos.total} alunos encontrados</p>
                {alunos.items.length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alunos.items.every((a) => selectedIds.includes(a.id))}
                      onChange={() => toggleSelectAll(alunos.items)}
                      className="rounded border-surface-input text-primary focus:ring-primary"
                    />
                    <span>Selecionar Todos nesta página</span>
                  </label>
                )}
              </div>
              <AlunosTab
                alunos={alunos.items}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onEdit={setEditAluno}
                onDelete={(a) => setDeleteConfirm({ type: 'alunos', id: a.id, nome: a.usuario.nome })}
              />
              <Pagination page={alunos.page} totalPages={alunos.totalPages} onChange={setPage} />
            </>
          )}
        </>
      )}

      {batchConfirm && (
        <Modal onClose={() => setBatchConfirm(false)}>
          <h2 className="mb-2 text-lg font-bold text-text">Confirmar exclusão em lote</h2>
          <p className="mb-6 text-sm text-text-muted">
            Tem certeza que deseja excluir em cascata <strong className="text-primary">{selectedIds.length}</strong> item(s) selecionado(s)?
            Esta ação removerá todos os dados vinculados e não poderá ser desfeita.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setBatchConfirm(false)} className={btnGhost}>Cancelar</button>
            <button
              onClick={handleBatchDelete}
              disabled={batchDeleting}
              className="rounded bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
            >
              {batchDeleting ? 'Excluindo...' : 'Confirmar Exclusão em Lote'}
            </button>
          </div>
        </Modal>
      )}

      {editAcademia && (
        <EditAcademiaModal
          academia={editAcademia}
          onClose={() => setEditAcademia(null)}
          onSave={async (data) => {
            try {
              await api.updateRootAcademia(editAcademia.id, data)
              showFeedback('Academia atualizada!')
              setEditAcademia(null)
              await loadData()
            } catch {
              showFeedback('Erro ao atualizar academia.')
            }
          }}
        />
      )}

      {editProfessor && (
        <EditProfessorModal
          professor={editProfessor}
          academias={academias?.items || []}
          onClose={() => setEditProfessor(null)}
          onSave={async (data) => {
            try {
              await api.updateRootProfessor(editProfessor.id, data)
              showFeedback('Professor atualizado!')
              setEditProfessor(null)
              await loadData()
            } catch {
              showFeedback('Erro ao atualizar professor.')
            }
          }}
        />
      )}

      {editAluno && (
        <EditAlunoModal
          aluno={editAluno}
          academias={academias?.items || []}
          professores={professores?.items || []}
          onClose={() => setEditAluno(null)}
          onSave={async (data) => {
            try {
              await api.updateRootAluno(editAluno.id, data)
              showFeedback('Aluno atualizado!')
              setEditAluno(null)
              await loadData()
            } catch {
              showFeedback('Erro ao atualizar aluno.')
            }
          }}
        />
      )}

      {deleteConfirm && (
        <Modal onClose={() => setDeleteConfirm(null)}>
          <h2 className="mb-2 text-lg font-bold text-text">Confirmar exclusão</h2>
          <p className="mb-6 text-sm text-text-muted">
            Tem certeza que deseja excluir <strong className="text-text">{deleteConfirm.nome}</strong>?
            Esta ação não pode ser desfeita e todos os dados vinculados serão removidos.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteConfirm(null)} className={btnGhost}>Cancelar</button>
            <button
              onClick={handleDelete}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white"
            >
              Excluir
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-surface-card p-6 shadow-2xl">
        {children}
      </div>
    </div>
  )
}

function AdminToggleButton({ usuarioId, isAdmin }: { usuarioId: string; isAdmin: boolean }) {
  const [busy, setBusy] = useState(false)
  const [admin, setAdmin] = useState(isAdmin)

  async function handleToggle() {
    setBusy(true)
    try {
      await api.toggleAdmin(usuarioId, !admin)
      setAdmin(!admin)
    } catch {
      // silencioso — o botão reverte visualmente no próximo reload
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      className={`rounded px-3 py-1.5 text-sm font-medium transition-colors min-h-[36px] inline-flex items-center ${
        admin
          ? 'bg-primary/20 text-primary hover:bg-primary/30'
          : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
      }`}
    >
      {busy ? '...' : admin ? 'Admin' : 'Tornar Admin'}
    </button>
  )
}

function AcademiasTab({
  academias,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  academias: AcademiaItem[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  onEdit: (a: AcademiaItem) => void
  onDelete: (a: AcademiaItem) => void
}) {
  if (academias.length === 0) return <p className="text-text-muted">Nenhuma academia encontrada.</p>

  return (
    <div className="space-y-2">
      {academias.map((a) => (
        <div key={a.id} className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-surface-card p-4 border transition ${selectedIds.includes(a.id) ? 'border-primary' : 'border-transparent'}`}>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={selectedIds.includes(a.id)}
              onChange={() => onToggleSelect(a.id)}
              className="mt-1 rounded border-surface-input text-primary focus:ring-primary h-4 w-4"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text">{a.nome}</h3>
                {statusBadge(a.status)}
              </div>
              <p className="text-xs text-text-muted">CNPJ: {a.cnpj}</p>
              <p className="text-xs text-text-muted">{a.usuario.email}</p>
              <p className="text-xs text-text-muted">
                {mostrarLimiteProfessores && `Max. professores: ${a.max_professores} | `}Professores: {a._count.professores} | Alunos: {a._count.alunos}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end sm:flex-nowrap sm:self-center">
            <button onClick={() => onEdit(a)} className="rounded bg-blue-500/10 px-3 py-1.5 text-sm text-blue-400 min-h-[36px] inline-flex items-center">Editar</button>
            <AdminToggleButton usuarioId={a.usuario.id} isAdmin={!!a.usuario.admin} />
            <button onClick={() => onDelete(a)} className="rounded bg-destructive/10 px-3 py-1.5 text-sm text-destructive min-h-[36px] inline-flex items-center">Excluir</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ProfessoresTab({
  professores,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  professores: ProfessorItem[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  onEdit: (p: ProfessorItem) => void
  onDelete: (p: ProfessorItem) => void
}) {
  if (professores.length === 0) return <p className="text-text-muted">Nenhum professor encontrado.</p>

  return (
    <div className="space-y-2">
      {professores.map((p) => (
        <div key={p.id} className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between rounded-lg bg-surface-card p-4 border transition ${selectedIds.includes(p.id) ? 'border-primary' : 'border-transparent'}`}>
          <div className="flex items-start justify-between sm:justify-start sm:gap-0">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedIds.includes(p.id)}
                onChange={() => onToggleSelect(p.id)}
                className="mt-1 rounded border-surface-input text-primary focus:ring-primary h-4 w-4"
              />
              <div>
                <h3 className="font-semibold text-text">{p.usuario.nome}</h3>
                <p className="text-xs text-text-muted">{p.usuario.email}</p>
                <p className="text-xs text-text-muted">
                  CREF: {p.cref || '---'} | Alunos: {p._count.alunos}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-end sm:hidden sm:self-start ml-3">
              <button onClick={() => onEdit(p)} className="rounded bg-blue-500/10 px-3 py-1.5 text-sm text-blue-400 min-h-[36px] inline-flex items-center">Editar</button>
              <AdminToggleButton usuarioId={p.usuario.id} isAdmin={!!p.usuario.admin} />
              <button onClick={() => onDelete(p)} className="rounded bg-destructive/10 px-3 py-1.5 text-sm text-destructive min-h-[36px] inline-flex items-center">Excluir</button>
            </div>
          </div>
            <div className="hidden sm:flex flex-wrap gap-1.5 justify-end sm:flex-nowrap sm:self-start">
              <button onClick={() => onEdit(p)} className="rounded bg-blue-500/10 px-3 py-1.5 text-sm text-blue-400 min-h-[36px] inline-flex items-center">Editar</button>
              <AdminToggleButton usuarioId={p.usuario.id} isAdmin={!!p.usuario.admin} />
              <button onClick={() => onDelete(p)} className="rounded bg-destructive/10 px-3 py-1.5 text-sm text-destructive min-h-[36px] inline-flex items-center">Excluir</button>
            </div>
          {p.academias.length > 0 && (
            <div className="mt-2 ml-7 flex flex-wrap gap-1">
              {p.academias.map((v) => (
                <span key={v.id} className="rounded-full bg-surface-input px-2 py-0.5 text-xs text-text-muted">
                  {v.academia.nome}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function AlunosTab({
  alunos,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  alunos: AlunoItem[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  onEdit: (a: AlunoItem) => void
  onDelete: (a: AlunoItem) => void
}) {
  if (alunos.length === 0) return <p className="text-text-muted">Nenhum aluno encontrado.</p>

  return (
    <div className="space-y-2">
      {alunos.map((a) => (
        <div key={a.id} className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-surface-card p-4 border transition ${selectedIds.includes(a.id) ? 'border-primary' : 'border-transparent'}`}>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={selectedIds.includes(a.id)}
              onChange={() => onToggleSelect(a.id)}
              className="mt-1 rounded border-surface-input text-primary focus:ring-primary h-4 w-4"
            />
            <div>
              <h3 className="font-semibold text-text">{a.usuario.nome}</h3>
              <p className="text-xs text-text-muted">{a.usuario.email}</p>
              <p className="text-xs text-text-muted">
                Academia: {a.academia?.nome || '---'} | Professor: {a.professor?.usuario.nome || 'Autogestão'}
              </p>
              {(a.peso_kg || a.altura_cm) && (
                <p className="text-xs text-text-muted">
                  Peso: {a.peso_kg ? `${a.peso_kg}kg` : '---'} | Altura: {a.altura_cm ? `${a.altura_cm}cm` : '---'}
                  {a.data_nascimento && ` | Nasc: ${new Date(a.data_nascimento).toLocaleDateString('pt-BR')}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end sm:flex-nowrap sm:self-center">
            <button onClick={() => onEdit(a)} className="rounded bg-blue-500/10 px-3 py-1.5 text-sm text-blue-400 min-h-[36px] inline-flex items-center">Editar</button>
            <PremiumManagerButton
              usuarioId={a.usuario.id}
              usuarioNome={a.usuario.nome}
              temPremium={!!a.usuario.premium_manual_em}
              onToggle={() => {}}
            />
            <AdminToggleButton usuarioId={a.usuario.id} isAdmin={!!a.usuario.admin} />
            <button onClick={() => onDelete(a)} className="rounded bg-destructive/10 px-3 py-1.5 text-sm text-destructive min-h-[36px] inline-flex items-center">Excluir</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function EditAcademiaModal({
  academia,
  onClose,
  onSave,
}: {
  academia: AcademiaItem
  onClose: () => void
  onSave: (data: any) => Promise<void>
}) {
  const [nome, setNome] = useState(academia.nome)
  const [cnpj, setCnpj] = useState(academia.cnpj)
  const [email, setEmail] = useState(academia.usuario.email)
  const [maxProfessores, setMaxProfessores] = useState(academia.max_professores)
  const [status, setStatus] = useState(academia.status)
  const [saving, setSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [resetMsg, setResetMsg] = useState('')

  async function handleResetPassword() {
    if (newPassword.length < 8) return
    try {
      await api.resetPassword(academia.usuario.id, newPassword)
      setResetMsg('Senha redefinida com sucesso!')
      setNewPassword('')
      setTimeout(() => setResetMsg(''), 3000)
    } catch {
      setResetMsg('Erro ao redefinir senha.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({ nome, cnpj, email, max_professores: maxProfessores, status })
    setSaving(false)
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-4 text-lg font-bold text-text">Editar Academia</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Nome" htmlFor="academia-nome" required>
          <Input id="academia-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </FormField>
        <FormField label="CNPJ" htmlFor="academia-cnpj" required>
          <Input id="academia-cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} required />
        </FormField>
        <FormField label="E-mail" htmlFor="academia-email" required>
          <Input id="academia-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FormField>
        {mostrarLimiteProfessores && (
          <FormField label="Max. Professores" htmlFor="academia-max">
            <Input id="academia-max" type="number" min={1} max={500} value={maxProfessores} onChange={(e) => setMaxProfessores(Number(e.target.value))} />
          </FormField>
        )}
        <FormField label="Status" htmlFor="academia-status">
          <Select id="academia-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="PENDENTE">Pendente</option>
            <option value="ATIVO">Ativo</option>
            <option value="REJEITADO">Rejeitado</option>
          </Select>
        </FormField>
        <div className="flex items-end justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnGhost}>Cancelar</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
      <div className="mt-4 space-y-2 border-t border-surface-input pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Redefinir Senha do Usuário</h4>
        <div className="flex flex-wrap gap-2">
          <Input
            type="password"
            placeholder="Nova senha (min. 8 caracteres)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={newPassword.length < 8}
            className="whitespace-nowrap rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          >
            Resetar
          </button>
        </div>
        {resetMsg && <p className="mt-1 text-xs font-medium text-success">{resetMsg}</p>}
      </div>
    </Modal>
  )
}

function EditProfessorModal({
  professor,
  academias,
  onClose,
  onSave,
}: {
  professor: ProfessorItem
  academias: AcademiaItem[]
  onClose: () => void
  onSave: (data: any) => Promise<void>
}) {
  const [nome, setNome] = useState(professor.usuario.nome)
  const [email, setEmail] = useState(professor.usuario.email)
  const [cref, setCref] = useState(professor.cref || '')
  const [selectedAcademias, setSelectedAcademias] = useState<Set<string>>(
    new Set(professor.academias.map((v) => v.academia.id)),
  )
  const [saving, setSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [resetMsg, setResetMsg] = useState('')

  async function handleResetPassword() {
    if (newPassword.length < 8) return
    try {
      await api.resetPassword(professor.usuario.id, newPassword)
      setResetMsg('Senha redefinida com sucesso!')
      setNewPassword('')
      setTimeout(() => setResetMsg(''), 3000)
    } catch {
      setResetMsg('Erro ao redefinir senha.')
    }
  }

  function toggleAcademia(id: string) {
    setSelectedAcademias((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      nome,
      email,
      cref: cref || null,
      academias_ids: Array.from(selectedAcademias),
    })
    setSaving(false)
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-4 text-lg font-bold text-text">Editar Professor</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Nome" htmlFor="professor-nome" required>
          <Input id="professor-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </FormField>
        <FormField label="E-mail" htmlFor="professor-email" required>
          <Input id="professor-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FormField>
        <FormField label="CREF" htmlFor="professor-cref">
          <Input id="professor-cref" value={cref} onChange={(e) => setCref(e.target.value)} placeholder="Opcional" />
        </FormField>
        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-medium text-text">Academias vinculadas</p>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-surface-input p-2">
            {academias.length === 0 && <p className="text-xs text-text-muted">Nenhuma academia disponível.</p>}
            {academias.map((a) => (
              <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-text hover:bg-surface-input">
                <input
                  type="checkbox"
                  checked={selectedAcademias.has(a.id)}
                  onChange={() => toggleAcademia(a.id)}
                  className="accent-primary"
                />
                {a.nome}
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-end justify-end gap-2 pt-2 md:col-span-2">
          <button type="button" onClick={onClose} className={btnGhost}>Cancelar</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
      <div className="mt-4 space-y-2 border-t border-surface-input pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Redefinir Senha do Usuário</h4>
        <div className="flex flex-wrap gap-2">
          <Input
            type="password"
            placeholder="Nova senha (min. 8 caracteres)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={newPassword.length < 8}
            className="whitespace-nowrap rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          >
            Resetar
          </button>
        </div>
        {resetMsg && <p className="mt-1 text-xs font-medium text-success">{resetMsg}</p>}
      </div>
    </Modal>
  )
}

function EditAlunoModal({
  aluno,
  academias,
  professores,
  onClose,
  onSave,
}: {
  aluno: AlunoItem
  academias: AcademiaItem[]
  professores: ProfessorItem[]
  onClose: () => void
  onSave: (data: any) => Promise<void>
}) {
  const [nome, setNome] = useState(aluno.usuario.nome)
  const [email, setEmail] = useState(aluno.usuario.email)
  const [telefone, setTelefone] = useState(formatPhone(aluno.usuario.telefone || ''))
  const [dataNascimento, setDataNascimento] = useState(aluno.data_nascimento?.split('T')[0] || '')
  const [pesoKg, setPesoKg] = useState(aluno.peso_kg?.toString() || '')
  const [alturaCm, setAlturaCm] = useState(aluno.altura_cm?.toString() || '')
  const [academiaId, setAcademiaId] = useState(aluno.academia_id || '')
  const [professorId, setProfessorId] = useState(aluno.professor_id || '')
  const [saving, setSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [resetMsg, setResetMsg] = useState('')

  async function handleResetPassword() {
    if (newPassword.length < 8) return
    try {
      await api.resetPassword(aluno.usuario.id, newPassword)
      setResetMsg('Senha redefinida com sucesso!')
      setNewPassword('')
      setTimeout(() => setResetMsg(''), 3000)
    } catch {
      setResetMsg('Erro ao redefinir senha.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      nome,
      email,
      telefone: telefone ? telefone.replace(/\D/g, '') : null,
      data_nascimento: dataNascimento || null,
      peso_kg: pesoKg ? Number(pesoKg) : null,
      altura_cm: alturaCm ? Number(alturaCm) : null,
      academia_id: academiaId || null,
      professor_id: professorId || null,
    })
    setSaving(false)
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-4 text-lg font-bold text-text">Editar Aluno</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Nome" htmlFor="aluno-nome" required>
          <Input id="aluno-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </FormField>
        <FormField label="E-mail" htmlFor="aluno-email" required>
          <Input id="aluno-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FormField>
        <FormField label="Telefone" htmlFor="aluno-telefone">
          <Input id="aluno-telefone" value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))} placeholder="(99) 99999-9999" type="tel" />
        </FormField>
        <FormField label="Data de nascimento" htmlFor="aluno-nascimento">
          <Input id="aluno-nascimento" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
        </FormField>
        <FormField label="Peso (kg)" htmlFor="aluno-peso">
          <Input id="aluno-peso" type="number" step="0.1" min="0" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} placeholder="70.5" />
        </FormField>
        <FormField label="Altura (cm)" htmlFor="aluno-altura">
          <Input id="aluno-altura" type="number" step="1" min="0" value={alturaCm} onChange={(e) => setAlturaCm(e.target.value)} placeholder="175" />
        </FormField>
        <FormField label="Academia" htmlFor="aluno-academia">
          <Select id="aluno-academia" value={academiaId} onChange={(e) => setAcademiaId(e.target.value)}>
            <option value="">Sem academia</option>
            {academias.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Professor" htmlFor="aluno-professor">
          <Select id="aluno-professor" value={professorId} onChange={(e) => setProfessorId(e.target.value)}>
            <option value="">Autogestão</option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>{p.usuario.nome}</option>
            ))}
          </Select>
        </FormField>
        <div className="flex items-end justify-end gap-2 pt-2 md:col-span-2">
          <button type="button" onClick={onClose} className={btnGhost}>Cancelar</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
      <div className="mt-4 space-y-2 border-t border-surface-input pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Redefinir Senha do Usuário</h4>
        <div className="flex flex-wrap gap-2">
          <Input
            type="password"
            placeholder="Nova senha (min. 8 caracteres)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={newPassword.length < 8}
            className="whitespace-nowrap rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          >
            Resetar
          </button>
        </div>
        {resetMsg && <p className="mt-1 text-xs font-medium text-success">{resetMsg}</p>}
      </div>
    </Modal>
  )
}
