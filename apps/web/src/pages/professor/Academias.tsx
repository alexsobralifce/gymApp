import { useEffect, useState } from 'react'
import { api, ApiError } from '../../api/client'
import type { Academia, Vinculo } from '../../types/api'
import BarraBusca from '../../components/ui/BarraBusca'
import { filtrarPorTexto } from '../../utils/busca'

import { useT } from '../../i18n'
const STATUS_BADGE: Record<string, string> = {
  PENDENTE_ACADEMIA: 'Aguardando Academia',
  PENDENTE_ROOT: 'Aguardando Root',
  ATIVO: 'Ativo',
  REJEITADO: 'Rejeitado',
  REMOVIDO: 'Removido',
}

export default function ProfessorAcademias() {
  const { t } = useT()
  const [academias, setAcademias] = useState<Academia[]>([])
  const [vinculos, setVinculos] = useState<Vinculo[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [perfilOk, setPerfilOk] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function init() {
      try {
        await api.criarPerfilProfessor()
        setPerfilOk(true)
      } catch {
        setPerfilOk(false)
      }
      const [acads, vincs] = await Promise.all([
        api.getAcademias(),
        api.getVinculos(),
      ])
      setAcademias(acads)
      setVinculos(vincs)
      setLoading(false)
    }
    init()
  }, [])

  function getVinculo(academiaId: string) {
    return vinculos.find((v) => v.academia_id === academiaId)
  }

  async function vincular(academiaId: string) {
    try {
      const result = await api.vincularAcademia(academiaId)
      if (result.jaVinculado) {
        const fresh = await api.getVinculos()
        setVinculos(fresh)
        const vinculo = fresh.find((v) => v.academia_id === academiaId)
        setFeedback(t('Já vinculado. Status: {v1}', { v1: STATUS_BADGE[vinculo?.status ?? ''] ?? vinculo?.status }))
      } else {
        setFeedback(t('Solicitação enviada! Aguardando aprovação da academia e do Root.'))
        const fresh = await api.getVinculos()
        setVinculos(fresh)
      }
      setTimeout(() => setFeedback(null), 5000)
    } catch (err) {
      try {
        const fresh = await api.getVinculos()
        setVinculos(fresh)
        const vinculo = fresh.find((v) => v.academia_id === academiaId)
        if (vinculo) {
          setFeedback(t('Já vinculado. Status: {v1}', { v1: STATUS_BADGE[vinculo.status] ?? vinculo.status }))
        } else {
          setFeedback(err instanceof ApiError ? t(err.message) : t('Erro ao solicitar vínculo.'))
        }
      } catch {
        setFeedback(err instanceof ApiError ? t(err.message) : t('Erro ao solicitar vínculo.'))
      }
      setTimeout(() => setFeedback(null), 5000)
    }
  }

  async function desvincular(academiaId: string) {
    try {
      await api.desvincularAcademia(academiaId)
      setVinculos((prev) => prev.filter((v) => v.academia_id !== academiaId))
      setFeedback(t('Desvinculado com sucesso.'))
      setTimeout(() => setFeedback(null), 3000)
    } catch (err) {
      setFeedback(err instanceof ApiError ? t(err.message) : t('Erro ao desvincular.'))
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  const academiasFiltradas = filtrarPorTexto(academias, search, (a) => [a.nome, a.cnpj])

  if (loading) return <div className="p-4 text-text-muted">{t('Carregando...')}</div>

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">{t('Academias')}</h1>

      {!perfilOk && (
        <div className="mb-4 rounded border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-400">
          {t('Perfil de professor não encontrado. Tente recarregar a página.')}
        </div>
      )}

      {feedback && (
        <div className={`mb-4 rounded p-3 text-sm ${feedback.includes('Erro') ? 'bg-destructive/10 text-destructive' : feedback.includes('Desvinculado') ? 'bg-surface-card text-text-muted' : 'bg-surface-card text-success'}`}>
          {feedback}
        </div>
      )}

      <BarraBusca
        value={search}
        onChange={setSearch}
        placeholder={t('Buscar academia por nome ou CNPJ...')}
        total={academias.length}
        filtrados={academiasFiltradas.length}
      />

      {academias.length === 0 && <p className="text-text-muted">{t('Nenhuma academia disponível.')}</p>}
      {academias.length > 0 && academiasFiltradas.length === 0 && (
        <p className="text-text-muted">{t('Nenhuma academia encontrada.')}</p>
      )}

      <div className="space-y-3">
        {academiasFiltradas.map((a) => {
          const vinculo = getVinculo(a.id)
          const isLinked = vinculo !== undefined

          return (
            <div key={a.id} className="flex items-center justify-between rounded-lg bg-surface-card p-4">
              <div>
                <h3 className="font-semibold text-text">{a.nome}</h3>
                <p className="text-xs text-text-muted">{t('CNPJ:')} {a.cnpj}</p>
                {isLinked && (
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
                    vinculo.status === 'ATIVO' ? 'bg-success/10 text-success' :
                    vinculo.status === 'REJEITADO' || vinculo.status === 'REMOVIDO' ? 'bg-destructive/10 text-destructive' :
                    'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {STATUS_BADGE[vinculo.status] ?? vinculo.status}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {!isLinked || vinculo.status === 'REJEITADO' || vinculo.status === 'REMOVIDO' ? (
                  <button
                    onClick={() => vincular(a.id)}
                    disabled={!perfilOk}
                    className="rounded bg-success px-3 py-1 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-40"
                  >
                    {t('Vincular')}
                  </button>
                ) : (
                  <button
                    onClick={() => desvincular(a.id)}
                    className="rounded bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary-dark"
                  >
                    {t('Vinculado')}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
