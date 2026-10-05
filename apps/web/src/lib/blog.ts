export interface SecaoArtigo {
  titulo: string
  paragrafos?: string[]
  lista?: string[]
}

export interface Artigo {
  slug: string
  titulo: string
  descricao: string
  categoria: 'Personal trainer' | 'Academia' | 'Aluno'
  autor: string
  publicadoEm: string
  atualizadoEm: string
  tipo?: 'curadoria'
  /** Matéria de terceiros comentada (curadoria): sempre com link para o original. */
  origem?: { veiculo: string; pais: string; titulo: string; url: string }
  resumo: string
  secoes: SecaoArtigo[]
  fontes: Array<{ titulo: string; url: string }>
  cta?: { texto: string; href: string }
}

// Só entram os artigos de content/blog/. Rascunhos (content/blog-rascunhos/) não vão para o bundle.
const arquivos = import.meta.glob<Omit<Artigo, 'slug'>>('../../content/blog/*.json', {
  eager: true,
  import: 'default',
})

export const ARTIGOS: Artigo[] = Object.entries(arquivos)
  .map(([caminho, dados]) => ({ slug: caminho.split('/').pop()!.replace(/\.json$/, ''), ...dados }))
  .sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm))

export function buscarArtigo(slug: string | undefined): Artigo | undefined {
  return ARTIGOS.find((a) => a.slug === slug)
}

export function formatarData(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}
