import { useEffect, useState, useTransition } from 'react'
import {
  preloadWorkoutGifs,
  extractWorkoutGifUrls,
  type PreloadProgress,
} from '../../lib/offlineGifPreloader'
import { CheckIcon } from '../icons/Icon'

interface OfflinePreloadBadgeProps {
  exercicios?: Array<{ exercicio?: { gif_url?: string | null; imagem_url?: string | null } }>
  gifUrls?: string[]
  className?: string
}

export function OfflinePreloadBadge({ exercicios, gifUrls, className = '' }: OfflinePreloadBadgeProps) {
  const [, startTransition] = useTransition()
  const [progress, setProgress] = useState<PreloadProgress | null>(null)

  const urls = gifUrls || (exercicios ? extractWorkoutGifUrls(exercicios) : [])

  const urlsJoined = urls.join(',')

  const startPreload = () => {
    if (urls.length === 0) return
    preloadWorkoutGifs(urls, (p) => {
      startTransition(() => {
        setProgress(p)
      })
    })
  }

  useEffect(() => {
    startPreload()
  }, [urlsJoined])

  if (!urls || urls.length === 0 || !progress) {
    return null
  }

  if (progress.status === 'downloading') {
    return (
      <div className={`inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary animate-pulse ${className}`}>
        <span className="text-sm">⚡</span>
        <span>
          Baixando GIFs para a academia... ({progress.cached + progress.failed}/{progress.total})
        </span>
      </div>
    )
  }

  if (progress.status === 'completed' || progress.isComplete) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-xl bg-success/10 border border-success/20 px-3 py-1.5 text-xs font-bold text-success ${className}`}>
        <CheckIcon className="h-3.5 w-3.5 text-success" />
        <span>⚡ {progress.cached}/{progress.total} GIFs prontos para uso offline na academia</span>
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-xl bg-warning/10 border border-warning/20 px-3 py-1.5 text-xs font-bold text-warning ${className}`}>
      <span>⚡ Erro ao baixar GIFs.</span>
      <button
        type="button"
        onClick={startPreload}
        className="underline font-extrabold cursor-pointer hover:text-text"
      >
        Tentar novamente
      </button>
    </div>
  )
}
