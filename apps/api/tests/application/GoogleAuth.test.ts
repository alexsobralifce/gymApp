import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthService } from '../../src/application/usecases/auth/AuthService'
import { prisma } from '../../src/infrastructure/database/prisma'
import { Role } from '@prisma/client'
import { UnauthorizedError } from '../../src/domain/errors/AppError'

describe('AuthService — Google OAuth Authentication Tests', () => {
  let fakeJwtSign: any

  beforeEach(() => {
    fakeJwtSign = vi.fn().mockImplementation(() => `mock-jwt-token-${Math.random().toString(36).slice(2)}`)
  })

  it('autentica usuário existente com sucesso via userinfo quando id_token local falha', async () => {
    const testEmail = `google_test_${Date.now()}@example.com`
    const testGoogleId = `gid_${Date.now()}`

    // Cria usuário pré-existente
    const usuario = await prisma.usuario.create({
      data: {
        nome: 'Usuario Google Teste',
        email: testEmail,
        role: Role.ALUNO,
        email_verified: true,
      },
    })

    // Mock global fetch para simular resposta do Google userinfo
    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes('oauth2/v3/userinfo')) {
        return {
          ok: true,
          json: async () => ({
            sub: testGoogleId,
            email: testEmail,
            name: 'Usuario Google Teste',
            picture: 'https://lh3.googleusercontent.com/a/photo.jpg',
          }),
        } as any
      }
      if (urlStr.includes('tokeninfo')) {
        return {
          ok: false,
          json: async () => ({ error: 'invalid_token' }),
        } as any
      }
      return { ok: false } as any
    })

    try {
      const result = await AuthService.loginWithGoogle('mock-access-token', fakeJwtSign)

      expect(result).toBeDefined()
      expect(result.isNew).toBe(false)
      expect(result.nome).toBe('Usuario Google Teste')
      expect(result.accessToken).toContain('mock-jwt-token')

      // Verifica se o google_id e foto_url foram vinculados
      const updatedUser = await prisma.usuario.findUnique({ where: { id: usuario.id } })
      expect(updatedUser?.google_id).toBe(testGoogleId)
      expect(updatedUser?.foto_url).toBe('https://lh3.googleusercontent.com/a/photo.jpg')
    } finally {
      global.fetch = originalFetch
      // Cleanup
      await prisma.refreshToken.deleteMany({ where: { usuario_id: usuario.id } })
      await prisma.aluno.deleteMany({ where: { usuario_id: usuario.id } })
      await prisma.usuario.delete({ where: { id: usuario.id } })
    }
  })

  it('cria novo usuário e registro de Aluno quando autentica pela primeira vez via Google', async () => {
    const newEmail = `google_new_${Date.now()}@example.com`
    const newGoogleId = `gid_new_${Date.now()}`

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes('tokeninfo?id_token=')) {
        return {
          ok: true,
          json: async () => ({
            sub: newGoogleId,
            email: newEmail,
            name: 'Novo Aluno Google',
            picture: 'https://lh3.googleusercontent.com/a/novo.jpg',
          }),
        } as any
      }
      return { ok: false } as any
    })

    let createdUserId: string | null = null

    try {
      const result = await AuthService.loginWithGoogle('mock-id-token', fakeJwtSign)

      expect(result).toBeDefined()
      expect(result.isNew).toBe(true)
      expect(result.nome).toBe('Novo Aluno Google')

      const user = await prisma.usuario.findUnique({
        where: { email: newEmail },
        include: { aluno: true },
      })
      expect(user).not.toBeNull()
      expect(user?.role).toBe(Role.ALUNO)
      expect(user?.email_verified).toBe(true)
      expect(user?.google_id).toBe(newGoogleId)

      createdUserId = user?.id || null
    } finally {
      global.fetch = originalFetch
      if (createdUserId) {
        await prisma.refreshToken.deleteMany({ where: { usuario_id: createdUserId } })
        await prisma.aluno.deleteMany({ where: { usuario_id: createdUserId } })
        await prisma.usuario.delete({ where: { id: createdUserId } })
      }
    }
  })

  it('lança UnauthorizedError quando todos os métodos de validação de token do Google falham', async () => {
    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: false,
        json: async () => ({ error: 'invalid_token', error_description: 'Token expired' }),
      } as any
    })

    try {
      await expect(
        AuthService.loginWithGoogle('token-completamente-invalido', fakeJwtSign),
      ).rejects.toThrow(UnauthorizedError)
    } finally {
      global.fetch = originalFetch
    }
  })
})
