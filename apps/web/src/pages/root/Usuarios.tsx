import { useEffect, useState } from 'react'
import { api } from '../../api/client'

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
  usuario: { id: string; email: string; nome: string }
  academia: { id: string; nome: string } | null
  professor: { id: string; usuario: { nome: string } } | null
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

export default function RootUsuarios() {
  const [tab, setTab] = useState<Tab>('academias')
  const [feedback, setFeedback] = useState<string | null>(null)

  const [academias, setAcademias] = useState<AcademiaItem[]>([])
  const [professores, setProfessores] = useState<ProfessorItem[]>([])
  const [alunos, setAlunos] = useState<AlunoItem[]>([])
  const [loading, setLoading] = useState(true)

  const [editAcademia, setEditAcademia] = useState<AcademiaItem | null>(null)
  const [editProfessor, setEditProfessor] = useState<ProfessorItem | null>(null)
  const [editAluno, setEditAluno] = useState<AlunoItem | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: Tab; id: string; nome: string } | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [a, p, al] = await Promise.all([
        api.getRootAcademias(),
        api.getRootProfessores(),
        api.getRootAlunos(),
      ])
      setAcademias(a as AcademiaItem[])
      setProfessores(p as ProfessorItem[])
      setAlunos(al as AlunoItem[])
    } catch {
      showFeedback('Erro ao carregar dados.')
    } finally {
      setLoading(false)
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
        setAcademias((prev) => prev.filter((a) => a.id !== deleteConfirm.id))
      } else if (deleteConfirm.type === 'professores') {
        await api.deleteRootProfessor(deleteConfirm.id)
        setProfessores((prev) => prev.filter((p) => p.id !== deleteConfirm.id))
      } else {
        await api.deleteRootAluno(deleteConfirm.id)
        setAlunos((prev) => prev.filter((a) => a.id !== deleteConfirm.id))
      }
      showFeedback(`${deleteConfirm.nome} excluído com sucesso!`)
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

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

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

      {tab === 'academias' && (
        <AcademiasTab
          academias={academias}
          onEdit={setEditAcademia}
          onDelete={(a) => setDeleteConfirm({ type: 'academias', id: a.id, nome: a.nome })}
        />
      )}

      {tab === 'professores' && (
        <ProfessoresTab
          professores={professores}
          onEdit={setEditProfessor}
          onDelete={(p) =>
            setDeleteConfirm({ type: 'professores', id: p.id, nome: p.usuario.nome })
          }
        />
      )}

      {tab === 'alunos' && (
        <AlunosTab
          alunos={alunos}
          onEdit={setEditAluno}
          onDelete={(a) =>
            setDeleteConfirm({ type: 'alunos', id: a.id, nome: a.usuario.nome })
          }
        />
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
              await loadAll()
            } catch {
              showFeedback('Erro ao atualizar academia.')
            }
          }}
        />
      )}

      {editProfessor && (
        <EditProfessorModal
          professor={editProfessor}
          academias={academias}
          onClose={() => setEditProfessor(null)}
          onSave={async (data) => {
            try {
              await api.updateRootProfessor(editProfessor.id, data)
              showFeedback('Professor atualizado!')
              setEditProfessor(null)
              await loadAll()
            } catch {
              showFeedback('Erro ao atualizar professor.')
            }
          }}
        />
      )}

      {editAluno && (
        <EditAlunoModal
          aluno={editAluno}
          academias={academias}
          professores={professores}
          onClose={() => setEditAluno(null)}
          onSave={async (data) => {
            try {
              await api.updateRootAluno(editAluno.id, data)
              showFeedback('Aluno atualizado!')
              setEditAluno(null)
              await loadAll()
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-surface-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
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
              Máx. professores: {a.max_professores} · Professores: {a._count.professores} · Alunos: {a._count.alunos}
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
                CREF: {p.cref || '—'} · Alunos: {p._count.alunos}
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
              Academia: {a.academia?.nome || '—'} · Professor: {a.professor?.usuario.nome || 'Autogestão'}
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
          <label className="mb-1 block text-xs text-text-muted">Máx. Professores</label>
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
      <div className="border-t border-surface-input pt-4 mt-4 space-y-2">
        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Redefinir Senha do Usuário</h4>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Nova senha (mín. 8 caracteres)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={newPassword.length < 8}
            className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap disabled:opacity-40"
          >
            Resetar
          </button>
        </div>
        {resetMsg && <p className="text-xs font-medium text-success mt-1">{resetMsg}</p>}
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
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnGhost}>Cancelar</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
      <div className="border-t border-surface-input pt-4 mt-4 space-y-2">
        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Redefinir Senha do Usuário</h4>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Nova senha (mín. 8 caracteres)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={newPassword.length < 8}
            className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap disabled:opacity-40"
          >
            Resetar
          </button>
        </div>
        {resetMsg && <p className="text-xs font-medium text-success mt-1">{resetMsg}</p>}
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
            <option value="">Autogestão</option>
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
      <div className="border-t border-surface-input pt-4 mt-4 space-y-2">
        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Redefinir Senha do Usuário</h4>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Nova senha (mín. 8 caracteres)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={newPassword.length < 8}
            className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap disabled:opacity-40"
          >
            Resetar
          </button>
        </div>
        {resetMsg && <p className="text-xs font-medium text-success mt-1">{resetMsg}</p>}
      </div>
    </Modal>
  )
}
