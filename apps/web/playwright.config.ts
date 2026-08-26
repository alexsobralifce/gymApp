import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Configuração E2E (Playwright) do GymApp web.
 *
 * Dois modos:
 * - Padrão (sem env): smoke apenas — sobe somente o Vite (5173). Não exige API/DB.
 * - `E2E_FULL=1`: sobe Vite + API (Fastify em :3333, cwd na raiz do monorepo) —
 *   necessário para `e2e/authenticated.spec.ts`. Rode via `npm run test:e2e:full`
 *   (todos) ou `npm run test:e2e:auth` (só o spec autenticado).
 *
 * A API exige Postgres + Redis (docker compose up -d na raiz). O webServer reutiliza
 * processos já em execução na porta (reuseExistingServer) — se uma API antiga estiver
 * rodando na 3333, reinicie-a para garantir o código atual.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    locale: 'pt-BR',
    // Concede notificações para não exibir o NotificationPrompt nos testes autenticados
    permissions: ['notifications'],
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      // O spec autenticado roda apenas no chromium: o seed registra um usuário
      // por worker e o endpoint /auth/register tem rate limit (3/min por IP).
      testIgnore: /authenticated\.spec\.ts/,
    },
  ],
  webServer: process.env.E2E_FULL === '1'
    ? [
        {
          command: 'npm run dev',
          url: 'http://localhost:5173',
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
        {
          command: 'npm run dev:api',
          cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
          url: 'http://localhost:3333/health',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ]
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
})
