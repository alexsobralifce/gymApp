import { expect, test, devices, type Page } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { apiDisponivel, seedUserComTreino, API_URL, type UsuarioSeedado } from './helpers'

/**
 * E2E de Seleção/Captura de Foto e Postagem no Instagram no Modo Mobile (Pixel 7).
 *
 * Testa:
 * 1. Interface mobile de conclusão de treino (PostarTreinoCard na rota /treino/:id/conclusao).
 * 2. Upload / captura de foto e geração de prévia Canvas 9:16 com foto + métricas.
 * 3. Disparo de compartilhamento no Instagram Stories via Web Share API mobile.
 * 4. Fallback de download do card 9:16 quando Web Share não está disponível.
 * 5. Publicação da foto no Mural GymApp e salvamento na galeria.
 */

// Força emulação de dispositivo mobile (Pixel 7: 393x851, Android, Touch)
test.use({
  ...devices['Pixel 7'],
})

let seed: UsuarioSeedado | null = null
let apiUp = false
let sampleImagePath: string

test.beforeAll(async () => {
  apiUp = await apiDisponivel(API_URL)
  if (apiUp) {
    seed = await seedUserComTreino(API_URL)
  }

  // Cria uma imagem PNG de teste (100x100 vermelha) no diretório temporário para simular foto da câmera
  const scratchDir = path.resolve(process.cwd(), 'e2e/fixtures')
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true })
  }
  sampleImagePath = path.join(scratchDir, 'test-photo.png')

  // PNG mínimo válido de 1x1 pixel em vermelho em Base64
  const redPngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAf8/9hAAAADKlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  fs.writeFileSync(sampleImagePath, Buffer.from(redPngBase64, 'base64'))
})

/** Injeta tokens e dispensa modals de onboarding */
async function autenticar(page: Page) {
  await page.route('**/exercises/**', (route) => route.abort())
  await page.route('**/social/mural/atividade', (route) =>
    route.fulfill({ json: { totalComentarios: 0 } }),
  )

  await page.addInitScript(
    (args) => {
      localStorage.setItem('accessToken', args.accessToken)
      localStorage.setItem('refreshToken', args.refreshToken)
      localStorage.setItem('gymapp_user', JSON.stringify(args.user))
      localStorage.setItem('gymapp_welcome_seen', 'true')
      localStorage.setItem('gymapp_onboarding_seen', 'true')
      localStorage.setItem('gymapp_onboarding_permissions_done', 'true')
      localStorage.setItem('gymapp_first_workout_done', 'true')
    },
    { accessToken: seed!.accessToken, refreshToken: seed!.refreshToken, user: seed!.user },
  )
}

