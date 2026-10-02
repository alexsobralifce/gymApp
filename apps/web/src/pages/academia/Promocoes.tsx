import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { resolveMediaUrl } from '../../lib/media'
import ConfirmModal from '../../components/ui/ConfirmModal'
import type { Promocao, PromocaoInput, PromocaoTipo } from '../../types/api'

const TIPOS: { valor: PromocaoTipo; rotulo: string }[] = [
  { valor: 'CAMPANHA', rotulo: 'Campanha' },
  { valor: 'PLANO', rotulo: 'Plano especial' },
  { valor: 'PARCERIA', rotulo: 'Parceria' },
  { valor: 'PRODUTO', rotulo: 'Produto' },
]

interface Form {
  titulo: string
  descricao: string
  tipo: PromocaoTipo
  ctaLabel: string
  ctaUrl: string
  precoTexto: string
  fimEm: string
  ativo: boolean
}

const FORM_VAZIO: Form = { titulo: '', descricao: '', tipo: 'CAMPANHA', ctaLabel: '', ctaUrl: '', precoTexto: '', fimEm: '', ativo: true }

const campo = 'w-full rounded-xl bg-surface-input border border-surface-input px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary'

function paraForm(p: Promocao): Form {
  return {
    titulo: p.titulo,
    descricao: p.descricao ?? '',
    tipo: p.tipo,
    ctaLabel: p.cta_label ?? '',
    ctaUrl: p.cta_url ?? '',
    precoTexto: p.preco_texto ?? '',
    fimEm: p.fim_em ? p.fim_em.slice(0, 10) : '',
    ativo: p.ativo,
  }
}

function paraInput(f: Form): PromocaoInput {
  return {
    titulo: f.titulo.trim(),
    descricao: f.descricao.trim() || null,
    tipo: f.tipo,
    ctaLabel: f.ctaLabel.trim() || null,
    ctaUrl: f.ctaUrl.trim() || null,
    precoTexto: f.precoTexto.trim() || null,
    fimEm: f.fimEm ? new Date(`${f.fimEm}T23:59:59`).toISOString() : null,
    ativo: f.ativo,
  }
}

