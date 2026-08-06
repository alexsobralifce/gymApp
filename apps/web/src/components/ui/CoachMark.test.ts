import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('CoachMark — regressões', () => {
  const src = fs.readFileSync(path.resolve(__dirname, 'CoachMark.tsx'), 'utf-8')

  it('checkAndShow não re-exibe depois de visto (guard hasSeenCoach)', () => {
    expect(src).toMatch(/if \(hasSeenCoach\(\)\)\s*\{[\s\S]*?disconnect\(\)/)
  })

  it('dismiss desconecta o MutationObserver', () => {
    const dismissBlock = src.slice(src.indexOf('function dismiss'))
    expect(dismissBlock).toMatch(/markCoachSeen\(\)/)
    expect(dismissBlock).toMatch(/observerRef\.current\?\.disconnect\(\)/)
  })

  it('overlay sem véu escuro (pointer-events-none no container)', () => {
    const overlayBlock = src.slice(src.indexOf('CoachMarkOverlay'))
    expect(overlayBlock).toMatch(/pointer-events-none/)
    expect(overlayBlock).not.toContain('bg-black/50')
  })
})
