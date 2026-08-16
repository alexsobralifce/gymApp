import { prisma } from '../../../infrastructure/database/prisma.js'

export interface ParsedNoticia {
  titulo: string
  resumo: string
  url: string
  fonte: string
  data_publicacao: Date | null
  imagem_url?: string
}

// Curated high quality fitness/health banner images from Unsplash
const DEFAULT_FITNESS_IMAGES = [
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80', // Gym weights / barbells
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80', // Fitness workout
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80', // Abs / core / training
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80', // Dumbbells
  'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=800&q=80', // Running / outdoor
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80', // Yoga / stretching / health
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80', // Healthy food / nutrition
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80', // Active training
]

function getTopicImage(titulo: string, resumo: string): string {
  const text = `${titulo} ${resumo}`.toLowerCase()
  if (/muscul|hipertrofia|peso|força|supino|agachamento|bíceps|tríceps|halter/.test(text)) {
    return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80'
  }
  if (/corrida|cardio|caminhada|aerób|maratona|pedalar|ciclismo|esteira/.test(text)) {
    return 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=800&q=80'
  }
  if (/alongamento|flexibilidade|yoga|postura|pilates|coluna|lombar/.test(text)) {
    return 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80'
  }
  if (/alimentação|nutrição|proteína|creatina|dieta|suplement|comida/.test(text)) {
    return 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80'
  }
  if (/mente|cérebro|ansiedade|depressão|sono|estresse|endorfina|humor|bem-estar/.test(text)) {
    return 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80'
  }
  if (/coração|cardíac|pressão|colesterol|diabetes|longevidade|saúde/.test(text)) {
    return 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80'
  }
  const hash = Math.abs(text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0))
  return DEFAULT_FITNESS_IMAGES[hash % DEFAULT_FITNESS_IMAGES.length]
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
}

const RSS_FEEDS = [
  'https://news.google.com/rss/search?q=exercicios+fisicos+saude&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  'https://news.google.com/rss/search?q=musculacao+beneficios+treino&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  'https://news.google.com/rss/search?q=atividade+fisica+bem+estar+longevidade&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  'https://news.google.com/rss/search?q=saude+endorfina+exercicio+qualidade+de+vida&hl=pt-BR&gl=BR&ceid=BR:pt-419',
]

export class NoticiasService {
  /**
   * Busca feeds RSS do Google News em PT-BR e faz upsert no banco
   */
  static async fetchAndSyncNews(): Promise<{ inseridas: number; total: number }> {
    const agora = Date.now()
    const MAX_IDADE_MS = 30 * 24 * 60 * 60 * 1000 // 30 dias
    const PRUNE_IDADE_MS = 60 * 24 * 60 * 60 * 1000 // 60 dias
    let totalInseridas = 0

    for (const feedUrl of RSS_FEEDS) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 12000)

        const response = await fetch(feedUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'application/rss+xml, application/xml, text/xml, */*',
          },
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!response.ok) {
          console.warn(`[NoticiasService] Feed retornou status ${response.status}: ${feedUrl}`)
          continue
        }

        const xml = await response.text()
        const itemRegex = /<item>([\s\S]*?)<\/item>/g
        let match

        while ((match = itemRegex.exec(xml)) !== null) {
          const item = match[1]
          let rawTitle = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1]?.trim()
          const rawLink = (item.match(/<link>(.*?)<\/link>/))?.[1]?.trim()
          let rawDesc = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/))?.[1]?.trim()
          let rawFonte = (item.match(/<source.*?>(.*?)<\/source>/))?.[1]?.trim()
          const pubDateRaw = (item.match(/<pubDate>(.*?)<\/pubDate>/))?.[1]?.trim()

          if (!rawTitle || !rawLink) continue

          rawTitle = decodeHtmlEntities(rawTitle)
          if (rawDesc) rawDesc = decodeHtmlEntities(rawDesc)
          if (rawFonte) rawFonte = decodeHtmlEntities(rawFonte)

          // Extrai fonte se vier no título formatado "Título - Nome da Fonte"
          let titulo = rawTitle
          let fonte = rawFonte || 'Google News'

          const lastDash = rawTitle.lastIndexOf(' - ')
          if (lastDash > 10 && !rawFonte) {
            fonte = rawTitle.slice(lastDash + 3).trim()
            titulo = rawTitle.slice(0, lastDash).trim()
          }

          // Limpa tags HTML da descrição
          let resumo = (rawDesc || titulo)
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim()

          if (!resumo || resumo.length < 10) {
            resumo = titulo
          }

          // Trata data de publicação
          let dataPublicacao: Date | null = null
          if (pubDateRaw) {
            const parsed = new Date(pubDateRaw)
            if (!isNaN(parsed.getTime())) {
              dataPublicacao = parsed
            }
          }

          // Se a notícia for anterior a 30 dias, ignora
          if (dataPublicacao && agora - dataPublicacao.getTime() > MAX_IDADE_MS) {
            continue
          }

          const imagemUrl = getTopicImage(titulo, resumo)

          await prisma.noticia.upsert({
            where: { url: rawLink },
            create: {
              titulo: titulo.slice(0, 200),
              resumo: resumo.slice(0, 400),
              url: rawLink,
              fonte: fonte.slice(0, 100),
              imagem_url: imagemUrl,
              data_publicacao: dataPublicacao || new Date(),
            },
            update: {
              imagem_url: imagemUrl,
              data_publicacao: dataPublicacao || undefined,
            },
          })
          totalInseridas++
        }
      } catch (err: any) {
        console.warn(`[NoticiasService] Erro ao sincronizar feed ${feedUrl}:`, err?.message || err)
      }
    }

    // Podar notícias muito antigas (> 60 dias)
    try {
      const cortePrune = new Date(agora - PRUNE_IDADE_MS)
      await prisma.noticia.deleteMany({
        where: {
          data_publicacao: { lt: cortePrune },
        },
      })
    } catch (err) {
      // Ignora erro de poda
    }

    const total = await prisma.noticia.count()
    console.log(`[NoticiasService] Sincronização concluída: +${totalInseridas} notícias processadas. Total no banco: ${total}`)
    return { inseridas: totalInseridas, total }
  }

  /**
   * Lista notícias com ordenação por data de publicação
   */
  static async listNoticias(limit = 40, offset = 0) {
    let count = await prisma.noticia.count()
    
    // Se o banco estiver vazio, aciona a sincronização imediatamente
    if (count === 0) {
      await this.fetchAndSyncNews().catch(() => {})
      count = await prisma.noticia.count()
    }

    const noticias = await prisma.noticia.findMany({
      orderBy: [
        { data_publicacao: 'desc' },
        { criado_em: 'desc' },
      ],
      take: limit,
      skip: offset,
      select: {
        id: true,
        titulo: true,
        resumo: true,
        url: true,
        fonte: true,
        imagem_url: true,
        criado_em: true,
        data_publicacao: true,
      },
    })

    return {
      noticias,
      total: count,
    }
  }
}
