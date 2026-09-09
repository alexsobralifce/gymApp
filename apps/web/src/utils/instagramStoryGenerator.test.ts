// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { gerarStoryImage, baixarBlobComoArquivo } from './instagramStoryGenerator'

describe('instagramStoryGenerator', () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    // Mock HTMLCanvasElement e 2D context no happy-dom
    const mockContext = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      arcTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      clip: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      roundRect: vi.fn(),
    }

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockContext as any)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback: any, type?: string) {
      callback(new Blob(['mock-png-data'], { type: type || 'image/png' }))
    })
  })

  it('gera Story Card 9:16 oficial mesmo sem foto do usuário', async () => {
    const blob = await gerarStoryImage({
      treinoNome: 'Treino de Peitoral e Tríceps',
      duracaoFormatada: '52 min',
      volumeKg: 4200,
      seriesConcluidas: 16,
      alunoNome: 'Carlos Silva',
    })

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
  })

  it('gera Story Card 9:16 desenhando a foto do usuário internamente quando fornecida', async () => {
    // Mock do Image constructor
    const originalImage = global.Image
    class MockImage {
      crossOrigin = ''
      src = ''
      width = 800
      height = 600
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 10)
      }
    }
    global.Image = MockImage as any

    const blob = await gerarStoryImage(
      {
        treinoNome: 'Treino de Costas e Bíceps',
        duracaoFormatada: '48 min',
        volumeKg: 3800,
        seriesConcluidas: 14,
        alunoNome: 'Ana Souza',
      },
      'https://gymapp.test/uploads/foto-treino.jpg'
    )

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')

    global.Image = originalImage
  })

  it('baixarBlobComoArquivo cria link temporário e dispara download', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    const blob = new Blob(['teste'], { type: 'image/png' })
    baixarBlobComoArquivo(blob, 'treino-teste.png')

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(appendChildSpy).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalled()
  })
})
