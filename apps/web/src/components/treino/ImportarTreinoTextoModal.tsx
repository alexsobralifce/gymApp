import { useMemo, useState } from 'react'
import { api } from '../../api/client'
import type { Exercicio, ImportacaoTreinoPreview, StatusCasamentoExercicio } from '../../types/api'
import ExerciseLibraryDrawer from '../ui/ExerciseLibraryDrawer'
import { XIcon } from '../icons/Icon'

import { useT } from '../../i18n'
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const EXEMPLO = `Segunda - Peito e tríceps
Supino reto c/ barra 4x10
Supino inclinado halteres 3x12
Tríceps corda 3x15

Quarta - Costas e bíceps
Puxada alta 4x10
Remada curvada 3x12
Rosca direta 3x12`

export interface ExercicioImportado {
  exercicioId: string
  nome: string
  ordem: number
  series: number
  repeticoes: number
  cargaSugeridaKg?: number
  observacoes?: string
  imagemUrl?: string | null
  gifUrl?: string | null
  grupoMuscular?: string | null
  originalExercicio?: Exercicio
}

export interface FichaImportada {
  nome: string
  diasSemana: number[]
  exercicios: ExercicioImportado[]
}

interface Item {
  chave: string
  textoOriginal: string
  status: StatusCasamentoExercicio
  exercicioId: string | null
  series: number
  repeticoes: number
  carga: string
  observacoes: string
  candidatos: Array<{ exercicioId: string; nome: string }>
}

interface TreinoEditavel {
  nome: string
  diasSemana: number[]
  itens: Item[]
}

interface Props {
  onFechar: () => void
  todosExercicios: Exercicio[]
  onConfirmar: (fichas: FichaImportada[]) => void | Promise<void>
  confirmando?: boolean
  rotuloConfirmar?: string
}

function paraEditavel(prev: ImportacaoTreinoPreview): TreinoEditavel[] {
  return prev.treinos.map((tr, ti) => ({
    nome: tr.rotulo,
    // Os dias de cada treino são sempre escolhidos pela pessoa, nunca deduzidos do texto.
    diasSemana: [],
    itens: tr.exercicios.map((e, ei) => ({
      chave: `${ti}-${ei}`,
      textoOriginal: e.textoOriginal,
      status: e.status,
      exercicioId: e.exercicioId,
      series: e.series,
      repeticoes: e.repeticoes,
      carga: e.cargaSugeridaKg != null ? String(e.cargaSugeridaKg) : '',
      observacoes: e.observacoes ?? '',
      candidatos: e.candidatos.map((c) => ({ exercicioId: c.exercicioId, nome: c.nome })),
    })),
  }))
}

const SELO: Record<StatusCasamentoExercicio, { texto: string; classe: string }> = {
  ok: { texto: '✓ Reconhecido', classe: 'text-success' },
  duvida: { texto: '⚠ Confira', classe: 'text-yellow-500' },
  nao_encontrado: { texto: '✕ Não encontrado', classe: 'text-destructive' },
}

export default function ImportarTreinoTextoModal({
  onFechar,
  todosExercicios,
  onConfirmar,
  confirmando = false,
  rotuloConfirmar = 'Criar treinos',
}: Props) {
  const { t } = useT()
  const [texto, setTexto] = useState('')
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [treinos, setTreinos] = useState<TreinoEditavel[] | null>(null)
  const [escolhendo, setEscolhendo] = useState<{ t: number; i: number } | null>(null)

  const porId = useMemo(() => new Map(todosExercicios.map((e) => [e.id, e])), [todosExercicios])

  const pendencia = useMemo(() => {
    if (!treinos) return null
    if (treinos.length === 0) return t('Nenhum treino para criar.')
    if (treinos.some((tr) => tr.nome.trim().length < 2)) return t('Dê um nome para cada treino.')
    if (treinos.some((tr) => tr.diasSemana.length === 0)) return t('Marque pelo menos um dia da semana em cada treino.')
    if (treinos.some((tr) => tr.itens.length === 0)) return t('Cada treino precisa de pelo menos um exercício.')
    if (treinos.some((tr) => tr.itens.some((it) => it.exercicioId == null)))
      return t('Escolha no catálogo os exercícios não encontrados, ou remova-os.')
    return null
  }, [treinos])

  function fechar() {
    if (lendo || confirmando) return
    setEscolhendo(null)
    onFechar()
  }

  async function reconhecer() {
    setErro(null)
    setLendo(true)
    try {
      const prev = await api.importarTreinoTexto(texto)
      if (prev.treinos.length === 0) {
        setErro(t('Não encontrei exercícios nesse texto. Escreva um exercício por linha, separando os treinos por dia.'))
        return
      }
      setTreinos(paraEditavel(prev))
    } catch (e) {
      setErro(e instanceof Error ? t(e.message) : t('Não foi possível ler o texto.'))
    } finally {
      setLendo(false)
    }
  }

  function atualizarTreino(tr: number, parcial: Partial<TreinoEditavel>) {
    setTreinos((prev) => prev && prev.map((x, i) => (i === tr ? { ...x, ...parcial } : x)))
  }

  function atualizarItem(tr: number, i: number, parcial: Partial<Item>) {
    setTreinos(
      (prev) =>
        prev &&
        prev.map((x, ti) => (ti === tr ? { ...x, itens: x.itens.map((it, ii) => (ii === i ? { ...it, ...parcial } : it)) } : x)),
    )
  }

  function removerItem(tr: number, i: number) {
    setTreinos((prev) => prev && prev.map((x, ti) => (ti === tr ? { ...x, itens: x.itens.filter((_, ii) => ii !== i) } : x)))
  }

  function alternarDia(tr: number, dia: number) {
    const atuais = treinos?.[tr].diasSemana ?? []
    atualizarTreino(tr, { diasSemana: atuais.includes(dia) ? atuais.filter((d) => d !== dia) : [...atuais, dia].sort() })
  }

  function escolherNoCatalogo(ex: Exercicio) {
    if (!escolhendo) return
    const { t, i } = escolhendo
    const atual = treinos?.[t].itens[i]
    const candidatos = atual?.candidatos.some((c) => c.exercicioId === ex.id)
      ? atual.candidatos
      : [{ exercicioId: ex.id, nome: ex.nome }, ...(atual?.candidatos ?? [])]
    atualizarItem(t, i, { exercicioId: ex.id, status: 'ok', candidatos })
    setEscolhendo(null)
  }

  async function confirmar() {
    if (!treinos || pendencia) return
    const fichas: FichaImportada[] = treinos.map((tr) => ({
      nome: tr.nome.trim(),
      diasSemana: tr.diasSemana,
      exercicios: tr.itens.map((it, idx) => {
        const ex = porId.get(it.exercicioId as string)
        const nome = ex?.nome ?? it.candidatos.find((c) => c.exercicioId === it.exercicioId)?.nome ?? it.textoOriginal
        const carga = Number(it.carga.replace(',', '.'))
        return {
          exercicioId: it.exercicioId as string,
          nome,
          ordem: idx + 1,
          series: it.series,
          repeticoes: it.repeticoes,
          cargaSugeridaKg: it.carga.trim() !== '' && Number.isFinite(carga) && carga > 0 ? carga : undefined,
          observacoes: it.observacoes.trim() || undefined,
          imagemUrl: ex?.imagem_url,
          gifUrl: ex?.gif_url,
          grupoMuscular: ex?.grupo_muscular,
          originalExercicio: ex,
        }
      }),
    }))
    await onConfirmar(fichas)
  }

  return (
    <>
      <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center ${escolhendo ? 'hidden' : ''}`}>
        <div className="absolute inset-0 bg-black/60" onClick={fechar} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('Colar treino em texto')}
          className="relative z-10 flex w-full max-h-[94vh] sm:max-w-2xl flex-col rounded-t-3xl sm:rounded-2xl bg-surface-card shadow-2xl animate-modal-pop safe-bottom"
        >
          <div className="flex items-start justify-between gap-3 border-b border-surface-input p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-black text-text">{t('Colar treino em texto')}</h2>
              <p className="text-xs sm:text-sm text-text-muted">
                {treinos
                  ? t('Confira os treinos reconhecidos e dê um nome a cada um.')
                  : t('Cole a lista dia a dia. O sistema reconhece os exercícios e monta os treinos.')}
              </p>
            </div>
            <button
              type="button"
              onClick={fechar}
              aria-label={t('Fechar')}
              className="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-text-muted hover:text-text hover:bg-surface-input cursor-pointer"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            {!treinos ? (
              <>
                <label htmlFor="importar-texto" className="block text-sm font-bold text-text">
                  {t('Texto dos treinos')}
                </label>
                <textarea
                  id="importar-texto"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder={EXEMPLO}
                  rows={12}
                  maxLength={8000}
                  className="input-base resize-y font-mono"
                />
                {erro && <p role="alert" className="text-sm font-semibold text-destructive">{erro}</p>}
              </>
            ) : (
              treinos.map((tr, ti) => (
                <section key={ti} className="space-y-3 rounded-2xl border border-surface-input bg-surface p-3.5 sm:p-4">
                  <div>
                    <label htmlFor={`imp-nome-${ti}`} className="mb-1 block text-xs font-bold text-text-muted">
                      {t('Nome do treino')}
                    </label>
                    <input
                      id={`imp-nome-${ti}`}
                      value={tr.nome}
                      onChange={(e) => atualizarTreino(ti, { nome: e.target.value })}
                      autoFocus={ti === 0}
                      maxLength={60}
                      className="input-base"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('Dias da semana')}>
                    {DIAS.map((d, di) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={tr.diasSemana.includes(di)}
                        onClick={() => alternarDia(ti, di)}
                        className={`min-h-11 min-w-11 rounded-xl px-3 text-xs font-extrabold cursor-pointer transition-colors ${
                          tr.diasSemana.includes(di)
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-surface-input bg-surface-card text-text-muted hover:text-text'
                        }`}
                      >
                        {t(d)}
                      </button>
                    ))}
                  </div>

                  <ol className="space-y-2">
                    {tr.itens.map((it, ii) => {
                      const selo = SELO[it.exercicioId == null ? 'nao_encontrado' : it.status]
                      return (
                        <li key={it.chave} className="space-y-2 rounded-xl border border-surface-input bg-surface-card p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs text-text-muted">{ii + 1}. {it.textoOriginal}</p>
                              <p className={`text-xs font-bold ${selo.classe}`}>{t(selo.texto)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removerItem(ti, ii)}
                              aria-label={`Remover ${it.textoOriginal}`}
                              className="min-h-11 min-w-11 rounded-xl text-text-muted hover:text-destructive cursor-pointer"
                            >
                              <XIcon className="mx-auto h-4 w-4" />
                            </button>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row">
                            <select
                              aria-label={t('Exercício para {textoOriginal}', { textoOriginal: it.textoOriginal })}
                              value={it.exercicioId ?? ''}
                              onChange={(e) => {
                                if (e.target.value === '__catalogo') setEscolhendo({ t: ti, i: ii })
                                else atualizarItem(ti, ii, { exercicioId: e.target.value || null, status: 'ok' })
                              }}
                              className="input-base sm:flex-1"
                            >
                              {it.exercicioId == null && <option value="">{t('Escolha o exercício…')}</option>}
                              {it.candidatos.map((c) => (
                                <option key={c.exercicioId} value={c.exercicioId}>{c.nome}</option>
                              ))}
                              <option value="__catalogo">{t('Buscar em todo o catálogo…')}</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <CampoNumero rotulo={t('Séries')} valor={String(it.series)} min={1} max={20}
                              onChange={(v) => atualizarItem(ti, ii, { series: Math.max(1, Math.min(20, Number(v) || 1)) })} />
                            <CampoNumero rotulo={t('Repetições')} valor={String(it.repeticoes)} min={1} max={200}
                              onChange={(v) => atualizarItem(ti, ii, { repeticoes: Math.max(1, Math.min(200, Number(v) || 1)) })} />
                            <CampoNumero rotulo={t('Carga (kg)')} valor={it.carga} min={0} max={1000} step="0.5" vazioOk
                              onChange={(v) => atualizarItem(ti, ii, { carga: v })} />
                          </div>
                          {it.observacoes && <p className="text-xs text-text-muted">{t('Obs.:')} {it.observacoes}</p>}
                        </li>
                      )
                    })}
                  </ol>
                </section>
              ))
            )}
          </div>

          <div className="space-y-2 border-t border-surface-input p-4 sm:p-5">
            {treinos && pendencia && <p role="status" className="text-xs font-semibold text-text-muted">{pendencia}</p>}
            <div className="flex justify-end gap-3">
              {treinos ? (
                <>
                  <button type="button" onClick={() => setTreinos(null)} disabled={confirmando}
                    className="min-h-11 rounded-xl border border-surface-input bg-surface px-5 text-sm font-semibold text-text-muted hover:text-text disabled:opacity-50 cursor-pointer">
                    {t('Voltar ao texto')}
                  </button>
                  <button type="button" onClick={confirmar} disabled={!!pendencia || confirmando}
                    className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50 cursor-pointer active:scale-95 transition-all">
                    {confirmando ? t('Criando…') : `${rotuloConfirmar} (${treinos.length})`}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={fechar} disabled={lendo}
                    className="min-h-11 rounded-xl border border-surface-input bg-surface px-5 text-sm font-semibold text-text-muted hover:text-text cursor-pointer">
                    {t('Cancelar')}
                  </button>
                  <button type="button" onClick={reconhecer} disabled={lendo || texto.trim().length < 10}
                    className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50 cursor-pointer active:scale-95 transition-all">
                    {lendo ? t('Lendo o texto…') : t('Reconhecer treinos')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <ExerciseLibraryDrawer
        isOpen={escolhendo !== null}
        onClose={() => setEscolhendo(null)}
        todosExercicios={todosExercicios}
        addedExerciseIds={new Set()}
        onAddExercise={escolherNoCatalogo}
        onRemoveExercise={() => {}}
      />
    </>
  )
}

function CampoNumero({ rotulo, valor, onChange, min, max, step, vazioOk }: {
  rotulo: string
  valor: string
  onChange: (v: string) => void
  min: number
  max: number
  step?: string
  vazioOk?: boolean
}) {
  return (
    <label className="block text-xs font-bold text-text-muted">
      {rotulo}
      <input
        type="number"
        inputMode="decimal"
        value={valor}
        min={min}
        max={max}
        step={step}
        placeholder={vazioOk ? '—' : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="input-base mt-1"
      />
    </label>
  )
}
