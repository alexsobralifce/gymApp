// Descobre o tipo do arquivo pelos primeiros bytes (não pela extensão) e extrai o texto quando houver.
import { extractText, getDocumentProxy } from 'unpdf'
import { ValidationError } from '../../../../domain/errors/AppError.js'

export type TipoArquivo = 'pdf' | 'imagem' | 'texto'

export interface ArquivoLido {
  tipo: TipoArquivo
  mime: string
  /** Texto extraído; ausente em imagens e em PDFs sem camada de texto (escaneados). */
  texto?: string
  paginas?: number
}

export const MAX_BYTES_ARQUIVO = 8 * 1024 * 1024
export const MAX_PAGINAS_PDF = 20
export const MAX_CARACTERES_TEXTO = 30_000
/** Abaixo disso por página, o PDF é tratado como escaneado e vai como arquivo para o modelo ler. */
const MIN_CARACTERES_POR_PAGINA = 40

export function detectarTipo(buf: Buffer): { tipo: TipoArquivo; mime: string } | null {
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return { tipo: 'pdf', mime: 'application/pdf' }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { tipo: 'imagem', mime: 'image/jpeg' }
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { tipo: 'imagem', mime: 'image/png' }
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { tipo: 'imagem', mime: 'image/webp' }
  // Texto/Markdown: sem bytes nulos nem caracteres de controle fora de tab, LF e CR.
  const amostra = buf.subarray(0, 2000)
  const binario = amostra.some((b) => b === 0 || (b < 9) || (b > 13 && b < 32))
  return binario ? null : { tipo: 'texto', mime: 'text/plain' }
}

/** Tira a marcação do Markdown que atrapalha a leitura, mantendo títulos e linhas de tabela. */
export function limparMarkdown(md: string): string {
  return md
    .replace(/\r\n?/g, '\n')
    .replace(/^```.*$/gm, '')
    .replace(/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/gm, '')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/(\*\*|__|\*|_)(\S(?:.*?\S)?)\1/g, '$2')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '- ')
    .replace(/\|/g, ' | ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function lerArquivo(buf: Buffer): Promise<ArquivoLido> {
  if (buf.length === 0) throw new ValidationError('O arquivo está vazio.')
  const detectado = detectarTipo(buf)
  if (!detectado) throw new ValidationError('Formato não suportado. Envie PDF, foto (JPG, PNG, WEBP), Markdown ou texto.')

  if (detectado.tipo === 'imagem') return { ...detectado }

  if (detectado.tipo === 'texto') {
    const texto = limparMarkdown(buf.toString('utf8'))
    if (texto.length > MAX_CARACTERES_TEXTO) throw new ValidationError('O arquivo é grande demais. Envie menos treinos por vez.')
    return { ...detectado, texto }
  }

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buf))
    if (pdf.numPages > MAX_PAGINAS_PDF) throw new ValidationError(`O PDF tem páginas demais (máximo ${MAX_PAGINAS_PDF}).`)
    const { text } = await extractText(pdf, { mergePages: true })
    const texto = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    if (texto.length > MAX_CARACTERES_TEXTO) throw new ValidationError('O PDF é grande demais. Envie menos treinos por vez.')
    const escaneado = texto.length < MIN_CARACTERES_POR_PAGINA * pdf.numPages
    return { ...detectado, texto: escaneado ? undefined : texto, paginas: pdf.numPages }
  } catch (e) {
    if (e instanceof ValidationError) throw e
    throw new ValidationError('Não consegui abrir esse PDF. Ele pode estar protegido ou corrompido.')
  }
}
