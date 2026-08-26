import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('DemoTreino — UX-011 demo interativa', () => {
  const src = fs.readFileSync(path.resolve(__dirname, 'DemoTreino.tsx'), 'utf-8')

  it('deve conter 3 exercícios de demonstração com dados PT-BR', () => {
    expect(src).toContain('DEMO_EXERCICIOS')
    for (const nome of ['Supino Reto', 'Agachamento', 'Rosca Direta com Barra']) {
      expect(src).toContain(nome)
    }
    // mídia via CDN do gifdotreino (mesmo padrão do sync-gifdotreino.ts)
    expect(src).toContain('gifdotreino.com')
  })

  it('deve registrar séries localmente, sem chamadas de rede', () => {
    expect(src).toContain('Registrar série')
    expect(src).toContain('totalSeries')
    expect(src).not.toMatch(/fetch\(/)
    expect(src).not.toMatch(/axios/)
  })

  it('deve exibir progresso X/3 séries concluídas', () => {
    expect(src).toContain('séries concluídas')
    expect(src).toContain('META_SERIES = 3')
  })

  it('deve oferecer descanso visual de 60s pausável', () => {
    expect(src).toContain('TEMPO_DESCANSO = 60')
    expect(src).toContain('Pausar descanso')
    expect(src).toContain('Pular')
  })

  it('deve mostrar conversão para criar conta após 3 séries', () => {
    expect(src).toContain('Crie sua conta para salvar seu progresso')
    expect(src).toMatch(/navigate\('\/register'\)/)
    expect(src).toMatch(/navigate\('\/login'\)/)
  })

  it('deve respeitar prefers-reduced-motion', () => {
    expect(src).toContain("'(prefers-reduced-motion: reduce)'")
  })

  it('deve usar ImageWithFallback para degradar sem a API', () => {
    expect(src).toContain('ImageWithFallback')
  })

  it('não deve persistir nada em localStorage', () => {
    expect(src).not.toMatch(/localStorage/)
  })
})
