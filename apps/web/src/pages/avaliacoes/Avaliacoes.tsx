import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import Toast from '../../components/ui/Toast'
import ConfirmModal from '../../components/ui/ConfirmModal'
import BatchActionBar from '../../components/ui/BatchActionBar'
import { RulerIcon, PlusIcon, UserCircleIcon, ClipboardListIcon, DumbbellIcon, ChartLineIcon, PencilIcon, TrashIcon } from '../../components/icons/Icon'
import ReactMarkdown from 'react-markdown'

export default function Avaliacoes() {
  const [alunos, setAlunos] = useState<any[]>([])
  const [selectedAluno, setSelectedAluno] = useState<any | null>(null)
  const [avaliacoes, setAvaliacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [buscaAluno, setBuscaAluno] = useState('')
  const [buscaAvaliacao, setBuscaAvaliacao] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchDeleting, setBatchDeleting] = useState(false)
  
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null)

  // Laudo / Prescrição / Comparativo Modal state
  const [activeLaudo, setActiveLaudo] = useState<string | null>(null)
  const [activePrescricao, setActivePrescricao] = useState<any | null>(null)
  const [activeComparativo, setActiveComparativo] = useState<any | null>(null)

  // Form state - Antropometria & Vitais
  const [pesoKg, setPesoKg] = useState('')
  const [estaturaM, setEstaruraM] = useState('')
  const [cinturaCm, setCinturaCm] = useState('')
  const [quadrilCm, setQuadrilCm] = useState('')
  const [pas, setPas] = useState('')
  const [pad, setPad] = useState('')
  const [fcRepouso, setFcRepouso] = useState('')
  const [protocoloDobras, setProtocoloDobras] = useState<'JP7' | 'JP3' | 'GUEDES'>('JP7')
  
  // Dobras
  const [triceps, setTriceps] = useState('')
  const [subescapular, setSubescapular] = useState('')
  const [peitoral, setPeitoral] = useState('')
  const [axilarMedia, setAxilarMedia] = useState('')
  const [suprailiaca, setSuprailiaca] = useState('')
  const [abdominal, setAbdominal] = useState('')
  const [coxa, setCoxa] = useState('')
  const [parqPositivo, setParqPositivo] = useState(false)

  // Phase 2 - Testes Funcionais
  const [wellsCm, setWellsCm] = useState('')
  const [cooperMetros, setCooperMetros] = useState('')
  const [carga1Rm, setCarga1Rm] = useState('')
  const [reps1Rm, setReps1Rm] = useState('')

  useEffect(() => {
    carregarAlunos()
  }, [])

  useEffect(() => {
    if (selectedAluno) {
      carregarAvaliacoes(selectedAluno.id)
    }
  }, [selectedAluno])

  async function carregarAlunos() {
    try {
      setLoading(true)
      let list: any[] = []
      const resProf: any = await api.getAlunosProfessor().catch(() => null)
      if (Array.isArray(resProf) && resProf.length > 0) {
        list = resProf
      } else {
        const resAcad: any = await api.getAlunosAcademia().catch(() => null)
        if (Array.isArray(resAcad) && resAcad.length > 0) {
          list = resAcad
        } else if (Array.isArray(resProf)) {
          list = resProf
        }
      }
      setAlunos(list)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao carregar alunos', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function carregarAvaliacoes(alunoId: string) {
    try {
      const res: any = await api.get(`/avaliacoes/aluno/${alunoId}`)
      const data = Array.isArray(res) ? res : res?.data ?? []
      setAvaliacoes(data)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao carregar avaliações', type: 'error' })
    }
  }

  async function handleCriarAvaliacao(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAluno) return

    try {
      setLoading(true)
      const payload: any = {
        alunoId: selectedAluno.id,
        parqPositivo,
        riscoCardiaco: parqPositivo ? 'MODERADO' : 'BAIXO',
        pas: pas ? parseFloat(pas) : undefined,
        pad: pad ? parseFloat(pad) : undefined,
        fcRepouso: fcRepouso ? parseInt(fcRepouso) : undefined,
        pesoKg: pesoKg ? parseFloat(pesoKg) : undefined,
        estaturaM: estaturaM ? parseFloat(estaturaM) : undefined,
        cinturaCm: cinturaCm ? parseFloat(cinturaCm) : undefined,
        quadrilCm: quadrilCm ? parseFloat(quadrilCm) : undefined,
        protocoloDobras,
        dobrasMm: {
          triceps: triceps ? parseFloat(triceps) : undefined,
          subescapular: subescapular ? parseFloat(subescapular) : undefined,
          peitoral: peitoral ? parseFloat(peitoral) : undefined,
          axilar_media: axilarMedia ? parseFloat(axilarMedia) : undefined,
          suprailiaca: suprailiaca ? parseFloat(suprailiaca) : undefined,
          abdominal: abdominal ? parseFloat(abdominal) : undefined,
          coxa: coxa ? parseFloat(coxa) : undefined,
        },
        flexibilidadeJson: wellsCm ? { bancoWellsCm: parseFloat(wellsCm) } : undefined,
        cardioJson: cooperMetros ? { cooperDistanciaMetros: parseFloat(cooperMetros) } : undefined,
        neuroJson: carga1Rm && reps1Rm ? { cargaKg: parseFloat(carga1Rm), reps: parseInt(reps1Rm) } : undefined,
      }

      if (modalMode === 'edit' && editingId) {
        await api.patch(`/avaliacoes/${editingId}`, payload)
        setToast({ message: 'Avaliação física atualizada com sucesso!', type: 'success' })
      } else {
        await api.post('/avaliacoes', payload)
        setToast({ message: 'Avaliação física completa registrada com sucesso!', type: 'success' })
      }

      setShowModal(false)
      carregarAvaliacoes(selectedAluno.id)
      setPesoKg('')
      setEstaruraM('')
      setCinturaCm('')
      setQuadrilCm('')
      setTriceps('')
      setSubescapular('')
      setPeitoral('')
      setAxilarMedia('')
      setSuprailiaca('')
      setAbdominal('')
      setCoxa('')
      setWellsCm('')
      setCooperMetros('')
      setCarga1Rm('')
      setReps1Rm('')
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao registrar avaliação', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  function handleOpenNovaAvaliacao() {
    setModalMode('create')
    setEditingId(null)
    setPesoKg('')
    setEstaruraM('')
    setCinturaCm('')
    setQuadrilCm('')
    setPas('')
    setPad('')
    setFcRepouso('')
    setProtocoloDobras('JP7')
    setTriceps('')
    setSubescapular('')
    setPeitoral('')
    setAxilarMedia('')
    setSuprailiaca('')
    setAbdominal('')
    setCoxa('')
    setWellsCm('')
    setCooperMetros('')
    setCarga1Rm('')
    setReps1Rm('')
    setParqPositivo(false)
    setShowModal(true)
  }

  function handleOpenEditarAvaliacao(av: any) {
    setModalMode('edit')
    setEditingId(av.id)
    setPesoKg(av.peso_kg ? String(av.peso_kg) : '')
    setEstaruraM(av.estatura_m ? String(av.estatura_m) : '')
    setCinturaCm(av.perimetros_cm?.cintura ? String(av.perimetros_cm.cintura) : '')
    setQuadrilCm(av.perimetros_cm?.quadril ? String(av.perimetros_cm.quadril) : '')
    setPas(av.pas ? String(av.pas) : '')
    setPad(av.pad ? String(av.pad) : '')
    setFcRepouso(av.fc_repouso ? String(av.fc_repouso) : '')
    setProtocoloDobras(av.protocolo_dobras || 'JP7')
    
    // Dobras
    // Backend returns dobras calculated sum, but we can't reverse engineer easily without storing raw. 
    // If we haven't stored raw dobras, they might be lost, but for now we reset them if not available.
    // Ideally the backend stores the raw JSON. Here we try to map if it exists.
    const dobras = av.dobras_mm || {}
    setTriceps(dobras.triceps ? String(dobras.triceps) : '')
    setSubescapular(dobras.subescapular ? String(dobras.subescapular) : '')
    setPeitoral(dobras.peitoral ? String(dobras.peitoral) : '')
    setAxilarMedia(dobras.axilar_media ? String(dobras.axilar_media) : '')
    setSuprailiaca(dobras.suprailiaca ? String(dobras.suprailiaca) : '')
    setAbdominal(dobras.abdominal ? String(dobras.abdominal) : '')
    setCoxa(dobras.coxa ? String(dobras.coxa) : '')

    setWellsCm(av.flexibilidade_json?.bancoWellsCm ? String(av.flexibilidade_json.bancoWellsCm) : '')
    setCooperMetros(av.cardio_json?.cooperDistanciaMetros ? String(av.cardio_json.cooperDistanciaMetros) : '')
    setCarga1Rm(av.neuro_json?.cargaKg ? String(av.neuro_json.cargaKg) : '')
    setReps1Rm(av.neuro_json?.reps ? String(av.neuro_json.reps) : '')
    setParqPositivo(av.parq_positivo || false)

    setShowModal(true)
  }

  async function handleConfirmDelete() {
    if (!showConfirmDelete) return
    try {
      setLoading(true)
      await api.delete(`/avaliacoes/${showConfirmDelete}`)
      setToast({ message: 'Avaliação excluída com sucesso!', type: 'success' })
      if (selectedAluno) carregarAvaliacoes(selectedAluno.id)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao excluir avaliação', type: 'error' })
    } finally {
      setLoading(false)
      setShowConfirmDelete(null)
    }
  }

  async function handleGerarLaudo(id: string) {
    try {
      setLoading(true)
      const res: any = await api.post(`/avaliacoes/${id}/gerar-laudo`, {})
      const laudo = res?.laudo ?? res?.data?.laudo
      setActiveLaudo(laudo)
      setToast({ message: 'Laudo inteligente gerado com sucesso!', type: 'success' })
      if (selectedAluno) carregarAvaliacoes(selectedAluno.id)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao gerar laudo', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleGerarPrescricao(id: string) {
    try {
      setLoading(true)
      const res: any = await api.post(`/avaliacoes/${id}/gerar-prescricao`, {})
      const prescricao = res?.prescricao ?? res?.data?.prescricao
      setActivePrescricao(prescricao)
      setToast({ message: 'Prescrição de 4 semanas gerada com sucesso!', type: 'success' })
      if (selectedAluno) carregarAvaliacoes(selectedAluno.id)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao gerar prescrição', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleCompararAvaliacoes() {
    if (avaliacoes.length < 2) return
    try {
      setLoading(true)
      const atualId = avaliacoes[0].id
      const anteriorId = avaliacoes[1].id
      const res: any = await api.get(`/avaliacoes/comparar?atualId=${atualId}&anteriorId=${anteriorId}`)
      const comp = res?.deltas ? res : res?.data
      setActiveComparativo(comp)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao comparar avaliações', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-card p-6 rounded-2xl border border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text flex items-center gap-2">
            <RulerIcon className="h-7 w-7 text-primary" />
            Protocolo de Avaliação Física & Evolução Comparativa
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Antropometria, Composição Corporal, Testes Funcionais, Prescrição e Comparativo Evolutivo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Alunos */}
        <div className="bg-surface-card p-5 rounded-2xl border border-border space-y-4">
          <h2 className="font-semibold text-text text-lg">Selecione o Aluno</h2>
          
          <input
            type="text"
            placeholder="Buscar aluno por nome ou email..."
            value={buscaAluno}
            onChange={(e) => setBuscaAluno(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />

          {loading && alunos.length === 0 ? (
            <LoadingSpinner />
          ) : alunos.length === 0 ? (
            <EmptyState icon="👥" title="Nenhum aluno encontrado" description="Você precisa ter alunos vinculados para realizar avaliações." />
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {alunos
                .filter((aluno) => {
                  const nome = aluno.usuario?.nome || aluno.nome || ''
                  const email = aluno.usuario?.email || ''
                  return (
                    nome.toLowerCase().includes(buscaAluno.toLowerCase()) ||
                    email.toLowerCase().includes(buscaAluno.toLowerCase())
                  )
                })
                .map((aluno) => {
                  const isSelected = selectedAluno?.id === aluno.id
                  return (
                    <button
                      key={aluno.id}
                      onClick={() => {
                        setSelectedIds([])
                        setSelectedAluno(aluno)
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-text'
                          : 'border-border bg-surface hover:border-primary/50 text-text-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <UserCircleIcon className="h-8 w-8 text-primary shrink-0" />
                        <div>
                          <p className="font-medium text-text">{aluno.usuario?.nome || aluno.nome || 'Aluno'}</p>
                          <p className="text-xs text-text-muted">{aluno.usuario?.email || ''}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
            </div>
          )}
        </div>

        {/* Histórico e Detalhes da Avaliação */}
        <div className="lg:col-span-2 bg-surface-card p-6 rounded-2xl border border-border space-y-6">
          {selectedAluno ? (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-4">
                <div>
                  <h2 className="text-xl font-bold text-text">Avaliações de {selectedAluno.usuario?.nome || selectedAluno.nome}</h2>
                  <p className="text-sm text-text-muted">Histórico de protocolos e comparativos evolutivos</p>
                </div>
                <div className="flex items-center gap-2">
                  {avaliacoes.length >= 2 && (
                    <button
                      onClick={handleCompararAvaliacoes}
                      className="flex items-center gap-2 px-3.5 py-2 bg-surface border border-border text-text rounded-xl font-medium hover:border-primary transition-all"
                    >
                      <ChartLineIcon className="h-4 w-4 text-primary" />
                      Comparar
                    </button>
                  )}
                  <button
                    onClick={handleOpenNovaAvaliacao}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Nova Avaliação
                  </button>
                </div>
              </div>

              {avaliacoes.length > 0 && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Buscar avaliação por data ou laudo..."
                    value={buscaAvaliacao}
                    onChange={(e) => setBuscaAvaliacao(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
                  />

                  <BatchActionBar
                    selectedCount={selectedIds.length}
                    onClearSelection={() => setSelectedIds([])}
                    onDeleteSelected={async () => {
                      if (!window.confirm(`Tem certeza que deseja excluir ${selectedIds.length} avaliação(ões) selecionada(s)?`)) return
                      setBatchDeleting(true)
                      try {
                        await Promise.allSettled(selectedIds.map((id) => api.delete(`/avaliacoes/${id}`)))
                        setAvaliacoes((prev) => prev.filter((av) => !selectedIds.includes(av.id)))
                        setSelectedIds([])
                        setToast({ message: `${selectedIds.length} avaliação(ões) excluída(s)!`, type: 'success' })
                      } catch (err: any) {
                        setToast({ message: err.message || 'Erro ao excluir avaliações', type: 'error' })
                      } finally {
                        setBatchDeleting(false)
                      }
                    }}
                    loading={batchDeleting}
                  />
                </div>
              )}

              {avaliacoes.length === 0 ? (
                <EmptyState icon="📋" title="Nenhuma avaliação registrada" description="Clique em 'Nova Avaliação' para iniciar o protocolo completo." />
              ) : (
                <div className="space-y-4">
                  {avaliacoes
                    .filter((av) => {
                      const dateStr = new Date(av.data).toLocaleDateString('pt-BR')
                      return dateStr.includes(buscaAvaliacao) || (av.laudo_markdown && av.laudo_markdown.toLowerCase().includes(buscaAvaliacao.toLowerCase()))
                    })
                    .map((av) => {
                      const isSelected = selectedIds.includes(av.id)
                      return (
                        <div key={av.id} className={`p-4 rounded-xl border transition-all space-y-3 ${isSelected ? 'border-primary bg-primary/5' : 'bg-surface border-border'}`}>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() =>
                                  setSelectedIds((prev) =>
                                    prev.includes(av.id) ? prev.filter((i) => i !== av.id) : [...prev, av.id]
                                  )
                                }
                                className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                              />
                              <span className="font-semibold text-text">
                                Data: {new Date(av.data).toLocaleDateString('pt-BR')}
                              </span>
                          <button onClick={() => handleOpenEditarAvaliacao(av)} className="text-text-muted hover:text-primary transition-colors" title="Editar">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button onClick={() => setShowConfirmDelete(av.id)} className="text-text-muted hover:text-destructive transition-colors" title="Excluir">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => handleGerarLaudo(av.id)}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 bg-surface-card border border-border text-text rounded-lg text-xs font-medium hover:border-primary min-h-[36px]"
                          >
                            <ClipboardListIcon className="h-3.5 w-3.5 text-primary" />
                            {av.laudo_markdown ? 'Ver Laudo' : 'Gerar Laudo'}
                          </button>
                          <button
                            onClick={() => handleGerarPrescricao(av.id)}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-xs font-medium hover:opacity-80 min-h-[36px]"
                          >
                            <DumbbellIcon className="h-3.5 w-3.5" />
                            {av.prescricao_json ? 'Ver Prescrição' : 'Gerar Treino 4 Semanas'}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="p-3 bg-surface-card rounded-xl border border-border">
                          <p className="text-xs text-text-muted">Peso</p>
                          <p className="font-bold text-text">{av.peso_kg ? `${av.peso_kg} kg` : '—'}</p>
                        </div>
                        <div className="p-3 bg-surface-card rounded-xl border border-border">
                          <p className="text-xs text-text-muted">IMC</p>
                          <p className="font-bold text-text">{av.imc ?? '—'}</p>
                        </div>
                        <div className="p-3 bg-surface-card rounded-xl border border-border">
                          <p className="text-xs text-text-muted">% Gordura</p>
                          <p className="font-bold text-primary">{av.percentual_gordura ? `${av.percentual_gordura}%` : '—'}</p>
                        </div>
                        <div className="p-3 bg-surface-card rounded-xl border border-border">
                          <p className="text-xs text-text-muted">VO₂máx</p>
                          <p className="font-bold text-text">{av.cardio_json?.vo2max ? `${av.cardio_json.vo2max} ml/kg/min` : '—'}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center text-text-muted">
              <RulerIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Selecione um aluno ao lado para visualizar e registrar avaliações físicas.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Comparativo Evolutivo */}
      {activeComparativo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-card border border-border w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-xl font-bold text-text">Comparativo Evolutivo (Delta)</h3>
              <button onClick={() => setActiveComparativo(null)} className="text-text-muted hover:text-text font-bold text-lg">✕</button>
            </div>
            
            <p className="text-sm font-medium text-primary bg-primary/10 p-3 rounded-xl border border-primary/20">
              📊 Análise de Progresso: {activeComparativo.analise}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-surface rounded-xl border border-border">
                <p className="text-xs text-text-muted">Variação de Peso</p>
                <p className={`font-bold text-lg ${activeComparativo.deltas?.pesoKg < 0 ? 'text-success' : 'text-text'}`}>
                  {activeComparativo.deltas?.pesoKg > 0 ? `+${activeComparativo.deltas.pesoKg}` : activeComparativo.deltas?.pesoKg ?? 0} kg
                </p>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-border">
                <p className="text-xs text-text-muted">Variação % Gordura</p>
                <p className={`font-bold text-lg ${activeComparativo.deltas?.percentualGordura < 0 ? 'text-success' : 'text-text'}`}>
                  {activeComparativo.deltas?.percentualGordura > 0 ? `+${activeComparativo.deltas.percentualGordura}` : activeComparativo.deltas?.percentualGordura ?? 0}%
                </p>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-border">
                <p className="text-xs text-text-muted">Variação Massa Magra</p>
                <p className={`font-bold text-lg ${activeComparativo.deltas?.massaMagraKg > 0 ? 'text-success' : 'text-text'}`}>
                  {activeComparativo.deltas?.massaMagraKg > 0 ? `+${activeComparativo.deltas.massaMagraKg}` : activeComparativo.deltas?.massaMagraKg ?? 0} kg
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setActiveComparativo(null)} className="px-5 py-2 bg-primary text-primary-foreground font-medium rounded-xl">Fechar Comparativo</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualizar Laudo */}
      {activeLaudo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-card border border-border w-full max-w-3xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-xl font-bold text-text">Laudo Consolidado da Avaliação</h3>
              <button onClick={() => setActiveLaudo(null)} className="text-text-muted hover:text-text font-bold text-lg">✕</button>
            </div>
            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-text bg-surface p-4 rounded-xl border border-border">
              <ReactMarkdown>{activeLaudo}</ReactMarkdown>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setActiveLaudo(null)} className="px-5 py-2 bg-primary text-primary-foreground font-medium rounded-xl">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualizar Prescrição */}
      {activePrescricao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-card border border-border w-full max-w-3xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-xl font-bold text-text">Prescrição de 4 Semanas</h3>
              <button onClick={() => setActivePrescricao(null)} className="text-text-muted hover:text-text font-bold text-lg">✕</button>
            </div>
            <div className="space-y-4 text-sm text-text">
              <p className="font-medium">Foco: <span className="text-primary">{activePrescricao.foco}</span> ({activePrescricao.microciclo})</p>
              <div className="space-y-3">
                {activePrescricao.sessoes?.map((sessao: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-surface border border-border space-y-2">
                    <p className="font-bold text-primary">{sessao.dia} — {sessao.treino}</p>
                    <ul className="space-y-1 pl-4 list-disc text-text-muted">
                      {sessao.exercicios?.map((ex: any, i: number) => (
                        <li key={i}>
                          <span className="font-medium text-text">{ex.nome}</span> — {ex.series} séries x {ex.repeticoes} (RPE {ex.rpe})
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-muted bg-surface p-3 rounded-xl">💡 {activePrescricao.mobilidadeRecomendada}</p>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setActivePrescricao(null)} className="px-5 py-2 bg-primary text-primary-foreground font-medium rounded-xl">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Avaliação */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-card border border-border w-full max-w-2xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-text mb-4">
              {modalMode === 'edit' ? 'Editar Avaliação Física' : 'Nova Avaliação Física'} — {selectedAluno?.usuario?.nome}
            </h3>
            
            <form onSubmit={handleCriarAvaliacao} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={pesoKg}
                    onChange={(e) => setPesoKg(e.target.value)}
                    placeholder="Ex: 75.5"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Estatura (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={estaturaM}
                    onChange={(e) => setEstaruraM(e.target.value)}
                    placeholder="Ex: 1.78"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Cintura (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cinturaCm}
                    onChange={(e) => setCinturaCm(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Quadril (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={quadrilCm}
                    onChange={(e) => setQuadrilCm(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Protocolo Dobras</label>
                  <select
                    value={protocoloDobras}
                    onChange={(e: any) => setProtocoloDobras(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text"
                  >
                    <option value="JP7">Jackson & Pollock 7</option>
                    <option value="JP3">Jackson & Pollock 3</option>
                    <option value="GUEDES">Guedes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">PA Sistólica</label>
                  <input
                    type="number"
                    value={pas}
                    onChange={(e) => setPas(e.target.value)}
                    placeholder="120"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">PA Diastólica</label>
                  <input
                    type="number"
                    value={pad}
                    onChange={(e) => setPad(e.target.value)}
                    placeholder="80"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">FC Repouso (bpm)</label>
                  <input
                    type="number"
                    value={fcRepouso}
                    onChange={(e) => setFcRepouso(e.target.value)}
                    placeholder="70"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-sm font-semibold text-text mb-2">Dobras Cutâneas (mm)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Tríceps</label>
                    <input type="number" step="0.1" value={triceps} onChange={(e) => setTriceps(e.target.value)} className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-text" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Subescapular</label>
                    <input type="number" step="0.1" value={subescapular} onChange={(e) => setSubescapular(e.target.value)} className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-text" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Peitoral</label>
                    <input type="number" step="0.1" value={peitoral} onChange={(e) => setPeitoral(e.target.value)} className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-text" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Axilar Média</label>
                    <input type="number" step="0.1" value={axilarMedia} onChange={(e) => setAxilarMedia(e.target.value)} className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-text" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Suprailíaca</label>
                    <input type="number" step="0.1" value={suprailiaca} onChange={(e) => setSuprailiaca(e.target.value)} className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-text" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Abdominal</label>
                    <input type="number" step="0.1" value={abdominal} onChange={(e) => setAbdominal(e.target.value)} className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-text" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Coxa</label>
                    <input type="number" step="0.1" value={coxa} onChange={(e) => setCoxa(e.target.value)} className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-text" />
                  </div>
                </div>
              </div>

              {/* Fase 2: Testes Funcionais */}
              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-sm font-semibold text-text">Testes Funcionais (Opcional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Flexibilidade (Banco de Wells - cm)</label>
                    <input type="number" step="0.5" value={wellsCm} onChange={(e) => setWellsCm(e.target.value)} placeholder="Ex: 24.5" className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Cardio (Teste de Cooper - Metros)</label>
                    <input type="number" step="10" value={cooperMetros} onChange={(e) => setCooperMetros(e.target.value)} placeholder="Ex: 2400" className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Força (Carga 1RM Estimada - kg)</label>
                    <input type="number" step="0.5" value={carga1Rm} onChange={(e) => setCarga1Rm(e.target.value)} placeholder="Ex: 80" className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Repetições Executadas</label>
                    <input type="number" value={reps1Rm} onChange={(e) => setReps1Rm(e.target.value)} placeholder="Ex: 8" className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="parq"
                  checked={parqPositivo}
                  onChange={(e) => setParqPositivo(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="parq" className="text-xs text-text-muted">PAR-Q+ Positivo (indica necessidade de atenção ou liberação médica)</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-border rounded-xl text-text hover:bg-surface-input"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {loading ? 'Calculando...' : 'Salvar Avaliação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={!!showConfirmDelete}
        title="Excluir Avaliação"
        message="Tem certeza que deseja excluir esta avaliação física? Esta ação não pode ser desfeita e os dados evolutivos e de comparativos serão removidos do gráfico do aluno."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirmDelete(null)}
      />
    </div>
  )
}
