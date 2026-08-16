import { useEffect, useState, useMemo } from 'react'
import { api } from '../../api/client'
import {
  Sparkles,
  RefreshCw,
  ExternalLink,
  Search,
  Calendar,
  Newspaper,
  Dumbbell,
  Heart,
  Flame,
  Activity,
  Apple,
} from 'lucide-react'

interface NoticiaItem {
  id: string
  titulo: string
  resumo: string
  url: string
  fonte?: string
  imagem_url?: string | null
  criado_em: string
  data_publicacao?: string | null
}

const CATEGORIES = [
  { id: 'TODOS', label: 'Todos', icon: Sparkles },
  { id: 'MUSCULACAO', label: 'Musculação & Força', icon: Dumbbell },
  { id: 'CARDIO', label: 'Cardio & Corrida', icon: Flame },
  { id: 'SAUDE', label: 'Saúde & Longevidade', icon: Heart },
  { id: 'MENTE', label: 'Bem-Estar & Mente', icon: Activity },
  { id: 'NUTRICAO', label: 'Nutrição & Dieta', icon: Apple },
]

function getCategoryForNews(titulo: string, resumo: string): string {
  const text = `${titulo} ${resumo}`.toLowerCase()
  if (/muscul|hipertrofia|peso|força|supino|agachamento|bíceps|tríceps|halter|crossfit/.test(text)) {
    return 'MUSCULACAO'
  }
  if (/corrida|cardio|caminhada|aerób|maratona|pedalar|ciclismo|esteira/.test(text)) {
    return 'CARDIO'
  }
  if (/alimentação|nutrição|proteína|creatina|dieta|suplement|comida|calorias/.test(text)) {
    return 'NUTRICAO'
  }
  if (/mente|cérebro|ansiedade|depressão|sono|estresse|endorfina|humor|psicol/.test(text)) {
    return 'MENTE'
  }
  return 'SAUDE'
}

