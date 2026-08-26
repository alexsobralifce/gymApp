import { expect, test, type Page } from '@playwright/test'
import { apiDisponivel, seedUserComTreino, API_URL, type UsuarioSeedado } from './helpers'

/**
 * E2E autenticado (dev local, exige API em :3333 — Postgres + Redis).
 * Rode com `E2E_FULL=1 npx playwright test e2e/authenticated.spec.ts` ou
 * `npm run test:e2e:auth` (a partir de apps/web).
 *
 * Fluxo coberto: login → meta semanal (UX-003) → hero "Iniciar Treino" →
 * execução + registro de série → troca de exercício preservando séries (UX-004).
 *
 * O seed é feito UMA vez no beforeAll via API (um único usuário, pois o
 * endpoint /auth/register tem rate limit de 3/min por IP). Cada teste usa um
 * context novo; os testes 2+ injetam os tokens do seed via addInitScript
 * (storageState dinâmico) para não estourar o rate limit de login.
 */

let seed: UsuarioSeedado | null = null
let apiUp = false

test.describe('E2E autenticado', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    apiUp = await apiDisponivel(API_URL)
    test.skip(!apiUp, 'API local não disponível — rode docker compose up -d e npm run dev:api (E2E_FULL=1)')
    seed = await seedUserComTreino(API_URL)
  })

  /** Injeta a sessão do seed + dispensa overlays de onboarding/coach que bloqueiam a UI. */
  async function autenticar(page: Page) {
    // Reduz o volume de requests contra a API local: a API tem rate limit global
    // de 100 req/min (apps/api/src/app.ts). Os GIFs de exercício e o polling de
    // atividade do AppShell não são necessários para as asserções deste spec.
    await page.route('**/exercises/**', (route) => route.abort())
    await page.route('**/social/mural/atividade', (route) =>
      route.fulfill({ json: { totalComentarios: 0 } }),
    )

    await page.addInitScript(
      (args) => {
        localStorage.setItem('accessToken', args.accessToken)
        localStorage.setItem('refreshToken', args.refreshToken)
        localStorage.setItem('gymapp_user', JSON.stringify(args.user))
        localStorage.setItem('gymapp_onboarding_seen', 'true')
        localStorage.setItem('gymapp_onboarding_permissions_done', 'true')
        localStorage.setItem('gymapp_first_workout_done', 'true')
        // Headless Chromium não concede a permissão de notificação (fica 'denied'),
        // o que faria o NotificationPrompt cobrir a tela. Fake 'granted' deixa o
        // subscribeAndSave falhar silenciosamente e esconde o prompt.
        try {
          Object.defineProperty(Notification, 'permission', { get: () => 'granted', configurable: true })
        } catch {
          /* permíssivel: se não der para redefinir, o prompt pode aparecer e é dispensado */
        }
      },
      { accessToken: seed!.accessToken, refreshToken: seed!.refreshToken, user: seed!.user },
    )
  }

  test('1. Login — email/senha redireciona e grava accessToken', async ({ page }) => {
    await page.goto('/login')

    await page.locator('#email').fill(seed!.email)
    await page.locator('#senha').fill(seed!.senha)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()

    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
    const token = await page.evaluate(() => localStorage.getItem('accessToken'))
    expect(token).toBeTruthy()
  })

  test('2. Meta semanal — stepper muda para 5, salva e persiste no reload (UX-003)', async ({ page }) => {
    await autenticar(page)
    await page.goto('/dados')

    const inputMeta = page.locator('#meta-semanal')
    await expect(inputMeta).toHaveValue('3', { timeout: 15_000 })

    const aumentar = page.getByRole('button', { name: 'Aumentar meta semanal de treinos' })
    await aumentar.click()
    await aumentar.click()
    await expect(inputMeta).toHaveValue('5')

    await page.getByRole('button', { name: 'Salvar Preferências' }).click()
    await expect(page.getByText('Preferências e restrições atualizadas!')).toBeVisible({ timeout: 10_000 })

    await page.reload()
    await expect(inputMeta).toHaveValue('5', { timeout: 15_000 })
  })

  test('3. Hero CTA — "Iniciar Treino" navega para /treino/:id/inicio', async ({ page }) => {
    await autenticar(page)
    await page.goto('/')

    const iniciar = page.getByRole('button', { name: 'Iniciar Treino' }).first()
    await expect(iniciar).toBeVisible({ timeout: 15_000 })
    await iniciar.click()

    await expect(page).toHaveURL(new RegExp(`/treino/${seed!.treinoId}/inicio`))
  })

  test('4. Execução — inicia pelo TreinoInicio e registra uma série', async ({ page }) => {
    await autenticar(page)
    await page.goto(`/treino/${seed!.treinoId}/inicio`)

    await page.getByRole('button', { name: 'Comecar Treino' }).click()
    await expect(page).toHaveURL(new RegExp(`/treino/${seed!.treinoId}/execucao`), { timeout: 15_000 })

    // Primeira série do primeiro exercício
    const carga = page.locator('input[placeholder="Kg"]').first()
    const reps = page.locator('input[placeholder="Reps"]').first()
    await expect(carga).toBeVisible({ timeout: 15_000 })

    await carga.fill('25')
    await reps.fill('10')
    await page.locator('button').filter({ hasText: /^✓$/ }).first().click()

    // Feedback real: o input da série registrada é desabilitado e mostra o check verde
    await expect(carga).toBeDisabled({ timeout: 10_000 })
  })

  test('5. Troca de exercício — drawer com alternativas, confirmação e nome atualizado in place (UX-004)', async ({ page }) => {
    await autenticar(page)

    // Retoma a sessão deixada EM_EXECUCAO pelo teste 4 (série 1 já registrada)
    await page.goto(`/treino/${seed!.treinoId}/execucao`)

    const primeiroCard = page.locator('.rounded-2xl.border.overflow-hidden.shadow-sm').first()
    await expect(primeiroCard).toBeVisible({ timeout: 15_000 })
    const nomeAntigo =
      (await primeiroCard.locator('p.text-sm.font-bold.text-text.truncate').textContent())?.trim() ?? ''

    const trocar = page.getByRole('button', { name: 'Trocar exercício' }).first()

    // Defensivo: se a retomada da sessão esbarrou em rate limit (HTTP 500) e o
    // app tentou voltar para /inicio, o router bloqueia e abre o modal "Sair do
    // treino". Cancelar o modal mantém a execução ativa e permite seguir.
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const sairModal = page.getByRole('heading', { name: 'Sair do treino' })
      if (await sairModal.isVisible().catch(() => false)) {
        await page.getByRole('button', { name: 'Continuar treinando' }).click()
        await page.waitForTimeout(300)
      }
      try {
        await trocar.click({ timeout: 3_000 })
        break
      } catch {
        if (tentativa === 4) throw new Error('Não foi possível abrir a substituição (modal "Sair do treino" persistente)')
      }
    }

    const drawer = page.locator('div.fixed.inset-0.z-40')
    await expect(drawer.getByText('Substituir Exercício')).toBeVisible()
    await expect(page.getByText(/alternativas? disponíveis/)).toBeVisible({ timeout: 15_000 })

    // Escolhe a primeira alternativa com nome diferente do atual (evita duplicata de nome)
    const alternativas = drawer.locator('.overflow-y-auto button[type="button"]')
    const total = await alternativas.count()
    let indice = -1
    let nomeAlternativa = ''
    for (let i = 0; i < total; i++) {
      const nome = (await alternativas.nth(i).locator('p').first().textContent())?.trim() ?? ''
      if (nome && nome !== nomeAntigo) {
        indice = i
        nomeAlternativa = nome
        break
      }
    }
    expect(nomeAlternativa).not.toBe('')
    await alternativas.nth(indice).click()

    // Modal de confirmação avisa que as séries registradas serão mantidas
    await expect(page.getByText(/As séries já registradas serão mantidas/)).toBeVisible()
    await page.getByRole('button', { name: 'Sim, substituir' }).click()

    await expect(page.getByText('Exercício substituído com sucesso!')).toBeVisible({ timeout: 10_000 })

    // Nome atualizado in place no primeiro card de exercício
    await expect(primeiroCard).toContainText(nomeAlternativa, { timeout: 10_000 })
    await expect(primeiroCard).not.toContainText(nomeAntigo)
  })
})
