// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractWorkoutGifUrls,
  preloadWorkoutGifs,
  isMobileDevice,
} from './offlineGifPreloader'

describe('offlineGifPreloader', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('extractWorkoutGifUrls extrai URLs únicas e válidas de exercícios', () => {
    const urls = extractWorkoutGifUrls([
      { exercicio: { gif_url: 'https://www.gifdotreino.com/Exercicios/Ombros/Desenvolvimento.gif' } },
      { exercicio: { imagem_url: 'https://www.gifdotreino.com/Exercicios/Ombros/Desenvolvimento.gif' } }, // duplicado
      { exercicio: { gif_url: 'https://www.gifdotreino.com/Exercicios/Peito/Supino.gif' } },
      { exercicio: undefined },
    ])

    expect(urls).toHaveLength(2)
    expect(urls[0]).toContain('Desenvolvimento.gif')
    expect(urls[1]).toContain('Supino.gif')
  })

  it('preloadWorkoutGifs utiliza fetch com mode: no-cors e aceita respostas opaque', async () => {
    const mockPut = vi.fn().mockResolvedValue(undefined)
    const mockMatch = vi.fn().mockResolvedValue(null)
    const mockCache = {
      match: mockMatch,
      put: mockPut,
    }

    ;(window as any).caches = {
      open: vi.fn().mockResolvedValue(mockCache),
    }

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      type: 'opaque',
      clone: () => ({ type: 'opaque' }),
    })
    global.fetch = fetchSpy

    const progress = await preloadWorkoutGifs([
      'https://www.gifdotreino.com/Exercicios/Ombros/Desenvolvimento.gif',
    ])

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://www.gifdotreino.com/Exercicios/Ombros/Desenvolvimento.gif',
      expect.objectContaining({ mode: 'no-cors' })
    )
    expect(mockPut).toHaveBeenCalled()
    expect(progress.cached).toBe(1)
    expect(progress.isComplete).toBe(true)
  })

  it('isMobileDevice identifica corretamente mobile UA', () => {
    const originalUA = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)',
      configurable: true,
    })

    expect(isMobileDevice()).toBe(true)

    Object.defineProperty(navigator, 'userAgent', {
      value: originalUA,
      configurable: true,
    })
  })
})
