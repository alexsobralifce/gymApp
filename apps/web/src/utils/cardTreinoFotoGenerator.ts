/**
 * Card "Treino concluído" para aluno vinculado a professor.
 * A foto ocupa o card inteiro (4:5) e as informações ficam centralizadas na base:
 * treino concluído, o que foi treinado, data e tempo, dias da semana e rodapé
 * (site à esquerda, professor + "Personal Trainer" à direita).
 */

export interface CardTreinoFotoData {
  treinoNome: string
  duracaoFormatada: string
  /** Data já formatada, ex.: "19 set 2026" */
  data: string
  /** Professor do aluno (ou o próprio professor). Sem nome, o bloco do professor some do rodapé. */
  professorNome?: string | null
  /** Sete posições, de domingo (0) a sábado (6) */
  diasTreinados: boolean[]
  /** Índice (0-6) do dia de hoje na semana */
  hojeIdx: number
  site?: string
}

export const CARD_LARGURA = 1080
export const CARD_ALTURA = 1350
export const CARD_SITE_PADRAO = 'endorfinapp.com.br'
const LETRAS_DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const AZUL = '#3B82F6'
const AZUL_CLARO = '#7FA2FF'
const NAVY = '15, 26, 46'
const FONTE = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

function chaveLocal(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/**
 * Marca quais dias da semana (domingo a sábado) que contém `hoje` têm treino.
 * O dia de hoje conta sempre como treinado: o treino acabou de ser concluído.
 */
export function montarDiasDaSemana(
  hoje: Date,
  datasTreinadas: Iterable<string>,
): { diasTreinados: boolean[]; hojeIdx: number } {
  const treinadas = new Set(datasTreinadas)
  const hojeIdx = hoje.getDay()
  const diasTreinados = LETRAS_DIAS.map((_, i) => {
    if (i === hojeIdx) return true
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + (i - hojeIdx))
    return treinadas.has(chaveLocal(d))
  })
  return { diasTreinados, hojeIdx }
}

/**
 * Nome exibido no rodapé direito do card: o próprio professor quando é ele quem treina;
 * para aluno, o professor vinculado; sem vínculo, nada (o bloco some).
 */
export function nomeProfessorNoCard(
  role: string | undefined,
  nomeUsuario: string | undefined,
  professorVinculado: string | null | undefined,
): string | null {
  if (role === 'PROFESSOR') return nomeUsuario?.trim() || null
  return professorVinculado?.trim() || null
}

/** Meses (AAAA-MM) que a semana de `hoje` toca; geralmente 1, às vezes 2. */
export function mesesDaSemana(hoje: Date): string[] {
  const meses = new Set<string>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + (i - hoje.getDay()))
    meses.add(chaveLocal(d).slice(0, 7))
  }
  return [...meses]
}

export function formatarDataCard(d: Date): string {
  return d
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/\./g, '')
    .replace(/ de /g, ' ')
}

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Reduz a fonte até o texto caber em `maxW`. */
function ajustarFonte(
  ctx: CanvasRenderingContext2D,
  texto: string,
  peso: number,
  tamanho: number,
  maxW: number,
  minimo = 28,
) {
  let t = tamanho
  ctx.font = `${peso} ${t}px ${FONTE}`
  while (t > minimo && ctx.measureText(texto).width > maxW) {
    t -= 2
    ctx.font = `${peso} ${t}px ${FONTE}`
  }
}

/** Corta o texto com reticências se, mesmo na menor fonte, não couber. */
function cortar(ctx: CanvasRenderingContext2D, texto: string, maxW: number): string {
  if (ctx.measureText(texto).width <= maxW) return texto
  let t = texto
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

export async function gerarCardTreinoFoto(
  data: CardTreinoFotoData,
  fotoSrc?: string | null,
): Promise<Blob> {
  const W = CARD_LARGURA
  const H = CARD_ALTURA
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível obter o contexto 2D do Canvas')

  // 1. Foto em tela cheia (cover); sem foto, fundo navy
  const foto = fotoSrc ? await carregarImagem(fotoSrc) : null
  if (foto) {
    const r = Math.max(W / foto.width, H / foto.height)
    const w = foto.width * r
    const h = foto.height * r
    ctx.drawImage(foto, (W - w) / 2, (H - h) / 2, w, h)
  } else {
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, '#0B1220')
    bg.addColorStop(1, '#050B14')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
  }

  // 2. Degradê navy na base para legibilidade
  const g = ctx.createLinearGradient(0, H - 580, 0, H)
  g.addColorStop(0, `rgba(${NAVY}, 0)`)
  g.addColorStop(0.55, `rgba(${NAVY}, 0.88)`)
  g.addColorStop(1, `rgba(${NAVY}, 0.97)`)
  ctx.fillStyle = g
  ctx.fillRect(0, H - 580, W, 580)

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'center'

  // 3. Cabeçalho: concluído, o que foi treinado, data e tempo
  ctx.fillStyle = AZUL_CLARO
  ctx.font = `700 30px ${FONTE}`
  ctx.fillText('✓  TREINO CONCLUÍDO', W / 2, H - 455)

  ctx.fillStyle = '#FFFFFF'
  ajustarFonte(ctx, data.treinoNome, 800, 64, W - 140)
  ctx.fillText(cortar(ctx, data.treinoNome, W - 140), W / 2, H - 380)

  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = `500 34px ${FONTE}`
  ctx.fillText(`${data.data}   ·   ${data.duracaoFormatada}`, W / 2, H - 325)

  // 4. Dias da semana centralizados
  const r = 44
  const gap = 28
  const n = 7
  const total = n * 2 * r + (n - 1) * gap
  const x0 = (W - total) / 2 + r
  const y = H - 230
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (2 * r + gap)
    const treinou = !!data.diasTreinados[i]
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    if (treinou) {
      ctx.fillStyle = AZUL
      ctx.fill()
    } else {
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.stroke()
    }
    ctx.fillStyle = treinou ? '#FFFFFF' : 'rgba(255,255,255,0.5)'
    ctx.font = `bold 40px ${FONTE}`
    ctx.textBaseline = 'middle'
    ctx.fillText(LETRAS_DIAS[i], x, y + 2)
    ctx.textBaseline = 'alphabetic'
    if (i === data.hojeIdx) {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(x - 10, y + r + 14, 20, 5)
    }
  }

  // 5. Rodapé: linha fina, site à esquerda, professor + Personal Trainer à direita
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fillRect(60, H - 130, W - 120, 2)

  ctx.textAlign = 'left'
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `600 32px ${FONTE}`
  ctx.fillText(data.site || CARD_SITE_PADRAO, 60, H - 50)

  if (data.professorNome) {
    ctx.textAlign = 'right'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `700 38px ${FONTE}`
    ctx.fillText(cortar(ctx, data.professorNome, W / 2 - 60), W - 60, H - 72)
    ctx.fillStyle = AZUL_CLARO
    ctx.font = `500 28px ${FONTE}`
    ctx.fillText('Personal Trainer', W - 60, H - 34)
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar blob do Canvas'))),
      'image/jpeg',
      0.92,
    )
  })
}
