import { useSearchParams } from 'react-router-dom'

export default function AlunoEstudo() {
  const [params] = useSearchParams()
  const url = params.get('url')

  if (!url) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <p className="text-text-muted">Nenhum estudo para exibir.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <iframe src={url} className="flex-1 border-0" title="Estudo científico" />
    </div>
  )
}
