export interface StoryData {
  treinoNome: string
  duracaoFormatada: string
  volumeKg?: number
  seriesConcluidas?: number
  calorias?: number
  bpmMedio?: number
  bpmMax?: number
  data?: string
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
  if (fotoSrc) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Erro ao carregar imagem'))
        img.src = fotoSrc
      })

      // Desenhar foto ajustada com cover
      const imgAspect = img.width / img.height
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

      ctx.drawImage(img, offsetX, offsetY, renderW, renderH)

      // Overlay escuro com vinheta para garantir contraste e legibilidade
      const overlayGrad = ctx.createLinearGradient(0, 0, 0, height)
      overlayGrad.addColorStop(0, 'rgba(11, 18, 32, 0.85)')
      overlayGrad.addColorStop(0.35, 'rgba(11, 18, 32, 0.55)')
      overlayGrad.addColorStop(0.65, 'rgba(11, 18, 32, 0.70)')
      overlayGrad.addColorStop(1, 'rgba(11, 18, 32, 0.95)')
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

  // 3. Header com Logotipo
  drawBrandLogo(ctx, width / 2, 170)

  // 4. Badge "TREINO PAGO / CONCLUÍDO"
  ctx.save()
  const badgeW = 340
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
  ctx.font = '800 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const dataTxt = data.data ?? new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()
  ctx.fillText(`⚡ TREINO CONCLUÍDO • ${dataTxt}`, width / 2, badgeY + badgeH / 2)
  ctx.restore()

  // 5. Nome do Treino em Destaque
  ctx.save()
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '900 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
  ctx.shadowBlur = 20

  const maxTitleWidth = width - 160
  let titulo = data.treinoNome || 'Treino do Dia'
  if (ctx.measureText(titulo).width > maxTitleWidth) {
    ctx.font = '900 50px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }
  ctx.fillText(titulo, width / 2, 400)
  ctx.restore()

  // 6. Card Principal de Métricas (Glassmorphism Dark)
  const cardX = 90
  const cardY = 500
  const cardW = width - 180
  const cardH = 920

  ctx.save()
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.lineWidth = 2.5
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
  ctx.shadowBlur = 40
  roundRect(ctx, cardX, cardY, cardW, cardH, 40)
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

  // Desenhar Métricas em formato 2 colunas ou blocos
  const gridStartX = cardX + 50
  const gridStartY = cardY + 70
  const colWidth = (cardW - 140) / 2
  const rowHeight = 250

  items.forEach((item, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const itemX = gridStartX + col * (colWidth + 40)
    const itemY = gridStartY + row * (rowHeight + 25)

    // Se for o último e for ímpar, centralizar ou estender
    const isSingleLast = index === items.length - 1 && items.length % 2 === 1 && items.length > 2

    const boxW = isSingleLast ? cardW - 100 : colWidth
    const boxX = isSingleLast ? gridStartX : itemX

    ctx.save()
    // Mini card da métrica
    ctx.fillStyle = 'rgba(30, 41, 59, 0.6)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1.5
    roundRect(ctx, boxX, itemY, boxW, rowHeight, 28)
    ctx.fill()
    ctx.stroke()

    // Ícone
    ctx.font = '40px -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(item.icon, boxX + 30, itemY + 30)

    // Label
    ctx.fillStyle = '#94A3B8'
    ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(item.label, boxX + 30, itemY + 95)

    // Valor
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(item.valor, boxX + 30, itemY + 145)

    // Unidade
    if (item.unidade) {
      const valW = ctx.measureText(item.valor).width
      ctx.fillStyle = item.cor
      ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(` ${item.unidade}`, boxX + 30 + valW, itemY + 162)
    }

    ctx.restore()
  })

  // 8. Frase de Impacto no Rodapé do Card
  ctx.save()
  const quoteY = cardY + cardH - 100
  ctx.fillStyle = 'rgba(16, 185, 129, 0.9)'
  ctx.font = 'italic 700 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
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
  ctx.fillText('ENDORFINAPP • A Química do Crescimento', width / 2, height - 260)

  ctx.fillStyle = '#10B981'
  ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillText('@endorfinapp', width / 2, height - 210)
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

/**
 * Dispara o compartilhamento nativo para Instagram Stories ou baixa o arquivo
 */
export async function compartilharStoryCard(
  blob: Blob,
  titulo: string = 'Treino Concluído com Endorfinapp'
): Promise<{ compartilhado: boolean; baixado: boolean }> {
  const file = new File([blob], 'treino-endorfinapp.png', { type: 'image/png' })

  // Tenta usar Web Share API se suportar arquivos
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
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

  // Fallback: Download automático do arquivo
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
