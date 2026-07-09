import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { ConflictError, NotFoundError, UnauthorizedError } from '../../../domain/errors/AppError.js'
import { env } from '../../../shared/env.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RegisterInput = {
  nome: string
  email: string
  senha: string
  role: Role
}

export type LoginInput = {
  email: string
  senha: string
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class AuthService {
  // Necessário para gerar JWT — injetado via setter para evitar dependência circular
  private static _jwtSign: ((payload: object) => string) | null = null

  static setJwtSigner(fn: (payload: object) => string) {
    AuthService._jwtSign = fn
  }

  /**
   * UC relacionado: UC-05 (academia), UC-09 (professor), UC-17 (aluno)
   * Cria usuário base. O perfil específico (Academia, Professor, Aluno)
   * é criado pelo UseCase correspondente após o registro.
   */
  static async register(input: RegisterInput) {
    const emailExistente = await prisma.usuario.findUnique({
      where: { email: input.email },
    })

    if (emailExistente) {
      throw new ConflictError('E-mail já cadastrado')
    }

    const senhaHash = await bcrypt.hash(input.senha, 12)

    const usuario = await prisma.usuario.create({
      data: {
        nome: input.nome,
        email: input.email,
        senha_hash: senhaHash,
        role: input.role,
      },
      select: { id: true, nome: true, email: true, role: true, criado_em: true },
    })

    return usuario
  }

  /**
   * Login com e-mail e senha — retorna par de tokens JWT
   */
  static async login(input: LoginInput, jwtSign: (payload: object, opts?: object) => string): Promise<AuthTokens> {
    const usuario = await prisma.usuario.findUnique({
      where: { email: input.email },
    })

    if (!usuario) {
      throw new UnauthorizedError('E-mail ou senha inválidos')
    }

    const senhaCorreta = await bcrypt.compare(input.senha, usuario.senha_hash)
    if (!senhaCorreta) {
      throw new UnauthorizedError('E-mail ou senha inválidos')
    }

    // Montar payload com tenantId dependendo do role
    let tenantId: string | undefined
    if (usuario.role === Role.ACADEMIA) {
      const academia = await prisma.academia.findUnique({ where: { usuario_id: usuario.id } })
      tenantId = academia?.id
    } else if (usuario.role === Role.PROFESSOR) {
      // Professor pode ter múltiplas academias — tenantId vem no header por request
    } else if (usuario.role === Role.ALUNO) {
      const aluno = await prisma.aluno.findUnique({ where: { usuario_id: usuario.id } })
      tenantId = aluno?.academia_id ?? undefined
    }

    const payload = { sub: usuario.id, role: usuario.role, tenantId }

    const accessToken = jwtSign(payload, { expiresIn: env.JWT_EXPIRES_IN })
    const refreshToken = jwtSign(
      { sub: usuario.id },
      { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES_IN },
    )

    // Persistir refresh token
    const expiresIn = 7 * 24 * 60 * 60 * 1000 // 7 dias em ms
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        usuario_id: usuario.id,
        expira_em: new Date(Date.now() + expiresIn),
      },
    })

    return { accessToken, refreshToken }
  }

  /**
   * Troca refresh token por novo par de tokens
   */
  static async refresh(
    refreshToken: string,
    jwtVerify: (token: string, opts?: object) => { sub: string },
    jwtSign: (payload: object, opts?: object) => string,
  ): Promise<AuthTokens> {
    let payload: { sub: string }
    try {
      payload = jwtVerify(refreshToken, { secret: env.JWT_REFRESH_SECRET })
    } catch {
      throw new UnauthorizedError('Refresh token inválido')
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    })

    if (!storedToken || storedToken.expira_em < new Date()) {
      throw new UnauthorizedError('Refresh token expirado ou não encontrado')
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.sub },
    })

    if (!usuario) {
      throw new NotFoundError('Usuário')
    }

    // Rotacionar: deletar token antigo e gerar novo par
    await prisma.refreshToken.delete({ where: { token: refreshToken } })

    const newPayload = { sub: usuario.id, role: usuario.role }
    const newAccessToken = jwtSign(newPayload, { expiresIn: env.JWT_EXPIRES_IN })
    const newRefreshToken = jwtSign({ sub: usuario.id }, { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES_IN })

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        usuario_id: usuario.id,
        expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return { accessToken: newAccessToken, refreshToken: newRefreshToken }
  }

  /**
   * Logout — invalida o refresh token
   */
  static async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
  }
}
