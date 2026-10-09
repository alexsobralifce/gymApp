import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import LayoutPublico from '../../components/seo/LayoutPublico'
import { useSeo } from '../../lib/seo'
import { idiomaDoCaminho } from '../../lib/i18n'
import { perguntasFrequentes } from '../../lib/dadosEstruturados'
import type { PaginaSeoDados } from './paginasSeo'

const TEXTOS = {
  pt: { para: 'Para', beneficios: 'O que você pode fazer', como: 'Como funciona', faq: 'Perguntas frequentes', segundo: 'Ver planos', segundoHref: '/planos' },
  en: { para: 'For', beneficios: 'What you can do', como: 'How it works', faq: 'Frequently asked questions', segundo: 'Free calculators', segundoHref: '/en/tools' },
}

export default function PaginaSeo({ dados }: { dados: PaginaSeoDados }) {
  const idioma = idiomaDoCaminho(dados.caminho)
  const t = TEXTOS[idioma]
  useSeo({ title: dados.title, description: dados.description, path: dados.caminho, jsonLd: perguntasFrequentes(dados.faqs) })

  return (
    <LayoutPublico atual={dados.caminho}>
      <main>
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">{t.para} {dados.publico.toLowerCase()}</p>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-4">{dados.h1}</h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-8">{dados.lead}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110">
              {dados.cta}
            </Link>
            <Link to={t.segundoHref} className="px-6 py-3 rounded-xl border border-border font-semibold hover:bg-surface-card">
              {t.segundo}
            </Link>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-14" aria-labelledby="beneficios">
          <h2 id="beneficios" className="text-2xl font-bold mb-6 text-center">{t.beneficios}</h2>
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
          <h2 id="como-funciona" className="text-2xl font-bold mb-6 text-center">{t.como}</h2>
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
          <h2 id="faq" className="text-2xl font-bold mb-6 text-center">{t.faq}</h2>
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
    </LayoutPublico>
  )
}
