import { Link, useParams } from 'react-router-dom'
import LayoutPublico from '../../components/seo/LayoutPublico'
import { useSeo, urlAbsoluta } from '../../lib/seo'
import { trilhaDePaginas } from '../../lib/dadosEstruturados'
import { EMAIL_SUPORTE } from '../../config/contato'
import { ARTIGOS, buscarArtigo, formatarData, type Artigo } from '../../lib/blog'

const SITE = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, '') ?? ''

function dadosEstruturados(a: Artigo) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: a.titulo,
    description: a.descricao,
    datePublished: a.publicadoEm,
    dateModified: a.atualizadoEm,
    inLanguage: 'pt-BR',
    author: { '@type': 'Organization', name: a.autor, ...(SITE && { url: `${SITE}/quem-somos` }) },
    publisher: { '@type': 'Organization', name: 'ENDORFINAPP' },
    ...(a.imagem && urlAbsoluta(a.imagem.url) && { image: urlAbsoluta(a.imagem.url) }),
    ...(a.origem && { citation: a.origem.url, isBasedOn: a.origem.url }),
    ...(SITE && { mainEntityOfPage: `${SITE}/blog/${a.slug}` }),
  }
}

/** Troca marcadores [n] por links numerados para a lista de fontes. */
function TextoComCitacoes({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/(\[\d+\])/).map((parte, i) => {
        const m = parte.match(/^\[(\d+)\]$/)
        return m ? (
          <sup key={i}>
            <a href={`#fonte-${m[1]}`} className="text-primary hover:underline" aria-label={`Fonte ${m[1]}`}>[{m[1]}]</a>
          </sup>
        ) : (
          parte
        )
      })}
    </>
  )
}

function Conteudo({ artigo }: { artigo: Artigo }) {
  useSeo({
    title: `${artigo.titulo} | ENDORFINAPP`,
    description: artigo.descricao,
    path: `/blog/${artigo.slug}`,
    noindex: artigo.tipo === 'curadoria',
    image: artigo.imagem?.url,
    jsonLd: artigo.tipo === 'curadoria' ? undefined : { '@context': 'https://schema.org', '@graph': [dadosEstruturados(artigo), trilhaDePaginas([{ nome: 'Início', caminho: '/' }, { nome: 'Blog', caminho: '/blog' }, { nome: artigo.titulo, caminho: `/blog/${artigo.slug}` }])] },
  })
  const relacionados = ARTIGOS.filter((a) => a.slug !== artigo.slug).slice(0, 3)

  return (
    <LayoutPublico atual="/blog">
      <main>
        <article className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          <nav aria-label="Você está em" className="text-xs text-muted-foreground mb-4">
            <Link to="/blog" className="hover:text-foreground">Blog</Link> · {artigo.tipo === 'curadoria' ? 'Leitura da semana' : artigo.categoria}
          </nav>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-3">{artigo.titulo}</h1>
          <p className="text-xs text-muted-foreground mb-8">
            Por <Link to="/quem-somos" className="underline hover:text-foreground">{artigo.autor}</Link> · Publicado em {formatarData(artigo.publicadoEm)} · Atualizado em {formatarData(artigo.atualizadoEm)}
          </p>
          {artigo.origem && (
            <aside className="rounded-xl border border-border bg-surface-card p-4 mb-6 text-sm">
              <p className="font-semibold mb-1">Curadoria</p>
              <p className="text-muted-foreground">
                Este texto comenta uma matéria publicada por {artigo.origem.veiculo}. Leia o conteúdo completo na fonte:{' '}
                <a href={artigo.origem.url} target="_blank" rel="noopener noreferrer" className="underline text-primary">
                  {artigo.origem.titulo}
                </a>
                .
              </p>
            </aside>
          )}
          {artigo.imagem && (
            <img
              src={artigo.imagem.url}
              alt={artigo.imagem.alt}
              width={1200}
              height={800}
              fetchPriority="high"
              className="mb-8 aspect-[3/2] w-full rounded-xl object-cover"
            />
          )}
          <p className="text-lg mb-8">{artigo.resumo}</p>

          {artigo.secoes.map((s) => (
            <section key={s.titulo} className="mb-8">
              <h2 className="text-2xl font-bold mb-3">{s.titulo}</h2>
              {s.imagem && (
                <img src={s.imagem.url} alt={s.imagem.alt} width={1200} height={800} loading="lazy" className="mb-4 aspect-[3/2] w-full rounded-xl object-cover" />
              )}
              {s.paragrafos?.map((p) => (
                <p key={p} className="mb-3 leading-relaxed text-foreground/90"><TextoComCitacoes texto={p} /></p>
              ))}
              {s.lista && (
                <ul className="list-disc pl-5 space-y-1.5 mb-3 text-foreground/90">
                  {s.lista.map((i) => <li key={i}>{i}</li>)}
                </ul>
              )}
            </section>
          ))}

          {artigo.cta && (
            <div className="rounded-xl border border-border bg-surface-card p-5 mb-8 text-center">
              <Link to={artigo.cta.href} className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110">
                {artigo.cta.texto}
              </Link>
            </div>
          )}

          <aside className="rounded-xl border border-border bg-surface-card p-4 mb-8 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Sobre a {artigo.autor}</p>
            <p>
              Somos o time do ENDORFINAPP.{' '}
              <Link to="/quem-somos" className="underline text-primary">Conheça quem somos</Link>
              {' '}ou fale com o suporte: <a href={`mailto:${EMAIL_SUPORTE}`} className="underline text-primary">{EMAIL_SUPORTE}</a>.
            </p>
          </aside>

          <section aria-labelledby="fontes" className="border-t border-border pt-6">
            <h2 id="fontes" className="text-lg font-bold mb-2">Fontes consultadas</h2>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
              {artigo.fontes.map((f, i) => (
                <li key={f.url} id={`fonte-${i + 1}`}>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">{f.titulo}</a>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground mt-4">
              Este conteúdo é informativo e não substitui a orientação de um profissional de educação física ou de saúde.
            </p>
          </section>

          {relacionados.length > 0 && (
            <section aria-labelledby="leia-tambem" className="mt-10">
              <h2 id="leia-tambem" className="text-lg font-bold mb-2">Leia também</h2>
              <ul className="space-y-1">
                {relacionados.map((r) => (
                  <li key={r.slug}><Link to={`/blog/${r.slug}`} className="text-primary hover:underline">{r.titulo}</Link></li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </main>
    </LayoutPublico>
  )
}

export default function BlogArtigo() {
  const { slug } = useParams()
  const artigo = buscarArtigo(slug)
  if (!artigo) {
    return (
      <LayoutPublico atual="/blog">
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-2">Artigo não encontrado</h1>
          <Link to="/blog" className="text-primary hover:underline">Ver todos os artigos</Link>
        </main>
      </LayoutPublico>
    )
  }
  return <Conteudo artigo={artigo} />
}
