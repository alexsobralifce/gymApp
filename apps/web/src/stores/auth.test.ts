// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from './auth'
import { api } from '../api/client'

vi.mock('../api/client', () => ({
  api: {
    register: vi.fn(),
    login: vi.fn(),
    getMe: vi.fn(),
  },
  ApiError: class extends Error {
    status: number
    constructor(msg: string, status = 400) {
      super(msg)
      this.status = status
    }
  },
}))

vi.mock('../lib/analytics', () => ({
  track: vi.fn(),
}))

describe('useAuthStore — fluxo de cadastro e verificação', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    useAuthStore.setState({ user: null, loading: false, error: null })
  })

  it('retorna requiresVerification: true quando o login após cadastro acusa e-mail não verificado', async () => {
    vi.mocked(api.register).mockResolvedValueOnce({ message: 'Conta criada com sucesso.' } as any)
    vi.mocked(api.login).mockRejectedValueOnce(new Error('E-mail não verificado. Verifique sua caixa de entrada.'))

    const res = await useAuthStore.getState().register('Nome Teste', 'novo@teste.com', 'SenhaForte!1', 'ALUNO')

    expect(api.register).toHaveBeenCalledWith('Nome Teste', 'novo@teste.com', 'SenhaForte!1', 'ALUNO', undefined, undefined)
    expect(res).toEqual({ requiresVerification: true })
    expect(useAuthStore.getState().loading).toBe(false)
    expect(useAuthStore.getState().error).toBeNull()
  })

  it('retorna requiresVerification: false quando o login tem sucesso imediato', async () => {
    vi.mocked(api.register).mockResolvedValueOnce({ message: 'Conta criada com sucesso.' } as any)
    vi.mocked(api.login).mockResolvedValueOnce({ accessToken: 'fake-access', refreshToken: 'fake-refresh' })
    vi.mocked(api.getMe).mockResolvedValueOnce({ id: 'u1', email: 'novo@teste.com', nome: 'Nome', role: 'ALUNO', admin: false } as any)

    const res = await useAuthStore.getState().register('Nome Teste', 'novo@teste.com', 'SenhaForte!1', 'ALUNO')

    expect(res).toEqual({ requiresVerification: false })
    expect(useAuthStore.getState().user?.email).toBe('novo@teste.com')
  })

  it('logout remove tokens e limpa estado', () => {
    localStorage.setItem('accessToken', 'token123')
    localStorage.setItem('refreshToken', 'ref123')
    useAuthStore.setState({ user: { id: 'u1', email: 'test@teste.com', nome: 'Test', role: 'ALUNO', admin: false } as any })

    useAuthStore.getState().logout()

    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })
})
