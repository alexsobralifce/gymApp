import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import ConfirmModal from '../../components/ui/ConfirmModal'
import type { AlunoAcademia, Treino } from '../../types/api'

const DIA_LABEL: Record<number, string> = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb' }

const STATUS_COR: Record<string, string> = {
  CADASTRADO: 'text-text-muted bg-surface border border-surface-input',
  ENVIADO: 'text-blue-400 bg-blue-500/10 border border-blue-500/20',
  ACEITO: 'text-success bg-success/10 border border-green-500/20',
  RECUSADO: 'text-destructive bg-destructive/10 border border-destructive/20',
  EM_ABERTO: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20',
  EM_EXECUCAO: 'text-primary bg-primary/10 border border-primary/20',
  CONCLUIDO: 'text-success bg-success/10 border border-success/20',
}

export default function AcademiaTreinos() {
  const [alunos, setAlunos] = useState<AlunoAcademia[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTreino, setEditingTreino] = useState<{ treino: Treino; alunoId: string } | null>(null)
  const [deletingTreino, setDeletingTreino] = useState<{ id: string; nome: string } | null>(null)
  const [viewingTreinos, setViewingTreinos] = useState<{ treinos: AlunoAcademia['treinos']; alunoNome: string } | null>(null)
  const [form, setForm] = useState({ nome: '', diasSemana: [] as number[] })
  const [saving, setSaving] = useState(false)
  const [cloningTreino, setCloningTreino] = useState<{ id: string; nome: string } | null>(null)
  const [alunosDestino, setAlunosDestino] = useState<{ id: string; usuario: { nome: string; email: string } }[]>([])
  const [alunoDestinoId, setAlunoDestinoId] = useState('')
  const { showToast, ToastComponent } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    api.getAlunosAcademia().then((data) => setAlunos(data as AlunoAcademia[])).finally(() => setLoading(false))
  }, [])

  const toggleDia = (dia: number) => {
    setForm((prev) => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(dia)
        ? prev.diasSemana.filter((d) => d !== dia)
        : [...prev.diasSemana, dia].sort(),
    }))
  }

  const handleUpdateTreino = async () => {
    if (!editingTreino || !form.nome || form.diasSemana.length === 0) return
    setSaving(true)
    try {
      await api.updateTreino(editingTreino.treino.id, { nome: form.nome, diasSemana: form.diasSemana })
      showToast('Treino atualizado com sucesso!')
      setEditingTreino(null)
      setForm({ nome: '', diasSemana: [] })
      const data = await api.getAlunosAcademia()
      setAlunos(data as AlunoAcademia[])
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTreino = async () => {
    if (!deletingTreino) return
    setSaving(true)
    try {
      await api.deleteTreino(deletingTreino.id)
      showToast('Treino removido com sucesso!')
      setDeletingTreino(null)
      const data = await api.getAlunosAcademia()
      setAlunos(data as AlunoAcademia[])
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const openCloneModal = async (treinoId: string, treinoNome: string) => {
    setCloningTreino({ id: treinoId, nome: treinoNome })
    setAlunoDestinoId('')
    try {
      const lista = await api.getAlunosAcademiaResumo()
      setAlunosDestino(lista)
    } catch {
      showToast('Erro ao carregar alunos', 'error')
    }
  }

  const handleCloneTreino = async () => {
    if (!cloningTreino || !alunoDestinoId) return
    setSaving(true)
    try {
      const treino = await api.clonarTreino(cloningTreino.id, alunoDestinoId)
      await api.enviarTreino(treino.id)
      showToast('Treino clonado com sucesso!')
      setCloningTreino(null)
      const data = await api.getAlunosAcademia()
      setAlunos(data as AlunoAcademia[])
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  return (
    <div className="p-4 md:p-6">
      {ToastComponent}

      <h1 className="mb-6 text-xl font-bold text-text">Listar Treinos</h1>

      {alunos.length === 0 ? (
        <p className="text-text-muted">Nenhum aluno cadastrado nesta academia.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-surface-card border border-surface-input">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-input bg-surface/50 text-xs font-semibold text-text-muted uppercase tracking-wider">
                <th className="p-4">Aluno</th>
                <th className="p-4">Fone</th>
                <th className="p-4">Email</th>
                <th className="p-4">Professor</th>
                <th className="p-4">Treinos</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-input">
              {alunos.map((aluno) => (
                <tr key={aluno.id} className="hover:bg-surface/30 transition-colors">
                  <td className="p-4 text-sm font-medium text-text">{aluno.usuario.nome}</td>
                  <td className="p-4 text-sm text-text-muted">{aluno.usuario.telefone || '-'}</td>
                  <td className="p-4 text-sm text-text-muted">{aluno.usuario.email}</td>
                  <td className="p-4 text-sm text-text-muted">{aluno.professor?.usuario.nome || 'Autogestão'}</td>
                  <td className="p-4">
                    {aluno.treinos.length === 0 ? (
                      <span className="text-xs text-text-muted italic">Nenhum</span>
                    ) : (
                      <button
                        onClick={() => setViewingTreinos({ treinos: aluno.treinos, alunoNome: aluno.usuario.nome })}
                        className="text-sm text-primary hover:underline cursor-pointer"
                      >
                        Ver treinos ({aluno.treinos.length})
                      </button>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => navigate(`/treinos/criar?alunoId=${aluno.id}`)}
                      className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/95 transition-colors cursor-pointer"
                    >
                      + Novo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Visualizar Treinos */}
      {viewingTreinos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setViewingTreinos(null)} />
          <div className="relative z-10 mx-4 w-full max-w-lg rounded-lg bg-surface-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Treinos de {viewingTreinos.alunoNome}</h3>
              <button onClick={() => setViewingTreinos(null)} className="text-text-muted hover:text-text text-lg cursor-pointer">&times;</button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {viewingTreinos.treinos.map((t) => {
                const aluno = alunos.find((a) => a.treinos.some((tr) => tr.id === t.id))
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-surface-input bg-surface p-3">
                    <div>
                      <p className="text-sm font-medium text-text">{t.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_COR[t.status] || 'text-text-muted'}`}>
                          {t.status}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {t.dias_semana?.map((d: number) => DIA_LABEL[d]).join(', ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setViewingTreinos(null); navigate(`/treino/${t.id}/inicio`) }}
                        className="text-xs text-primary hover:underline cursor-pointer"
                      >
                        Exibir
                      </button>
                      <button
                        onClick={() => {
                          setViewingTreinos(null)
                          openCloneModal(t.id, t.nome)
                        }}
                        className="text-xs text-blue-400 hover:underline cursor-pointer"
                      >
                        Clonar
                      </button>
                      <button
                        onClick={() => {
                          setEditingTreino({
                            treino: { ...t, aluno_id: '', criado_em: '' } as Treino,
                            alunoId: aluno?.id || '',
                          })
                          setForm({ nome: t.nome, diasSemana: t.dias_semana ? [...t.dias_semana] : [] })
                          setViewingTreinos(null)
                        }}
                        className="text-xs text-blue-400 hover:underline cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setDeletingTreino({ id: t.id, nome: t.nome })
                          setViewingTreinos(null)
                        }}
                        className="text-xs text-destructive hover:underline cursor-pointer"
                      >
                        Deletar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Treino */}
      {editingTreino && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setEditingTreino(null); setForm({ nome: '', diasSemana: [] }) }} />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-lg bg-surface-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-text">Editar Treino</h3>
            <div className="mt-4 space-y-4">
              <input
                type="text"
                placeholder="Nome do treino"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              <div>
                <p className="mb-2 text-xs text-text-muted">Dias da semana</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(DIA_LABEL).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => toggleDia(Number(k))}
                      className={`rounded px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        form.diasSemana.includes(Number(k))
                          ? 'bg-primary text-white'
                          : 'bg-surface text-text-muted border border-surface-input hover:border-primary'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setEditingTreino(null); setForm({ nome: '', diasSemana: [] }) }}
                disabled={saving}
                className="rounded border border-surface-input bg-surface px-4 py-2 text-sm text-text-muted hover:text-text disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateTreino}
                disabled={saving || !form.nome || form.diasSemana.length === 0}
                className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingTreino && (
        <ConfirmModal
          open={!!deletingTreino}
          title="Remover treino"
          message={`Tem certeza que deseja remover o treino "${deletingTreino.nome}"? Esta ação não pode ser desfeita.`}
          onConfirm={handleDeleteTreino}
          onCancel={() => setDeletingTreino(null)}
          loading={saving}
        />
      )}

      {/* Modal: Clonar Treino */}
      {cloningTreino && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCloningTreino(null)} />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-lg bg-surface-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-text">Clonar Treino</h3>
            <p className="mt-1 text-sm text-text-muted">
              Clonando: <span className="text-text font-medium">{cloningTreino.nome}</span>
            </p>
            <div className="mt-4">
              <label className="block text-xs text-text-muted mb-1">Aluno destino</label>
              <select
                value={alunoDestinoId}
                onChange={(e) => setAlunoDestinoId(e.target.value)}
                className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
              >
                <option value="">Selecione um aluno...</option>
                {alunosDestino.map((a) => (
                  <option key={a.id} value={a.id}>{a.usuario.nome} ({a.usuario.email})</option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setCloningTreino(null)}
                disabled={saving}
                className="rounded border border-surface-input bg-surface px-4 py-2 text-sm text-text-muted hover:text-text disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCloneTreino}
                disabled={saving || !alunoDestinoId}
                className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Clonando...' : 'Clonar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
