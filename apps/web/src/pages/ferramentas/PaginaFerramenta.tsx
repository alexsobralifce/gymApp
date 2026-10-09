import { Link } from 'react-router-dom'
import LayoutPublico from '../../components/seo/LayoutPublico'
import { useSeo } from '../../lib/seo'
import { perguntasFrequentes, trilhaDePaginas } from '../../lib/dadosEstruturados'
import { homeDoIdioma, type Idioma } from '../../lib/i18n'
import { FERRAMENTAS, ORDEM, type FerramentaId } from './conteudo'
import { UI } from './interface'
import { CalculadoraIMC, CalculadoraPesoIdeal, CalculadoraGasto, CalculadoraMeta } from './Calculadoras'

const CALCULADORA: Record<FerramentaId, (p: { idioma: Idioma }) => React.JSX.Element> = {
  imc: CalculadoraIMC, pesoIdeal: CalculadoraPesoIdeal, gasto: CalculadoraGasto, meta: CalculadoraMeta,
}

export function caminhoIndice(idioma: Idioma): string {
  return idioma === 'en' ? '/en/tools' : '/ferramentas'
}

export default function PaginaFerramenta({ id, idioma }: { id: FerramentaId; idioma: Idioma }) {
  const tx = FERRAMENTAS[id][idioma]
  const t = UI[idioma]
  const Calculadora = CALCULADORA[id]

  useSeo({
    title: tx.title,
    description: tx.description,
    path: tx.caminho,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebApplication', name: tx.h1, description: tx.description, applicationCategory: 'HealthApplication', operatingSystem: 'Any', inLanguage: idioma === 'en' ? 'en' : 'pt-BR', isAccessibleForFree: true },
        perguntasFrequentes(tx.faqs),
        trilhaDePaginas([{ nome: t.inicio, caminho: homeDoIdioma(idioma) }, { nome: t.ferramentas, caminho: caminhoIndice(idioma) }, { nome: tx.h1, caminho: tx.caminho }]),
      ],
    },
  })

  return (
    <LayoutPublico atual={tx.caminho}>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <nav aria-label={idioma === 'en' ? 'You are here' : 'Você está em'} className="text-xs text-muted-foreground mb-4">
          <Link to={homeDoIdioma(idioma)} className="inline-block py-2 hover:text-foreground">{t.inicio}</Link> ·{' '}
          <Link to={caminhoIndice(idioma)} className="inline-block py-2 hover:text-foreground">{t.ferramentas}</Link>
        </nav>
        <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-3">{tx.h1}</h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-8">{tx.lead}</p>

        <Calculadora idioma={idioma} />
        <p className="mt-4 text-xs text-muted-foreground max-w-2xl">{t.aviso}</p>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-8 max-w-2xl">
            {tx.explicacao.map((s) => (
              <section key={s.titulo}>
                <h2 className="text-2xl font-bold mb-3">{s.titulo}</h2>
                {s.paragrafos.map((p) => <p key={p} className="mb-3 leading-relaxed text-foreground/90">{p}</p>)}
              </section>
            ))}
            <section aria-labelledby="faq">
              <h2 id="faq" className="text-2xl font-bold mb-4">{t.perguntas}</h2>
              <div className="space-y-3">
                {tx.faqs.map((f) => (
                  <details key={f.q} className="rounded-xl border border-border bg-surface-card px-4 py-3 group">
                    <summary className="cursor-pointer font-semibold list-none flex min-h-6 items-center justify-between gap-3">
                      {f.q}<span aria-hidden="true" className="text-muted-foreground group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface-card p-5">
              <h2 className="text-lg font-bold mb-2">{t.ctaTitulo}</h2>
              <p className="text-sm text-muted-foreground mb-4">{t.ctaTexto}</p>
              <Link to={t.ctaHref} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 font-bold text-primary-foreground hover:brightness-110">{t.ctaBotao}</Link>
            </div>
            <nav aria-label={t.outrasFerramentas}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t.outrasFerramentas}</h2>
              <ul className="space-y-1">
                {ORDEM.filter((o) => o !== id).map((o) => (
                  <li key={o}>
                    <Link to={FERRAMENTAS[o][idioma].caminho} className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-surface-card">{FERRAMENTAS[o][idioma].nome}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      </main>
    </LayoutPublico>
  )
}
