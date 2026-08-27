import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import LoadingSpinner, { SkeletonCard } from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import Toast from '../../components/ui/Toast'
import ConfirmModal from '../../components/ui/ConfirmModal'
import BatchActionBar from '../../components/ui/BatchActionBar'
import FormField from '../../components/ui/FormField'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { RulerIcon, PlusIcon, UserCircleIcon, ClipboardListIcon, DumbbellIcon, ChartLineIcon, PencilIcon, TrashIcon } from '../../components/icons/Icon'
import ReactMarkdown from 'react-markdown'
import { resolveMediaUrl, downloadMediaFile } from '../../lib/media'
import { useAuthStore } from '../../stores/auth'

export default function Avaliacoes() {
  const currentUser = useAuthStore((s) => s.user)
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null)

  // Laudo / Prescrição / Comparativo Modal state
  const [activeLaudo, setActiveLaudo] = useState<string | null>(null)
  const [activePrescricao, setActivePrescricao] = useState<any | null>(null)
  const [activeComparativo, setActiveComparativo] = useState<any | null>(null)

  // Photos state & inline loaders
  const [activePhotoList, setActivePhotoList] = useState<string[] | null>(null)
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null)
  const [uploadingPhotoAvaliacaoId, setUploadingPhotoAvaliacaoId] = useState<string | null>(null)
  const [loadingLaudoId, setLoadingLaudoId] = useState<string | null>(null)
  const [loadingPrescricaoId, setLoadingPrescricaoId] = useState<string | null>(null)

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

  async function executeBatchDeleteAvaliacoes() {
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
  }

  function handleGerarPDF(av: any) {
    const nomeAluno = selectedAluno?.usuario?.nome || av.aluno?.usuario?.nome || 'Aluno'
    const avaliadorNome = currentUser?.nome || 'Professor / Avaliador'
    const avaliadorCref = (currentUser as any)?.professor?.cref || null
    const dataFormatada = new Date(av.data).toLocaleDateString('pt-BR')

    let target = document.getElementById('avaliacao-pdf-target')
    if (target) {
      target.remove()
    }

    target = document.createElement('div')
    target.id = 'avaliacao-pdf-target'
    document.body.appendChild(target)

    target.innerHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 750px; margin: 0 auto; color: #111; padding: 24px; box-sizing: border-box;">
        <div style="border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h1 style="font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 1.5px; color: #0f172a;">ENDORFINAPP</h1>
            <p style="font-size: 11px; font-weight: 600; margin: 4px 0 0 0; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Laudo de Avaliação Física Integrada</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 12px; font-weight: bold; margin: 0; color: #0f172a;">Data: ${dataFormatada}</p>
            <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">Protocolo: #${av.id.substring(0, 8).toUpperCase()}</p>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin: 0 0 2px 0;">Aluno(a)</p>
            <p style="font-size: 16px; font-weight: 800; margin: 0; color: #0f172a;">${nomeAluno.toUpperCase()}</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin: 0 0 2px 0;">Avaliador Responsável</p>
            <p style="font-size: 14px; font-weight: 700; margin: 0; color: #0f172a;">${avaliadorNome}</p>
            ${avaliadorCref ? `<p style="font-size: 11px; color: #475569; margin: 2px 0 0 0;">CREF: ${avaliadorCref}</p>` : ''}
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 12px; color: #0f172a; letter-spacing: 0.5px;">1. Composição Corporal & Antropometria</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc; width: 33%;"><strong>Peso:</strong> ${av.peso_kg ? av.peso_kg + ' kg' : '—'}</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc; width: 33%;"><strong>Estatura:</strong> ${av.estatura_m ? av.estatura_m + ' m' : '—'}</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc; width: 33%;"><strong>IMC:</strong> ${av.imc ? Number(av.imc).toFixed(1) : '—'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>% Gordura:</strong> ${av.percentual_gordura ? av.percentual_gordura + '%' : '—'}</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>Massa Magra:</strong> ${av.massa_magra_kg ? av.massa_magra_kg + ' kg' : '—'}</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>Massa Gorda:</strong> ${av.massa_gorda_kg ? av.massa_gorda_kg + ' kg' : '—'}</td>
            </tr>
            ${av.rcq ? `<tr><td colspan="3" style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc;"><strong>Relação Cintura-Quadril (RCQ):</strong> ${av.rcq.toFixed(2)}</td></tr>` : ''}
          </table>
        </div>

        ${(av.pas || av.fc_repouso || av.parq_positivo || av.risco_cardiaco) ? `
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 12px; color: #0f172a; letter-spacing: 0.5px;">2. Sinais Vitais & Triagem de Saúde</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1; width: 50%;"><strong>Pressão Arterial:</strong> ${av.pas && av.pad ? av.pas + '/' + av.pad + ' mmHg' : 'Não informada'}</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; width: 50%;"><strong>FC Repouso:</strong> ${av.fc_repouso ? av.fc_repouso + ' bpm' : 'Não informada'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc;"><strong>Risco Cardíaco:</strong> ${av.risco_cardiaco || 'BAIXO'}</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc;"><strong>Triagem PAR-Q+:</strong> ${av.parq_positivo ? 'Atenção / Liberação médica recomendada' : 'Sem restrições relatadas'}</td>
            </tr>
          </table>
        </div>` : ''}

        ${(av.cardio_json?.vo2max || av.neuro_json?.oneRmEstimada || av.flexibilidade_json?.bancoWellsCm) ? `
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 12px; color: #0f172a; letter-spacing: 0.5px;">3. Testes Funcionais & Capacidade Física</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc; width: 33%;"><strong>VO₂máx Estimado:</strong> ${av.cardio_json?.vo2max ? av.cardio_json.vo2max + ' ml/kg/min' : '—'}</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc; width: 33%;"><strong>Força Máxima (1RM):</strong> ${av.neuro_json?.oneRmEstimada ? av.neuro_json.oneRmEstimada + ' kg' : '—'}</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc; width: 33%;"><strong>Flexibilidade (Wells):</strong> ${av.flexibilidade_json?.bancoWellsCm ? av.flexibilidade_json.bancoWellsCm + ' cm' : '—'}</td>
            </tr>
          </table>
        </div>` : ''}

        ${av.laudo_markdown ? `
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 12px; color: #0f172a; letter-spacing: 0.5px;">4. Parecer e Laudo Técnico</h3>
          <div style="font-size: 11px; line-height: 1.6; white-space: pre-wrap; font-family: monospace; background: #f8fafc; padding: 14px; border-radius: 6px; border: 1px solid #cbd5e1;">${av.laudo_markdown.replace(/[#*`]/g, '')}</div>
        </div>` : ''}

        <div style="margin-top: 60px; border-top: 2px solid #0f172a; padding-top: 20px; text-align: center; page-break-inside: avoid;">
          <p style="font-size: 15px; font-weight: 800; margin: 0; color: #0f172a;">${avaliadorNome}</p>
          <p style="font-size: 12px; color: #475569; margin: 4px 0 0 0;">${avaliadorCref ? `CREF: ${avaliadorCref}` : 'Profissional de Educação Física'}</p>
          <p style="font-size: 10px; color: #94a3b8; margin-top: 16px; font-weight: bold; letter-spacing: 1px;">ENDORFINAPP — A QUÍMICA DO CRESCIMENTO</p>
        </div>
      </div>
    `

    setTimeout(() => {
      window.print()
    }, 150)
  }

  async function handleGerarLaudo(id: string) {
    try {
      setLoadingLaudoId(id)
      const res: any = await api.post(`/avaliacoes/${id}/gerar-laudo`, {})
      const laudo = res?.laudo ?? res?.data?.laudo
      setActiveLaudo(laudo)
      setToast({ message: 'Laudo inteligente gerado com sucesso!', type: 'success' })
      if (selectedAluno) carregarAvaliacoes(selectedAluno.id)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao gerar laudo', type: 'error' })
    } finally {
      setLoadingLaudoId(null)
    }
  }

  async function handleGerarPrescricao(id: string) {
    try {
      setLoadingPrescricaoId(id)
      const res: any = await api.post(`/avaliacoes/${id}/gerar-prescricao`, {})
      const prescricao = res?.prescricao ?? res?.data?.prescricao
      setActivePrescricao(prescricao)
      setToast({ message: 'Prescrição de 4 semanas gerada com sucesso!', type: 'success' })
      if (selectedAluno) carregarAvaliacoes(selectedAluno.id)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao gerar prescrição', type: 'error' })
    } finally {
      setLoadingPrescricaoId(null)
    }
  }

  async function handleUploadFoto(avaliacaoId: string, file: File) {
    if (file.size > 3 * 1024 * 1024) {
      setToast({ message: 'A foto deve ter no máximo 3 MB.', type: 'error' })
      return
    }
    setUploadingPhotoAvaliacaoId(avaliacaoId)
    try {
      const formData = new FormData()
      formData.append('foto', file)
      await api.uploadFotoAvaliacao(avaliacaoId, formData)
      setToast({ message: 'Foto adicionada à avaliação!', type: 'success' })
      if (selectedAluno) carregarAvaliacoes(selectedAluno.id)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao enviar foto', type: 'error' })
    } finally {
      setUploadingPhotoAvaliacaoId(null)
    }
  }

  async function handleDeleteFoto(avaliacaoId: string, fotoId: string) {
    try {
      await api.deleteFotoAvaliacao(avaliacaoId, fotoId)
      setToast({ message: 'Foto removida da avaliação.', type: 'success' })
      if (selectedAluno) carregarAvaliacoes(selectedAluno.id)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao remover foto', type: 'error' })
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
          
          <Input
            type="text"
            placeholder="Buscar aluno por nome ou email..."
            value={buscaAluno}
            onChange={(e) => setBuscaAluno(e.target.value)}
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
                  <Input
                    type="text"
                    placeholder="Buscar avaliação por data ou laudo..."
                    value={buscaAvaliacao}
                    onChange={(e) => setBuscaAvaliacao(e.target.value)}
                  />

                  <BatchActionBar
                    selectedCount={selectedIds.length}
                    onClearSelection={() => setSelectedIds([])}
                    onDeleteSelected={() => setConfirmDeleteOpen(true)}
                    loading={batchDeleting}
                  />
                </div>
              )}

              {loading && avaliacoes.length === 0 ? (
                <div className="space-y-4">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : avaliacoes.length === 0 ? (
                <EmptyState icon="📋" title="Nenhuma avaliação registrada" description="Clique em 'Nova Avaliação' para iniciar o protocolo completo." />
              ) : (
                <div className="space-y-4">
                  {avaliacoes
                    .filter((av) => {
                      const dateStr = new Date(av.data).toLocaleDateString('pt-BR')
                      return dateStr.includes(buscaAvaliacao) || (av.laudo_markdown && av.laudo_markdown.toLowerCase().includes(buscaAvaliacao.toLowerCase()))
                    })
                    .map((av, idx) => {
                      const isSelected = selectedIds.includes(av.id)
                      const isUploading = uploadingPhotoAvaliacaoId === av.id
                      const isLaudoLoading = loadingLaudoId === av.id
                      const isPrescricaoLoading = loadingPrescricaoId === av.id
                      return (
                        <div
                          key={av.id}
                          className={`p-4 rounded-2xl border transition-all space-y-4 animate-slide-up ${isSelected ? 'border-primary bg-primary/5' : 'bg-surface border-border'}`}
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
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
                              <span className="font-bold text-text text-base">
                                Data: {new Date(av.data).toLocaleDateString('pt-BR')}
                              </span>
                              <button
                                onClick={() => handleOpenEditarAvaliacao(av)}
                                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-muted hover:text-primary transition-colors rounded-lg hover:bg-surface-card"
                                title="Editar"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setShowConfirmDelete(av.id)}
                                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-muted hover:text-destructive transition-colors rounded-lg hover:bg-surface-card"
                                title="Excluir"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => handleGerarLaudo(av.id)}
                                disabled={isLaudoLoading}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-surface-card border border-border text-text rounded-xl text-xs font-semibold hover:border-primary min-h-[44px] disabled:opacity-50 transition-all cursor-pointer"
                              >
                                <ClipboardListIcon className="h-4 w-4 text-primary" />
                                {isLaudoLoading ? 'Gerando...' : av.laudo_markdown ? 'Ver Laudo' : 'Gerar Laudo'}
                              </button>
                              <button
                                onClick={() => handleGerarPrescricao(av.id)}
                                disabled={isPrescricaoLoading}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 border border-primary/50 text-primary bg-transparent rounded-xl text-xs font-semibold hover:bg-primary/10 min-h-[44px] disabled:opacity-50 transition-all cursor-pointer"
                              >
                                <DumbbellIcon className="h-4 w-4" />
                                {isPrescricaoLoading ? 'Gerando...' : av.prescricao_json ? 'Ver Prescrição' : 'Gerar Treino 4 Semanas'}
                              </button>
                              <button
                                onClick={() => handleGerarPDF(av)}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-surface-card border border-border text-text rounded-xl text-xs font-semibold hover:border-primary min-h-[44px] transition-all cursor-pointer"
                                title="Exportar laudo em PDF para impressão"
                              >
                                📄 Gerar PDF
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                            <div className="p-4 bg-surface-card rounded-xl border border-border">
                              <p className="text-sm font-medium text-text-muted">Peso</p>
                              <p className="font-bold text-text text-base mt-0.5">{av.peso_kg ? `${av.peso_kg} kg` : '—'}</p>
                            </div>
                            <div className="p-4 bg-surface-card rounded-xl border border-border">
                              <p className="text-sm font-medium text-text-muted">IMC</p>
                              <p className="font-bold text-text text-base mt-0.5">{av.imc ?? '—'}</p>
                            </div>
                            <div className="p-4 bg-surface-card rounded-xl border border-border">
                              <p className="text-sm font-medium text-text-muted">% Gordura</p>
                              <p className="font-bold text-primary text-base mt-0.5">{av.percentual_gordura ? `${av.percentual_gordura}%` : '—'}</p>
                            </div>
                            <div className="p-4 bg-surface-card rounded-xl border border-border">
                              <p className="text-sm font-medium text-text-muted">VO₂máx</p>
                              <p className="font-bold text-text text-base mt-0.5">{av.cardio_json?.vo2max ? `${av.cardio_json.vo2max} ml/kg/min` : '—'}</p>
                            </div>
                          </div>

                          {/* Seção de Fotos da Avaliação */}
                          <div className="pt-3 border-t border-border/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-text flex items-center gap-1.5">
                                📷 Fotos da Avaliação
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  (av.fotos?.length || 0) >= 4
                                    ? 'bg-surface-input text-text-muted'
                                    : (av.fotos?.length || 0) === 3
                                    ? 'bg-amber-500/20 text-warning'
                                    : 'bg-primary/20 text-primary'
                                }`}>
                                  {av.fotos?.length || 0}/4 fotos
                                </span>
                              </span>

                              {(av.fotos?.length || 0) < 4 && (
                                <label className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline cursor-pointer min-h-[44px] px-2.5 py-1 rounded-xl hover:bg-primary/10 transition-colors">
                                  <PlusIcon className="h-4 w-4" />
                                  Adicionar Foto
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) handleUploadFoto(av.id, file)
                                      e.target.value = ''
                                    }}
                                  />
                                </label>
                              )}
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                              {av.fotos?.map((f: any, fIdx: number) => (
                                <div key={f.id} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-surface shadow-sm">
                                  <img
                                    src={resolveMediaUrl(f.url) || ''}
                                    alt={f.nome_arquivo}
                                    onClick={() => {
                                      const urls = av.fotos.map((p: any) => resolveMediaUrl(p.url)).filter((u: any): u is string => u !== null)
                                      setActivePhotoList(urls)
                                      setActivePhotoIndex(fIdx)
                                    }}
                                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute top-1 right-1 flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        downloadMediaFile(f.url, f.nome_arquivo)
                                      }}
                                      className="p-1 bg-black/70 text-white hover:text-primary rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                                      title="Baixar foto"
                                    >
                                      📥
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteFoto(av.id, f.id)
                                      }}
                                      className="p-1 bg-black/70 text-white hover:text-destructive rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                                      title="Excluir foto"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {isUploading && (
                                <div className="aspect-square rounded-xl border border-dashed border-primary flex items-center justify-center bg-primary/5 animate-pulse">
                                  <span className="text-[10px] text-primary font-semibold">Enviando...</span>
                                </div>
                              )}

                              {(!av.fotos || av.fotos.length === 0) && !isUploading && (
                                <div className="col-span-4 py-3 text-center text-xs text-text-muted bg-surface/40 rounded-xl border border-dashed border-border">
                                  Nenhuma foto registrada para esta avaliação.
                                </div>
                              )}
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

      {/* Modal Lightbox de Foto Ampliada */}
      {activePhotoList && activePhotoIndex !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center space-y-3">
            <div className="w-full flex justify-between items-center text-white">
              <span className="text-sm font-medium text-white/80">
                Foto {activePhotoIndex + 1} de {activePhotoList.length}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => downloadMediaFile(activePhotoList[activePhotoIndex], `foto_avaliacao_${activePhotoIndex + 1}.jpg`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold transition-colors min-h-[44px] cursor-pointer"
                >
                  📥 Baixar Foto
                </button>
                <button
                  onClick={() => { setActivePhotoList(null); setActivePhotoIndex(null); }}
                  className="text-white hover:text-primary font-bold text-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                >
                  ✕ Fechar
                </button>
              </div>
            </div>

            <img
              src={activePhotoList[activePhotoIndex]}
              alt="Foto da avaliação ampliada"
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />

            {activePhotoList.length > 1 && (
              <div className="flex items-center gap-4 text-white pt-2">
                <button
                  onClick={() => setActivePhotoIndex((prev) => (prev! > 0 ? prev! - 1 : activePhotoList.length - 1))}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold transition-colors min-h-[44px] cursor-pointer"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setActivePhotoIndex((prev) => (prev! < activePhotoList.length - 1 ? prev! + 1 : 0))}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold transition-colors min-h-[44px] cursor-pointer"
                >
                  Próxima →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
            
            <form onSubmit={handleCriarAvaliacao} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Peso (kg)" htmlFor="peso-kg" required>
                <Input
                  id="peso-kg"
                  type="number"
                  step="0.1"
                  value={pesoKg}
                  onChange={(e) => setPesoKg(e.target.value)}
                  placeholder="Ex: 75.5"
                  required
                />
              </FormField>

              <FormField label="Estatura (m)" htmlFor="estatura-m" required>
                <Input
                  id="estatura-m"
                  type="number"
                  step="0.01"
                  value={estaturaM}
                  onChange={(e) => setEstaruraM(e.target.value)}
                  placeholder="Ex: 1.78"
                  required
                />
              </FormField>

              <FormField label="Cintura (cm)" htmlFor="cintura-cm">
                <Input
                  id="cintura-cm"
                  type="number"
                  step="0.1"
                  value={cinturaCm}
                  onChange={(e) => setCinturaCm(e.target.value)}
                />
              </FormField>

              <FormField label="Quadril (cm)" htmlFor="quadril-cm">
                <Input
                  id="quadril-cm"
                  type="number"
                  step="0.1"
                  value={quadrilCm}
                  onChange={(e) => setQuadrilCm(e.target.value)}
                />
              </FormField>

              <FormField label="Protocolo Dobras" htmlFor="protocolo-dobras">
                <Select
                  id="protocolo-dobras"
                  value={protocoloDobras}
                  onChange={(e: any) => setProtocoloDobras(e.target.value)}
                >
                  <option value="JP7">Jackson & Pollock 7</option>
                  <option value="JP3">Jackson & Pollock 3</option>
                  <option value="GUEDES">Guedes</option>
                </Select>
              </FormField>

              <FormField label="PA Sistólica" htmlFor="pas">
                <Input id="pas" type="number" value={pas} onChange={(e) => setPas(e.target.value)} placeholder="120" />
              </FormField>

              <FormField label="PA Diastólica" htmlFor="pad">
                <Input id="pad" type="number" value={pad} onChange={(e) => setPad(e.target.value)} placeholder="80" />
              </FormField>

              <FormField label="FC Repouso (bpm)" htmlFor="fc-repouso">
                <Input id="fc-repouso" type="number" value={fcRepouso} onChange={(e) => setFcRepouso(e.target.value)} placeholder="70" />
              </FormField>

              <div className="md:col-span-2 border-t border-border pt-3">
                <p className="text-sm font-semibold text-text mb-2">Dobras Cutâneas (mm)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <FormField label="Tríceps" htmlFor="dobra-triceps">
                    <Input id="dobra-triceps" type="number" step="0.1" value={triceps} onChange={(e) => setTriceps(e.target.value)} className="!px-2 !py-1.5 !rounded-lg" />
                  </FormField>
                  <FormField label="Subescapular" htmlFor="dobra-subescapular">
                    <Input id="dobra-subescapular" type="number" step="0.1" value={subescapular} onChange={(e) => setSubescapular(e.target.value)} className="!px-2 !py-1.5 !rounded-lg" />
                  </FormField>
                  <FormField label="Peitoral" htmlFor="dobra-peitoral">
                    <Input id="dobra-peitoral" type="number" step="0.1" value={peitoral} onChange={(e) => setPeitoral(e.target.value)} className="!px-2 !py-1.5 !rounded-lg" />
                  </FormField>
                  <FormField label="Axilar Média" htmlFor="dobra-axilar">
                    <Input id="dobra-axilar" type="number" step="0.1" value={axilarMedia} onChange={(e) => setAxilarMedia(e.target.value)} className="!px-2 !py-1.5 !rounded-lg" />
                  </FormField>
                  <FormField label="Suprailíaca" htmlFor="dobra-suprailiaca">
                    <Input id="dobra-suprailiaca" type="number" step="0.1" value={suprailiaca} onChange={(e) => setSuprailiaca(e.target.value)} className="!px-2 !py-1.5 !rounded-lg" />
                  </FormField>
                  <FormField label="Abdominal" htmlFor="dobra-abdominal">
                    <Input id="dobra-abdominal" type="number" step="0.1" value={abdominal} onChange={(e) => setAbdominal(e.target.value)} className="!px-2 !py-1.5 !rounded-lg" />
                  </FormField>
                  <FormField label="Coxa" htmlFor="dobra-coxa">
                    <Input id="dobra-coxa" type="number" step="0.1" value={coxa} onChange={(e) => setCoxa(e.target.value)} className="!px-2 !py-1.5 !rounded-lg" />
                  </FormField>
                </div>
              </div>

              {/* Fase 2: Testes Funcionais */}
              <div className="md:col-span-2 border-t border-border pt-3">
                <p className="text-sm font-semibold text-text mb-3">Testes Funcionais (Opcional)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Flexibilidade (Banco de Wells - cm)" htmlFor="wells-cm">
                    <Input id="wells-cm" type="number" step="0.5" value={wellsCm} onChange={(e) => setWellsCm(e.target.value)} placeholder="Ex: 24.5" />
                  </FormField>
                  <FormField label="Cardio (Teste de Cooper - Metros)" htmlFor="cooper-metros">
                    <Input id="cooper-metros" type="number" step="10" value={cooperMetros} onChange={(e) => setCooperMetros(e.target.value)} placeholder="Ex: 2400" />
                  </FormField>
                  <FormField label="Força (Carga 1RM Estimada - kg)" htmlFor="carga-1rm">
                    <Input id="carga-1rm" type="number" step="0.5" value={carga1Rm} onChange={(e) => setCarga1Rm(e.target.value)} placeholder="Ex: 80" />
                  </FormField>
                  <FormField label="Repetições Executadas" htmlFor="reps-1rm">
                    <Input id="reps-1rm" type="number" value={reps1Rm} onChange={(e) => setReps1Rm(e.target.value)} placeholder="Ex: 8" />
                  </FormField>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 md:col-span-2">
                <input
                  type="checkbox"
                  id="parq"
                  checked={parqPositivo}
                  onChange={(e) => setParqPositivo(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="parq" className="text-xs text-text-muted">PAR-Q+ Positivo (indica necessidade de atenção ou liberação médica)</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border md:col-span-2">
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
      {/* Confirm Delete Batch Modal */}
      <ConfirmModal
        open={confirmDeleteOpen}
        title="Excluir avaliações"
        message={`Tem certeza que deseja excluir ${selectedIds.length} avaliação(ões) selecionada(s)?`}
        onConfirm={() => {
          setConfirmDeleteOpen(false)
          executeBatchDeleteAvaliacoes()
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
        loading={batchDeleting}
      />
    </div>
  )
}
