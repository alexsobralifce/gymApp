import 'dotenv/config'
import { describe, it, expect } from 'vitest'
import { AuthService } from '../../src/application/usecases/auth/AuthService.js'
import { prisma } from '../../src/infrastructure/database/prisma.js'

describe('Limpeza e Cancelamento de Cadastros Incompletos — AuthService', () => {
  const emailIncompleto = `incompleto-${Date.now()}@teste.com`

  it('permite sobrescrever cadastro iniciado que não foi concluído por falta de código', async () => {
    // 1. Usuário inicia cadastro (não verificado)
    await AuthService.register({
      nome: 'Tentativa 1',
      email: emailIncompleto,
      senha: 'SenhaForte123!',
      role: 'ALUNO',
    })

    const criado = await prisma.usuario.findUnique({
      where: { email: emailIncompleto },
      select: { id: true, nome: true, email_verified: true },
    })
    expect(criado?.email_verified).toBe(false)
    expect(criado?.nome).toBe('Tentativa 1')

    // 2. Usuário tenta cadastrar de novo com o mesmo e-mail antes de validar
    // O sistema deve excluir o cadastro incompleto e criar o novo sem erro de conflito
    await AuthService.register({
      nome: 'Tentativa 2 Concluída',
      email: emailIncompleto,
      senha: 'SenhaForte123!',
      role: 'ALUNO',
    })

    const atualizado = await prisma.usuario.findUnique({
      where: { email: emailIncompleto },
      select: { id: true, nome: true, email_verified: true },
    })
    expect(atualizado?.id).not.toBe(criado?.id)
    expect(atualizado?.nome).toBe('Tentativa 2 Concluída')
    expect(atualizado?.email_verified).toBe(false)
  })

  it('cancela e apaga cadastro em andamento através do cancelRegistration', async () => {
    // Cancela o cadastro incompleto
    await AuthService.cancelRegistration(emailIncompleto)

    const usuario = await prisma.usuario.findUnique({
      where: { email: emailIncompleto },
    })
    expect(usuario).toBeNull()
  })

  it('não apaga usuário se o e-mail já estiver verificado', async () => {
    const emailVerificado = `verificado-${Date.now()}@teste.com`
    await prisma.usuario.create({
      data: {
        nome: 'Usuario Ativo',
        email: emailVerificado,
        role: 'ALUNO',
        email_verified: true,
      },
    })

    // Tentativa de cancelar não deve apagar conta verificada
    await AuthService.cancelRegistration(emailVerificado)

    const usuario = await prisma.usuario.findUnique({
      where: { email: emailVerificado },
    })
    expect(usuario).not.toBeNull()

    // Cleanup
    await prisma.usuario.delete({ where: { email: emailVerificado } })
  })

  it('limpa registros não verificados com código expirado', async () => {
    const emailExpirado = `expirado-${Date.now()}@teste.com`
    await prisma.usuario.create({
      data: {
        nome: 'Expirado',
        email: emailExpirado,
        role: 'ALUNO',
        email_verified: false,
        email_verify_code: '9999',
        email_verify_code_expira: new Date(Date.now() - 60000), // Expirado há 1 minuto
      },
    })

    const removidos = await AuthService.cleanExpiredUnverifiedRegistrations()
    expect(removidos).toBeGreaterThanOrEqual(1)

    const busca = await prisma.usuario.findUnique({
      where: { email: emailExpirado },
    })
    expect(busca).toBeNull()
  })
})
