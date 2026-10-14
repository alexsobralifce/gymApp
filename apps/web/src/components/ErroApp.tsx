import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { ehErroDeChunk, recarregarUmaVez } from '../lib/recarregarAposDeploy'

/** Tela de erro do roteador: recarrega sozinha quando a causa é versão nova publicada; senão oferece recarregar. */
export default function ErroApp() {
  const erro = useRouteError()
  const chunk = ehErroDeChunk(erro)

  useEffect(() => {
    if (chunk) recarregarUmaVez()
  }, [chunk])

  return (
    <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <h1 className="text-2xl font-black">{chunk ? 'Nova versão disponível' : 'Algo deu errado'}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {chunk
          ? 'O ENDORFINAPP foi atualizado. Recarregue a página para continuar.'
          : 'Não foi possível carregar esta tela. Recarregue a página e tente de novo.'}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="min-h-11 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground cursor-pointer"
      >
        Recarregar
      </button>
    </div>
  )
}
