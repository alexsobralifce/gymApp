import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EndorfinappLogo } from '../../components/branding/EndorfinappLogo'
import {
  Building2Icon,
  ChartLineIcon,
  CheckIcon,
  ChevronLeftIcon,
  ClipboardListIcon,
  MessageCircleIcon,
  RulerIcon,
  TicketIcon,
  TrophyIcon,
} from '../../components/icons/Icon'
import { PlanCard } from './PlanCard'
import {
  ADDONS_POR_SEGMENTO,
  PLANOS_ACADEMIA,
  PLANOS_PERSONAL,
  type SegmentoPublico,
} from './plansData'

const VANTAGENS = [
  {
    Icone: ClipboardListIcon,
    titulo: 'Gestão de alunos e professores',
    texto: 'Fichas em lote, templates reutilizáveis e clonagem de treino para vários alunos.',
  },
  {
    Icone: RulerIcon,
    titulo: 'Avaliação física com laudo',
    texto: 'Triagem, composição corporal, capacidade cardiorrespiratória, força e flexibilidade — com laudo pronto.',
  },
  {
    Icone: ChartLineIcon,
    titulo: 'Evolução e relatórios',
    texto: 'Frequência, volume, maior carga, gráficos de peso e IMC e histórico por aluno.',
  },
  {
    Icone: TrophyIcon,
    titulo: 'Engajamento e retenção',
    texto: 'App instalável, notificações de treino, conquistas, sequência e feed social.',
  },
  {
    Icone: MessageCircleIcon,
    titulo: 'Feita para várias unidades',
    texto: 'Isolamento por academia e por professor, aprovação de vínculos e limites por plano.',
  },
  {
    Icone: TicketIcon,
    titulo: 'Cobrança organizada',
    texto: 'Fatura com nota fiscal, PIX, boleto e cartão — com ajuste automático de faixa.',
  },
]

