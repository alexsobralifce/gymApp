import 'dotenv/config'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendVerificationEmail } from '../../src/infrastructure/email/mailer.js'
import { env } from '../../src/shared/env.js'

describe('Mailer — envio de código de verificação', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    env.RESEND_API_KEY = ''
    env.SENDGRID_API_KEY = ''
    env.FROM_EMAIL = 'nao-responda@endorfinapp.com.br'
  })

  it('retorna false e loga quando nenhuma chave de e-mail está configurada', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const ok = await sendVerificationEmail('teste@exemplo.com', '1234')

    expect(ok).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Nenhuma chave de e-mail configurada'))
  })

  it('envia via Resend quando RESEND_API_KEY está configurada', async () => {
    env.RESEND_API_KEY = 're_test_123456789'

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'resend_id_123' }),
    } as any)

    const ok = await sendVerificationEmail('aluno@exemplo.com', '5678')

    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(options?.headers).toMatchObject({
      'Authorization': 'Bearer re_test_123456789',
      'Content-Type': 'application/json',
    })
    const body = JSON.parse(options?.body as string)
    expect(body.to).toEqual(['aluno@exemplo.com'])
    expect(body.from).toContain('nao-responda@endorfinapp.com.br')
    expect(body.subject).toContain('Código de Verificação')
    expect(body.html).toContain('5678')
  })

  it('envia via SendGrid quando apenas SENDGRID_API_KEY está configurada', async () => {
    env.SENDGRID_API_KEY = 'SG.fake_key'

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => '',
    } as any)

    const ok = await sendVerificationEmail('aluno@exemplo.com', '9999')

    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.sendgrid.com/v3/mail/send')
    expect(options?.headers).toMatchObject({
      'Authorization': 'Bearer SG.fake_key',
    })
  })
})
