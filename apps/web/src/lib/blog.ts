import { localeAtual } from '../i18n'
export interface ImagemArtigo {
  url: string
  alt: string
}

export interface SubsecaoArtigo {
  titulo: string
  paragrafos?: string[]
  lista?: string[]
}

export interface TabelaArtigo {
  legenda?: string
  colunas: string[]
  linhas: string[][]
}

export interface SecaoArtigo {
  titulo: string
  imagem?: ImagemArtigo
  paragrafos?: string[]
  lista?: string[]
  tabela?: TabelaArtigo
  subsecoes?: SubsecaoArtigo[]
  /** Botão de download ou link de destaque ao fim da seção (arquivo em /downloads/). */
  link?: { texto: string; href: string }
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
  /** Capa do artigo: caminho do site ("/blog-img/x.webp") ou URL absoluta */
  imagem?: ImagemArtigo
  /** Matéria de terceiros comentada (curadoria): sempre com link para o original. */
  origem?: { veiculo: string; pais: string; titulo: string; url: string }
  resumo: string
  secoes: SecaoArtigo[]
  /** Perguntas frequentes: renderizadas ao fim e publicadas como FAQPage no JSON-LD. */
  faq?: Array<{ pergunta: string; resposta: string }>
  /** Artigo escrito à mão no repositório: a sincronização com o banco não o apaga. */
  manual?: boolean
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
  return new Date(`${iso}T12:00:00`).toLocaleDateString(localeAtual(), { day: 'numeric', month: 'long', year: 'numeric' })
}
