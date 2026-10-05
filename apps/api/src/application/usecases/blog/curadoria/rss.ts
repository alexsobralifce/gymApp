// Parser mínimo de RSS 2.0 (sem dependências): título, link, data, categorias e trecho.
export interface ItemRss {
  titulo: string
  link: string
  data: Date | null
  categorias: string[]
  trecho: string
}

const ENTIDADES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' }

export function decodificar(texto: string): string {
  return texto
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#0?39);/g, (m) => ENTIDADES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
}

function campo(bloco: string, tag: string): string {
  const m = bloco.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'))
  if (!m) return ''
  const cdata = m[1].match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/)
  return (cdata ? cdata[1] : decodificar(m[1])).trim()
}

export function semHtml(html: string): string {
  return decodificar(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

export function lerRss(xml: string): ItemRss[] {
  const itens = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? []
  return itens
    .map((bloco) => {
      const data = new Date(campo(bloco, 'pubDate') || campo(bloco, 'dc:date'))
      const categorias = [...bloco.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map((c) => semHtml(c[1].replace(/<!\[CDATA\[|\]\]>/g, '')))
      return {
        titulo: semHtml(campo(bloco, 'title')),
        link: campo(bloco, 'link') || campo(bloco, 'guid'),
        data: Number.isNaN(data.getTime()) ? null : data,
        categorias,
        trecho: semHtml(campo(bloco, 'description') || campo(bloco, 'content:encoded')).slice(0, 700),
      }
    })
    .filter((i) => i.titulo && /^https?:\/\//.test(i.link))
}
