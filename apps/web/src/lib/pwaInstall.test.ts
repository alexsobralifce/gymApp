import { describe, it, expect } from 'vitest'
import { navegadorIOS, deveReexibir, dispensar, lerEstado, DIAS_ENTRE_AVISOS, MAX_DISPENSAS } from './pwaInstall'

const UA_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const UA_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1'
const UA_INSTAGRAM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 320.0.0.0'
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36'

const DIA = 24 * 60 * 60 * 1000

describe('navegadorIOS', () => {
  it('identifica Safari no iPhone', () => {
    expect(navegadorIOS(UA_SAFARI)).toBe('safari')
  })

  it('identifica Chrome no iPhone (CriOS)', () => {
    expect(navegadorIOS(UA_CHROME)).toBe('chrome')
  })

  it('trata navegador de dentro de app (Instagram) como outro', () => {
    expect(navegadorIOS(UA_INSTAGRAM)).toBe('outro')
  })

  it('retorna null fora do iOS', () => {
    expect(navegadorIOS(UA_ANDROID)).toBeNull()
  })
})

describe('deveReexibir', () => {
  const agora = 1_000_000_000_000

  it('mostra quando nunca foi dispensado', () => {
    expect(deveReexibir({ dispensas: 0, ultimaDispensa: null }, agora)).toBe(true)
  })

  it('não mostra logo depois de dispensar', () => {
    expect(deveReexibir({ dispensas: 1, ultimaDispensa: agora - DIA }, agora)).toBe(false)
  })

  it(`volta a mostrar depois de ${DIAS_ENTRE_AVISOS} dias`, () => {
    expect(deveReexibir({ dispensas: 1, ultimaDispensa: agora - DIAS_ENTRE_AVISOS * DIA }, agora)).toBe(true)
  })

  it(`para de mostrar após ${MAX_DISPENSAS} dispensas`, () => {
    expect(deveReexibir({ dispensas: MAX_DISPENSAS, ultimaDispensa: agora - 365 * DIA }, agora)).toBe(false)
  })
})

describe('dispensar', () => {
  it('soma uma dispensa e guarda o momento', () => {
    const agora = 42
    expect(dispensar({ dispensas: 1, ultimaDispensa: 10 }, agora)).toEqual({ dispensas: 2, ultimaDispensa: 42 })
  })
})

describe('lerEstado', () => {
  it('devolve estado zerado quando não há nada salvo', () => {
    expect(lerEstado(null, false)).toEqual({ dispensas: 0, ultimaDispensa: null })
  })

  it('aceita o estado salvo', () => {
    expect(lerEstado('{"dispensas":2,"ultimaDispensa":99}', false)).toEqual({ dispensas: 2, ultimaDispensa: 99 })
  })

  it('ignora conteúdo inválido sem quebrar', () => {
    expect(lerEstado('{lixo', false)).toEqual({ dispensas: 0, ultimaDispensa: null })
  })

  it('converte a dispensa da versão antiga (para sempre) em uma dispensa recente', () => {
    expect(lerEstado(null, true)).toEqual({ dispensas: 1, ultimaDispensa: expect.any(Number) })
  })
})
