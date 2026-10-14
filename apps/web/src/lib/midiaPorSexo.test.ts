import { describe, it, expect } from 'vitest'
import { midiaPorSexo, temFiguraDoSexo } from './midiaPorSexo'

const base = {
  gif_url: '/principal.webp',
  foco_x: 0.1, foco_y: 0.1, foco_larg: 0.5, foco_alt: 0.9,
  variantes: { FEMININO: { gif_url: '/mulher.webp', foco_x: 0.2, foco_y: 0, foco_larg: 0.6, foco_alt: 1 } },
}

describe('midiaPorSexo', () => {
  it('aluna vê a versão feminina com o enquadramento dela', () => {
    const r = midiaPorSexo(base, 'FEMININO')
    expect(r.gif_url).toBe('/mulher.webp')
    expect([r.foco_x, r.foco_larg]).toEqual([0.2, 0.6])
  })

  it('aluno sem versão masculina vê o GIF principal', () => {
    expect(midiaPorSexo(base, 'MASCULINO')).toBe(base)
  })

  it('sem sexo informado vê o GIF principal', () => {
    expect(midiaPorSexo(base, null)).toBe(base)
    expect(midiaPorSexo(base, undefined)).toBe(base)
  })

  it('exercício sem variantes não muda', () => {
    const ex = { gif_url: '/a.webp' }
    expect(midiaPorSexo(ex, 'FEMININO')).toBe(ex)
  })

  it('versão sem enquadramento não herda o recorte do GIF principal', () => {
    const r = midiaPorSexo({ ...base, variantes: { FEMININO: { gif_url: '/m.webp' } } }, 'FEMININO')
    expect([r.foco_x, r.foco_larg, r.foco_alt]).toEqual([null, null, null])
  })
})

describe('temFiguraDoSexo', () => {
  it('conta o GIF principal marcado e as versões', () => {
    expect(temFiguraDoSexo({ sexo_figura: 'FEMININO' }, 'FEMININO')).toBe(true)
    expect(temFiguraDoSexo(base, 'FEMININO')).toBe(true)
    expect(temFiguraDoSexo(base, 'MASCULINO')).toBe(false)
    expect(temFiguraDoSexo({ sexo_figura: 'MASCULINO' }, 'MASCULINO')).toBe(true)
  })
})
