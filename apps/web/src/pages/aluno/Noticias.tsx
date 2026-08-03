import { useEffect, useState } from 'react'
import { api } from '../../api/client'

interface NoticiaItem {
  id: string
  titulo: string
  resumo: string
  url: string
  fonte?: string
  criado_em: string
  data_publicacao?: string | null
}

export default function Noticias() {
  const [noticias, setNoticias] = useState<NoticiaItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<NoticiaItem[]>('/noticias').then(setNoticias).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-4 text-text-muted">Carregando notícias...</div>

  return (
    <div className="flex h-full flex-col p-4 md:p-6 lg:p-8 space-y-4 animate-fade-in pb-20 md:pb-8">
      <h1 className="text-xl font-bold text-text">Notícias</h1>
      <p className="text-sm text-text-muted">As últimas sobre exercício, endorfina, bem-estar e felicidade.</p>
      {noticias.length === 0 && <p className="text-sm text-text-muted">Nenhuma notícia disponível ainda. Aguardando atualização do sistema.</p>}
      <div className="space-y-3">
        {noticias.map(n => (
          <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-surface-input bg-surface-card p-4 hover:border-primary/30 transition-colors">
            <h2 className="text-sm font-semibold text-text">{n.titulo}</h2>
            <p className="text-xs text-text-muted mt-1 line-clamp-2">{n.resumo}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-text-muted">{n.fonte || 'Google News'}</span>
              <span className="text-xs text-text-muted">{new Date(n.data_publicacao || n.criado_em).toLocaleDateString('pt-BR')}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
