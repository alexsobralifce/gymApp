import { Link } from 'react-router-dom'
import LayoutPublico from '../../components/seo/LayoutPublico'
import { useSeo } from '../../lib/seo'
import { ARTIGOS, formatarData } from '../../lib/blog'

export default function BlogLista() {
  useSeo({
    title: 'Blog ENDORFINAPP: treino, personal trainer e gestão de academia',
    description: 'Guias práticos sobre montagem de treinos, acompanhamento de alunos e gestão de academia, com fontes citadas.',
    path: '/blog',
  })

  return (
    <LayoutPublico atual="/blog">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-black mb-3">Blog ENDORFINAPP</h1>
        <p className="text-muted-foreground mb-10">Guias práticos de treino, personal trainer e gestão de academia.</p>
        <ul className="space-y-5">
          {ARTIGOS.map((a) => (
            <li key={a.slug} className="rounded-xl border border-border bg-surface-card p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1.5">{a.categoria}</p>
              <h2 className="text-xl font-bold mb-1.5">
                <Link to={`/blog/${a.slug}`} className="hover:text-primary">{a.titulo}</Link>
              </h2>
              <p className="text-sm text-muted-foreground mb-2">{a.resumo}</p>
              <p className="text-xs text-muted-foreground">Atualizado em {formatarData(a.atualizadoEm)}</p>
            </li>
          ))}
        </ul>
      </main>
    </LayoutPublico>
  )
}
