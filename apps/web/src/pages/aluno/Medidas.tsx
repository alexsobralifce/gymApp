import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import ReactMarkdown from 'react-markdown'
import { resolveMediaUrl, downloadMediaFile } from '../../lib/media'
import { useAuthStore } from '../../stores/auth'
import BatchActionBar from '../../components/ui/BatchActionBar'
import ConfirmModal from '../../components/ui/ConfirmModal'
import FormField from '../../components/ui/FormField'
import Input from '../../components/ui/Input'
import { calcularIdade } from '../../lib/health'
import type { MedidaCorporal, PerfilAluno } from '../../types/api'
import { ClipboardListIcon } from '../../components/icons/Icon'

interface IMCClassification {
  label: string
  min: number | null
  max: number | null
  color: string
  bgClass: string
}

const IMC_TABLE: IMCClassification[] = [
  { label: 'Abaixo do peso', min: 0, max: 18.49, color: '#3b82f6', bgClass: 'bg-blue-500/20 text-blue-400' },
  { label: 'Peso normal', min: 18.5, max: 24.99, color: '#22c55e', bgClass: 'bg-success/20 text-success' },
  { label: 'Sobrepeso', min: 25, max: 29.99, color: '#f59e0b', bgClass: 'bg-amber-500/20 text-warning' },
  { label: 'Obesidade grau I', min: 30, max: 34.99, color: '#f97316', bgClass: 'bg-orange-500/20 text-orange-400' },
  { label: 'Obesidade grau II', min: 35, max: 39.99, color: '#ef4444', bgClass: 'bg-red-500/20 text-destructive' },
  { label: 'Obesidade grau III', min: 40, max: null, color: '#dc2626', bgClass: 'bg-red-700/30 text-red-500' },
]

const IMC_MIN = 10
const IMC_MAX = 45

function getIMCClassificacao(imc: number): IMCClassification {
  return IMC_TABLE.find(c =>
    (c.min === null || imc >= c.min) && (c.max === null || imc <= c.max)
  ) || IMC_TABLE[0]
}

function imcBarPosition(imc: number): number {
  return Math.max(0, Math.min(100, ((imc - IMC_MIN) / (IMC_MAX - IMC_MIN)) * 100))
}

function pesoAlturaDoPerfil(perfil: PerfilAluno | null, ultimaMedida: MedidaCorporal | null) {
  const peso = ultimaMedida?.peso_kg ?? perfil?.peso_kg ?? null
  const altura = ultimaMedida?.altura_cm ?? perfil?.altura_cm ?? null
  return { peso, altura }
}