function getCategoryLabel(catId: string): string {
  const found = CATEGORIES.find((c) => c.id === catId)
  return found ? found.label : 'Saúde'
}

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'Recentemente'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Recentemente'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 5) return 'Agora mesmo'
  if (diffMinutes < 60) return `Há ${diffMinutes} min`
  if (diffHours < 24) return `Há ${diffHours} h`
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `Há ${diffDays} dias`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function Noticias() {
  const [noticias, setNoticias] = useState<NoticiaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('TODOS')
  const [message, setMessage] = useState<string | null>(null)

  async function loadNoticias() {
    try {
      setLoading(true)
      const data = await api.getNoticias(60, 0)
      if (Array.isArray(data)) {
        setNoticias(data)
      }
    } catch (err) {
      console.warn('Erro ao carregar notícias:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNoticias()
  }, [])

  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    setMessage(null)
    try {
      await api.refreshNoticias()
      await loadNoticias()
      setMessage('Notícias atualizadas com sucesso!')
      setTimeout(() => setMessage(null), 4000)
    } catch (err) {
      console.warn('Erro ao atualizar notícias:', err)
      setMessage('Atualização concluída.')
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setRefreshing(false)
    }
  }

  const filteredNoticias = useMemo(() => {
    return noticias.filter((item) => {
      const matchesSearch =
        search.trim() === '' ||
        item.titulo.toLowerCase().includes(search.toLowerCase()) ||
        item.resumo.toLowerCase().includes(search.toLowerCase()) ||
        (item.fonte && item.fonte.toLowerCase().includes(search.toLowerCase()))

      if (!matchesSearch) return false

      if (selectedCategory === 'TODOS') return true
      const cat = getCategoryForNews(item.titulo, item.resumo)
      return cat === selectedCategory
    })
  }, [noticias, search, selectedCategory])

  const featured = filteredNoticias.length > 0 ? filteredNoticias[0] : null
  const restArticles = filteredNoticias.length > 1 ? filteredNoticias.slice(1) : []

  return (
    <div className="flex h-full flex-col p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in pb-24 md:pb-12 max-w-7xl mx-auto w-full">
      {/* Header com Título e Ação de Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-input pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Newspaper className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-text">Notícias & Saúde</h1>
          </div>
          <p className="text-sm text-text-muted mt-1">
            As últimas descobertas científicas sobre musculação, saúde metabólica, endorfina e longevidade.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 px-4 py-2.5 text-xs font-semibold text-primary transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Buscando novidades...' : 'Atualizar Notícias'}
        </button>
      </div>

      {message && (
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-xs font-medium text-primary animate-slide-up flex items-center justify-between">
          <span>{message}</span>
          <span className="text-[10px] opacity-75">Sincronizado via Google News</span>
        </div>
      )}

      {/* Barra de Busca e Filtro de Categorias */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Pesquisar por tema, músculo, saúde, alimentação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-input bg-surface-card text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Categorias Pills com Scroll Horizontal */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]'
                    : 'bg-surface-card border border-surface-input text-text-muted hover:text-text hover:border-surface-input/80'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Skeletons durante o carregamento inicial */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-72 w-full rounded-2xl bg-surface-card border border-surface-input animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-surface-card border border-surface-input animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : filteredNoticias.length === 0 ? (
        /* Estado Vazio */
        <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-card border border-surface-input rounded-2xl space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl">
            📰
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-text">Nenhuma notícia encontrada</h3>
            <p className="text-xs text-text-muted">
              {search
                ? `Nenhum artigo corresponde à busca "${search}". Tente outros termos.`
                : 'Clique no botão abaixo para buscar as notícias mais recentes diretamente dos principais canais de saúde.'}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            Buscar Notícias Agora
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Artigo em Destaque (Hero Card) */}
          {featured && selectedCategory === 'TODOS' && !search && (
            <a
              href={featured.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block relative overflow-hidden rounded-2xl border border-surface-input bg-surface-card hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-xl"
            >
              <div className="grid md:grid-cols-12 gap-0">
                <div className="md:col-span-6 lg:col-span-7 h-56 md:h-80 overflow-hidden relative">
                  <img
                    src={
                      featured.imagem_url ||
                      'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80'
                    }
                    alt={featured.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent md:hidden" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider shadow-sm">
                      Destaque
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-background/80 backdrop-blur-md text-text text-[10px] font-semibold">
                      {getCategoryLabel(getCategoryForNews(featured.titulo, featured.resumo))}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-6 lg:col-span-5 p-5 md:p-6 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span className="font-semibold text-primary">{featured.fonte || 'Google News'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatRelativeTime(featured.data_publicacao || featured.criado_em)}
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-text group-hover:text-primary transition-colors line-clamp-3 leading-snug">
                      {featured.titulo}
                    </h2>

                    <p className="text-xs sm:text-sm text-text-muted line-clamp-3 leading-relaxed">
                      {featured.resumo}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center text-xs font-bold text-primary group-hover:underline gap-1">
                    Ler matéria completa
                    <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
                  </div>
                </div>
              </div>
            </a>
          )}

          {/* Grade de Cards das Notícias */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(selectedCategory !== 'TODOS' || search ? filteredNoticias : restArticles).map((n) => {
              const categoryTag = getCategoryLabel(getCategoryForNews(n.titulo, n.resumo))
              return (
                <a
                  key={n.id}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col justify-between rounded-2xl border border-surface-input bg-surface-card hover:border-primary/40 hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div>
                    {/* Imagem do Card */}
                    <div className="h-44 w-full overflow-hidden relative bg-surface-input/30">
                      <img
                        src={
                          n.imagem_url ||
                          'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80'
                        }
                        alt={n.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-md text-text text-[10px] font-medium border border-surface-input">
                          {categoryTag}
                        </span>
                      </div>
                    </div>

                    {/* Conteúdo textual */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-text-muted">
                        <span className="font-semibold text-primary truncate max-w-[150px]">
                          {n.fonte || 'Google News'}
                        </span>
                        <span>{formatRelativeTime(n.data_publicacao || n.criado_em)}</span>
                      </div>

                      <h3 className="text-sm font-bold text-text group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {n.titulo}
                      </h3>

                      <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                        {n.resumo}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-1 flex items-center justify-between text-xs font-semibold text-primary">
                    <span className="group-hover:underline">Abrir notícia</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
