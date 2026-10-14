import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { processarGif, medirEnquadramento, GIF_REGRAS } from '../../src/application/usecases/exercicio/ExercicioGifService.js'

const png = (w: number, h: number) =>
  sharp({ create: { width: w, height: h, channels: 3, background: '#fff' } }).png().toBuffer()

describe('processarGif', () => {
  it('normaliza imagem quadrada para WebP 720×720', async () => {
    const r = await processarGif(await png(1000, 1000))
    const meta = await sharp(r.buffer).metadata()
    expect(meta.format).toBe('webp')
    expect([meta.width, meta.height]).toEqual([GIF_REGRAS.saidaPx, GIF_REGRAS.saidaPx])
    expect(r.animado).toBe(false)
  })

  it('recorta proporção próxima de quadrada (4:3) para quadrado', async () => {
    const r = await processarGif(await png(800, 600))
    const meta = await sharp(r.buffer).metadata()
    expect([meta.width, meta.height]).toEqual([GIF_REGRAS.saidaPx, GIF_REGRAS.saidaPx])
  })

  it('rejeita imagem pequena demais', async () => {
    await expect(processarGif(await png(300, 300))).rejects.toThrow(/mínimo/)
  })

  it('rejeita imagem grande demais', async () => {
    await expect(processarGif(await png(2400, 2400))).rejects.toThrow(/máximo/)
  })

  it('rejeita proporção panorâmica', async () => {
    await expect(processarGif(await png(1600, 500))).rejects.toThrow(/Proporção/)
  })

  it('rejeita arquivo que não é imagem e arquivo vazio', async () => {
    await expect(processarGif(Buffer.from('não sou imagem'))).rejects.toThrow(/inválido/)
    await expect(processarGif(Buffer.alloc(0))).rejects.toThrow(/vazio/)
  })

  it('rejeita arquivo acima do limite de peso', async () => {
    await expect(processarGif(Buffer.alloc(GIF_REGRAS.pesoMaxBytes + 1))).rejects.toThrow(/5 MB/)
  })
})

describe('medirEnquadramento', () => {
  /** Quadro branco 1000×1000 com um retângulo escuro em (x, y, w, h) */
  const comFigura = (x: number, y: number, w: number, h: number) =>
    sharp({ create: { width: 1000, height: 1000, channels: 3, background: '#fff' } })
      .composite([{ input: { create: { width: w, height: h, channels: 3, background: '#222' } }, left: x, top: y }])
      .png()
      .toBuffer()

  it('figura estreita e alta gera recorte em retrato que a contém inteira', async () => {
    const f = (await medirEnquadramento(await comFigura(400, 100, 200, 800)))!
    expect(f.foco_larg).toBeLessThan(0.5)
    expect(f.foco_alt).toBeGreaterThan(0.9)
    // figura (x 0,4–0,6 | y 0,1–0,9) dentro do recorte
    expect(f.foco_x).toBeLessThanOrEqual(0.4)
    expect(f.foco_x + f.foco_larg).toBeGreaterThanOrEqual(0.6)
    expect(f.foco_y).toBeLessThanOrEqual(0.1)
    expect(f.foco_y + f.foco_alt).toBeGreaterThanOrEqual(0.9)
  })

  it('figura baixa e larga gera recorte em paisagem', async () => {
    const f = (await medirEnquadramento(await comFigura(50, 400, 900, 200)))!
    expect(f.foco_alt).toBeLessThan(0.6)
    expect(f.foco_larg).toBeGreaterThan(0.9)
  })

  it('nunca deixa o recorte mais fino que 1:2 nem mais largo que 1,8:1', async () => {
    const fina = (await medirEnquadramento(await comFigura(480, 100, 40, 800)))!
    expect(fina.foco_larg / fina.foco_alt).toBeGreaterThanOrEqual(0.499)
    const larga = (await medirEnquadramento(await comFigura(50, 480, 900, 40)))!
    expect(larga.foco_larg / larga.foco_alt).toBeLessThanOrEqual(1.801)
  })

  it('figura encostada no canto não sai do quadro', async () => {
    const f = (await medirEnquadramento(await comFigura(0, 0, 300, 300)))!
    expect(f.foco_x).toBe(0)
    expect(f.foco_y).toBe(0)
  })

  it('figura que ocupa tudo não amplia', async () => {
    const f = (await medirEnquadramento(await comFigura(20, 20, 960, 960)))!
    expect([f.foco_larg, f.foco_alt]).toEqual([1, 1])
  })

  it('imagem toda branca não tem enquadramento', async () => {
    expect(await medirEnquadramento(await png(800, 800))).toBeNull()
  })
})