export default function AlunoMedidas() {
  const user = useAuthStore((s) => s.user)
  const [medidas, setMedidas] = useState<MedidaCorporal[]>([])
  const [perfil, setPerfil] = useState<PerfilAluno | null>(null)
  const [avaliacoesProf, setAvaliacoesProf] = useState<any[]>([])
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<any | null>(null)
  const [activePhotoList, setActivePhotoList] = useState<string[] | null>(null)
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<MedidaCorporal | null>(null)
  const [mostrarNovo, setMostrarNovo] = useState(false)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const [pesoKg, setPesoKg] = useState('')
  const [alturaCm, setAlturaCm] = useState('')
  const [percentualBf, setPercentualBf] = useState('')
  const [massaMagraKg, setMassaMagraKg] = useState('')
  const [observacao, setObservacao] = useState('')

  const carregarDados = useCallback(async () => {
    try {
      const [mData, pData] = await Promise.all([
        api.getMedidas(),
        api.getPerfilAluno(),
      ])
      setMedidas(mData)
      setPerfil(pData)

      const targetId = pData?.id || pData?.usuario_id || user?.id
      if (targetId) {
        const resAv: any = await api.get(`/avaliacoes/aluno/${targetId}`).catch(() => [])
        const listAv = Array.isArray(resAv) ? resAv : resAv?.data ?? []
        setAvaliacoesProf(listAv)
      }

      return { mData, pData }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      return { mData: [], pData: null }
    }
  }, [user])

  useEffect(() => {
    carregarDados().then(({ mData, pData }) => {
      if (mData.length === 0 && pData?.peso_kg && pData?.altura_cm) {
        setPesoKg(pData.peso_kg.toString())
        setAlturaCm(pData.altura_cm.toString())
        setMostrarNovo(true)
      }
    }).finally(() => setLoading(false))
  }, [carregarDados])

  function gerarPDF(av: any) {
    const nomeAluno = user?.nome || perfil?.usuario?.nome || 'Aluno'
    const avaliadorNome = av.avaliador?.nome || 'Professor / Avaliador'
    const avaliadorCref = av.avaliador?.professor?.cref || null
    const dataFormatada = new Date(av.data).toLocaleDateString('pt-BR')

    let target = document.getElementById('avaliacao-pdf-target')
    if (!target) {
      target = document.createElement('div')
      target.id = 'avaliacao-pdf-target'
      document.body.appendChild(target)
    }

    target.innerHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #111; padding: 20px;">
        <div style="border-b: 2px solid #111; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h1 style="font-size: 22px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 1px; color: #111;">ENDORFINAPP</h1>
            <p style="font-size: 11px; margin: 2px 0 0 0; color: #555;">LAUDO DE AVALIAÇÃO FÍSICA INTEGRADA</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 12px; font-weight: bold; margin: 0;">Data: ${dataFormatada}</p>
          </div>
        </div>

        <div style="background: #f4f6f9; padding: 14px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
          <p style="font-size: 15px; font-weight: bold; margin: 0 0 4px 0; color: #0f172a;">ALUNO(A): ${nomeAluno.toUpperCase()}</p>
          <p style="font-size: 11px; margin: 0; color: #64748b;">Protocolo: #${av.id.substring(0, 8).toUpperCase()}</p>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 12px; color: #0f172a;">1. Composição Corporal & Antropometria</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #cbd5e1; background: #f8fafc;"><strong>Peso:</strong> ${av.peso_kg ? av.peso_kg + ' kg' : '—'}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; background: #f8fafc;"><strong>Estatura:</strong> ${av.estatura_m ? av.estatura_m + ' m' : '—'}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; background: #f8fafc;"><strong>IMC:</strong> ${av.imc ? Number(av.imc).toFixed(1) : '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>% Gordura:</strong> ${av.percentual_gordura ? av.percentual_gordura + '%' : '—'}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>Massa Magra:</strong> ${av.massa_magra_kg ? av.massa_magra_kg + ' kg' : '—'}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>Massa Gorda:</strong> ${av.massa_gorda_kg ? av.massa_gorda_kg + ' kg' : '—'}</td>
            </tr>
            ${av.rcq ? `<tr><td colspan="3" style="padding: 8px; border: 1px solid #cbd5e1;"><strong>Relação Cintura-Quadril (RCQ):</strong> ${av.rcq.toFixed(2)}</td></tr>` : ''}
          </table>
        </div>

        ${(av.pas || av.fc_repouso || av.parq_positivo || av.risco_cardiaco) ? `
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 12px; color: #0f172a;">2. Sinais Vitais & Triagem de Saúde</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>Pressão Arterial:</strong> ${av.pas && av.pad ? av.pas + '/' + av.pad + ' mmHg' : 'Não informada'}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>FC Repouso:</strong> ${av.fc_repouso ? av.fc_repouso + ' bpm' : 'Não informada'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>Risco Cardíaco:</strong> ${av.risco_cardiaco || 'BAIXO'}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>Triagem PAR-Q+:</strong> ${av.parq_positivo ? 'Atenção / Liberação médica' : 'Sem restrições relatadas'}</td>
            </tr>
          </table>
        </div>` : ''}

        ${(av.cardio_json?.vo2max || av.neuro_json?.oneRmEstimada || av.flexibilidade_json?.bancoWellsCm) ? `
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 12px; color: #0f172a;">3. Testes Funcionais & Capacidade Física</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #cbd5e1; background: #f8fafc;"><strong>VO₂máx Estimado:</strong> ${av.cardio_json?.vo2max ? av.cardio_json.vo2max + ' ml/kg/min' : '—'}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; background: #f8fafc;"><strong>Força Máxima (1RM):</strong> ${av.neuro_json?.oneRmEstimada ? av.neuro_json.oneRmEstimada + ' kg' : '—'}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; background: #f8fafc;"><strong>Flexibilidade (Wells):</strong> ${av.flexibilidade_json?.bancoWellsCm ? av.flexibilidade_json.bancoWellsCm + ' cm' : '—'}</td>
            </tr>
          </table>
        </div>` : ''}

        ${av.laudo_markdown ? `
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 13px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 12px; color: #0f172a;">4. Parecer e Laudo Técnico</h3>
          <div style="font-size: 11px; line-height: 1.6; white-space: pre-wrap; font-family: monospace; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">${av.laudo_markdown.replace(/[#*`]/g, '')}</div>
        </div>` : ''}

        <div style="margin-top: 50px; border-top: 2px solid #0f172a; padding-top: 20px; text-align: center;">
          <p style="font-size: 14px; font-weight: bold; margin: 0; color: #0f172a;">${avaliadorNome}</p>
          <p style="font-size: 12px; color: #475569; margin: 4px 0 0 0;">${avaliadorCref ? `CREF: ${avaliadorCref}` : 'Profissional de Educação Física'}</p>
          <p style="font-size: 10px; color: #94a3b8; margin-top: 16px;">ENDORFINAPP — A Química do Crescimento</p>
        </div>
      </div>
    `

    setTimeout(() => {
      window.print()
    }, 100)
  }

  function abrirNovo() {
    const ultima = medidas.length > 0 ? medidas[medidas.length - 1] : null
    const { peso, altura } = pesoAlturaDoPerfil(perfil, ultima)
    setPesoKg(peso?.toString() || '')
    setAlturaCm(altura?.toString() || '')
    setPercentualBf('')
    setMassaMagraKg('')
    setObservacao('')
    setEditando(null)
    setMostrarNovo(true)
  }

  const ultimaMedida = medidas.length > 0 ? medidas[medidas.length - 1] : null
  const classificacao = ultimaMedida?.imc ? getIMCClassificacao(ultimaMedida.imc) : null
  const posicaoBarra = ultimaMedida?.imc ? imcBarPosition(ultimaMedida.imc) : 0
  const idade = perfil?.data_nascimento ? calcularIdade(perfil.data_nascimento) : null

  function resetForm() {
    setPesoKg('')
    setAlturaCm('')
    setPercentualBf('')
    setMassaMagraKg('')
    setObservacao('')
    setEditando(null)
    setMostrarNovo(false)
  }

  function preencherEdicao(m: MedidaCorporal) {
    setEditando(m)
    setMostrarNovo(false)
    setPesoKg(m.peso_kg?.toString() || '')
    setAlturaCm(m.altura_cm?.toString() || '')
    setPercentualBf(m.percentual_bf?.toString() || '')
    setMassaMagraKg(m.massa_magra_kg?.toString() || '')
    setObservacao(m.observacao || '')
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!pesoKg && !alturaCm && !percentualBf && !massaMagraKg) return
    setSaving(true)
    try {
      await api.criarMedida({
        pesoKg: pesoKg ? Number(pesoKg) : undefined,
        alturaCm: alturaCm ? Number(alturaCm) : undefined,
        percentualBf: percentualBf ? Number(percentualBf) : undefined,
        massaMagraKg: massaMagraKg ? Number(massaMagraKg) : undefined,
        observacao: observacao || undefined,
      })
      setSucesso('Medida registrada com sucesso!')
      resetForm()
      await carregarDados()
    } catch {
      setSucesso('Erro ao registrar medida.')
    } finally {
      setSaving(false)
      setTimeout(() => setSucesso(null), 3000)
    }
  }

  async function handleAtualizar(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    setSaving(true)
    try {
      await api.updateMedida(editando.id, {
        pesoKg: pesoKg ? Number(pesoKg) : undefined,
        alturaCm: alturaCm ? Number(alturaCm) : undefined,
        percentualBf: percentualBf ? Number(percentualBf) : undefined,
        massaMagraKg: massaMagraKg ? Number(massaMagraKg) : undefined,
        observacao: observacao || undefined,
      })
      setSucesso('Medida atualizada com sucesso!')
      resetForm()
      await carregarDados()
    } catch {
      setSucesso('Erro ao atualizar medida.')
    } finally {
      setSaving(false)
      setTimeout(() => setSucesso(null), 3000)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  async function executeBatchDelete() {
    setBatchDeleting(true)
    try {
      await Promise.allSettled(selectedIds.map((id) => api.deleteMedida(id)))
      setMedidas((prev) => prev.filter((m) => !selectedIds.includes(m.id)))
      setSelectedIds([])
    } catch (e) {
      console.error('Erro ao excluir medidas:', e)
    } finally {
      setBatchDeleting(false)
    }
  }

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Medidas Corporais</h1>
        {!mostrarNovo && !editando && (
          <button
            onClick={abrirNovo}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110 transition-all cursor-pointer"
          >
            + Nova
          </button>
        )}
      </div>

      {sucesso && (
        <div className={`rounded-xl p-3 text-sm text-center font-medium ${
          sucesso.includes('Erro') ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
        }`}>
          {sucesso}
        </div>
      )}

      {/* IMC Card – última medida */}
      {classificacao && ultimaMedida && (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Seu IMC</p>
              <p className="text-3xl font-bold text-text mt-0.5">
                {ultimaMedida.imc?.toFixed(1)}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {ultimaMedida.peso_kg} kg &middot; {ultimaMedida.altura_cm} cm{idade ? ` &middot; ${idade} anos` : ''}
              </p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${classificacao.bgClass}`}>
              {classificacao.label}
            </div>
          </div>

          {/* IMC scale bar */}
          <div className="space-y-1.5">
            <div className="relative h-2 rounded-full bg-surface overflow-hidden">
              {IMC_TABLE.map((cat) => {
                const left = cat.min != null ? ((cat.min - IMC_MIN) / (IMC_MAX - IMC_MIN)) * 100 : 0
                const right = cat.max != null ? ((cat.max - IMC_MIN) / (IMC_MAX - IMC_MIN)) * 100 : 100
                const width = right - left
                return (
                  <div
                    key={cat.label}
                    className="absolute h-full"
                    style={{ left: `${left}%`, width: `${width}%`, backgroundColor: cat.color, opacity: 0.45 }}
                  />
                )
              })}
              <div
                className="absolute top-0 h-full w-1 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.6)] transition-all duration-500"
                style={{ left: `${posicaoBarra}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-text-muted">
              <span>{IMC_MIN}</span>
              <span>{IMC_MAX}</span>
            </div>
          </div>
        </div>
      )}

      {/* Seção: Avaliações Físicas Registradas pelo Professor */}
      <div className="rounded-2xl bg-surface-card border border-surface-input p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-text flex items-center gap-2">
              <ClipboardListIcon className="h-5 w-5 text-primary" />
              Avaliações do Professor
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Histórico de laudos, testes funcionais e fotos das suas avaliações físicas
            </p>
          </div>
          {avaliacoesProf.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary">
              {avaliacoesProf.length} avaliação(ões)
            </span>
          )}
        </div>

        {avaliacoesProf.length === 0 ? (
          <div className="py-6 text-center text-xs text-text-muted bg-surface/40 rounded-xl border border-dashed border-border">
            Nenhuma avaliação física registrada pelo seu professor ainda.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-input">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-surface-input bg-surface/50 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  <th className="p-3">Data</th>
                  <th className="p-3">Avaliador</th>
                  <th className="p-3">Peso</th>
                  <th className="p-3">IMC</th>
                  <th className="p-3">% BF</th>
                  <th className="p-3">Fotos</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-input">
                {avaliacoesProf.map((av) => {
                  const cat = av.imc ? getIMCClassificacao(av.imc) : null
                  const totalFotos = av.fotos?.length || 0
                  return (
                    <tr
                      key={av.id}
                      onClick={() => setSelectedAvaliacao(av)}
                      className="hover:bg-surface/50 transition-colors cursor-pointer"
                    >
                      <td className="p-3 text-xs font-semibold text-text">
                        {new Date(av.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3 text-xs text-text-muted">
                        {av.avaliador?.nome || 'Professor'}
                      </td>
                      <td className="p-3 text-xs font-medium text-text">
                        {av.peso_kg ? `${av.peso_kg} kg` : '—'}
                      </td>
                      <td className="p-3 text-xs">
                        {av.imc ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${cat?.bgClass}`}>
                            {av.imc.toFixed(1)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-3 text-xs font-bold text-primary">
                        {av.percentual_gordura ? `${av.percentual_gordura}%` : '—'}
                      </td>
                      <td className="p-3 text-xs">
                        {totalFotos > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <img
                              src={resolveMediaUrl(av.fotos[0].url) || ''}
                              alt="Miniatura"
                              className="h-6 w-6 rounded-md object-cover border border-border"
                            />
                            <span className="text-[10px] font-bold text-text-muted">
                              🖼 {totalFotos}
                            </span>
                          </div>
                        ) : (
                          <span className="text-text-disabled text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedAvaliacao(av)
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface border border-border text-xs font-semibold text-text hover:border-primary transition-colors cursor-pointer"
                        >
                          Ver Detalhes ↗
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Formulário (Novo ou Edição) */}
      {(mostrarNovo || editando) && (
        <form onSubmit={editando ? handleAtualizar : handleCriar} className="rounded-2xl bg-surface-card border border-surface-input p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
            <h3 className="text-sm font-bold text-text">
              {editando ? 'Editar Medida' : 'Nova Medida'}
            </h3>
            <div className="flex items-center gap-2">
              <button type="button" onClick={resetForm} className="text-text-muted hover:text-text text-sm cursor-pointer">Cancelar</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Peso (kg)" htmlFor="medida-peso">
              <Input
                id="medida-peso"
                type="number"
                step="0.1"
                placeholder="70.5"
                value={pesoKg}
                onChange={(e) => setPesoKg(e.target.value)}
              />
            </FormField>
            <FormField label="Altura (cm)" htmlFor="medida-altura">
              <Input
                id="medida-altura"
                type="number"
                step="1"
                placeholder="175"
                value={alturaCm}
                onChange={(e) => setAlturaCm(e.target.value)}
              />
            </FormField>
            <FormField label="% Gordura (BF)" htmlFor="medida-bf">
              <Input
                id="medida-bf"
                type="number"
                step="0.1"
                placeholder="15.5"
                value={percentualBf}
                onChange={(e) => setPercentualBf(e.target.value)}
              />
            </FormField>
            <FormField label="Massa Magra (kg)" htmlFor="medida-massa">
              <Input
                id="medida-massa"
                type="number"
                step="0.1"
                placeholder="60"
                value={massaMagraKg}
                onChange={(e) => setMassaMagraKg(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Observação" htmlFor="medida-obs">
            <Input
              id="medida-obs"
              type="text"
              placeholder="Observação (opcional)"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </FormField>
          <button type="submit" disabled={saving || (!pesoKg && !alturaCm && !percentualBf && !massaMagraKg)}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer">
            {saving ? 'Salvando...' : editando ? 'Atualizar medida' : 'Registrar medida'}
          </button>
        </form>
      )}

      {/* Busca & Ações em Lote */}
      {medidas.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar por data, peso ou observação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        </div>
      )}

      <BatchActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onDeleteSelected={() => setConfirmDeleteOpen(true)}
        loading={batchDeleting}
      />

      {/* Tabela / Lista de Medidas */}
      {medidas.length === 0 && !(mostrarNovo || editando) ? (
        <p className="text-sm text-text-muted bg-surface-card rounded-2xl p-6 border border-surface-input text-center">
          Nenhuma medida registrada ainda. Clique em "+ Nova" para começar.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-surface-card border border-surface-input">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-input bg-surface/50 text-xs font-semibold text-text-muted uppercase tracking-wider">
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={
                      medidas.length > 0 &&
                      medidas
                        .filter(
                          (m) =>
                            formatDate(m.data).includes(search) ||
                            (m.peso_kg && `${m.peso_kg}`.includes(search)) ||
                            (m.observacao && m.observacao.toLowerCase().includes(search.toLowerCase()))
                        )
                        .every((m) => selectedIds.includes(m.id))
                    }
                    onChange={() => {
                      const filtered = medidas.filter(
                        (m) =>
                          formatDate(m.data).includes(search) ||
                          (m.peso_kg && `${m.peso_kg}`.includes(search)) ||
                          (m.observacao && m.observacao.toLowerCase().includes(search.toLowerCase()))
                      )
                      const filteredIds = filtered.map((m) => m.id)
                      const allSelected = filteredIds.every((id) => selectedIds.includes(id))
                      if (allSelected) {
                        setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)))
                      } else {
                        setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])))
                      }
                    }}
                    className="rounded border-surface-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                </th>
                <th className="p-3">Data</th>
                <th className="p-3">Peso</th>
                <th className="p-3">Altura</th>
                <th className="p-3">IMC</th>
                <th className="p-3">% BF</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-input">
              {medidas
                .filter(
                  (m) =>
                    formatDate(m.data).includes(search) ||
                    (m.peso_kg && `${m.peso_kg}`.includes(search)) ||
                    (m.observacao && m.observacao.toLowerCase().includes(search.toLowerCase()))
                )
                .map((m) => {
                  const cat = m.imc ? getIMCClassificacao(m.imc) : null
                  const isSelected = selectedIds.includes(m.id)
                  return (
                    <tr key={m.id} className={`hover:bg-surface/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            setSelectedIds((prev) =>
                              prev.includes(m.id) ? prev.filter((i) => i !== m.id) : [...prev, m.id]
                            )
                          }
                          className="rounded border-surface-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-xs text-text-muted">
                        <span className="block font-medium text-text">{formatDate(m.data)}</span>
                        {m.observacao && (
                          <span
                            className="text-[10px] block truncate max-w-[150px] mt-0.5 text-text-muted"
                            title={m.observacao}
                          >
                            {m.observacao}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-text">{m.peso_kg ? `${m.peso_kg} kg` : '-'}</td>
                      <td className="p-3 text-sm text-text">{m.altura_cm ? `${m.altura_cm} cm` : '-'}</td>
                      <td className="p-3 text-sm">
                        {m.imc ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cat?.bgClass}`}>
                            {m.imc.toFixed(1)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3 text-sm text-text">{m.percentual_bf ? `${m.percentual_bf}%` : '-'}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => preencherEdicao(m)}
                          className="text-xs text-primary hover:underline cursor-pointer"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabela de Classificação IMC (OMS) */}
      <div className="rounded-2xl bg-surface-card border border-surface-input overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-input bg-surface/50">
          <h3 className="text-sm font-bold text-text">Classificação IMC (OMS)</h3>
        </div>
        <div className="divide-y divide-surface-input">
          {IMC_TABLE.map((cat) => {
            const range = cat.max === null
              ? `≥ ${cat.min}`
              : `${cat.min} – ${cat.max}`
            const isActive = classificacao?.label === cat.label
            return (
              <div
                key={cat.label}
                className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-white/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className={`${isActive ? 'text-text font-semibold' : 'text-text-muted'}`}>
                    {cat.label}
                    {isActive && (
                      <span className="ml-1.5 text-xs text-text-muted font-normal">(você)</span>
                    )}
                  </span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.bgClass}`}>
                  {range}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <ConfirmModal
        open={confirmDeleteOpen}
        title="Excluir medidas"
        message={`Tem certeza que deseja excluir ${selectedIds.length} medida(s) selecionada(s)?`}
        onConfirm={() => {
          setConfirmDeleteOpen(false)
          executeBatchDelete()
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
        loading={batchDeleting}
      />

      {/* Modal Detalhes da Avaliação do Aluno */}
      {selectedAvaliacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-card border border-border w-full max-w-3xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-border pb-4">
              <div>
                <h3 className="text-xl font-bold text-text flex items-center gap-2">
                  <ClipboardListIcon className="h-6 w-6 text-primary" />
                  Avaliação Física — {new Date(selectedAvaliacao.data).toLocaleDateString('pt-BR')}
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  Avaliador: <span className="text-text font-semibold">{selectedAvaliacao.avaliador?.nome || 'Professor'}</span>
                  {selectedAvaliacao.avaliador?.professor?.cref && ` (CREF: ${selectedAvaliacao.avaliador.professor.cref})`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => gerarPDF(selectedAvaliacao)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:opacity-90 transition-all min-h-[44px] shadow-md shadow-primary/20 cursor-pointer"
                >
                  📄 Gerar PDF
                </button>
                <button
                  onClick={() => setSelectedAvaliacao(null)}
                  className="p-2 text-text-muted hover:text-text font-bold text-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Grid de Composição Corporal */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Composição Corporal & Antropometria</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-surface rounded-xl border border-border">
                  <p className="text-xs text-text-muted">Peso</p>
                  <p className="font-bold text-text text-base mt-0.5">{selectedAvaliacao.peso_kg ? `${selectedAvaliacao.peso_kg} kg` : '—'}</p>
                </div>
                <div className="p-3 bg-surface rounded-xl border border-border">
                  <p className="text-xs text-text-muted">Estatura</p>
                  <p className="font-bold text-text text-base mt-0.5">{selectedAvaliacao.estatura_m ? `${selectedAvaliacao.estatura_m} m` : '—'}</p>
                </div>
                <div className="p-3 bg-surface rounded-xl border border-border">
                  <p className="text-xs text-text-muted">IMC</p>
                  <p className="font-bold text-text text-base mt-0.5">{selectedAvaliacao.imc ? selectedAvaliacao.imc.toFixed(1) : '—'}</p>
                </div>
                <div className="p-3 bg-surface rounded-xl border border-border">
                  <p className="text-xs text-text-muted">% Gordura</p>
                  <p className="font-bold text-primary text-base mt-0.5">{selectedAvaliacao.percentual_gordura ? `${selectedAvaliacao.percentual_gordura}%` : '—'}</p>
                </div>
                <div className="p-3 bg-surface rounded-xl border border-border">
                  <p className="text-xs text-text-muted">Massa Magra</p>
                  <p className="font-bold text-text text-base mt-0.5">{selectedAvaliacao.massa_magra_kg ? `${selectedAvaliacao.massa_magra_kg} kg` : '—'}</p>
                </div>
                <div className="p-3 bg-surface rounded-xl border border-border">
                  <p className="text-xs text-text-muted">Massa Gorda</p>
                  <p className="font-bold text-text text-base mt-0.5">{selectedAvaliacao.massa_gorda_kg ? `${selectedAvaliacao.massa_gorda_kg} kg` : '—'}</p>
                </div>
                <div className="p-3 bg-surface rounded-xl border border-border">
                  <p className="text-xs text-text-muted">PA Repouso</p>
                  <p className="font-bold text-text text-base mt-0.5">{selectedAvaliacao.pas && selectedAvaliacao.pad ? `${selectedAvaliacao.pas}/${selectedAvaliacao.pad}` : '—'}</p>
                </div>
                <div className="p-3 bg-surface rounded-xl border border-border">
                  <p className="text-xs text-text-muted">FC Repouso</p>
                  <p className="font-bold text-text text-base mt-0.5">{selectedAvaliacao.fc_repouso ? `${selectedAvaliacao.fc_repouso} bpm` : '—'}</p>
                </div>
              </div>
            </div>

            {/* Testes Funcionais */}
            {(selectedAvaliacao.cardio_json?.vo2max || selectedAvaliacao.neuro_json?.oneRmEstimada || selectedAvaliacao.flexibilidade_json?.bancoWellsCm) && (
              <div className="space-y-2 pt-2 border-t border-border/60">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Testes Funcionais & Capacidade</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-surface rounded-xl border border-border">
                    <p className="text-xs text-text-muted">VO₂máx (Cooper)</p>
                    <p className="font-bold text-text text-base mt-0.5">{selectedAvaliacao.cardio_json?.vo2max ? `${selectedAvaliacao.cardio_json.vo2max} ml/kg/min` : '—'}</p>
                  </div>
                  <div className="p-3 bg-surface rounded-xl border border-border">
                    <p className="text-xs text-text-muted">1RM Estimada (Brzycki)</p>
                    <p className="font-bold text-text text-base mt-0.5">{selectedAvaliacao.neuro_json?.oneRmEstimada ? `${selectedAvaliacao.neuro_json.oneRmEstimada} kg` : '—'}</p>
                  </div>
                  <div className="p-3 bg-surface rounded-xl border border-border">
                    <p className="text-xs text-text-muted">Flexibilidade (Wells)</p>
                    <p className="font-bold text-text text-base mt-0.5">{selectedAvaliacao.flexibilidade_json?.bancoWellsCm ? `${selectedAvaliacao.flexibilidade_json.bancoWellsCm} cm` : '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Fotos da Avaliação */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Fotos da Avaliação</h4>
              {selectedAvaliacao.fotos && selectedAvaliacao.fotos.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {selectedAvaliacao.fotos.map((f: any, fIdx: number) => (
                    <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-surface shadow-sm group">
                      <img
                        src={resolveMediaUrl(f.url) || ''}
                        alt={f.nome_arquivo}
                        onClick={() => {
                          const urls = selectedAvaliacao.fotos.map((p: any) => resolveMediaUrl(p.url)).filter((u: any): u is string => u !== null)
                          setActivePhotoList(urls)
                          setActivePhotoIndex(fIdx)
                        }}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadMediaFile(f.url, f.nome_arquivo)
                        }}
                        className="absolute top-1 right-1 p-1.5 bg-black/70 text-white hover:text-primary rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer opacity-90 sm:opacity-0 group-hover:opacity-100"
                        title="Baixar foto"
                      >
                        📥
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic bg-surface/50 p-3 rounded-xl border border-dashed border-border text-center">
                  Nenhuma foto registrada nesta avaliação.
                </p>
              )}
            </div>

            {/* Laudo Markdown */}
            {selectedAvaliacao.laudo_markdown && (
              <div className="space-y-2 pt-2 border-t border-border/60">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Laudo Técnico</h4>
                <div className="prose prose-sm dark:prose-invert max-w-none text-text bg-surface p-4 rounded-xl border border-border overflow-x-auto">
                  <ReactMarkdown>{selectedAvaliacao.laudo_markdown}</ReactMarkdown>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                onClick={() => setSelectedAvaliacao(null)}
                className="px-5 py-2 bg-surface border border-border text-text font-semibold rounded-xl hover:border-primary transition-all min-h-[44px] cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox para Fotos na visão do Aluno */}
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
    </div>
  )
}
