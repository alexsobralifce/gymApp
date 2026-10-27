import { Link } from 'react-router-dom'
import LayoutPublico from '../../components/seo/LayoutPublico'
import { useSeo } from '../../lib/seo'
import { ARTIGOS, formatarData, type Artigo } from '../../lib/blog'

function rotulo(a: Artigo) {
  return a.tipo === 'curadoria' ? (a.origem?.veiculo ?? 'Curadoria') : a.categoria
}

/** Destaque: o artigo mais recente ocupa o topo, em tela cheia. */
function Destaque({ artigo }: { artigo: Artigo }) {
  return (
    <Link
      to={`/blog/${artigo.slug}`}
      className="group relative mb-12 flex min-h-[280px] overflow-hidden rounded-2xl border border-border bg-surface-card sm:min-h-[360px]"
    >
      {artigo.imagem && (
        <img
          src={artigo.imagem.url}
          alt={artigo.imagem.alt}
          width={1200}
          height={800}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/70 to-transparent" aria-hidden="true" />
      <div className="relative mt-auto p-5 sm:p-8 max-w-2xl min-w-0">
        <span className="inline-block rounded bg-primary px-2 py-1 text-xs font-bold uppercase tracking-widest text-primary-foreground">
          Em destaque · {rotulo(artigo)}
        </span>
        <h2 className="mt-3 text-2xl font-black leading-tight text-text sm:text-4xl">{artigo.titulo}</h2>
        <p className="mt-2 text-sm text-text-muted sm:text-base">{artigo.resumo}</p>
        <p className="mt-3 text-xs text-text-muted">Publicado em {formatarData(artigo.publicadoEm)}</p>
      </div>
    </Link>
  )
}

function Card({ artigo }: { artigo: Artigo }) {
  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-card">
      {artigo.imagem && (
        <Link to={`/blog/${artigo.slug}`} tabIndex={-1} aria-hidden="true">
          <img src={artigo.imagem.url} alt="" width={1200} height={800} loading="lazy" className="aspect-[3/2] w-full object-cover" />
        </Link>
      )}
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{rotulo(artigo)}</p>
        <h3 className="mb-2 text-lg font-bold leading-snug">
          <Link to={`/blog/${artigo.slug}`} className="hover:text-primary">{artigo.titulo}</Link>
        </h3>
        <p className="mb-4 line-clamp-3 text-sm text-text-muted">{artigo.resumo}</p>
        <p className="mt-auto text-xs text-text-muted">Atualizado em {formatarData(artigo.atualizadoEm)}</p>
      </div>
    </li>
  )
}

function Secao({ titulo, artigos }: { titulo: string; artigos: Artigo[] }) {
  if (artigos.length === 0) return null
  return (
    <section className="mb-12" aria-labelledby={`sec-${titulo}`}>
      <h2 id={`sec-${titulo}`} className="mb-5 border-b-2 border-primary pb-2 text-xl font-black uppercase tracking-wide">
        {titulo}
      </h2>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {artigos.map((a) => <Card key={a.slug} artigo={a} />)}
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

  // ARTIGOS já vem do mais recente para o mais antigo.
  const destaque = ARTIGOS[0]
  const resto = ARTIGOS.slice(1)

  return (
    <LayoutPublico atual="/blog">
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="mb-3 text-3xl font-black sm:text-4xl">Blog ENDORFINAPP</h1>
        <p className="mb-10 text-muted-foreground">Guias práticos de treino, personal trainer e gestão de academia.</p>
        {destaque && <Destaque artigo={destaque} />}
        <Secao titulo="Artigos" artigos={resto.filter((a) => a.tipo !== 'curadoria')} />
        <Secao titulo="Leituras da semana" artigos={resto.filter((a) => a.tipo === 'curadoria')} />
      </main>
    </LayoutPublico>
  )
}
