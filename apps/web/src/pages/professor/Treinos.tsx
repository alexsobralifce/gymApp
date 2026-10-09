import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../../components/ui/Toast'
import ConfirmModal from '../../components/ui/ConfirmModal'
import BatchActionBar from '../../components/ui/BatchActionBar'
import Input from '../../components/ui/Input'
import BarraBusca from '../../components/ui/BarraBusca'
import { filtrarPorTexto } from '../../utils/busca'
import Select from '../../components/ui/Select'
import FormField from '../../components/ui/FormField'
import type { ProfessorDashboard, Treino } from '../../types/api'

import { useT } from '../../i18n'
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

export default function ProfessorTreinos() {
  const { t } = useT()
  const [alunos, setAlunos] = useState<ProfessorDashboard[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [editingTreino, setEditingTreino] = useState<{ treino: Treino; alunoId: string } | null>(null)
  const [deletingTreino, setDeletingTreino] = useState<{ id: string; nome: string } | null>(null)
  const [viewingTreinos, setViewingTreinos] = useState<{ treinos: ProfessorDashboard['treinos']; alunoNome: string; alunoId: string } | null>(null)
  const [form, setForm] = useState({ nome: '', diasSemana: [] as number[] })
  const [saving, setSaving] = useState(false)
  const [cloningTreino, setCloningTreino] = useState<{ id: string; nome: string } | null>(null)
  const [alunosDestino, setAlunosDestino] = useState<{ id: string; usuario: { nome: string; email: string } }[]>([])
  const [alunoDestinoId, setAlunoDestinoId] = useState('')
  const [cloningLote, setCloningLote] = useState<{ id: string; nome: string } | null>(null)
  const [alunosLoteDisponiveis, setAlunosLoteDisponiveis] = useState<{ id: string; usuario: { nome: string; email: string } }[]>([])
  const [selectedAlunoIds, setSelectedAlunoIds] = useState<string[]>([])
  const [buscaAlunoLote, setBuscaAlunoLote] = useState('')
  const { showToast, ToastComponent } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    api.getDashboard().then(setAlunos).finally(() => setLoading(false))
  }, [])

  const filteredAlunos = filtrarPorTexto(alunos, search, (a) => [
    a.usuario.nome,
    a.usuario.email,
    ...a.treinos.map((tr) => tr.nome),
  ])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    const currentIds = filteredAlunos.map((a) => a.id)
    const allSelected = currentIds.every((id) => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentIds])))
    }
  }

  const executeBatchDelete = async () => {
    if (!viewingTreinos || selectedIds.length === 0) return
    setBatchDeleting(true)
    try {
      await Promise.allSettled(selectedIds.map((id) => api.deleteTreino(id)))
      showToast(t('{length} treino(s) removido(s) com sucesso!', { length: selectedIds.length }))
      setSelectedIds([])
      const updatedDash = await api.getDashboard()
      setAlunos(updatedDash)
      const updatedAluno = updatedDash.find((a) => a.id === viewingTreinos.alunoId)
      if (updatedAluno) {
        setViewingTreinos({
          treinos: updatedAluno.treinos,
          alunoNome: updatedAluno.usuario.nome,
          alunoId: updatedAluno.id,
        })
      } else {
        setViewingTreinos(null)
      }
    } catch (e) {
      showToast(t((e as Error).message), 'error')
    } finally {
      setBatchDeleting(false)
    }
  }

  const handleBatchDeleteWorkoutsInModal = () => {
    if (!viewingTreinos || selectedIds.length === 0) return
    setConfirmDeleteOpen(true)
  }

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
      showToast(t('Treino atualizado com sucesso!'))
      setEditingTreino(null)
      setForm({ nome: '', diasSemana: [] })
      const data = await api.getDashboard()
      setAlunos(data)
    } catch (e) {
      showToast(t((e as Error).message), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTreino = async () => {
    if (!deletingTreino) return
    setSaving(true)
    try {
      await api.deleteTreino(deletingTreino.id)
      showToast(t('Treino removido com sucesso!'))
      setDeletingTreino(null)
      const data = await api.getDashboard()
      setAlunos(data)
    } catch (e) {
      showToast(t((e as Error).message), 'error')
    } finally {
      setSaving(false)
    }
  }

  const openCloneModal = async (treinoId: string, treinoNome: string) => {
    setCloningTreino({ id: treinoId, nome: treinoNome })
    setAlunoDestinoId('')
    try {
      const lista = await api.getAlunosProfessor()
      setAlunosDestino(lista)
    } catch {
      showToast(t('Erro ao carregar alunos'), 'error')
    }
  }

  const handleCloneTreino = async () => {
    if (!cloningTreino || !alunoDestinoId) return
    setSaving(true)
    try {
      const treino = await api.clonarTreino(cloningTreino.id, alunoDestinoId)
      await api.enviarTreino(treino.id)
      showToast(t('Treino clonado com sucesso!'))
      setCloningTreino(null)
      const data = await api.getDashboard()
      setAlunos(data)
    } catch (e) {
      showToast(t((e as Error).message), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleTemplate = async (treinoId: string, isTemplate: boolean) => {
    try {
      await api.marcarTemplate(treinoId, isTemplate)
      showToast(isTemplate ? t('Template ativado!') : t('Template removido!'))
      const data = await api.getDashboard()
      setAlunos(data)
    } catch (e) {
      showToast(t((e as Error).message), 'error')
    }
  }

  const openCloneLoteModal = async (treinoId: string, treinoNome: string) => {
    setCloningLote({ id: treinoId, nome: treinoNome })
    setSelectedAlunoIds([])
    setBuscaAlunoLote('')
    try {
      const lista = await api.getAlunosProfessor()
      setAlunosLoteDisponiveis(lista)
    } catch {
      showToast(t('Erro ao carregar alunos'), 'error')
    }
  }

  const toggleAlunoLote = (id: string) => {
    setSelectedAlunoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleCloneLote = async () => {
    if (!cloningLote || selectedAlunoIds.length === 0) return
    setSaving(true)
    try {
      const treinos = await api.clonarTreinoLote(cloningLote.id, selectedAlunoIds)
      await Promise.all(treinos.map((tr) => api.enviarTreino(tr.id)))
      showToast(t('{length} treino(s) clonado(s) e enviado(s) com sucesso!', { length: treinos.length }))
      setCloningLote(null)
      setSelectedAlunoIds([])
      const data = await api.getDashboard()
      setAlunos(data)
    } catch (e) {
      showToast(t((e as Error).message), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-4 text-text-muted">{t('Carregando...')}</div>

  return (
    <div className="p-4 md:p-6">
      {ToastComponent}

      <h1 className="mb-6 text-xl font-bold text-text">{t('Listar Treinos')}</h1>

      <BarraBusca
        value={search}
        onChange={setSearch}
        placeholder={t('Buscar aluno por nome, email ou treino...')}
        total={alunos.length}
        filtrados={filteredAlunos.length}
      />

      {filteredAlunos.length === 0 ? (
        <p className="text-text-muted">{t('Nenhum aluno encontrado.')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-surface-card border border-surface-input">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-input bg-surface/50 text-xs font-semibold text-text-muted uppercase tracking-wider">
                <th className="p-4">{t('Aluno')}</th>
                <th className="p-4">{t('Fone')}</th>
                <th className="p-4">{t('Email')}</th>
                <th className="p-4">{t('Treinos')}</th>
                <th className="p-4 text-right">{t('Ações')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-input">
              {filteredAlunos.map((aluno) => (
                <tr key={aluno.id} className="hover:bg-surface/30 transition-colors">
                  <td className="p-4 text-sm font-medium text-text">{aluno.usuario.nome}</td>
                  <td className="p-4 text-sm text-text-muted">{aluno.usuario.telefone || '-'}</td>
                  <td className="p-4 text-sm text-text-muted">{aluno.usuario.email}</td>
                  <td className="p-4">
                    {aluno.treinos.length === 0 ? (
                      <span className="text-xs text-text-muted italic">{t('Nenhum')}</span>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedIds([])
                          setViewingTreinos({ treinos: aluno.treinos, alunoNome: aluno.usuario.nome, alunoId: aluno.id })
                        }}
                        className="text-sm text-primary hover:underline cursor-pointer"
                      >
                        {t('Ver treinos (')}{aluno.treinos.length})
                      </button>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/treinos/criar?alunoId=${aluno.id}`)}
                        className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors cursor-pointer"
                      >
                        {t('+ Novo')}
                      </button>
                    </div>
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
              <h3 className="text-lg font-semibold text-text">{t('Treinos de')} {viewingTreinos.alunoNome}</h3>
              <button onClick={() => setViewingTreinos(null)} className="text-text-muted hover:text-text text-lg cursor-pointer">&times;</button>
            </div>

            <BatchActionBar
              selectedCount={selectedIds.length}
              onClearSelection={() => setSelectedIds([])}
              onDeleteSelected={handleBatchDeleteWorkoutsInModal}
              loading={batchDeleting}
            />

            {viewingTreinos.treinos.length > 0 && (
              <div className="mb-2 flex items-center justify-end">
                <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={viewingTreinos.treinos.every((tr) => selectedIds.includes(tr.id))}
                    onChange={() => toggleSelectAll()}
                    className="rounded border-surface-input text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>{t('Selecionar todos os treinos')}</span>
                </label>
              </div>
            )}

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {viewingTreinos.treinos.map((tr) => (
                <div key={tr.id} className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${selectedIds.includes(tr.id) ? 'border-primary bg-primary/5' : 'border-surface-input bg-surface'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(tr.id)}
                      onChange={() => toggleSelect(tr.id)}
                      className="rounded border-surface-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text">{tr.nome}</p>
                        {tr.is_template && (
                          <span className="inline-flex rounded px-1.5 py-0.5 text-xs font-semibold text-warning bg-amber-400/10 border border-amber-400/20">
                            {t('Template')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-semibold ${STATUS_COR[tr.status] || 'text-text-muted'}`}>
                          {tr.status}
                        </span>
                        <span className="text-xs text-text-muted">
                          {tr.dias_semana?.map((d: number) => t(DIA_LABEL[d])).join(', ')}
                        </span>
                        {tr.nota_avaliacao && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-xs font-bold text-amber-400">
                            ⭐ {tr.nota_avaliacao}/5
                          </span>
                        )}
                      </div>
                      {tr.feedback_comentario && (
                        <p className="mt-1.5 text-xs text-text-muted italic bg-surface-input/40 px-2 py-1 rounded border border-surface-input">
                          💬 "{tr.feedback_comentario}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                      <button
                        onClick={() => handleToggleTemplate(tr.id, !tr.is_template)}
                        className={`text-xs hover:underline cursor-pointer min-h-[32px] inline-flex items-center ${tr.is_template ? 'text-warning' : 'text-amber-500'}`}
                      >
                        {tr.is_template ? t('Desmarcar Template') : 'Template'}
                      </button>
                      {tr.is_template && (
                        <button
                          onClick={() => { setViewingTreinos(null); openCloneLoteModal(tr.id, tr.nome) }}
                          className="text-xs text-success hover:underline cursor-pointer min-h-[32px] inline-flex items-center"
                        >
                          {t('Clonar em Lote')}
                        </button>
                      )}
                      <button
                        onClick={() => { setViewingTreinos(null); navigate(`/treino/${tr.id}/inicio`) }}
                        className="text-xs text-primary hover:underline cursor-pointer min-h-[32px] inline-flex items-center"
                      >
                        {t('Exibir')}
                      </button>
                    <button
                      onClick={() => {
                        setViewingTreinos(null)
                        openCloneModal(tr.id, tr.nome)
                      }}
                      className="text-xs text-blue-400 hover:underline cursor-pointer min-h-[32px] inline-flex items-center"
                    >
                      {t('Clonar')}
                    </button>
                    <button
                      onClick={() => {
                        const treino = tr as Treino
                        setEditingTreino({ treino: { ...treino, aluno_id: '', criado_em: '' }, alunoId: viewingTreinos.alunoId })
                        setForm({ nome: treino.nome, diasSemana: treino.dias_semana ? [...treino.dias_semana] : [] })
                        setViewingTreinos(null)
                      }}
                      className="text-xs text-blue-400 hover:underline cursor-pointer min-h-[32px] inline-flex items-center"
                    >
                      {t('Editar')}
                    </button>
                    <button
                      onClick={() => {
                        setDeletingTreino({ id: tr.id, nome: tr.nome })
                        setViewingTreinos(null)
                      }}
                      className="text-xs text-destructive hover:underline cursor-pointer min-h-[32px] inline-flex items-center"
                    >
                      {t('Deletar')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Treino */}
      {editingTreino && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setEditingTreino(null); setForm({ nome: '', diasSemana: [] }) }} />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-lg bg-surface-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-text">{t('Editar Treino')}</h3>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label={t('Nome do treino')} htmlFor="edit-nome">
                  <Input
                    id="edit-nome"
                    type="text"
                    placeholder={t('Nome do treino')}
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  />
                </FormField>
                <div>
                  <p className="mb-2 text-xs text-text-muted">{t('Dias da semana')}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(DIA_LABEL).map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => toggleDia(Number(k))}
                        className={`rounded px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                          form.diasSemana.includes(Number(k))
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-surface text-text-muted border border-surface-input hover:border-primary'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setEditingTreino(null); setForm({ nome: '', diasSemana: [] }) }}
                disabled={saving}
                className="rounded border border-surface-input bg-surface px-4 py-2 text-sm text-text-muted hover:text-text disabled:opacity-50 cursor-pointer"
              >
                {t('Cancelar')}
              </button>
              <button
                onClick={handleUpdateTreino}
                disabled={saving || !form.nome || form.diasSemana.length === 0}
                className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Remoção */}
      {deletingTreino && (
        <ConfirmModal
          open={!!deletingTreino}
          title={t('Remover treino')}
          message={t('Tem certeza que deseja remover o treino "{nome}"? Esta ação não pode ser desfeita.', { nome: deletingTreino.nome })}
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
            <h3 className="text-lg font-semibold text-text">{t('Clonar Treino')}</h3>
            <p className="mt-1 text-sm text-text-muted">
              {t('Clonando:')} <span className="text-text font-medium">{cloningTreino.nome}</span>
            </p>
            <div className="mt-4">
              <FormField label={t('Aluno destino')} htmlFor="aluno-destino">
                <Select
                  id="aluno-destino"
                  value={alunoDestinoId}
                  onChange={(e) => setAlunoDestinoId(e.target.value)}
                >
                  <option value="">{t('Selecione um aluno...')}</option>
                  {alunosDestino.map((a) => (
                    <option key={a.id} value={a.id}>{a.usuario.nome} ({a.usuario.email})</option>
                  ))}
                </Select>
              </FormField>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setCloningTreino(null)}
                disabled={saving}
                className="rounded border border-surface-input bg-surface px-4 py-2 text-sm text-text-muted hover:text-text disabled:opacity-50 cursor-pointer"
              >
                {t('Cancelar')}
              </button>
              <button
                onClick={handleCloneTreino}
                disabled={saving || !alunoDestinoId}
                className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Clonando...' : 'Clonar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Clonar em Lote */}
      {cloningLote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCloningLote(null)} />
          <div className="relative z-10 mx-4 w-full max-w-lg rounded-lg bg-surface-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-text">{t('Clonar em Lote')}</h3>
            <p className="mt-1 text-sm text-text-muted">
              {t('Clonando:')} <span className="text-text font-medium">{cloningLote.nome}</span>
            </p>
            <div className="mt-1 text-xs text-warning">
              {selectedAlunoIds.length} {t('aluno(s) selecionado(s)')}
            </div>
            <div className="mt-3">
              <Input
                type="text"
                placeholder={t('Buscar aluno...')}
                value={buscaAlunoLote}
                onChange={(e) => setBuscaAlunoLote(e.target.value)}
              />
            </div>
            <div className="mt-3 max-h-60 overflow-y-auto space-y-1">
              {alunosLoteDisponiveis
                .filter((a) =>
                  buscaAlunoLote === '' ||
                  a.usuario.nome.toLowerCase().includes(buscaAlunoLote.toLowerCase()) ||
                  a.usuario.email.toLowerCase().includes(buscaAlunoLote.toLowerCase())
                )
                .map((a) => (
                  <label key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAlunoIds.includes(a.id)}
                      onChange={() => toggleAlunoLote(a.id)}
                      className="rounded border-surface-input"
                    />
                    <span className="text-sm text-text">{a.usuario.nome}</span>
                    <span className="text-xs text-text-muted ml-auto">{a.usuario.email}</span>
                  </label>
                ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedAlunoIds(alunosLoteDisponiveis.map((a) => a.id))}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                {t('Selecionar todos')}
              </button>
              <button
                onClick={() => setSelectedAlunoIds([])}
                className="text-xs text-text-muted hover:underline cursor-pointer"
              >
                {t('Limpar')}
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setCloningLote(null)}
                disabled={saving}
                className="rounded border border-surface-input bg-surface px-4 py-2 text-sm text-text-muted hover:text-text disabled:opacity-50 cursor-pointer"
              >
                {t('Cancelar')}
              </button>
              <button
                onClick={handleCloneLote}
                disabled={saving || selectedAlunoIds.length === 0}
                className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Clonando...' : t('Clonar para {length} alunos', { length: selectedAlunoIds.length })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão em Lote */}
      <ConfirmModal
        open={confirmDeleteOpen}
        title={t('Excluir treinos')}
        message={t('Tem certeza que deseja excluir os {length} treino(s) selecionado(s)?', { length: selectedIds.length })}
        onConfirm={() => {
          setConfirmDeleteOpen(false)
          executeBatchDelete()
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
        loading={batchDeleting}
      />
    </div>
  )
}
