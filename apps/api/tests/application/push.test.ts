import 'dotenv/config'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// vi.mock MUST be hoisted — declare the mock factory at top level
vi.mock('web-push', () => {
  return {
    default: {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn(),
    },
  }
})

describe('pipeline de push', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    vi.doUnmock('../../src/infrastructure/push/webPush.js')
  })

  it('retorna failed quando VAPID não está configurado (sem lançar)', async () => {
    vi.resetModules()
    vi.stubEnv('VAPID_PUBLIC_KEY', '')
    vi.stubEnv('VAPID_PRIVATE_KEY', '')
    vi.stubEnv('VAPID_SUBJECT', '')
    const { sendWebPush } = await import('../../src/infrastructure/push/webPush.js')
    const result = await sendWebPush({ endpoint: 'https://x', keys: { p256dh: 'a', auth: 'b' } } as any, 'T', 'B')
    expect(result).toBe('failed')
  })

  it('retorna sent quando o envio ao FCM é bem-sucedido', async () => {
    vi.resetModules()
    vi.stubEnv('VAPID_PUBLIC_KEY', 'PUBLIC')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'PRIVATE')
    vi.stubEnv('VAPID_SUBJECT', 'mailto:test@test.com')
    const webpushMock = (await import('web-push')).default as any
    webpushMock.sendNotification.mockResolvedValueOnce({ statusCode: 201 })
    const { sendWebPush } = await import('../../src/infrastructure/push/webPush.js')
    const result = await sendWebPush({ endpoint: 'https://fcm.googleapis.com/fcm/send/xyz', keys: { p256dh: 'a', auth: 'b' } } as any, 'T', 'B', { url: 'https://app.com/treino/1' })
    expect(result).toBe('sent')
    expect(webpushMock.sendNotification).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('https://app.com/treino/1'))
  })

  it('retorna gone em 410 (subscription expirada)', async () => {
    vi.resetModules()
    vi.stubEnv('VAPID_PUBLIC_KEY', 'PUBLIC')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'PRIVATE')
    vi.stubEnv('VAPID_SUBJECT', 'mailto:test@test.com')
    const webpushMock = (await import('web-push')).default as any
    const err = new Error('410') as any
    err.name = 'WebPushError'
    err.statusCode = 410
    webpushMock.sendNotification.mockRejectedValueOnce(err)
    const { sendWebPush } = await import('../../src/infrastructure/push/webPush.js')
    const result = await sendWebPush({ endpoint: 'https://x' } as any, 'T', 'B')
    expect(result).toBe('gone')
  })

  it('no-op quando usuário não tem expo token nem web subscription', async () => {
    vi.resetModules()
    const { sendDualPush } = await import('../../src/infrastructure/push/sendDualPush.js')
    await expect(sendDualPush({ expo_push_token: null, web_push_subscription: null }, 'T', 'B')).resolves.toBeUndefined()
  })

  it('chama sendWebPush quando há subscription web', async () => {
    vi.resetModules()
    vi.doMock('../../src/infrastructure/push/webPush.js', () => ({
      sendWebPush: vi.fn().mockResolvedValue('sent'),
    }))
    const { sendDualPush } = await import('../../src/infrastructure/push/sendDualPush.js')
    await sendDualPush({ id: 'u1', expo_push_token: null, web_push_subscription: { endpoint: 'https://x' } }, 'T', 'B')
    // re-import the mocked webPush to assert
    const { sendWebPush } = await import('../../src/infrastructure/push/webPush.js')
    expect(sendWebPush).toHaveBeenCalled()
  })
})
