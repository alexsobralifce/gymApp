import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import { resolveMediaUrl } from '../../lib/media'
import type { PromocaoVitrine } from '../../types/api'
import { vitrineJaVista, marcarVitrineVista } from './vitrineSessao'

import { useT } from '../../i18n'
/** Modal com as promoções da academia do aluno, exibido uma vez por sessão ao abrir o app. */
export default function VitrinePromocoes() {
  const { t } = useT()
  const role = useAuthStore((s) => s.user?.role)
  const [promocoes, setPromocoes] = useState<PromocaoVitrine[]>([])
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    if (role !== 'ALUNO' || vitrineJaVista()) return
    let ativo = true
    api.getPromocoesAtivas()
      .then((lista) => {
        if (ativo && lista.length > 0) setPromocoes(lista)
      })
      .catch(() => {})
    return () => { ativo = false }
  }, [role])

  const atual = promocoes[indice]

  useEffect(() => {
    if (atual) api.registrarEventoPromocao(atual.id, 'VISUALIZACAO').catch(() => {})
  }, [atual?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function fechar() {
    marcarVitrineVista()
    setPromocoes([])
  }

  if (!atual) return null
  const img = resolveMediaUrl(atual.imagem_url)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={t('Promoções da sua academia')}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-surface-card border border-surface-input shadow-xl">
        {img && <img src={img} alt="" className="max-h-64 w-full object-cover" />}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">{t('Novidades da sua academia')}</span>
            {promocoes.length > 1 && <span className="text-xs text-text-muted">{indice + 1}/{promocoes.length}</span>}
          </div>
          <h2 className="text-lg font-bold text-text">{t(atual.titulo)}</h2>
          {atual.preco_texto && <p className="text-sm font-semibold text-success">{atual.preco_texto}</p>}
          {atual.descricao && <p className="text-sm text-text-muted">{t(atual.descricao)}</p>}

          <div className="flex flex-col gap-2 pt-1">
            {atual.cta_url && (
              <a
                href={atual.cta_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => api.registrarEventoPromocao(atual.id, 'CLIQUE').catch(() => {})}
                className="rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
              >
                {atual.cta_label || t('Saiba mais')}
              </a>
            )}
            {indice < promocoes.length - 1 ? (
              <button onClick={() => setIndice(indice + 1)} className="rounded-xl px-4 py-2 text-sm text-text-muted cursor-pointer">{t('Próxima')}</button>
            ) : (
              <button onClick={fechar} className="rounded-xl px-4 py-2 text-sm text-text-muted cursor-pointer">{t('Fechar')}</button>
            )}
          </div>
          {indice < promocoes.length - 1 && (
            <button onClick={fechar} className="w-full text-xs text-text-muted cursor-pointer">{t('Pular tudo')}</button>
          )}
        </div>
      </div>
    </div>
  )
}
