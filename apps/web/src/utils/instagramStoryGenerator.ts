export interface StoryData {
  treinoNome: string
  duracaoFormatada: string
  volumeKg?: number
  seriesConcluidas?: number
  calorias?: number
  bpmMedio?: number
  bpmMax?: number
  data?: string
  horaInicio?: string
  horaFim?: string
  fotoUsuario?: string | null
  alunoNome?: string
}

const imageCache = new Map<string, HTMLImageElement>()

/**
 * Carrega uma imagem de forma assíncrona com suporte a CORS e cache em memória
 */
function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src)!)
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageCache.set(src, img)
      resolve(img)
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/**
 * Desenha avatar circular com borda neon e brilho
 */
function drawCircularAvatar(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  radius: number
) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2)
  ctx.restore()

  // Borda neon esmeralda
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.strokeStyle = '#10B981'
  ctx.lineWidth = 4
  ctx.shadowColor = 'rgba(16, 185, 129, 0.7)'
  ctx.shadowBlur = 12
  ctx.stroke()
  ctx.restore()
}

/**
 * Desenha um retângulo com cantos arredondados no Canvas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2
  if (h < 2 * r) r = h / 2
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Desenha uma imagem com ajuste 'contain' (sem corte),
 * centralizada com proporção preservada, ambientação de fundo e cantos arredondados.
 */
function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number = 26
) {
  ctx.save()

  // 1. Fundo da moldura com cantos arredondados
  roundRect(ctx, x, y, w, h, r)
  ctx.fillStyle = 'rgba(11, 18, 32, 0.88)'
  ctx.fill()
  ctx.clip()

  // 2. Fundo ambientado (reflexo suave da própria foto)
  const imgAspect = img.width / img.height
  const boxAspect = w / h
  let bgW = w
  let bgH = h
  let bgX = x
  let bgY = y
  if (imgAspect > boxAspect) {
    bgW = h * imgAspect
    bgX = x + (w - bgW) / 2
  } else {
    bgH = w / imgAspect
    bgY = y + (h - bgH) / 2
  }
  ctx.save()
  ctx.globalAlpha = 0.30
  ctx.drawImage(img, bgX, bgY, bgW, bgH)
  ctx.fillStyle = 'rgba(11, 18, 32, 0.60)'
  ctx.fillRect(x, y, w, h)
  ctx.restore()

  // 3. Imagem principal com ajuste 'contain' (zero cortes)
  let renderW: number
  let renderH: number
  if (imgAspect > boxAspect) {
    renderW = w
    renderH = w / imgAspect
  } else {
    renderH = h
    renderW = h * imgAspect
  }
  const renderX = x + (w - renderW) / 2
  const renderY = y + (h - renderH) / 2

  ctx.save()
  roundRect(ctx, renderX, renderY, renderW, renderH, Math.min(18, r))
  ctx.clip()
  ctx.drawImage(img, renderX, renderY, renderW, renderH)
  ctx.restore()

  ctx.restore()

  // 4. Borda externa elegante da moldura
  ctx.save()
  roundRect(ctx, x, y, w, h, r)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()
}

/**
 * Desenha uma imagem com ajuste 'cover' e cantos arredondados
 */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number = 28
) {
  ctx.save()
  roundRect(ctx, x, y, w, h, r)
  ctx.clip()

  const imgAspect = img.width / img.height
  const boxAspect = w / h
  let renderW = w
  let renderH = h
  let offsetX = x
  let offsetY = y

  if (imgAspect > boxAspect) {
    renderW = h * imgAspect
    offsetX = x + (w - renderW) / 2
  } else {
    renderH = w / imgAspect
    offsetY = y + (h - renderH) / 2
  }

  ctx.drawImage(img, offsetX, offsetY, renderW, renderH)
  ctx.restore()

  // Borda elegante translúcida e suave brilho
  ctx.save()
  roundRect(ctx, x, y, w, h, r)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()
}

/**
 * Renderiza o logotipo e símbolo do ENDORFINAPP no Canvas
 */
function drawBrandLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save()
  
  // Símbolo ECG + Raio
  ctx.strokeStyle = '#10B981' // Verde Esmeralda / Neon
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowColor = 'rgba(16, 185, 129, 0.6)'
  ctx.shadowBlur = 15

  ctx.beginPath()
  // Pulso ECG
  ctx.moveTo(cx - 180, cy)
  ctx.lineTo(cx - 140, cy)
  ctx.lineTo(cx - 120, cy - 35)
  ctx.lineTo(cx - 95, cy + 40)
  ctx.lineTo(cx - 75, cy - 20)
  ctx.lineTo(cx - 55, cy)
  ctx.lineTo(cx - 30, cy)
  ctx.stroke()

  // Raio Neon
  ctx.fillStyle = '#10B981'
  ctx.beginPath()
  ctx.moveTo(cx - 20, cy - 40)
  ctx.lineTo(cx - 45, cy + 5)
  ctx.lineTo(cx - 25, cy + 5)
  ctx.lineTo(cx - 35, cy + 45)
  ctx.lineTo(cx + 5, cy - 5)
  ctx.lineTo(cx - 15, cy - 5)
  ctx.closePath()
  ctx.fill()

  // Texto ENDORFINAPP
  ctx.shadowBlur = 0
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('ENDORFINAPP', cx + 25, cy)

  ctx.restore()
}