export default function Planos() {
  const navigate = useNavigate()
  const [segmento, setSegmento] = useState<SegmentoPublico>('PERSONAL')
  const [planoSelecionado, setPlanoSelecionado] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Planos e Preços | ENDORFINAPP'
  }, [])

  const planos = useMemo(
    () => (segmento === 'PERSONAL' ? PLANOS_PERSONAL : PLANOS_ACADEMIA),
    [segmento],
  )
  const addons = ADDONS_POR_SEGMENTO[segmento]

  function handleVoltar() {
    if (window.history.length > 1) window.history.back()
    else navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <EndorfinappLogo variant="horizontal" iconSize={28} size={15} showSlogan={false} />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleVoltar}
              className="flex items-center gap-1 text-sm font-medium text-text-muted hover:text-text cursor-pointer"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Voltar
            </button>
            <Link
              to="/login"
              className="rounded-lg border border-primary/50 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="gradient-hero">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center fade-in">
          <h1 className="text-3xl font-extrabold leading-tight text-text sm:text-4xl">
            Planos que cabem na sua <span className="text-primary">Academia</span> e no seu{' '}
            <span className="text-primary">Personal</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-text-muted sm:text-base">
            Pague por <strong className="text-text">aluno ativo</strong>. Sem surpresa, sem taxa
            escondida. Do personal autônomo à rede de academias.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className="glass rounded-full px-3 py-1.5 font-semibold text-text">
              A partir de R$ 0,60 por aluno ativo/mês
            </span>
            <span className="glass rounded-full px-3 py-1.5 font-semibold text-text">
              15 dias grátis em todos os planos
            </span>
            <span className="glass rounded-full px-3 py-1.5 font-semibold text-text">
              Pagamento seguro via Mercado Pago
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        {/* Segmento */}
        <div
          role="tablist"
          aria-label="Escolha o tipo de conta"
          className="mx-auto -mt-6 mb-8 flex max-w-md rounded-xl border border-border bg-surface-card p-1"
        >
          {(
            [
              { id: 'PERSONAL', label: 'Sou Personal Trainer' },
              { id: 'ACADEMIA', label: 'Sou Academia' },
            ] as Array<{ id: SegmentoPublico; label: string }>
          ).map((opcao) => {
            const ativo = segmento === opcao.id
            return (
              <button
                key={opcao.id}
                role="tab"
                aria-selected={ativo}
                type="button"
                onClick={() => {
                  setSegmento(opcao.id)
                  setPlanoSelecionado(null)
                }}
                className={[
                  'flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors cursor-pointer',
                  ativo ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text',
                ].join(' ')}
              >
                {opcao.label}
              </button>
            )
          })}
        </div>

        {/* Planos */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {planos.map((plano) => (
            <PlanCard key={plano.codigo} plano={plano} onSelecionar={setPlanoSelecionado} />
          ))}
        </div>

        {planoSelecionado && (
          <div className="mt-5 rounded-xl border border-primary/35 bg-primary/10 px-4 py-3 text-sm text-text slide-up">
            <strong className="font-bold">{planoSelecionado}</strong> selecionado. A contratação
            direta pelo app está em preparação — fale com nosso time para começar agora.{' '}
            <Link to="/register" className="font-bold text-primary underline">
              Criar conta
            </Link>
          </div>
        )}

        {/* Add-ons */}
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold text-text">Serviços adicionais</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {addons.map((addon) => (
              <div
                key={addon.item}
                className="flex items-center justify-between rounded-xl border border-border bg-surface-card px-4 py-3"
              >
                <span className="text-sm text-text-muted">{addon.item}</span>
                <span className="text-sm font-bold text-primary">{addon.preco}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Vantagens */}
        <section className="mt-12">
          <h2 className="text-center text-xl font-bold text-text">
            O que a ferramenta entrega
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-text-muted">
            Tudo o que a academia e o personal precisam para prescrever, acompanhar e manter o aluno.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VANTAGENS.map(({ Icone, titulo, texto }) => (
              <div key={titulo} className="rounded-2xl border border-border bg-surface-card p-5">
                <Icone className="mb-3 h-6 w-6 text-primary" />
                <h3 className="mb-1 text-sm font-bold text-text">{titulo}</h3>
                <p className="text-xs leading-relaxed text-text-muted">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Por que pagar por aluno ativo */}
        <section className="mt-12 rounded-2xl border border-border bg-surface-card p-6">
          <h2 className="mb-2 text-lg font-bold text-text">Por que cobramos por aluno ativo</h2>
          <p className="text-sm leading-relaxed text-text-muted">
            Contamos como <strong className="text-text">ativo</strong> o aluno que treinou nos
            últimos 30 dias. Assim você paga pelo que realmente está em uso — e não pela base
            inteira de cadastros. Quem cresce, sobe de faixa automaticamente; quem está começando,
            paga menos.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              'Contagem mensal transparente',
              'Aviso antes de atingir o limite',
              'Ajuste automático na fatura seguinte',
              'Tolerância antes de qualquer bloqueio',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-text-muted">
                <CheckIcon className="h-4 w-4 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* CTA final */}
        <section className="mt-12 text-center">
          <h2 className="text-xl font-bold text-text">Pronto para começar?</h2>
          <p className="mt-2 text-sm text-text-muted">
            Crie sua conta e teste sem custo. Você só paga quando crescer.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to="/register"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
            >
              Criar conta grátis
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-primary/50 px-6 py-3 text-sm font-bold text-primary hover:bg-primary/10"
            >
              Já tenho conta
            </Link>
          </div>
          <p className="mt-4 text-xs text-text-muted">
            Toda cobrança é processada com segurança pelo Mercado Pago. Você autoriza o cartão no
            cadastro e só é cobrado automaticamente após os 15 dias de teste, caso não cancele antes.
          </p>
        </section>

        <footer className="mt-12 flex items-center justify-center gap-2 border-t border-border pt-6 text-xs text-text-muted">
          <Building2Icon className="h-4 w-4" />
          <span>ENDORFINAPP — A Química do Crescimento · Pagamentos via Mercado Pago</span>
        </footer>
      </main>
    </div>
  )
}