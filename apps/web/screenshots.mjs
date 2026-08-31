import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const EMAIL = 'teste-local@endorfinapp.com'
const SENHA = 'Teste@123'
const BASE = 'http://localhost:5173'
const OUT = 'public/screenshots-play'
const VIEWPORT = { width: 405, height: 720 }

const MODAL_KEYS = [
  'gymapp_onboarding_seen',
  'gymapp_welcome_seen',
  'gymapp_first_workout_done',
  'gymapp_system_evaluation_done',
  'gymapp_benefits_tour_seen',
  'gymapp_onboarding_permissions_done',
  'gymapp_notif_prompt_dismissed',
]

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
    locale: 'pt-BR',
    permissions: [],
  })
  const page = await ctx.newPage()

  // Suprime todo modal via localStorage (precisa estar na origem antes de setar)
  await page.goto(BASE + '/login', { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await page.evaluate((keys) => {
    keys.forEach((k) => localStorage.setItem(k, 'true'))
    localStorage.setItem('gymapp_notif_prompt_dismissed', new Date().toISOString())
  }, MODAL_KEYS)

  await page.locator('input[type="email"]').first().fill(EMAIL)
  await page.locator('input[type="password"]').first().fill(SENHA)
  await page.locator('input[type="password"]').first().press('Enter')
  await page.waitForTimeout(6500)
  console.log('URL pós-login:', page.url())

  const telas = [
    ['1-dashboard', '/'],
    ['2-meus-treinos', '/meus-treinos'],
    ['3-treino-ia', '/treino/ia'],
    ['4-medidas', '/medidas'],
    ['5-evolucao', '/evolucao'],
    ['6-feed', '/feed'],
  ]

  for (const [nome, rota] of telas) {
    await page.goto(BASE + rota, { waitUntil: 'load' }).catch(() => {})
    await page.waitForTimeout(4500)
    const info = await page.evaluate(() => {
      const modais = Array.from(document.querySelectorAll('div.fixed')).map((d) => (d.className || '').slice(0, 45))
      return {
        modais,
        h1: Array.from(document.querySelectorAll('h1, h2')).slice(0, 3).map((h) => h.textContent?.trim().slice(0, 40)),
      }
    })
    await page.screenshot({ path: `${OUT}/${nome}.png` })
    console.log(`=== ${nome} (${rota}) ===\n  h1/h2: ${JSON.stringify(info.h1)}\n  modais: ${JSON.stringify(info.modais)}`)
    await page.waitForTimeout(2500)
  }

  // Fluxo do treino: detalhe via link real
  await page.goto(BASE + '/meus-treinos', { waitUntil: 'load' })
  await page.waitForTimeout(4000)
  const linkTreino = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find((x) => (x.getAttribute('href') || '').includes('/treino/') && !(x.getAttribute('href') || '').includes('execucao'))
    return a ? a.getAttribute('href') : null
  })
  console.log('href do treino:', linkTreino)
  if (linkTreino) {
    await page.goto(BASE + linkTreino, { waitUntil: 'load' })
    await page.waitForTimeout(4200)
    await page.screenshot({ path: `${OUT}/7-treino-detalhe.png` })
    console.log('=== 7-treino-detalhe capturado ===' + page.url())
    await page.waitForTimeout(2000)
  } else {
    console.log('href do treino não encontrado — pulando detalhe')
  }

  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })