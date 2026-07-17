import { useEffect, useState, useCallback } from 'react'
import { api } from '../../api/client'
import { formatPhone } from '../../lib/phone'

type Tab = 'academias' | 'professores' | 'alunos'

interface AcademiaItem {
  id: string
  nome: string
  cnpj: string
  status: string
  max_professores: number
  usuario_id: string
  usuario: { id: string; email: string; nome: string }
  _count: { professores: number; alunos: number }
}

interface ProfessorItem {
  id: string
  cref: string | null
  usuario_id: string
  usuario: { id: string; email: string; nome: string }
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
  usuario: { id: string; email: string; nome: string; telefone: string | null }
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

const inputClass =
  'w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none'

const btnPrimary =
  'rounded bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-40'

const btnGhost =
  'rounded border border-surface-input px-4 py-2 text-sm text-text-muted'

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ATIVO: 'bg-green-500/10 text-green-400',
    PENDENTE: 'bg-yellow-500/10 text-yellow-400',
    REJEITADO: 'bg-red-500/10 text-red-400',
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
            className={`rounded px-3 py-1 text-sm ${p === page ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface-input'}`}
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

export default function RootUsuarios() {
  const [tab, setTab] = useState<Tab>('academias')
  const [feedback, setFeedback] = useState<string | null>(null)

  const [academias, setAcademias] = useState<PaginatedData<AcademiaItem> | null>(null)
  const [professores, setProfessores] = useState<PaginatedData<ProfessorItem> | null>(null)
  const [alunos, setAlunos] = useState<PaginatedData<AlunoItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

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
  }, [tab, search])

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
        <div className={`mb-4 rounded p-3 text-sm ${feedback.includes('Erro') ? 'bg-red-500/10 text-red-400' : 'bg-surface-card text-success'}`}>
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
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputClass}
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Carregando...</div>
      ) : (
        <>
          {tab === 'academias' && academias && (
            <>
              <p className="mb-3 text-xs text-text-muted">{academias.total} academias encontradas</p>
              <AcademiasTab
                academias={academias.items}
                onEdit={setEditAcademia}
                onDelete={(a) => setDeleteConfirm({ type: 'academias', id: a.id, nome: a.nome })}
              />
              <Pagination page={academias.page} totalPages={academias.totalPages} onChange={setPage} />
            </>
          )}

          {tab === 'professores' && professores && (
            <>
              <p className="mb-3 text-xs text-text-muted">{professores.total} professores encontrados</p>
              <ProfessoresTab
                professores={professores.items}
                onEdit={setEditProfessor}
                onDelete={(p) => setDeleteConfirm({ type: 'professores', id: p.id, nome: p.usuario.nome })}
              />
              <Pagination page={professores.page} totalPages={professores.totalPages} onChange={setPage} />
            </>
          )}

          {tab === 'alunos' && alunos && (
            <>
              <p className="mb-3 text-xs text-text-muted">{alunos.total} alunos encontrados</p>
              <AlunosTab
                alunos={alunos.items}
                onEdit={setEditAluno}
                onDelete={(a) => setDeleteConfirm({ type: 'alunos', id: a.id, nome: a.usuario.nome })}
              />
              <Pagination page={alunos.page} totalPages={alunos.totalPages} onChange={setPage} />
            </>
          )}
        </>
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
          <h2 className="mb-2 text-lg font-bold text-text">Confirmar exclusao</h2>
          <p className="mb-6 text-sm text-text-muted">
            Tem certeza que deseja excluir <strong className="text-text">{deleteConfirm.nome}</strong>?
            Esta acao nao pode ser desfeita e todos os dados vinculados serao removidos.
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

function AcademiasTab({
  academias,
  onEdit,
  onDelete,
}: {
  academias: AcademiaItem[]
  onEdit: (a: AcademiaItem) => void
  onDelete: (a: AcademiaItem) => void
}) {
  if (academias.length === 0) return <p className="text-text-muted">Nenhuma academia encontrada.</p>

  return (
    <div className="space-y-2">
      {academias.map((a) => (
        <div key={a.id} className="flex items-center justify-between rounded-lg bg-surface-card p-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text">{a.nome}</h3>
              {statusBadge(a.status)}
            </div>
            <p className="text-xs text-text-muted">CNPJ: {a.cnpj}</p>
            <p className="text-xs text-text-muted">{a.usuario.email}</p>
            <p className="text-xs text-text-muted">
              Max. professores: {a.max_professores} | Professores: {a._count.professores} | Alunos: {a._count.alunos}
            </p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onEdit(a)} className="rounded bg-blue-500/10 px-3 py-1 text-sm text-blue-400">Editar</button>
            <button onClick={() => onDelete(a)} className="rounded bg-red-500/10 px-3 py-1 text-sm text-red-400">Excluir</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ProfessoresTab({
  professores,
  onEdit,
  onDelete,
}: {
  professores: ProfessorItem[]
  onEdit: (p: ProfessorItem) => void
  onDelete: (p: ProfessorItem) => void
}) {
  if (professores.length === 0) return <p className="text-text-muted">Nenhum professor encontrado.</p>

  return (
    <div className="space-y-2">
      {professores.map((p) => (
        <div key={p.id} className="rounded-lg bg-surface-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-text">{p.usuario.nome}</h3>
              <p className="text-xs text-text-muted">{p.usuario.email}</p>
              <p className="text-xs text-text-muted">
                CREF: {p.cref || '---'} | Alunos: {p._count.alunos}
              </p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => onEdit(p)} className="rounded bg-blue-500/10 px-3 py-1 text-sm text-blue-400">Editar</button>
              <button onClick={() => onDelete(p)} className="rounded bg-red-500/10 px-3 py-1 text-sm text-red-400">Excluir</button>
            </div>
          </div>
          {p.academias.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
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
  onEdit,
  onDelete,
}: {
  alunos: AlunoItem[]
  onEdit: (a: AlunoItem) => void
  onDelete: (a: AlunoItem) => void
}) {
  if (alunos.length === 0) return <p className="text-text-muted">Nenhum aluno encontrado.</p>

  return (
    <div className="space-y-2">
      {alunos.map((a) => (
        <div key={a.id} className="flex items-center justify-between rounded-lg bg-surface-card p-4">
          <div>
            <h3 className="font-semibold text-text">{a.usuario.nome}</h3>
            <p className="text-xs text-text-muted">{a.usuario.email}</p>
            <p className="text-xs text-text-muted">
              Academia: {a.academia?.nome || '---'} | Professor: {a.professor?.usuario.nome || 'Autogestao'}
            </p>
            {(a.peso_kg || a.altura_cm) && (
              <p className="text-xs text-text-muted">
                Peso: {a.peso_kg ? `${a.peso_kg}kg` : '---'} | Altura: {a.altura_cm ? `${a.altura_cm}cm` : '---'}
                {a.data_nascimento && ` | Nasc: ${new Date(a.data_nascimento).toLocaleDateString('pt-BR')}`}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <button onClick={() => onEdit(a)} className="rounded bg-blue-500/10 px-3 py-1 text-sm text-blue-400">Editar</button>
            <button onClick={() => onDelete(a)} className="rounded bg-red-500/10 px-3 py-1 text-sm text-red-400">Excluir</button>
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
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-text-muted">Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">CNPJ</label>
          <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">Max. Professores</label>
          <input type="number" min={1} max={500} value={maxProfessores} onChange={(e) => setMaxProfessores(Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            <option value="PENDENTE">Pendente</option>
            <option value="ATIVO">Ativo</option>
            <option value="REJEITADO">Rejeitado</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnGhost}>Cancelar</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
      <div className="mt-4 space-y-2 border-t border-surface-input pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Redefinir Senha do Usuario</h4>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Nova senha (min. 8 caracteres)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={newPassword.length < 8}
            className="whitespace-nowrap rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
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
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-text-muted">Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">CREF</label>
          <input value={cref} onChange={(e) => setCref(e.target.value)} className={inputClass} placeholder="Opcional" />
        </div>
        <div>
          <label className="mb-2 block text-xs text-text-muted">Academias vinculadas</label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-surface-input p-2">
            {academias.length === 0 && <p className="text-xs text-text-muted">Nenhuma academia disponivel.</p>}
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
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnGhost}>Cancelar</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
      <div className="mt-4 space-y-2 border-t border-surface-input pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Redefinir Senha do Usuario</h4>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Nova senha (min. 8 caracteres)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={newPassword.length < 8}
            className="whitespace-nowrap rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
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
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-text-muted">Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">Telefone</label>
          <input value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))} className={inputClass} placeholder="(99) 99999-9999" type="tel" />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-text-muted">Peso (kg)</label>
            <input type="number" step="0.1" min="0" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} className={inputClass} placeholder="70.5" />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-text-muted">Altura (cm)</label>
            <input type="number" step="1" min="0" value={alturaCm} onChange={(e) => setAlturaCm(e.target.value)} className={inputClass} placeholder="175" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">Data de nascimento</label>
          <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">Academia</label>
          <select value={academiaId} onChange={(e) => setAcademiaId(e.target.value)} className={inputClass}>
            <option value="">Sem academia</option>
            {academias.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">Professor</label>
          <select value={professorId} onChange={(e) => setProfessorId(e.target.value)} className={inputClass}>
            <option value="">Autogestao</option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>{p.usuario.nome}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnGhost}>Cancelar</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
      <div className="mt-4 space-y-2 border-t border-surface-input pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Redefinir Senha do Usuario</h4>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Nova senha (min. 8 caracteres)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={newPassword.length < 8}
            className="whitespace-nowrap rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Resetar
          </button>
        </div>
        {resetMsg && <p className="mt-1 text-xs font-medium text-success">{resetMsg}</p>}
      </div>
    </Modal>
  )
}
