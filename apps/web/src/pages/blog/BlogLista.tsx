import { Link } from 'react-router-dom'
import LayoutPublico from '../../components/seo/LayoutPublico'
import { useSeo } from '../../lib/seo'
import { ARTIGOS, formatarData, type Artigo } from '../../lib/blog'

function Secao({ titulo, artigos }: { titulo: string; artigos: Artigo[] }) {
  if (artigos.length === 0) return null
  return (
    <section className="mb-10" aria-labelledby={`sec-${titulo}`}>
      <h2 id={`sec-${titulo}`} className="text-lg font-bold mb-4">{titulo}</h2>
      <ul className="space-y-5">
        {artigos.map((a) => (
          <li key={a.slug} className="overflow-hidden rounded-xl border border-border bg-surface-card">
            {a.imagem && (
              <Link to={`/blog/${a.slug}`} tabIndex={-1} aria-hidden="true">
                <img src={a.imagem.url} alt="" width={1200} height={800} loading="lazy" className="aspect-[3/2] w-full object-cover" />
              </Link>
            )}
            <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1.5">{a.tipo === 'curadoria' ? `${a.origem?.veiculo ?? 'Curadoria'}` : a.categoria}</p>
            <h3 className="text-xl font-bold mb-1.5">
              <Link to={`/blog/${a.slug}`} className="hover:text-primary">{a.titulo}</Link>
            </h3>
            <p className="text-sm text-muted-foreground mb-2">{a.resumo}</p>
            <p className="text-xs text-muted-foreground">Atualizado em {formatarData(a.atualizadoEm)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

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
        <Secao titulo="Artigos" artigos={ARTIGOS.filter((a) => a.tipo !== 'curadoria')} />
        <Secao titulo="Leituras da semana" artigos={ARTIGOS.filter((a) => a.tipo === 'curadoria')} />
      </main>
    </LayoutPublico>
  )
}
