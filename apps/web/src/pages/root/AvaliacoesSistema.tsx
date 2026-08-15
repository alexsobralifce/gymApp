import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { StarIcon } from '../../components/icons/Icon'

interface AvaliacaoSistemaItem {
  id: string
  nota: number
  respostas: Record<string, number>
  mensagem: string | null
  criado_em: string
  aluno: { nome: string; email: string }
}

const PERGUNTAS = [
  { key: 'criar_treino', label: 'Criar treino' },
  { key: 'navegacao', label: 'Navegação' },
  { key: 'execucao', label: 'Execução' },
  { key: 'recomendacao', label: 'Recomendação' },
]

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Nota ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          width={size}
          height={size}
          fill={n <= value ? 'currentColor' : 'none'}
          className={n <= value ? 'text-warning' : 'text-text-disabled'}
        />
      ))}
    </div>
  )
}

function mediaDe(valores: number[]): string | null {
  const validos = valores.filter((v) => v > 0)
  if (validos.length === 0) return null
  return (validos.reduce((a, b) => a + b, 0) / validos.length).toFixed(1)
}

export default function RootAvaliacoesSistema() {
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoSistemaItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .listarAvaliacoesSistema()
      .then((res) => setAvaliacoes(res.avaliacoes))
      .catch(() => setAvaliacoes([]))
      .finally(() => setLoading(false))
  }, [])

  const mediaGeral = avaliacoes && avaliacoes.length > 0
    ? (avaliacoes.reduce((a, b) => a + b.nota, 0) / avaliacoes.length).toFixed(1)
    : null

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  if (!avaliacoes || avaliacoes.length === 0) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <h1 className="mb-6 text-xl font-bold text-text">Avaliações do App</h1>
        <p className="py-8 text-center text-text-muted">Nenhuma avaliação ainda.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="mb-6 text-xl font-bold text-text">Avaliações do App</h1>

      {/* Resumo */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-lg bg-surface-card p-4">
          <div className="text-2xl font-bold text-primary">{avaliacoes.length}</div>
          <div className="text-xs text-text-muted">Total de avaliações</div>
        </div>
        <div className="rounded-lg bg-surface-card p-4">
          <div className="text-2xl font-bold text-warning">{mediaGeral ?? '—'}</div>
          <div className="text-xs text-text-muted">Média geral</div>
        </div>
        {PERGUNTAS.map((p) => (
          <div key={p.key} className="rounded-lg bg-surface-card p-4">
            <div className="text-2xl font-bold text-text">
              {mediaDe(avaliacoes.map((a) => a.respostas?.[p.key] ?? 0)) ?? '—'}
            </div>
            <div className="text-xs text-text-muted">{p.label}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      <h2 className="mb-3 text-sm font-semibold text-text-muted">Avaliações recebidas</h2>
      <div className="space-y-2">
        {avaliacoes.map((a) => (
          <div key={a.id} className="rounded-lg bg-surface-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={a.nota} />
                  <span className="text-sm font-semibold text-text">{a.nota}/5</span>
                </div>
                <p className="mt-1 text-sm text-text">{a.aluno.nome}</p>
                <p className="text-xs text-text-muted">{a.aluno.email}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {new Date(a.criado_em).toLocaleDateString('pt-BR')}{' '}
                  {new Date(a.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PERGUNTAS.map((p) => {
                const v = a.respostas?.[p.key] ?? 0
                return (
                  <div key={p.key} className="rounded-lg bg-surface p-2.5">
                    <div className="text-xs text-text-muted">{p.label}</div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Stars value={v} size={12} />
                      {v > 0 && <span className="text-xs font-semibold text-text">{v}</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            {a.mensagem && (
              <p className="mt-3 rounded-lg bg-surface border border-surface-input p-3 text-sm text-text leading-relaxed">
                {a.mensagem}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
