import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { processarLogo } from '../../src/application/usecases/academia/LogoService.js'

const img = (w: number, h: number, fmt: 'png' | 'jpeg' | 'webp' | 'gif' = 'png') =>
  sharp({ create: { width: w, height: h, channels: 4, background: { r: 200, g: 30, b: 30, alpha: 1 } } })
    [fmt === 'gif' ? 'gif' : fmt]()
    .toBuffer()

describe('processarLogo', () => {
  it('aceita PNG quadrado e reduz para no máximo 800px', async () => {
    const out = await processarLogo(await img(1600, 1600))
    const meta = await sharp(out).metadata()
    expect(meta.format).toBe('png')
    expect(meta.width).toBe(800)
  })

  it('não amplia logo menor que 800px', async () => {
    const meta = await sharp(await processarLogo(await img(500, 500))).metadata()
    expect(meta.width).toBe(500)
  })

  it('aceita JPG e WebP horizontais (3:1) e converte para PNG', async () => {
    for (const f of ['jpeg', 'webp'] as const) {
      const meta = await sharp(await processarLogo(await img(1200, 400, f))).metadata()
      expect(meta.format).toBe('png')
    }
  })

  it('rejeita imagem menor que 400px', async () => {
    await expect(processarLogo(await img(300, 300))).rejects.toThrow(/mínimo 400/)
  })

  it('rejeita imagem maior que 2000px', async () => {
    await expect(processarLogo(await img(2400, 2000))).rejects.toThrow(/máximo 2000/)
  })

  it('rejeita proporção fora de 1:1 a 3:1 (vertical ou muito larga)', async () => {
    await expect(processarLogo(await img(400, 800))).rejects.toThrow(/Proporção/)
    await expect(processarLogo(await img(1600, 400))).rejects.toThrow(/Proporção/)
  })

  it('rejeita GIF e arquivo que não é imagem', async () => {
    await expect(processarLogo(await img(500, 500, 'gif'))).rejects.toThrow(/Formato/)
    await expect(processarLogo(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).rejects.toThrow(/inválido|não suportado/)
  })

  it('rejeita arquivo acima de 2 MB', async () => {
    await expect(processarLogo(Buffer.alloc(2 * 1024 * 1024 + 1))).rejects.toThrow(/2 MB/)
  })
})
