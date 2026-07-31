import { env } from '../../shared/env.js'

const SENDGRID_API = 'https://api.sendgrid.com/v3/mail/send'

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  if (!env.SENDGRID_API_KEY) {
    console.log(`[mailer] SENDGRID_API_KEY não configurada. Código para ${to}: ${code}`)
    return false
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(SENDGRID_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: env.FROM_EMAIL },
        subject: 'ENDORFINAPP — Código de Verificação',
        content: [{
          type: 'text/html',
          value: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 20px;background:#0A1628;border-radius:12px">
          <h1 style="color:#B8F000;margin:0 0 8px;font-size:24px">ENDORFIN<span style="color:#F7F9FC">APP</span></h1>
          <p style="color:#B8C5D9;font-size:14px;margin:0 0 8px">A Química do Crescimento</p>
          <p style="color:#9BA8C0;font-size:14px;margin:0 0 24px">Confirme seu e-mail para ativar sua conta.</p>
          <div style="background:#122040;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <p style="color:#9BA8C0;font-size:12px;margin:0 0 8px">SEU CÓDIGO</p>
            <p style="color:#F7F9FC;font-size:40px;font-weight:900;letter-spacing:20px;margin:0;font-family:monospace">${code}</p>
          </div>
          <p style="color:#9BA8C0;font-size:12px;margin:0">
            Este código expira em 15 minutos. Se você não solicitou esta conta, ignore este e-mail.
          </p>
        </div>
      `,
        }],
      }),
      signal: controller.signal,
    })

    if (response.ok) {
      console.log('[mailer] Email enviado com sucesso.')
      return true
    }

    const body = await response.text()
    console.error(`[mailer] SendGrid erro ${response.status}: ${body}`)
    return false
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('[mailer] Timeout ao enviar para SendGrid (8s)')
    } else {
      console.error('[mailer] Erro ao enviar e-mail:', err.message)
    }
    return false
  } finally {
    clearTimeout(timeout)
  }
}
