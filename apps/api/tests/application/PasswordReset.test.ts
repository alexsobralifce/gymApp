import 'dotenv/config'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from '../../src/application/usecases/auth/AuthService.js'
import { prisma } from '../../src/infrastructure/database/prisma.js'
import * as mailer from '../../src/infrastructure/email/mailer.js'
import bcrypt from 'bcryptjs'

describe('Recuperação de Senha — AuthService', () => {
  const testEmail = `test-reset-${Date.now()}@exemplo.com`
  let mailerSpy: any

  beforeEach(() => {
    mailerSpy = vi.spyOn(mailer, 'sendPasswordResetEmail').mockResolvedValue(true)
  })

  it('solicita recuperação de senha e envia código de 4 dígitos', async () => {
    // Cria usuário de teste
    const hash = await bcrypt.hash('SenhaAntiga!1', 10)
    await prisma.usuario.create({
      data: {
        email: testEmail,
        nome: 'Usuario Reset',
        role: 'ALUNO',
        senha_hash: hash,
        email_verified: true,
      },
    })

    await AuthService.forgotPassword(testEmail)

    expect(mailerSpy).toHaveBeenCalledTimes(1)
    expect(mailerSpy).toHaveBeenCalledWith(testEmail, expect.stringMatching(/^\d{4}$/))

    const usuario = await prisma.usuario.findUnique({
      where: { email: testEmail },
      select: { reset_password_code: true, reset_password_code_expira: true },
    })

    expect(usuario?.reset_password_code).toHaveLength(4)
    expect(usuario?.reset_password_code_expira).toBeDefined()
  })

  it('rejeita código de recuperação incorreto', async () => {
    await expect(
      AuthService.resetPassword(testEmail, '0000', 'NovaSenhaForte!2'),
    ).rejects.toThrow('Código de recuperação incorreto.')
  })

  it('redefine senha com código correto e permite novo login', async () => {
    const usuario = await prisma.usuario.findUnique({
      where: { email: testEmail },
      select: { reset_password_code: true },
    })

    const code = usuario!.reset_password_code!

    await AuthService.resetPassword(testEmail, code, 'NovaSenhaForte!2')

    const usuarioAtualizado = await prisma.usuario.findUnique({
      where: { email: testEmail },
      select: { senha_hash: true, reset_password_code: true },
    })

    expect(usuarioAtualizado?.reset_password_code).toBeNull()
    const senhaValida = await bcrypt.compare('NovaSenhaForte!2', usuarioAtualizado!.senha_hash!)
    expect(senhaValida).toBe(true)

    // Cleanup
    await prisma.usuario.delete({ where: { email: testEmail } })
  })
})
