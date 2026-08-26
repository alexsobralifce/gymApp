import { describe, it, expect } from 'vitest'
import { resolveMediaUrl, resolveExerciseMedia } from './media'

describe('Validação de Mídia e URLs de GIFs (Frontend - media.ts)', () => {
  it('retorna null para valores nulos, vazios ou indefinidos', () => {
    expect(resolveMediaUrl(null)).toBeNull()
    expect(resolveMediaUrl(undefined)).toBeNull()
    expect(resolveMediaUrl('')).toBeNull()
    expect(resolveMediaUrl('   ')).toBeNull()
    expect(resolveMediaUrl('null')).toBeNull()
    expect(resolveMediaUrl('undefined')).toBeNull()
  })

  it('preserva URLs completas HTTPS e força HTTPS em URLs HTTP inseguras', () => {
    const httpsUrl = 'https://www.gifdotreino.com/Exercicios/Peito/supino.gif'
    expect(resolveMediaUrl(httpsUrl)).toBe(httpsUrl)

    const httpUrl = 'http://www.gifdotreino.com/Exercicios/Peito/supino.gif'
    expect(resolveMediaUrl(httpUrl)).toBe('https://www.gifdotreino.com/Exercicios/Peito/supino.gif')
  })

  it('codifica espaços e caracteres especiais em português na URL para evitar erro no WebKit/Safari', () => {
    const rawUrl = 'https://www.gifdotreino.com/Exercicios/Glúteos/Abdução Lateral.gif'
    const resolved = resolveMediaUrl(rawUrl)
    expect(resolved).not.toBeNull()
    expect(resolved).toContain('Gl%C3%BAteos')
    expect(resolved).toContain('Abdu%C3%A7%C3%A3o')
    expect(resolved).toContain('%20')
  })

  it('prefixa caminhos relativos com a URL base da API e preserva HTTP em localhost', () => {
    const relativePath = '/exercises/gdrive/ABS_alternado_1_.gif'
    const resolved = resolveMediaUrl(relativePath)

    expect(resolved).not.toBeNull()
    expect(resolved).toContain('/exercises/gdrive/ABS_alternado_1_.gif')
  })

  it('não converte http://localhost para https:// (evita erro de protocolo SSL local)', () => {
    const localUrl = 'http://localhost:3333/exercises/gdrive/ABS_infra_1_.gif'
    const resolved = resolveMediaUrl(localUrl)
    expect(resolved).toBe('http://localhost:3333/exercises/gdrive/ABS_infra_1_.gif')
  })

  it('resolveExerciseMedia prioriza preferGif quando solicitado', () => {
    const thumb = '/exercises/images/thumb.jpg'
    const gif = '/exercises/videos/animacao.gif'

    // Quando preferGif for true e gifUrl existir, deve retornar o GIF
    const comPref = resolveExerciseMedia(thumb, gif, true)
    expect(comPref).toContain('animacao.gif')

    // Quando preferGif for false, prioriza o thumbnail para economia de banda
    const semPref = resolveExerciseMedia(thumb, gif, false)
    expect(semPref).toContain('thumb.jpg')

    // Fallback: se não tiver imagemUrl, usa o gifUrl mesmo sem preferGif
    const apenasGif = resolveExerciseMedia(null, gif, false)
    expect(apenasGif).toContain('animacao.gif')
  })

  it('suporta Data URIs (base64) sem corrompê-las', () => {
    const dataUri = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    expect(resolveMediaUrl(dataUri)).toBe(dataUri)
  })
})
