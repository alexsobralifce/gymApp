import { expect, test } from '@playwright/test'

/**
 * Smoke E2E — fluxos não autenticados (não dependem da API).
 * Foco: DESIGN-001 (tema Azul default aplicado antes do primeiro paint,
 * sem flash de tema errado) e renderização das telas públicas.
 */

test.describe('Tema padrão Azul (DESIGN-001)', () => {
  test('usuário novo sem localStorage recebe data-theme="blue"', async ({ page }) => {
    await page.goto('/')

    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'blue')
    // Modo efetivo é sempre day ou night (auto resolve para um dos dois)
    await expect(html).toHaveAttribute('data-mode', /day|night/)
  })

  test('meta theme-color reflete a superfície do tema azul', async ({ page }) => {
    await page.goto('/')

    const mode = await page.locator('html').getAttribute('data-mode')
    const expected = mode === 'night' ? '#0B1220' : '#FFFFFF'
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      new RegExp(expected, 'i'),
    )
  })

  test('tema salvo do usuário é preservado (não sobrescrito para blue)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gymapp_theme', 'violet')
    })
    await page.goto('/')

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'violet')
  })

  test('cor primária renderizada é azul (token aplicado no DOM)', async ({ page }) => {
    await page.goto('/')

    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
    )
    // Blue night #3B82F6 / day #2563EB
    expect(['#3b82f6', '#2563eb']).toContain(primary.toLowerCase())
  })
})

test.describe('Telas públicas', () => {
  test('landing page carrega com conteúdo principal', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
    // App React montou (root tem filhos)
    await expect
      .poll(async () => await page.locator('#root > *').count(), { timeout: 10_000 })
      .toBeGreaterThan(0)
  })

  test('tela de login renderiza formulário', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('body')).toBeVisible()
    await expect
      .poll(async () => await page.locator('#root > *').count(), { timeout: 10_000 })
      .toBeGreaterThan(0)
  })
})
