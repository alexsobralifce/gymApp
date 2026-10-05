import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import EndorfinappLogo from '../../components/branding/EndorfinappLogo'
import { useSeo } from '../../lib/seo'
import type { PaginaSeoDados } from './paginasSeo'
import { PAGINAS_SEO } from './paginasSeo'

const ROTULO_LINK: Record<string, string> = {
  '/app-para-personal-trainer': 'App para personal trainer',
  '/software-para-academia': 'Software para academia',
  '/app-de-treino': 'App de treino para alunos',
}

export default function PaginaSeo({ dados }: { dados: PaginaSeoDados }) {
  useSeo({ title: dados.title, description: dados.description, path: dados.caminho })
  const outras = PAGINAS_SEO.filter((p) => p.caminho !== dados.caminho)

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <header className="border-b border-border bg-background/90 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" aria-label="ENDORFINAPP, página inicial">
            <EndorfinappLogo variant="horizontal" size={26} showSlogan={false} />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3 shrink-0" aria-label="Principal">
            <Link to="/planos" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground">Planos</Link>
            <Link to="/login" className="px-2 text-sm text-muted-foreground hover:text-foreground whitespace-nowrap">Entrar</Link>
            <Link to="/register" className="px-3 sm:px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:brightness-110 whitespace-nowrap">
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Para {dados.publico.toLowerCase()}</p>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-4">{dados.h1}</h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-8">{dados.lead}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110">
              {dados.cta}
            </Link>
            <Link to="/planos" className="px-6 py-3 rounded-xl border border-border font-semibold hover:bg-surface-card">
              Ver planos
            </Link>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-14" aria-labelledby="beneficios">
          <h2 id="beneficios" className="text-2xl font-bold mb-6 text-center">O que você pode fazer</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dados.beneficios.map((b) => (
              <li key={b.titulo} className="rounded-xl border border-border bg-surface-card p-5">
                <h3 className="font-bold mb-1.5 flex items-start gap-2">
                  <Check className="w-4 h-4 mt-1 shrink-0 text-primary" aria-hidden="true" />
                  {b.titulo}
                </h3>
                <p className="text-sm text-muted-foreground">{b.texto}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-14" aria-labelledby="como-funciona">
          <h2 id="como-funciona" className="text-2xl font-bold mb-6 text-center">Como funciona</h2>
          <ol className="space-y-4">
            {dados.passos.map((p, i) => (
              <li key={p.titulo} className="flex gap-4 items-start">
                <span className="w-8 h-8 shrink-0 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center">{i + 1}</span>
                <div>
                  <h3 className="font-bold">{p.titulo}</h3>
                  <p className="text-sm text-muted-foreground">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-14" aria-labelledby="faq">
          <h2 id="faq" className="text-2xl font-bold mb-6 text-center">Perguntas frequentes</h2>
          <div className="space-y-3">
            {dados.faqs.map((f) => (
              <details key={f.q} className="rounded-xl border border-border bg-surface-card p-4" open>
                <summary className="font-semibold cursor-pointer">{f.q}</summary>
                <p className="text-sm text-muted-foreground mt-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 text-center">
          <Link to="/register" className="inline-block px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110">
            {dados.cta}
          </Link>
        </section>
      </main>

      <footer className="border-t border-border py-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row gap-4 justify-between text-sm text-muted-foreground">
          <nav aria-label="Veja também" className="flex flex-wrap gap-x-5 gap-y-2">
            {outras.map((o) => (
              <Link key={o.caminho} to={o.caminho} className="hover:text-foreground">{ROTULO_LINK[o.caminho]}</Link>
            ))}
            <Link to="/planos" className="hover:text-foreground">Planos</Link>
            <Link to="/politica-privacidade" className="hover:text-foreground">Privacidade</Link>
          </nav>
          <span>© 2026 ENDORFINAPP</span>
        </div>
      </footer>
    </div>
  )
}
