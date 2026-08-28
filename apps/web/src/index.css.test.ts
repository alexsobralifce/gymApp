import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('index.css — Tema único Azul (Blue)', () => {
  const cssPath = path.resolve(__dirname, 'index.css')
  const cssContent = fs.readFileSync(cssPath, 'utf-8')

  it('must NOT bind night colors to bare :root (mobile cascade bug)', () => {
    expect(cssContent).not.toMatch(/:root\s*,\s*(html)?\[data-mode=["']night["']\]/)
    expect(cssContent).not.toMatch(/(html)?\[data-mode=["']night["']\]\s*,\s*:root/)
  })

  it('must contain only blue theme (no lime/red/violet/orange)', () => {
    expect(cssContent).toContain('html[data-theme="blue"]')
    expect(cssContent).not.toContain('html[data-theme="lime"]')
    expect(cssContent).not.toContain('html[data-theme="red"]')
    expect(cssContent).not.toContain('html[data-theme="violet"]')
    expect(cssContent).not.toContain('html[data-theme="orange"]')
  })

  it('should scope mode tokens to html[data-mode] for identical mobile/desktop', () => {
    expect(cssContent).toContain('html[data-mode="day"]')
    expect(cssContent).toContain('html[data-mode="night"]')
    expect(cssContent).toContain('html[data-theme="blue"][data-mode="day"]')
    expect(cssContent).toContain('html[data-theme="blue"][data-mode="night"]')
  })

  it('should define explicit day surface colors for blue theme (white bg)', () => {
    const blueDaySection = cssContent.slice(
      cssContent.indexOf('html[data-theme="blue"][data-mode="day"]'),
      cssContent.indexOf('/* ─── Animações'),
    )

    expect(blueDaySection).toContain('--color-surface: #FFFFFF;')
    expect(blueDaySection).toContain('--color-background: #FFFFFF;')
    expect(blueDaySection).toContain('--color-text: #0B1220;')
    expect(blueDaySection).toContain('color-scheme: only light;')
  })

  it('should define explicit night surface colors for blue theme (dark bg)', () => {
    const blueNightSection = cssContent.slice(
      cssContent.indexOf('html[data-theme="blue"][data-mode="night"]'),
      cssContent.indexOf('html[data-theme="blue"][data-mode="day"]'),
    )

    expect(blueNightSection).toContain('--color-surface: #0B1220;')
    expect(blueNightSection).toContain('--color-background: #0B1220;')
    expect(blueNightSection).toContain('--color-card: #111C33;')
    expect(blueNightSection).toContain('--color-text: #F5F8FF;')
    expect(blueNightSection).toContain('color-scheme: dark;')
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

  it('blue day surface must be light (luminance heuristic)', () => {
    const dayBlock = cssContent.slice(
      cssContent.indexOf('html[data-theme="blue"][data-mode="day"]'),
      cssContent.indexOf('/* ─── Animações'),
    )
    const surface = dayBlock.match(/--color-surface:\s*(#[0-9A-Fa-f]{6})/)?.[1]
    expect(surface).toBeTruthy()
    const r = parseInt(surface!.slice(1, 3), 16)
    expect(r).toBeGreaterThan(200)
  })

  it('blue night surface must be dark', () => {
    const nightBlock = cssContent.slice(
      cssContent.indexOf('html[data-theme="blue"][data-mode="night"]'),
      cssContent.indexOf('html[data-theme="blue"][data-mode="day"]'),
    )
    const surface = nightBlock.match(/--color-surface:\s*(#[0-9A-Fa-f]{6})/)?.[1]
    expect(surface).toBeTruthy()
    const r = parseInt(surface!.slice(1, 3), 16)
    expect(r).toBeLessThan(40)
  })
})
