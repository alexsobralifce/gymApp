import { env } from '../../shared/env.js'

const RESEND_API = 'https://api.resend.com/emails'
const SENDGRID_API = 'https://api.sendgrid.com/v3/mail/send'

function getSenderAddress(): string {
  const from = env.FROM_EMAIL || 'nao-responda@endorfinapp.com.br'
  if (from.includes('<') && from.includes('>')) {
    return from
  }
  return `ENDORFINAPP <${from}>`
}

function getVerificationHtmlTemplate(code: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 20px;background:#0A1628;border-radius:12px">
      <h1 style="color:#B8F000;margin:0 0 8px;font-size:24px">ENDORFIN<span style="color:#F7F9FC">APP</span></h1>
      <p style="color:#B8C5D9;font-size:14px;margin:0 0 8px">A Química do Crescimento</p>
      <p style="color:#9BA8C0;font-size:14px;margin:0 0 24px">Confirme seu e-mail para ativar sua conta.</p>
      <div style="background:#122040;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
        <p style="color:#9BA8C0;font-size:12px;margin:0 0 8px">SEU CÓDIGO DE VERIFICAÇÃO</p>
        <p style="color:#F7F9FC;font-size:40px;font-weight:900;letter-spacing:20px;margin:0;font-family:monospace">${code}</p>
      </div>
      <p style="color:#9BA8C0;font-size:12px;margin:0">
        Este código expira em 15 minutos. Se você não solicitou esta conta, ignore este e-mail.
      </p>
    </div>
  `
}

function getPasswordResetHtmlTemplate(code: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 20px;background:#0A1628;border-radius:12px">
      <h1 style="color:#B8F000;margin:0 0 8px;font-size:24px">ENDORFIN<span style="color:#F7F9FC">APP</span></h1>
      <p style="color:#B8C5D9;font-size:14px;margin:0 0 8px">A Química do Crescimento</p>
      <p style="color:#9BA8C0;font-size:14px;margin:0 0 24px">Você solicitou a recuperação da sua senha.</p>
      <div style="background:#122040;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
        <p style="color:#9BA8C0;font-size:12px;margin:0 0 8px">SEU CÓDIGO DE RECUPERAÇÃO</p>
        <p style="color:#F7F9FC;font-size:40px;font-weight:900;letter-spacing:20px;margin:0;font-family:monospace">${code}</p>
      </div>
      <p style="color:#9BA8C0;font-size:12px;margin:0">
        Este código expira em 15 minutos. Se você não solicitou a alteração de senha, ignore este e-mail.
      </p>
    </div>
  `
}

interface SendMailParams {
  to: string
  subject: string
  html: string
}

async function sendViaResend(params: SendMailParams): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: getSenderAddress(),
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
      signal: controller.signal,
    })

    if (response.ok) {
      console.log(`[mailer:resend] Email enviado com sucesso para ${params.to}`)
      return true
    }

    const body = await response.text()
    console.error(`[mailer:resend] Erro ${response.status}: ${body}`)
    return false
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('[mailer:resend] Timeout ao enviar para Resend (8s)')
    } else {
      console.error('[mailer:resend] Erro ao enviar:', err.message)
    }
    return false
  } finally {
    clearTimeout(timeout)
  }
}

async function sendViaSendgrid(params: SendMailParams): Promise<boolean> {
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
        personalizations: [{ to: [{ email: params.to }] }],
        from: { email: env.FROM_EMAIL || 'suportendorfinapp@gmail.com' },
        subject: params.subject,
        content: [{
          type: 'text/html',
          value: params.html,
        }],
      }),
      signal: controller.signal,
    })

    if (response.ok) {
      console.log(`[mailer:sendgrid] Email enviado com sucesso para ${params.to}`)
      return true
    }

    const body = await response.text()
    console.error(`[mailer:sendgrid] SendGrid erro ${response.status}: ${body}`)
    return false
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('[mailer:sendgrid] Timeout ao enviar para SendGrid (8s)')
    } else {
      console.error('[mailer:sendgrid] Erro ao enviar e-mail:', err.message)
    }
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export async function sendEmail(params: SendMailParams): Promise<boolean> {
  if (env.RESEND_API_KEY) {
    return sendViaResend(params)
  }

  if (env.SENDGRID_API_KEY) {
    return sendViaSendgrid(params)
  }

  console.log(`[mailer] Nenhuma chave de e-mail configurada (RESEND_API_KEY ou SENDGRID_API_KEY). Email para ${params.to}: ${params.subject}`)
  return false
}

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'ENDORFINAPP — Código de Verificação',
    html: getVerificationHtmlTemplate(code),
  })
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'ENDORFINAPP — Recuperação de Senha',
    html: getPasswordResetHtmlTemplate(code),
  })
}

