// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { vitrineJaVista, marcarVitrineVista } from './vitrineSessao'

describe('vitrineSessao', () => {
  beforeEach(() => sessionStorage.clear())

  it('começa como não vista', () => {
    expect(vitrineJaVista()).toBe(false)
  })

  it('depois de marcada, não reaparece na mesma sessão', () => {
    marcarVitrineVista()
    expect(vitrineJaVista()).toBe(true)
  })
})