export default function Promocoes() {
  const [lista, setLista] = useState<Promocao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState<string | 'nova' | null>(null)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [imagem, setImagem] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [excluir, setExcluir] = useState<Promocao | null>(null)

  async function carregar() {
    try {
      setLista(await api.listarPromocoes())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar as promoções.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  function abrir(p?: Promocao) {
    setErro(null)
    setImagem(null)
    setForm(p ? paraForm(p) : FORM_VAZIO)
    setEditando(p ? p.id : 'nova')
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (form.ctaUrl && !/^https?:\/\//i.test(form.ctaUrl.trim())) {
      setErro('O link deve começar com http:// ou https://')
      return
    }
    setSalvando(true)
    try {
      const salva = editando === 'nova'
        ? await api.criarPromocao(paraInput(form))
        : await api.atualizarPromocao(editando as string, paraInput(form))
      if (imagem) {
        const fd = new FormData()
        fd.append('file', imagem)
        await api.uploadImagemPromocao(salva.id, fd)
      }
      setEditando(null)
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar a promoção.')
    } finally {
      setSalvando(false)
    }
  }

  async function alternarAtivo(p: Promocao) {
    try {
      await api.atualizarPromocao(p.id, { ativo: !p.ativo })
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível atualizar.')
    }
  }

  async function confirmarExclusao() {
    if (!excluir) return
    try {
      await api.removerPromocao(excluir.id)
      setExcluir(null)
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível excluir.')
      setExcluir(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Vitrine de promoções</h1>
          <p className="text-sm text-text-muted mt-1">
            Campanhas, planos, parcerias e produtos que seus alunos veem assim que abrem o app.
          </p>
        </div>
        {editando === null && (
          <button onClick={() => abrir()} className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground cursor-pointer">
            Nova promoção
          </button>
        )}
      </div>

      {erro && editando === null && <p role="alert" className="text-sm text-destructive">{erro}</p>}

      {editando !== null && (
        <form onSubmit={salvar} className="rounded-2xl bg-surface-card border border-surface-input p-5 space-y-4">
          <h2 className="text-sm font-bold text-text">{editando === 'nova' ? 'Nova promoção' : 'Editar promoção'}</h2>

          <label className="block text-sm text-text">
            Título
            <input className={`${campo} mt-1`} required minLength={2} maxLength={80} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </label>

          <label className="block text-sm text-text">
            Descrição
            <textarea className={`${campo} mt-1`} rows={3} maxLength={300} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-text">
              Tipo
              <select className={`${campo} mt-1`} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as PromocaoTipo })}>
                {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
              </select>
            </label>
            <label className="block text-sm text-text">
              Preço / destaque (opcional)
              <input className={`${campo} mt-1`} maxLength={40} placeholder="Ex.: 15% OFF" value={form.precoTexto} onChange={(e) => setForm({ ...form, precoTexto: e.target.value })} />
            </label>
            <label className="block text-sm text-text">
              Texto do botão
              <input className={`${campo} mt-1`} maxLength={30} placeholder="Ex.: Quero aproveitar" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
            </label>
            <label className="block text-sm text-text">
              Link do botão
              <input className={`${campo} mt-1`} type="url" placeholder="https://" value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} />
            </label>
            <label className="block text-sm text-text">
              Válida até (opcional)
              <input className={`${campo} mt-1`} type="date" value={form.fimEm} onChange={(e) => setForm({ ...form, fimEm: e.target.value })} />
            </label>
            <label className="block text-sm text-text">
              Imagem (PNG, JPG ou WebP, até 3 MB)
              <input className={`${campo} mt-1`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setImagem(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
            Ativa (visível para os alunos)
          </label>

          {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditando(null)} className="rounded-xl px-4 py-2 text-sm text-text-muted cursor-pointer">Cancelar</button>
            <button type="submit" disabled={salvando} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60 cursor-pointer">
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="text-sm text-text-muted">Carregando…</p>
      ) : lista.length === 0 && editando === null ? (
        <div className="rounded-2xl border border-dashed border-surface-input p-8 text-center">
          <p className="text-sm text-text">Você ainda não cadastrou nenhuma promoção.</p>
          <p className="text-xs text-text-muted mt-1">Crie a primeira para aparecer na tela inicial dos alunos.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {lista.map((p) => {
            const img = resolveMediaUrl(p.imagem_url)
            const expirada = !!p.fim_em && new Date(p.fim_em) < new Date()
            return (
              <li key={p.id} className="flex gap-3 rounded-2xl bg-surface-card border border-surface-input p-4">
                {img && <img src={img} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-text truncate">{p.titulo}</p>
                    <span className="rounded-full bg-surface-input px-2 py-0.5 text-[11px] text-text-muted">{TIPOS.find((t) => t.valor === p.tipo)?.rotulo}</span>
                    {expirada ? (
                      <span className="rounded-full bg-surface-input px-2 py-0.5 text-[11px] text-text-muted">Expirada</span>
                    ) : !p.ativo ? (
                      <span className="rounded-full bg-surface-input px-2 py-0.5 text-[11px] text-text-muted">Inativa</span>
                    ) : (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] text-success">No ar</span>
                    )}
                  </div>
                  {p.descricao && <p className="mt-1 text-xs text-text-muted line-clamp-2">{p.descricao}</p>}
                  <p className="mt-1 text-xs text-text-muted">
                    {p.visualizacoes ?? 0} visualizações · {p.cliques ?? 0} cliques
                    {p.fim_em && ` · até ${new Date(p.fim_em).toLocaleDateString('pt-BR')}`}
                  </p>
                  <div className="mt-2 flex gap-3 text-xs">
                    <button onClick={() => abrir(p)} className="text-primary cursor-pointer">Editar</button>
                    <button onClick={() => alternarAtivo(p)} className="text-text-muted cursor-pointer">{p.ativo ? 'Desativar' : 'Ativar'}</button>
                    <button onClick={() => setExcluir(p)} className="text-destructive cursor-pointer">Excluir</button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmModal
        open={!!excluir}
        title="Excluir promoção"
        message={`Excluir "${excluir?.titulo ?? ''}"? Essa ação não pode ser desfeita.`}
        confirmText="Excluir"
        onConfirm={confirmarExclusao}
        onCancel={() => setExcluir(null)}
      />
    </div>
  )
}