/**
 * Gera um Canvas 9:16 (1080x1920) e retorna o Blob PNG
 */
export async function gerarStoryImage(
  data: StoryData,
  fotoSrc?: string | null
): Promise<Blob> {
  const width = 1080
  const height = 1920

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível obter o contexto 2D do Canvas')

  // 1. Fundo (Foto do usuário ou Gradiente Dark Neon)
  let userPhotoImg: HTMLImageElement | null = null
  if (fotoSrc) {
    try {
      userPhotoImg = await carregarImagem(fotoSrc)
      if (!userPhotoImg) throw new Error('Falha ao carregar foto de fundo')

      // Desenhar foto ajustada com cover no fundo
      const imgAspect = userPhotoImg.width / userPhotoImg.height
      const canvasAspect = width / height
      let renderW = width
      let renderH = height
      let offsetX = 0
      let offsetY = 0

      if (imgAspect > canvasAspect) {
        renderW = height * imgAspect
        offsetX = (width - renderW) / 2
      } else {
        renderH = width / imgAspect
        offsetY = (height - renderH) / 2
      }

      ctx.drawImage(userPhotoImg, offsetX, offsetY, renderW, renderH)

      // Overlay escuro com vinheta para garantir contraste e legibilidade
      const overlayGrad = ctx.createLinearGradient(0, 0, 0, height)
      overlayGrad.addColorStop(0, 'rgba(11, 18, 32, 0.88)')
      overlayGrad.addColorStop(0.35, 'rgba(11, 18, 32, 0.60)')
      overlayGrad.addColorStop(0.65, 'rgba(11, 18, 32, 0.72)')
      overlayGrad.addColorStop(1, 'rgba(11, 18, 32, 0.96)')
      ctx.fillStyle = overlayGrad
      ctx.fillRect(0, 0, width, height)
    } catch {
      // Fallback para gradiente se a foto falhar
      drawDefaultBackground(ctx, width, height)
    }
  } else {
    drawDefaultBackground(ctx, width, height)
  }

  // 2. Elementos Decorativos / Glows
  ctx.save()
  const topGlow = ctx.createRadialGradient(width / 2, 200, 10, width / 2, 200, 450)
  topGlow.addColorStop(0, 'rgba(16, 185, 129, 0.25)')
  topGlow.addColorStop(1, 'rgba(16, 185, 129, 0)')
  ctx.fillStyle = topGlow
  ctx.fillRect(0, 0, width, 600)

  const bottomGlow = ctx.createRadialGradient(width / 2, height - 300, 10, width / 2, height - 300, 500)
  bottomGlow.addColorStop(0, 'rgba(59, 130, 246, 0.20)')
  bottomGlow.addColorStop(1, 'rgba(59, 130, 246, 0)')
  ctx.fillStyle = bottomGlow
  ctx.fillRect(0, height - 700, width, 700)
  ctx.restore()

  // 3. Header com Logotipo e Avatar do Usuário (se disponível)
  let avatarImg: HTMLImageElement | null = null
  if (data.fotoUsuario) {
    try {
      avatarImg = await carregarImagem(data.fotoUsuario)
    } catch {
      avatarImg = null
    }
  }

  if (avatarImg) {
    drawCircularAvatar(ctx, avatarImg, 130, 170, 42)
    drawBrandLogo(ctx, 580, 170)
  } else {
    drawBrandLogo(ctx, width / 2, 170)
  }

  // 4. Badge "TREINO CONCLUÍDO • DATA • HORÁRIO"
  ctx.save()
  const dataTxt = data.data ?? new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()
  const horarioTxt = data.horaInicio && data.horaFim
    ? ` • ${data.horaInicio} → ${data.horaFim}`
    : data.horaFim
    ? ` • ${data.horaFim}`
    : ''
  const badgeTexto = `⚡ TREINO CONCLUÍDO • ${dataTxt}${horarioTxt}`

  ctx.font = '800 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  const textWidth = ctx.measureText(badgeTexto).width
  const badgeW = Math.max(360, textWidth + 60)
  const badgeH = 54
  const badgeX = (width - badgeW) / 2
  const badgeY = 270

  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)'
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)'
  ctx.lineWidth = 2
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 27)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#34D399'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(badgeTexto, width / 2, badgeY + badgeH / 2)
  ctx.restore()

  // 5. Nome do Treino em Destaque
  ctx.save()
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '900 60px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
  ctx.shadowBlur = 20

  const maxTitleWidth = width - 160
  let titulo = data.treinoNome || 'Treino do Dia'
  if (ctx.measureText(titulo).width > maxTitleWidth) {
    ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }
  ctx.fillText(titulo, width / 2, 380)
  ctx.restore()

  // 6. Card Principal de Métricas (Glassmorphism Dark - Expandido para acomodar foto e métricas)
  const cardX = 80
  const cardY = 430
  const cardW = width - 160
  const cardH = 1180

  ctx.save()
  ctx.fillStyle = 'rgba(15, 23, 42, 0.80)'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)'
  ctx.lineWidth = 2.5
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)'
  ctx.shadowBlur = 40
  roundRect(ctx, cardX, cardY, cardW, cardH, 36)
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  // 7. Grid de Métricas no Card
  const items: { label: string; valor: string; unidade?: string; icon: string; cor: string }[] = []

  // Duração
  items.push({
    label: 'TEMPO DE TREINO',
    valor: data.duracaoFormatada || '45 min',
    icon: '⏱️',
    cor: '#38BDF8',
  })

  // Volume
  if (data.volumeKg && data.volumeKg > 0) {
    items.push({
      label: 'CARGA TOTAL',
      valor: `${data.volumeKg.toLocaleString('pt-BR')}`,
      unidade: 'kg',
      icon: '🏋️‍♂️',
      cor: '#34D399',
    })
  }

  // Séries
  if (data.seriesConcluidas && data.seriesConcluidas > 0) {
    items.push({
      label: 'SÉRIES EXECUTADAS',
      valor: `${data.seriesConcluidas}`,
      unidade: 'séries',
      icon: '⚡',
      cor: '#A78BFA',
    })
  }

  // Calorias
  if (data.calorias && data.calorias > 0) {
    items.push({
      label: 'ENERGIA GASTA',
      valor: `${data.calorias}`,
      unidade: 'kcal',
      icon: '🔥',
      cor: '#FB923C',
    })
  }

  // Frequência Cardíaca
  if (data.bpmMedio && data.bpmMedio > 0) {
    items.push({
      label: 'FC MÉDIA / MÁX',
      valor: `${data.bpmMedio}${data.bpmMax ? ` / ${data.bpmMax}` : ''}`,
      unidade: 'bpm',
      icon: '❤️',
      cor: '#F87171',
    })
  }

  if (userPhotoImg) {
    // ─── CENÁRIO A: COM FOTO POSTADA PELO USUÁRIO ───
    // 7.1 Moldura da foto com destaque ampliado e ajuste contain (zero corte)
    const photoPad = 24
    const photoX = cardX + photoPad
    const photoY = cardY + photoPad
    const photoW = cardW - photoPad * 2
    const photoH = 750

    drawImageContain(ctx, userPhotoImg, photoX, photoY, photoW, photoH, 26)

    // Tag sutil na foto
    ctx.save()
    const photoBadgeTxt = 'ENDORFINAPP • TREINO REALIZADO'
    ctx.font = '800 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    const pbw = ctx.measureText(photoBadgeTxt).width + 30
    roundRect(ctx, photoX + 16, photoY + 16, pbw, 34, 17)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.70)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#34D399'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(photoBadgeTxt, photoX + 16 + pbw / 2, photoY + 33)
    ctx.restore()

    // 7.2 Métricas desenhadas abaixo da foto
    const metricsStartY = photoY + photoH + 20
    const isMultiRow = items.length > 2
    const metricRowHeight = isMultiRow ? 115 : 150
    const colWidth = (photoW - 20) / 2

    items.slice(0, 4).forEach((item, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const itemX = photoX + col * (colWidth + 20)
      const itemY = metricsStartY + row * (metricRowHeight + 14)

      ctx.save()
      ctx.fillStyle = 'rgba(30, 41, 59, 0.75)'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)'
      ctx.lineWidth = 1.5
      roundRect(ctx, itemX, itemY, colWidth, metricRowHeight, 20)
      ctx.fill()
      ctx.stroke()

      // Ícone
      ctx.font = isMultiRow ? '28px -apple-system, sans-serif' : '36px -apple-system, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(item.icon, itemX + 22, itemY + (isMultiRow ? 14 : 20))

      // Label
      ctx.fillStyle = '#94A3B8'
      ctx.font = isMultiRow
        ? '800 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        : '800 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(item.label, itemX + 22, itemY + (isMultiRow ? 46 : 64))

      // Valor
      ctx.fillStyle = '#FFFFFF'
      ctx.font = isMultiRow
        ? '900 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        : '900 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(item.valor, itemX + 22, itemY + (isMultiRow ? 70 : 96))

      // Unidade
      if (item.unidade) {
        const valW = ctx.measureText(item.valor).width
        ctx.fillStyle = item.cor
        ctx.font = isMultiRow
          ? '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          : '800 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        ctx.fillText(` ${item.unidade}`, itemX + 22 + valW, itemY + (isMultiRow ? 82 : 112))
      }
      ctx.restore()
    })
  } else {
    // ─── CENÁRIO B: SEM FOTO (LAYOUT COMPLETO DE MÉTRICAS) ───
    const gridStartX = cardX + 50
    const gridStartY = cardY + 70
    const colWidth = (cardW - 140) / 2
    const rowHeight = 250

    items.forEach((item, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const itemX = gridStartX + col * (colWidth + 40)
      const itemY = gridStartY + row * (rowHeight + 25)

      const isSingleLast = index === items.length - 1 && items.length % 2 === 1 && items.length > 2
      const boxW = isSingleLast ? cardW - 100 : colWidth
      const boxX = isSingleLast ? gridStartX : itemX

      ctx.save()
      ctx.fillStyle = 'rgba(30, 41, 59, 0.6)'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 1.5
      roundRect(ctx, boxX, itemY, boxW, rowHeight, 28)
      ctx.fill()
      ctx.stroke()

      ctx.font = '40px -apple-system, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(item.icon, boxX + 30, itemY + 30)

      ctx.fillStyle = '#94A3B8'
      ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(item.label, boxX + 30, itemY + 95)

      ctx.fillStyle = '#FFFFFF'
      ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(item.valor, boxX + 30, itemY + 145)

      if (item.unidade) {
        const valW = ctx.measureText(item.valor).width
        ctx.fillStyle = item.cor
        ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        ctx.fillText(` ${item.unidade}`, boxX + 30 + valW, itemY + 162)
      }
      ctx.restore()
    })
  }

  // 8. Frase de Impacto no Rodapé do Card
  ctx.save()
  const quoteY = cardY + cardH - 55
  ctx.fillStyle = 'rgba(16, 185, 129, 0.95)'
  ctx.font = 'italic 700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('“A constância vence qualquer obstáculo.”', width / 2, quoteY)
  ctx.restore()

  // 9. Rodapé Oficial
  ctx.save()
  ctx.fillStyle = '#64748B'
  ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('ENDORFINAPP • A Química do Crescimento', width / 2, height - 210)

  ctx.fillStyle = '#10B981'
  ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillText('@endorfinapp', width / 2, height - 165)
  ctx.restore()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Falha ao gerar blob do Canvas'))
      },
      'image/png',
      0.95
    )
  })
}

function drawDefaultBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Gradiente escuro futurista
  const bgGrad = ctx.createLinearGradient(0, 0, width, height)
  bgGrad.addColorStop(0, '#0B1220')
  bgGrad.addColorStop(0.5, '#0F172A')
  bgGrad.addColorStop(1, '#050B14')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // Padrão sutil de malha geométrica
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'
  ctx.lineWidth = 1
  const gridSize = 80
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  ctx.restore()
}

function isMobileDeviceCheck(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /android|iphone|ipad|ipod/i.test(ua) || (window.innerWidth <= 768)
}

/**
 * Dispara o compartilhamento nativo para Instagram Stories no celular ou baixa o arquivo no computador
 */
export async function compartilharStoryCard(
  blob: Blob,
  titulo: string = 'Treino Concluído com Endorfinapp'
): Promise<{ compartilhado: boolean; baixado: boolean }> {
  const file = new File([blob], 'treino-endorfinapp.png', { type: 'image/png' })

  // No celular (iOS/Android), usa Web Share API para abrir diretamente o menu com o app do Instagram
  if (isMobileDeviceCheck() && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: titulo,
        text: 'Treino de hoje pago com o @endorfinapp! 💪⚡🔥 #Endorfinapp #TreinoConcluido',
      })
      return { compartilhado: true, baixado: false }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Usuário cancelou o compartilhamento
        return { compartilhado: false, baixado: false }
      }
      console.warn('Falha no Web Share API, recorrendo a download:', err)
    }
  }

  // No computador ou se Web Share falhar: Download automático do card em alta resolução
  baixarBlobComoArquivo(blob, 'treino-endorfinapp.png')
  return { compartilhado: false, baixado: true }
}

/**
 * Força o download de um Blob como arquivo
 */
export function baixarBlobComoArquivo(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
