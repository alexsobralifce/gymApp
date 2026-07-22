import nodemailer from 'nodemailer'
import { env } from '../../shared/env.js'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter

  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.warn('[mailer] SMTP não configurado. E-mails NÃO serão enviados.')
    console.warn('[mailer] Preencha SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL no .env')
    return null
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  })

  return transporter
}

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  const t = getTransporter()
  if (!t) {
    console.log(`[mailer] Código de verificação para ${to}: ${code}`)
    return false
  }

  try {
    await t.sendMail({
      from: env.FROM_EMAIL,
      to,
      subject: 'GymApp — Código de Verificação',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 20px">
          <h1 style="color:#9DD802;margin:0 0 8px;font-size:24px">GYM<span style="color:#F5F5F5">APP</span></h1>
          <p style="color:#9BA8C0;font-size:14px;margin:0 0 24px">Confirme seu e-mail para ativar sua conta.</p>
          <div style="background:#112660;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <p style="color:#9BA8C0;font-size:12px;margin:0 0 8px">SEU CÓDIGO</p>
            <p style="color:#F5F5F5;font-size:36px;font-weight:900;letter-spacing:12px;margin:0;font-family:monospace">${code}</p>
          </div>
          <p style="color:#9BA8C0;font-size:12px;margin:0">
            Este código expira em 15 minutos. Se você não solicitou esta conta, ignore este e-mail.
          </p>
        </div>
      `,
    })
    return true
  } catch (err) {
    console.error('[mailer] Erro ao enviar e-mail:', err)
    return false
  }
}
