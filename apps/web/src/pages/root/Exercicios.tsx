import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import type { ExercicioCatalogo, ExercicioInput, GifPrevia, GifRegras } from '../../types/api'
import { temFiguraDoSexo } from '../../lib/midiaPorSexo'
import { useT } from '../../i18n'

const POR_PAGINA = 48

const VAZIO: ExercicioInput = {
  nome: '',
  grupo_muscular: null,
  equipamento: null,
  nivel: null,
  musculo_alvo: null,
  musculos_secundarios: [],
  descricao_pt: null,
  dica: null,
  passos_pt: [],
  gif_url: null,
  imagem_url: null,
  sexo_figura: null,
}

const CAMPO = 'w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-text'

function paraInput(ex: ExercicioCatalogo): ExercicioInput {
  return {
    nome: ex.nome,
    grupo_muscular: ex.grupo_muscular ?? null,
    equipamento: ex.equipamento ?? null,
    nivel: ex.nivel ?? null,
    musculo_alvo: ex.musculo_alvo ?? null,
    musculos_secundarios: ex.musculos_secundarios ?? [],
    descricao_pt: ex.descricao_pt ?? null,
    dica: ex.dica ?? null,
    passos_pt: ex.passos_pt ?? [],
    gif_url: ex.gif_url ?? null,
    imagem_url: ex.imagem_url ?? null,
    sexo_figura: ex.sexo_figura ?? null,
  }
}

