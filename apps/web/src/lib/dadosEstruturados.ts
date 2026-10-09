import { urlAbsoluta } from './seo'

const NOME = 'ENDORFINAPP'

/** Organização, site e aplicativo (landing). Usa @graph porque useSeo aceita um único objeto JSON-LD. */
export function dadosDoSite(): Record<string, unknown> {
  const raiz = urlAbsoluta('/') ?? undefined
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: NOME, ...(raiz && { url: raiz }), parentOrganization: { '@type': 'Organization', name: 'Urano Sistemas', url: 'https://www.uranosistemas.com.br' } },
      { '@type': 'WebSite', name: NOME, inLanguage: 'pt-BR', ...(raiz && { url: raiz }) },
      {
        '@type': 'SoftwareApplication',
        name: NOME,
        applicationCategory: 'HealthApplication',
        operatingSystem: 'Web, Android',
        inLanguage: 'pt-BR',
        description: 'App de treino para alunos, personal trainers e academias.',
      },
    ],
  }
}

export function perguntasFrequentes(faqs: Array<{ q: string; a: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
}

export function trilhaDePaginas(itens: Array<{ nome: string; caminho: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itens.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.nome, ...(urlAbsoluta(it.caminho) && { item: urlAbsoluta(it.caminho) }) })),
  }
}
