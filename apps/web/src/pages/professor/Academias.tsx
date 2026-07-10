import { useEffect, useState } from 'react'
import { api, ApiError } from '../../api/client'
import type { Academia, Vinculo } from '../../types/api'

const STATUS_BADGE: Record<string, string> = {
  PENDENTE_ACADEMIA: 'Aguardando Academia',
  PENDENTE_ROOT: 'Aguardando Root',
  ATIVO: 'Ativo',
  REJEITADO: 'Rejeitado',
  REMOVIDO: 'Removido',
}

export default function ProfessorAcademias() {
  const [academias, setAcademias] = useState<Academia[]>([])
  const [vinculos, setVinculos] = useState<Vinculo[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [perfilOk, setPerfilOk] = useState(true)

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
        const vinculo = getVinculo(academiaId)
        setFeedback(`Já vinculado. Status: ${STATUS_BADGE[vinculo?.status ?? ''] ?? vinculo?.status}`)
      } else {
        setFeedback('Solicitação enviada! Aguardando aprovação da academia e do Root.')
        const fresh = await api.getVinculos()
        setVinculos(fresh)
      }
      setTimeout(() => setFeedback(null), 5000)
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Erro ao solicitar vínculo.')
      setTimeout(() => setFeedback(null), 5000)
    }
  }

  async function desvincular(academiaId: string) {
    try {
      await api.desvincularAcademia(academiaId)
      setVinculos((prev) => prev.filter((v) => v.academia_id !== academiaId))
      setFeedback('Desvinculado com sucesso.')
      setTimeout(() => setFeedback(null), 3000)
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Erro ao desvincular.')
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Academias</h1>

      {!perfilOk && (
        <div className="mb-4 rounded border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-400">
          Perfil de professor não encontrado. Tente recarregar a página.
        </div>
      )}

      {feedback && (
        <div className={`mb-4 rounded p-3 text-sm ${feedback.includes('Erro') ? 'bg-red-500/10 text-red-400' : feedback.includes('Desvinculado') ? 'bg-surface-card text-text-muted' : 'bg-surface-card text-success'}`}>
          {feedback}
        </div>
      )}

      {academias.length === 0 && <p className="text-text-muted">Nenhuma academia disponível.</p>}

      <div className="space-y-3">
        {academias.map((a) => {
          const vinculo = getVinculo(a.id)
          const isLinked = vinculo !== undefined

          return (
            <div key={a.id} className="flex items-center justify-between rounded-lg bg-surface-card p-4">
              <div>
                <h3 className="font-semibold text-text">{a.nome}</h3>
                <p className="text-xs text-text-muted">CNPJ: {a.cnpj}</p>
                {isLinked && (
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
                    vinculo.status === 'ATIVO' ? 'bg-green-500/10 text-green-400' :
                    vinculo.status === 'REJEITADO' || vinculo.status === 'REMOVIDO' ? 'bg-red-500/10 text-red-400' :
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
                    className="rounded bg-success px-3 py-1 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Vincular
                  </button>
                ) : (
                  <button
                    onClick={() => desvincular(a.id)}
                    className="rounded bg-primary px-3 py-1 text-sm font-medium text-white"
                  >
                    Vinculado
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