test.describe('Instagram & Foto — Modo Mobile (Pixel 7)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    test.skip(!apiUp || !seed, 'API local não disponível — execute com E2E_FULL=1')
    await autenticar(page)
  })

  test('1. Conclusão de Treino renderiza Card de Postagem em layout mobile', async ({ page }) => {
    await page.goto(`/treino/${seed!.treinoId}/conclusao`)

    // Título e card de postagem
    await expect(page.getByText('Treino Concluído!')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Poste seu Treino')).toBeVisible()

    // Botão de adicionar foto e prévia do story
    const btnFoto = page.getByRole('button', { name: /Tirar Foto no Treino/i })
    await expect(btnFoto).toBeVisible()

    // Imagem da prévia do Story 9:16
    const previewImg = page.locator('img[alt="Prévia do Story"]')
    await expect(previewImg).toBeVisible({ timeout: 10_000 })
  })

  test('2. Adicionar/tirar foto atualiza a prévia do Story 9:16', async ({ page }) => {
    await page.goto(`/treino/${seed!.treinoId}/conclusao`)

    // Upload da foto de teste para o input file escondido
    const fileInput = page.locator('input[type="file"][accept="image/*"]').first()
    await fileInput.setInputFiles(sampleImagePath)

    // O botão deve mudar para "Tirar Outra Foto"
    await expect(page.getByRole('button', { name: /Tirar Outra Foto/i })).toBeVisible({
      timeout: 10_000,
    })

    // O botão de remover foto (XIcon) deve ficar visível
    const btnRemover = page.locator('button[title="Remover foto e usar fundo padrão"]')
    await expect(btnRemover).toBeVisible()

    // A prévia do Story deve continuar renderizando a foto atualizada no Canvas
    const previewImg = page.locator('img[alt="Prévia do Story"]')
    await expect(previewImg).toBeVisible()
  })

  test('3. Postar no Instagram Stories dispara Web Share API no celular com imagem 9:16', async ({ page }) => {
    // Mock do navigator.share e navigator.canShare para simular o app do Instagram / Android Share Drawer
    await page.addInitScript(() => {
      ;(window as any).__sharedData = null
      Object.defineProperty(navigator, 'canShare', {
        value: () => true,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(navigator, 'share', {
        value: async (data: any) => {
          ;(window as any).__sharedData = data
          return Promise.resolve()
        },
        writable: true,
        configurable: true,
      })
    })

    await page.goto(`/treino/${seed!.treinoId}/conclusao`)

    // Seleciona uma foto
    const fileInput = page.locator('input[type="file"][accept="image/*"]').first()
    await fileInput.setInputFiles(sampleImagePath)

    // Clica em "Postar no Instagram Stories"
    const btnInstagram = page.getByRole('button', { name: /Postar no Instagram Stories/i })
    await expect(btnInstagram).toBeEnabled()
    await btnInstagram.click()

    // Valida se o feedback de sucesso de compartilhamento apareceu na UI
    await expect(
      page.getByText('Compartilhamento iniciado! Selecione o Instagram nos seus apps.'),
    ).toBeVisible({ timeout: 15_000 })

    // Valida os dados passados para a Web Share API nativa
    const sharedData = await page.evaluate(() => {
      const data = (window as any).__sharedData
      if (!data) return null
      return {
        title: data.title,
        text: data.text,
        filesCount: data.files ? data.files.length : 0,
        fileName: data.files && data.files[0] ? data.files[0].name : null,
        fileType: data.files && data.files[0] ? data.files[0].type : null,
      }
    })

    expect(sharedData).toBeTruthy()
    expect(sharedData?.filesCount).toBe(1)
    expect(sharedData?.fileName).toBe('treino-endorfinapp.png')
    expect(sharedData?.fileType).toBe('image/png')
    expect(sharedData?.text).toContain('#Endorfinapp')
  })

  test('4. Fallback quando Web Share não está disponível realiza download do Card 9:16', async ({ page }) => {
    // Simula ambiente onde Web Share não é suportado (ex: navegador sem suporte)
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', {
        value: () => false,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        writable: true,
        configurable: true,
      })
    })

    await page.goto(`/treino/${seed!.treinoId}/conclusao`)

    const btnInstagram = page.getByRole('button', { name: /Postar no Instagram Stories/i })
    await btnInstagram.click()

    // Mensagem de fallback de download
    await expect(
      page.getByText(/Card 9:16 salvo em Downloads!/i),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('5. Publicar foto no Mural GymApp e Salvar na Galeria', async ({ page }) => {
    await page.goto(`/treino/${seed!.treinoId}/conclusao`)

    // Carrega foto
    await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles(sampleImagePath)

    // Botão de publicar no mural GymApp aparece quando há foto e postId
    const btnMural = page.getByRole('button', { name: /Publicar Foto no Mural GymApp/i })
    if (await btnMural.isVisible().catch(() => false)) {
      await btnMural.click()
      await expect(page.getByText(/Foto publicada no Mural da Academia!/i)).toBeVisible({
        timeout: 15_000,
      })
    }

    // Botão de salvar imagem na galeria
    const btnSalvar = page.getByRole('button', { name: /Salvar Imagem na Galeria/i })
    await expect(btnSalvar).toBeVisible()
    await btnSalvar.click()

    await expect(page.getByText('Imagem salva em alta resolução!')).toBeVisible({
      timeout: 10_000,
    })
  })
})