function mensagemDeErro(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

interface EditorProps {
  exercicio: ExercicioCatalogo | null // null = novo
  onFechar: () => void
  onSalvo: () => void
}

function Editor({ exercicio, onFechar, onSalvo }: EditorProps) {
  const { t } = useT()
  const [form, setForm] = useState<ExercicioInput>(exercicio ? paraInput(exercicio) : VAZIO)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [regras, setRegras] = useState<GifRegras | null>(null)
  const [previaGif, setPreviaGif] = useState<GifPrevia | null>(null)
  const [erroArquivo, setErroArquivo] = useState('')
  const [variantes, setVariantes] = useState(exercicio?.variantes ?? {})
  const [erroVariante, setErroVariante] = useState('')
  const [enviandoVariante, setEnviandoVariante] = useState<'MASCULINO' | 'FEMININO' | null>(null)

  useEffect(() => { api.rootRegrasGif().then(setRegras).catch(() => setRegras(null)) }, [])

  async function escolherArquivo(file: File | null) {
    setArquivo(file)
    setPreviaGif(null)
    setErroArquivo('')
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    try {
      setPreviaGif(await api.rootPreviaGif(fd))
    } catch (err) {
      setErroArquivo(mensagemDeErro(err))
    }
  }

  const set = <K extends keyof ExercicioInput>(k: K, v: ExercicioInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const texto = (k: 'grupo_muscular' | 'equipamento' | 'nivel' | 'musculo_alvo' | 'dica' | 'descricao_pt' | 'gif_url' | 'imagem_url') =>
    ({ value: form[k] ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value || null) })

  const previa = previaGif?.previa ?? (arquivo ? null : form.gif_url || form.imagem_url)

  async function enviarVariante(sexo: 'MASCULINO' | 'FEMININO', file: File | null) {
    if (!exercicio || !file) return
    setErroVariante('')
    setEnviandoVariante(sexo)
    try {
      const fd = new FormData()
      fd.append('file', file)
      setVariantes((await api.rootUploadVarianteGif(exercicio.id, sexo, fd)).variantes)
    } catch (err) {
      setErroVariante(mensagemDeErro(err))
    } finally {
      setEnviandoVariante(null)
    }
  }

  async function removerVariante(sexo: 'MASCULINO' | 'FEMININO') {
    if (!exercicio) return
    setErroVariante('')
    try {
      setVariantes((await api.rootRemoverVarianteGif(exercicio.id, sexo)).variantes)
    } catch (err) {
      setErroVariante(mensagemDeErro(err))
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      const salvo = exercicio
        ? await api.rootAtualizarExercicio(exercicio.id, form)
        : await api.rootCriarExercicio(form)
      if (arquivo) {
        const fd = new FormData()
        fd.append('file', arquivo)
        await api.rootUploadGifExercicio(salvo.id, fd)
      }
      onSalvo()
    } catch (err) {
      setErro(mensagemDeErro(err))
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <form onSubmit={salvar} className="max-h-[92vh] w-full max-w-2xl space-y-3 overflow-y-auto rounded-t-2xl bg-surface-card p-4 sm:rounded-2xl">
        <h2 className="text-lg font-bold text-text">{exercicio ? t('Editar exercício') : t('Novo exercício')}</h2>

        {previa && <img src={previa} alt="" className="mx-auto max-h-48 rounded-lg bg-surface object-contain" />}

        <label className="block text-sm text-text-muted">
          {t('Nome')}
          <input className={CAMPO} required minLength={2} placeholder={t('Ex.: Supino Reto com Barra')} value={form.nome} onChange={(e) => set('nome', e.target.value)} />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm text-text-muted">{t('Grupo muscular')}<input className={CAMPO} placeholder={t('Ex.: Peito')} {...texto('grupo_muscular')} /></label>
          <label className="block text-sm text-text-muted">{t('Equipamento')}<input className={CAMPO} placeholder={t('Ex.: Barra')} {...texto('equipamento')} /></label>
          <label className="block text-sm text-text-muted">{t('Nível')}<input className={CAMPO} placeholder={t('Ex.: Iniciante')} {...texto('nivel')} /></label>
          <label className="block text-sm text-text-muted">{t('Músculo alvo')}<input className={CAMPO} placeholder={t('Ex.: Peitoral')} {...texto('musculo_alvo')} /></label>
        </div>

        <label className="block text-sm text-text-muted">
          {t('Músculos secundários (separados por vírgula)')}
          <input
            className={CAMPO}
            placeholder={t('Ex.: Tríceps, Deltoide anterior')}
            value={form.musculos_secundarios.join(', ')}
            onChange={(e) => set('musculos_secundarios', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          />
        </label>

        <label className="block text-sm text-text-muted">{t('Descrição')}<textarea rows={3} className={CAMPO} placeholder={t('Ex.: Exercício de empurrar que trabalha peito, ombros e tríceps.')} {...texto('descricao_pt')} /></label>
        <label className="block text-sm text-text-muted">{t('Dica')}<textarea rows={2} className={CAMPO} placeholder={t('Ex.: Mantenha os pés firmes no chão e não tire o quadril do banco.')} {...texto('dica')} /></label>
        <label className="block text-sm text-text-muted">
          {t('Passos (um por linha)')}
          <textarea
            rows={4}
            className={CAMPO}
            placeholder={t('Ex.:\nDeite-se no banco com os pés firmes no chão.\nDesça a barra até a altura do peito.\nEmpurre a barra até estender os braços.')}
            value={form.passos_pt.join('\n')}
            onChange={(e) => set('passos_pt', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
          />
        </label>

        <fieldset className="space-y-2 rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-semibold text-text">GIF</legend>
          {regras && (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-text-muted">
              <li>{t('Formatos: GIF, WebP, PNG ou JPG, até {mb} MB.', { mb: Math.round(regras.pesoMaxBytes / 1048576) })}</li>
              <li>{t('Tamanho: de {min}×{min} a {max}×{max} px, quadrado ou até 4:3.', { min: regras.ladoMinPx, max: regras.ladoMaxPx })}</li>
              <li>{t('Pessoa centralizada e ocupando a maior parte do quadro, em fundo liso.')}</li>
              <li>{t('O sistema recorta ao centro e converte para {px}×{px} px (WebP animado, até {q} quadros).', { px: regras.saidaPx, q: regras.quadrosMax })}</li>
            </ul>
          )}
          <label className="block text-sm text-text-muted">
            {t('Enviar arquivo (GIF, WebP, PNG ou JPG, até 5 MB)')}
            <input type="file" accept="image/gif,image/webp,image/png,image/jpeg" className="mt-1 block w-full text-sm" onChange={(e) => void escolherArquivo(e.target.files?.[0] ?? null)} />
          </label>
          {erroArquivo && <p role="alert" className="text-sm text-red-400">{erroArquivo}</p>}
          {previaGif && (
            <p className="text-xs text-text-muted">
              {t('Resultado: {l}×{a} px, {n} quadros, {antes} KB → {depois} KB.', {
                l: previaGif.final.largura, a: previaGif.final.altura, n: previaGif.final.quadros,
                antes: previaGif.original.kb, depois: previaGif.final.kb,
              })}
            </p>
          )}
          <label className="block text-sm text-text-muted">
            {t('ou endereço do GIF (URL)')}
            <input type="url" className={CAMPO} placeholder="https://exemplo.com/supino-reto.gif" {...texto('gif_url')} disabled={!!arquivo} />
          </label>
          <label className="block text-sm text-text-muted">
            {t('Imagem estática (URL, opcional)')}
            <input type="url" className={CAMPO} placeholder="https://exemplo.com/supino-reto.jpg" {...texto('imagem_url')} />
          </label>
        </fieldset>

        <fieldset className="space-y-2 rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-semibold text-text">{t('Imagem por sexo')}</legend>
          <label className="block text-sm text-text-muted">
            {t('Quem aparece no GIF principal')}
            <select
              className={CAMPO}
              value={form.sexo_figura ?? ''}
              onChange={(e) => set('sexo_figura', (e.target.value || null) as ExercicioInput['sexo_figura'])}
            >
              <option value="">{t('Não informado')}</option>
              <option value="MASCULINO">{t('Homem')}</option>
              <option value="FEMININO">{t('Mulher')}</option>
            </select>
          </label>
          <p className="text-xs text-text-muted">
            {t('Alunas veem a versão feminina e alunos a masculina, se existir. Sem versão, veem o GIF principal.')}
          </p>
          {!exercicio ? (
            <p className="text-xs text-text-muted">{t('Salve o exercício para enviar as versões por sexo.')}</p>
          ) : (
            (['FEMININO', 'MASCULINO'] as const).map((sexo) => {
              const v = variantes[sexo]
              const rotulo = sexo === 'FEMININO' ? t('Versão feminina') : t('Versão masculina')
              return (
                <div key={sexo} className="flex flex-wrap items-center gap-3 rounded-lg bg-surface p-2">
                  {v?.gif_url
                    ? <img src={v.gif_url} alt={rotulo} className="h-16 w-16 rounded bg-white object-contain" />
                    : <span className="flex h-16 w-16 items-center justify-center rounded bg-surface-input text-xs text-text-muted">{t('Sem')}</span>}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold text-text">{rotulo}</p>
                    <input
                      type="file"
                      aria-label={rotulo}
                      accept="image/gif,image/webp,image/png,image/jpeg"
                      className="block w-full text-xs"
                      disabled={enviandoVariante !== null}
                      onChange={(e) => void enviarVariante(sexo, e.target.files?.[0] ?? null)}
                    />
                    {enviandoVariante === sexo && <p className="text-xs text-text-muted">{t('Enviando...')}</p>}
                  </div>
                  {v?.gif_url && (
                    <button type="button" onClick={() => void removerVariante(sexo)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-400">{t('Remover')}</button>
                  )}
                </div>
              )
            })
          )}
          {erroVariante && <p role="alert" className="text-sm text-red-400">{erroVariante}</p>}
        </fieldset>

        {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onFechar} className="rounded-lg px-4 py-2 text-sm text-text-muted">{t('Cancelar')}</button>
          <button type="submit" disabled={salvando || !!erroArquivo} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60">
            {salvando ? t('Salvando...') : t('Salvar')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function RootExercicios() {
  const { t } = useT()
  const [lista, setLista] = useState<ExercicioCatalogo[] | null>(null)
  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState('')
  const [semGif, setSemGif] = useState(false)
  const [figura, setFigura] = useState<'' | 'SEM_FEMININA' | 'SEM_MASCULINA'>('')
  const [visiveis, setVisiveis] = useState(POR_PAGINA)
  const [editando, setEditando] = useState<ExercicioCatalogo | null | undefined>(undefined) // undefined = fechado
  const [erro, setErro] = useState('')

  const carregar = () =>
    api.rootListarExercicios().then(setLista).catch((e) => { setLista([]); setErro(mensagemDeErro(e)) })

  useEffect(() => { void carregar() }, [])

  const grupos = useMemo(
    () => [...new Set((lista ?? []).map((e) => e.grupo_muscular).filter((g): g is string => !!g))].sort(),
    [lista],
  )

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return (lista ?? []).filter((e) =>
      (!q || e.nome.toLowerCase().includes(q)) &&
      (!grupo || e.grupo_muscular === grupo) &&
      (!semGif || !e.gif_url) &&
      (figura !== 'SEM_FEMININA' || !temFiguraDoSexo(e, 'FEMININO')) &&
      (figura !== 'SEM_MASCULINA' || !temFiguraDoSexo(e, 'MASCULINO')),
    )
  }, [lista, busca, grupo, semGif, figura])

  async function apagar(ex: ExercicioCatalogo) {
    if (!window.confirm(t('Apagar "{nome}"? Esta ação não pode ser desfeita.', { nome: ex.nome }))) return
    setErro('')
    try {
      await api.rootRemoverExercicio(ex.id)
      await carregar()
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  if (!lista) return <div className="p-4 text-text-muted">{t('Carregando...')}</div>

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">{t('Catálogo de exercícios e GIFs')}</h1>
          <p className="text-xs text-text-muted">
            {t('{n} exercícios · {m} sem GIF', { n: lista.length, m: lista.filter((e) => !e.gif_url).length })}
          </p>
        </div>
        <button onClick={() => setEditando(null)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-surface">
          + {t('Adicionar exercício')}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          aria-label={t('Buscar')}
          placeholder={t('Buscar por nome')}
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setVisiveis(POR_PAGINA) }}
          className={`${CAMPO} sm:max-w-xs`}
        />
        <select aria-label={t('Grupo muscular')} value={grupo} onChange={(e) => { setGrupo(e.target.value); setVisiveis(POR_PAGINA) }} className={`${CAMPO} sm:max-w-[12rem]`}>
          <option value="">{t('Todos os grupos')}</option>
          {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          aria-label={t('Figura')}
          value={figura}
          onChange={(e) => { setFigura(e.target.value as typeof figura); setVisiveis(POR_PAGINA) }}
          className={`${CAMPO} sm:max-w-[14rem]`}
        >
          <option value="">{t('Todas as figuras')}</option>
          <option value="SEM_FEMININA">{t('Sem figura feminina')}</option>
          <option value="SEM_MASCULINA">{t('Sem figura masculina')}</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" checked={semGif} onChange={(e) => { setSemGif(e.target.checked); setVisiveis(POR_PAGINA) }} />
          {t('Só sem GIF')}
        </label>
      </div>

      {erro && <p role="alert" className="mb-3 text-sm text-red-400">{erro}</p>}

      {filtrados.length === 0 ? (
        <p className="py-8 text-center text-text-muted">{t('Nenhum exercício encontrado.')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtrados.slice(0, visiveis).map((ex) => {
            const img = ex.gif_url || ex.imagem_url
            return (
              <div key={ex.id} className="flex flex-col overflow-hidden rounded-lg bg-surface-card">
                <div className="flex aspect-square items-center justify-center bg-surface">
                  {img
                    ? <img src={img} alt={ex.nome} loading="lazy" className="h-full w-full object-contain" />
                    : <span className="text-xs text-text-muted">{t('Sem GIF')}</span>}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-2.5">
                  <p className="text-sm font-semibold leading-tight text-text">{ex.nome}</p>
                  <p className="text-xs text-text-muted">{[ex.grupo_muscular, ex.equipamento].filter(Boolean).join(' · ') || '—'}</p>
                  <p className="text-xs text-text-muted">
                    {temFiguraDoSexo(ex, 'FEMININO') ? '♀' : '·'} {temFiguraDoSexo(ex, 'MASCULINO') ? '♂' : '·'}
                  </p>
                  {ex.usos > 0 && <p className="text-xs text-text-muted">{t('Em {n} treinos', { n: ex.usos })}</p>}
                  <div className="mt-auto flex gap-2 pt-2">
                    <button onClick={() => setEditando(ex)} className="flex-1 rounded-lg bg-surface px-2 py-1.5 text-xs font-semibold text-text">{t('Editar')}</button>
                    <button onClick={() => apagar(ex)} className="flex-1 rounded-lg bg-surface px-2 py-1.5 text-xs font-semibold text-red-400">{t('Apagar')}</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filtrados.length > visiveis && (
        <div className="mt-4 text-center">
          <button onClick={() => setVisiveis((v) => v + POR_PAGINA)} className="rounded-lg bg-surface-card px-4 py-2 text-sm text-text">
            {t('Mostrar mais')} ({filtrados.length - visiveis})
          </button>
        </div>
      )}

      {editando !== undefined && (
        <Editor
          exercicio={editando}
          onFechar={() => setEditando(undefined)}
          onSalvo={() => { setEditando(undefined); void carregar() }}
        />
      )}
    </div>
  )
}
