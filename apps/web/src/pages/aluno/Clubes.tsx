import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import {
  TrophyIcon,
  Building2Icon,
  UsersIcon,
  LogOutIcon,
  LinkIcon,
  CheckIcon,
  XIcon,
  GridIcon,
} from '../../components/icons/Icon'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Toast from '../../components/ui/Toast'
import type { MeuClube, ClubeDetalhe } from '../../types/api'

type Tab = 'meus' | 'descobrir' | 'criar'

export default function Clubes() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('meus')
  const [meus, setMeus] = useState<MeuClube[]>([])
  const [disponiveis, setDisponiveis] = useState<ClubeDetalhe[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [academiaNome, setAcademiaNome] = useState<string | null>(null)

  // Criar clube
  const [criarNome, setCriarNome] = useState('')
  const [criarDescricao, setCriarDescricao] = useState('')
  const [criando, setCriando] = useState(false)

  // Entrar em clube
  const [entrandoId, setEntrandoId] = useState<string | null>(null)
  const [codigoInput, setCodigoInput] = useState('')
  const [showCodigoInput, setShowCodigoInput] = useState<string | null>(null)

  // Copiar código
  const [copiadoId, setCopiadoId] = useState<string | null>(null)

  async function carregar() {
    try {
      const [clubes, perfil] = await Promise.all([
        api.getClubes(),
        api.getPerfilAluno().catch(() => null),
      ])
      setMeus(clubes.meus)
      setDisponiveis(clubes.disponiveis)
      if (perfil?.academia) {
        setAcademiaNome(perfil.academia.nome)
      }
    } catch { /* ok */ }
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function handleCriar() {
    if (!criarNome.trim() || criando) return
    setCriando(true)
    try {
      await api.criarClube({ nome: criarNome.trim(), descricao: criarDescricao.trim() || undefined })
      setToast('Clube criado com sucesso!')
      setCriarNome('')
      setCriarDescricao('')
      setTab('meus')
      await carregar()
    } catch { setToast('Erro ao criar clube.') }
    setCriando(false)
  }

  async function handleEntrar(clubeId: string, codigo?: string) {
    setEntrandoId(clubeId)
    try {
      await api.entrarClube(clubeId, codigo)
      setToast('Entrou no clube com sucesso!')
      setShowCodigoInput(null)
      setCodigoInput('')
      await carregar()
    } catch { setToast('Erro ao entrar no clube.') }
    setEntrandoId(null)
  }

  async function handleSair(clubeId: string) {
    try {
      await api.sairClube(clubeId)
      setToast('Saiu do clube.')
      await carregar()
    } catch { setToast('Erro ao sair do clube.') }
  }

  async function handleCopiarCodigo(codigo: string, clubeId: string) {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiadoId(clubeId)
      setTimeout(() => setCopiadoId(null), 2000)
    } catch {
      setToast('Erro ao copiar código.')
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-xl mx-auto w-full">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-5">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center gap-3">
        <TrophyIcon className="h-6 w-6 text-accent" />
        <h1 className="text-lg font-bold text-text">Clubes</h1>
      </div>

      {/* Clube da Academia (se houver) */}
      {academiaNome && (
        <div className="rounded-2xl gradient-card border border-surface-input p-4 flex items-center gap-3">
          <Building2Icon className="h-8 w-8 text-accent shrink-0" />
          <div>
            <p className="text-sm font-bold text-text">{academiaNome}</p>
            <p className="text-xs text-text-muted">Clube da academia</p>
          </div>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 rounded-2xl bg-surface-input p-1">
        {([
          { key: 'meus' as Tab, label: `Meus (${meus.length})` },
          { key: 'descobrir' as Tab, label: `Descobrir (${disponiveis.length})` },
          { key: 'criar' as Tab, label: 'Criar' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
              tab === t.key
                ? 'bg-surface-card text-text shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das Abas */}
      {tab === 'meus' && (
        <div className="space-y-3">
          {meus.length === 0 ? (
            <div className="rounded-2xl bg-surface-card border border-surface-input p-8 text-center space-y-3">
              <TrophyIcon className="h-10 w-10 text-text-muted mx-auto opacity-30" />
              <p className="text-sm text-text-muted">Você não participa de nenhum clube ainda.</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setTab('descobrir')}
                  className="rounded-xl bg-surface-input px-4 py-2 text-xs font-bold text-text hover:bg-surface-input/70 transition-all cursor-pointer"
                >
                  Descobrir Clubes
                </button>
                <button
                  onClick={() => setTab('criar')}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:brightness-110 transition-all cursor-pointer"
                >
                  Criar Clube
                </button>
              </div>
            </div>
          ) : (
            meus.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl bg-surface-card border border-surface-input p-4 space-y-3 hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-text">{c.nome}</h3>
                      {c.role === 'CRIADOR' && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/20">
                          Criador
                        </span>
                      )}
                    </div>
                    {c.descricao && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{c.descricao}</p>
                    )}
                    <p className="text-xs text-text-muted mt-1.5">
                      <UsersIcon className="h-3 w-3 inline mr-1" />
                      {c.total_membros} membro{(c.total_membros || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Código de convite (só criador vê) */}
                {c.role === 'CRIADOR' && c.codigo_convite && (
                  <div className="flex items-center gap-2 rounded-xl bg-surface p-2.5 border border-surface-input">
                    <span className="text-xs text-text-muted">Convite:</span>
                    <code className="flex-1 text-sm font-bold text-primary tracking-widest">{c.codigo_convite}</code>
                    <button
                      onClick={() => handleCopiarCodigo(c.codigo_convite!, c.id)}
                      className="rounded-lg p-1.5 hover:bg-surface-input transition-all cursor-pointer"
                      title="Copiar código"
                    >
                      {copiadoId === c.id ? (
                        <CheckIcon className="h-4 w-4 text-success" />
                      ) : (
                        <LinkIcon className="h-4 w-4 text-text-muted" />
                      )}
                    </button>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => navigate(`/clubes/${c.id}`)}
                    className="flex-1 rounded-xl border border-surface-input bg-surface py-2 text-xs font-bold text-text hover:bg-surface-input/50 transition-all cursor-pointer"
                  >
                    Ver Clube
                  </button>
                  {c.role !== 'CRIADOR' && (
                    <button
                      onClick={() => handleSair(c.id)}
                      className="rounded-xl border border-destructive/20 py-2 px-3 text-xs font-bold text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                    >
                      <LogOutIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'descobrir' && (
        <div className="space-y-3">
          {disponiveis.length === 0 ? (
            <div className="rounded-2xl bg-surface-card border border-surface-input p-8 text-center space-y-3">
              <GridIcon className="h-10 w-10 text-text-muted mx-auto opacity-30" />
              <p className="text-sm text-text-muted">Nenhum clube disponível no momento.</p>
              <button
                onClick={() => setTab('criar')}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:brightness-110 transition-all cursor-pointer"
              >
                Criar o Primeiro
              </button>
            </div>
          ) : (
            disponiveis.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl bg-surface-card border border-surface-input p-4 space-y-3 hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-text">{c.nome}</h3>
                    {c.descricao && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{c.descricao}</p>
                    )}
                    <p className="text-xs text-text-muted mt-1.5">
                      <UsersIcon className="h-3 w-3 inline mr-1" />
                      {c.total_membros} membro{(c.total_membros || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {showCodigoInput === c.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codigoInput}
                      onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                      placeholder="Código de convite"
                      maxLength={6}
                      className="flex-1 rounded-xl border border-surface-input bg-surface-input px-3 py-2 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none uppercase tracking-widest"
                    />
                    <button
                      onClick={() => {
                        if (codigoInput) handleEntrar(c.id, codigoInput)
                      }}
                      disabled={!codigoInput || entrandoId === c.id}
                      className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      {entrandoId === c.id ? '...' : 'Entrar'}
                    </button>
                    <button
                      onClick={() => { setShowCodigoInput(null); setCodigoInput('') }}
                      className="rounded-xl p-2 text-text-muted hover:text-text cursor-pointer"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEntrar(c.id)}
                    disabled={entrandoId === c.id}
                    className="w-full rounded-xl gradient-primary py-2.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    {entrandoId === c.id ? 'Entrando...' : 'Entrar no Clube'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'criar' && (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text uppercase tracking-wider">Nome do Clube</label>
            <input
              type="text"
              value={criarNome}
              onChange={(e) => setCriarNome(e.target.value)}
              placeholder="Ex: Marombeiros do CrossFit"
              maxLength={50}
              className="w-full rounded-xl border border-surface-input bg-surface-input px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text uppercase tracking-wider">Descrição (opcional)</label>
            <textarea
              value={criarDescricao}
              onChange={(e) => setCriarDescricao(e.target.value)}
              placeholder="Descreva o propósito do clube..."
              maxLength={200}
              rows={3}
              className="w-full rounded-xl border border-surface-input bg-surface-input px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none resize-none"
            />
            <p className="text-xs text-text-disabled text-right">{criarDescricao.length}/200</p>
          </div>

          <div className="rounded-xl bg-surface p-3 border border-surface-input space-y-1">
            <p className="text-xs font-semibold text-text flex items-center gap-1">
              <CheckIcon className="h-3.5 w-3.5 text-success" />
              Clube público (entrada livre)
            </p>
            <p className="text-xs text-text-muted">
              Após criar, um código de convite único será gerado para compartilhar com amigos.
            </p>
          </div>

          <button
            onClick={handleCriar}
            disabled={!criarNome.trim() || criando}
            className="w-full rounded-xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
          >
            {criando ? 'Criando...' : 'Criar Clube'}
          </button>
        </div>
      )}
    </div>
  )
}
