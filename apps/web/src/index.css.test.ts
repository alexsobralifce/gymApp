import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('index.css Theme Variables Verification', () => {
  const cssPath = path.resolve(__dirname, 'index.css')
  const cssContent = fs.readFileSync(cssPath, 'utf-8')

  it('should define explicit day surface colors for lime theme in data-mode="day"', () => {
    const limeDaySection = cssContent.slice(
      cssContent.indexOf('[data-theme="lime"][data-mode="day"]'),
      cssContent.indexOf('/* ─── 2. Vermelho')
    )

    expect(limeDaySection).toContain('--color-surface: #E4E6ED;')
    expect(limeDaySection).toContain('--color-background: #E4E6ED;')
    expect(limeDaySection).toContain('--color-card: #EDEFF4;')
    expect(limeDaySection).toContain('--color-text: #0A1628;')
  })

  it('should define explicit night surface colors for lime theme in data-mode="night"', () => {
    const limeNightSection = cssContent.slice(
      cssContent.indexOf('[data-theme="lime"][data-mode="night"]'),
      cssContent.indexOf('[data-theme="lime"][data-mode="day"]')
    )

    expect(limeNightSection).toContain('--color-surface: #0A1628;')
    expect(limeNightSection).toContain('--color-background: #0A1628;')
    expect(limeNightSection).toContain('--color-card: #122040;')
    expect(limeNightSection).toContain('--color-text: #F7F9FC;')
  })
})
