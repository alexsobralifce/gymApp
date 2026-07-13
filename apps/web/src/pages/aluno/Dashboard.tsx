import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import type { Treino, PerfilAluno, Notificacao } from '../../types/api'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function calcularIMC(pesoKg: number | null | undefined, alturaCm: number | null | undefined): number | null {
  if (!pesoKg || !alturaCm || alturaCm <= 0) return null
  return parseFloat((pesoKg / ((alturaCm / 100) ** 2)).toFixed(1))
}

function classificarIMC(imc: number): { label: string; cor: string } {
  if (imc < 18.5) return { label: 'Abaixo do peso', cor: 'text-yellow-400' }
  if (imc < 25) return { label: 'Peso normal', cor: 'text-green-400' }
  if (imc < 30) return { label: 'Sobrepeso', cor: 'text-yellow-400' }
  if (imc < 35) return { label: 'Obesidade grau I', cor: 'text-orange-400' }
  if (imc < 40) return { label: 'Obesidade grau II', cor: 'text-red-400' }
  return { label: 'Obesidade grau III', cor: 'text-red-400' }
}

function calcularIdade(dataNascimento: string | null | undefined): number | null {
  if (!dataNascimento) return null
  const nasc = new Date(dataNascimento)
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const mes = hoje.getMonth() - nasc.getMonth()
  if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export default function AlunoDashboard() {
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [perfil, setPerfil] = useState<PerfilAluno | null>(null)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalNotificacao, setModalNotificacao] = useState<Notificacao | null>(null)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  async function carregarDados() {
    try {
      const [tData, pData, nData] = await Promise.all([
        api.getAlunoTreinos(),
        api.getPerfilAluno(),
        api.getNotificacoes().catch(() => [] as Notificacao[]),
      ])
      setTreinos(tData.sort((a, b) => a.nome.localeCompare(b.nome)))
      setPerfil(pData)
      setNotificacoes(nData)
      if (nData.length > 0) {
        setModalNotificacao(nData[0])
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    carregarDados().finally(() => setLoading(false))
  }, [])

  async function handleResponder(treinoId: string, acao: 'ACEITAR' | 'RECUSAR') {
    try {
      await api.responderTreino(treinoId, acao)
      setFeedback(acao === 'ACEITAR' ? 'Treino aceito com sucesso! Bons treinos!' : 'Treino recusado.')
      await carregarDados()
      setTimeout(() => setFeedback(null), 3000)
    } catch {
      setFeedback('Erro ao responder ao treino.')
    }
  }

  async function handleFecharNotificacao() {
    await api.visualizarNotificacoes().catch(() => {})
    setModalNotificacao(null)
    if (notificacoes.length > 1) {
      setModalNotificacao(notificacoes[1])
    }
  }

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  const pendentes = treinos.filter((t) => t.status === 'ENVIADO')
  const disponiveis = treinos.filter(
    (t) => t.status === 'ACEITO' || t.status === 'EM_ABERTO'
  )

  const imc = calcularIMC(perfil?.peso_kg, perfil?.altura_cm)
  const classificacao = imc ? classificarIMC(imc) : null
  const idade = calcularIdade(perfil?.data_nascimento)

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-6">
      {/* Modal de Notificação */}
      {modalNotificacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={handleFecharNotificacao} />
          <div className="relative z-10 mx-4 w-full max-w-sm rounded-2xl bg-surface-card p-6 shadow-2xl border border-surface-input animate-modal-pop">
            <div className="text-center">
              <span className="text-4xl">{modalNotificacao.tipo === 'NOVO_TREINO' ? '🏋️' : '👨‍🏫'}</span>
              <h3 className="mt-3 text-lg font-bold text-text">
                {modalNotificacao.tipo === 'NOVO_TREINO' ? 'Nova Ficha de Treino!' : 'Professor Atribuído!'}
              </h3>
              <p className="mt-2 text-sm text-text-muted">{modalNotificacao.mensagem}</p>
            </div>
            <div className="mt-5 flex gap-2">
              {modalNotificacao.tipo === 'NOVO_TREINO' && (
                <button
                  onClick={() => { handleFecharNotificacao(); navigate('/meus-treinos') }}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:brightness-110 transition-all cursor-pointer"
                >
                  Ver Treinos
                </button>
              )}
              <button
                onClick={handleFecharNotificacao}
                className="flex-1 rounded-xl border border-surface-input bg-surface py-2.5 text-sm font-medium text-text-muted hover:text-text transition-all cursor-pointer"
              >
                {modalNotificacao.tipo === 'NOVO_TREINO' ? 'Depois' : 'OK, entendi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card do Perfil */}
      {user && (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm">
          <h2 className="text-xl font-bold text-text">Olá, {user.nome}</h2>
          <div className="mt-1 space-y-0.5 text-xs text-text-muted">
            {perfil?.academia && <p>Academia: <span className="font-semibold text-text">{perfil.academia.nome}</span></p>}
            {idade && <p>Idade: <span className="font-semibold text-text">{idade} anos</span></p>}
            {perfil?.professor ? (
              <>
                <p>Professor: <span className="font-semibold text-text">{perfil.professor.usuario.nome}</span></p>
                <p>Email: <span className="text-text">{perfil.professor.usuario.email}</span></p>
                {perfil.professor.usuario.telefone && (
                  <p>
                    WhatsApp:{' '}
                    <a
                      href={`https://wa.me/${perfil.professor.usuario.telefone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 font-semibold hover:underline"
                    >
                      {perfil.professor.usuario.telefone}
                    </a>
                  </p>
                )}
              </>
            ) : (
              <p>Modo: <span className="font-semibold text-text">Autogestão</span></p>
            )}
          </div>

          {/* IMC */}
          {imc !== null && (
            <div className="mt-3 pt-3 border-t border-surface-input">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-muted">Seu IMC</p>
                  <p className="text-2xl font-bold text-text">{imc}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${classificacao?.cor}`}>{classificacao?.label}</p>
                  <p className="text-[10px] text-text-muted">
                    {perfil?.peso_kg}kg / {perfil?.altura_cm}cm
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {feedback && (
        <div className={`rounded-xl p-3 text-sm text-center font-medium ${
          feedback.includes('Erro') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-success/10 text-success border border-success/20'
        }`}>
          {feedback}
        </div>
      )}

      {/* Novos Treinos Recebidos (Pendentes) */}
      {pendentes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-primary uppercase tracking-wider">Fichas de Treino Recebidas ({pendentes.length})</h2>
          <div className="space-y-3">
            {pendentes.map((t) => (
              <div key={t.id} className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 shadow-sm space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-text">{t.nome}</h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.dias_semana.map((d) => (
                      <span key={d} className="rounded bg-surface-input px-1.5 py-0.5 text-xs font-semibold text-text-muted">
                        {DIAS[d]}
                      </span>
                    ))}
                  </div>
                </div>

                {t.exercicios && t.exercicios.length > 0 && (
                  <div className="rounded-xl bg-surface/50 p-3">
                    <p className="text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">Exercícios ({t.exercicios.length})</p>
                    <p className="text-sm text-text leading-relaxed truncate">
                      {t.exercicios.map((ex) => ex.exercicio.nome).join(', ')}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleResponder(t.id, 'RECUSAR')}
                    className="flex-1 rounded-xl border border-red-500/30 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
                  >
                    Recusar
                  </button>
                  <button
                    onClick={() => handleResponder(t.id, 'ACEITAR')}
                    className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-500 active:scale-95 transition-all"
                  >
                    Aceitar Ficha
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Treinos Ativos */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-text uppercase tracking-wider">Meus Treinos Ativos</h2>

        {disponiveis.length === 0 ? (
          <p className="text-sm text-text-muted bg-surface-card rounded-2xl p-4 border border-surface-input text-center">
            Nenhum treino disponível hoje. Aguarde o envio das fichas pelo professor ou crie no modo autogestão.
          </p>
        ) : (
          <div className="grid gap-3">
            {disponiveis.map((t) => (
              <div key={t.id} className="rounded-2xl border border-surface-input bg-surface-card p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-text">{t.nome}</h3>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {t.dias_semana.map((d) => (
                        <span key={d} className="rounded bg-surface-input px-1.5 py-0.5 text-xs font-semibold text-text-muted">
                          {DIAS[d]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="rounded-full bg-success/15 border border-success/30 px-2.5 py-0.5 text-xs font-bold text-success capitalize">
                    {t.status === 'EM_ABERTO' ? 'Em aberto' : 'Aceito'}
                  </span>
                </div>

                {t.exercicios && t.exercicios.length > 0 && (
                  <p className="mt-3 text-xs text-text-muted line-clamp-1">
                    {t.exercicios.map((ex) => ex.exercicio.nome).join(' · ')}
                  </p>
                )}

                <button
                  onClick={() => navigate(`/treino/${t.id}/inicio`)}
                  className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all"
                >
                  Iniciar Treino
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seção de Ciência & Bem-estar */}
      <div className="rounded-2xl bg-surface-card border border-surface-input p-5 shadow-sm">
        <h2 className="text-base font-bold text-text uppercase tracking-wider mb-3">Ciência & Bem-estar</h2>
        <div className="space-y-3">
          <div className="rounded-xl bg-surface p-3 border border-surface-input">
            <p className="text-sm font-medium text-text">💡 Por que o aquecimento é essencial?</p>
            <p className="text-xs text-text-muted mt-1">
              Estudos mostram que 5-10 minutos de aquecimento reduzem o risco de lesões em até 40% e melhoram o desempenho nas primeiras séries.
            </p>
          </div>
          <div className="rounded-xl bg-surface p-3 border border-surface-input">
            <p className="text-sm font-medium text-text">📊 Consistência &gt; Intensidade</p>
            <p className="text-xs text-text-muted mt-1">
              Pesquisas longitudinais mostram que a frequência semanal de treino é o maior preditor de ganhos de força, acima da carga absoluta.
            </p>
          </div>
          <div className="rounded-xl bg-surface p-3 border border-surface-input">
            <p className="text-sm font-medium text-text">🥗 Proteína pós-treino</p>
            <p className="text-xs text-text-muted mt-1">
              A janela anabólica de 30-60 minutos após o treino é o momento ideal para consumir proteína, maximizando a síntese muscular em até 50%.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
