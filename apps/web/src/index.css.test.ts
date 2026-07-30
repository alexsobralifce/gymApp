import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('index.css Theme Variables Verification', () => {
  const cssPath = path.resolve(__dirname, 'index.css')
  const cssContent = fs.readFileSync(cssPath, 'utf-8')

  it('must NOT bind night colors to bare :root (mobile cascade bug)', () => {
    expect(cssContent).not.toMatch(/:root\s*,\s*(html)?\[data-mode=["']night["']\]/)
    expect(cssContent).not.toMatch(/(html)?\[data-mode=["']night["']\]\s*,\s*:root/)
  })

  it('should scope mode tokens to html[data-mode] for identical mobile/desktop', () => {
    expect(cssContent).toContain('html[data-mode="day"]')
    expect(cssContent).toContain('html[data-mode="night"]')
    expect(cssContent).toContain('html[data-theme="lime"][data-mode="day"]')
    expect(cssContent).toContain('html[data-theme="lime"][data-mode="night"]')
  })

  it('should define explicit day surface colors for lime theme (white bg)', () => {
    const limeDaySection = cssContent.slice(
      cssContent.indexOf('html[data-theme="lime"][data-mode="day"]'),
      cssContent.indexOf('/* ─── 2. Vermelho'),
    )

    expect(limeDaySection).toContain('--color-surface: #FFFFFF;')
    expect(limeDaySection).toContain('--color-background: #FFFFFF;')
    expect(limeDaySection).toContain('--color-text: #0A1628;')
    expect(limeDaySection).toContain('color-scheme: only light;')
  })

  it('should define explicit night surface colors for lime theme (dark bg)', () => {
    const limeNightSection = cssContent.slice(
      cssContent.indexOf('html[data-theme="lime"][data-mode="night"]'),
      cssContent.indexOf('html[data-theme="lime"][data-mode="day"]'),
    )

    expect(limeNightSection).toContain('--color-surface: #0A1628;')
    expect(limeNightSection).toContain('--color-background: #0A1628;')
    expect(limeNightSection).toContain('--color-card: #122040;')
    expect(limeNightSection).toContain('--color-text: #F7F9FC;')
    expect(limeNightSection).toContain('color-scheme: dark;')
  })

  it('should force html/body/#root background from tokens (viewport-independent)', () => {
    expect(cssContent).toMatch(
      /html\s*,\s*body\s*,\s*#root\s*\{[^}]*background-color:\s*var\(--color-surface\)/s,
    )
  })

  it('day mode uses only light to block Chrome Android Auto Dark', () => {
    expect(cssContent).toContain('html[data-mode="day"]')
    const dayBlock = cssContent.slice(
      cssContent.indexOf('/* ─── Modo Dia'),
      cssContent.indexOf('/* Fallback se data-mode'),
    )
    expect(dayBlock).toContain('color-scheme: only light;')
    expect(dayBlock).toContain('--color-surface: #FFFFFF;')
  })

  it('day mode surfaces must be light (luminance heuristic via hex prefix)', () => {
    const dayBlocks = [
      cssContent.slice(
        cssContent.indexOf('html[data-theme="lime"][data-mode="day"]'),
        cssContent.indexOf('/* ─── 2. Vermelho'),
      ),
      cssContent.slice(
        cssContent.indexOf('html[data-theme="red"][data-mode="day"]'),
        cssContent.indexOf('/* ─── 3. Violeta'),
      ),
      cssContent.slice(
        cssContent.indexOf('html[data-theme="violet"][data-mode="day"]'),
        cssContent.indexOf('/* ─── 4. Laranja'),
      ),
    ]

    for (const block of dayBlocks) {
      const surface = block.match(/--color-surface:\s*(#[0-9A-Fa-f]{6})/)?.[1]
      expect(surface).toBeTruthy()
      const r = parseInt(surface!.slice(1, 3), 16)
      expect(r).toBeGreaterThan(200)
    }
  })

  it('night mode surfaces must be dark', () => {
    const nightBlocks = [
      cssContent.slice(
        cssContent.indexOf('html[data-theme="lime"][data-mode="night"]'),
        cssContent.indexOf('html[data-theme="lime"][data-mode="day"]'),
      ),
      cssContent.slice(
        cssContent.indexOf('html[data-theme="red"][data-mode="night"]'),
        cssContent.indexOf('html[data-theme="red"][data-mode="day"]'),
      ),
      cssContent.slice(
        cssContent.indexOf('html[data-theme="violet"][data-mode="night"]'),
        cssContent.indexOf('html[data-theme="violet"][data-mode="day"]'),
      ),
    ]

    for (const block of nightBlocks) {
      const surface = block.match(/--color-surface:\s*(#[0-9A-Fa-f]{6})/)?.[1]
      expect(surface).toBeTruthy()
      const r = parseInt(surface!.slice(1, 3), 16)
      expect(r).toBeLessThan(40)
    }
  })
})
