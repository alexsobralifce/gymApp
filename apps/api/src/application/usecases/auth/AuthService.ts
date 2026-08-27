import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { Role } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { ConflictError, NotFoundError, UnauthorizedError, ForbiddenError } from '../../../domain/errors/AppError.js'
import { env } from '../../../shared/env.js'
import { sendVerificationEmail } from '../../../infrastructure/email/mailer.js'
import crypto from 'crypto'

const googleClient = env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(env.GOOGLE_CLIENT_ID)
  : null

// ─── Types ────────────────────────────────────────────────────────────────────

export type RegisterInput = {
  nome: string
  email: string
  senha: string
  role: Role
  telefone?: string
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

  /** Garante no máximo 5 refresh tokens por usuário, removendo os mais antigos */
  private static async enforceRefreshTokenLimit(usuarioId: string): Promise<void> {
    const existingTokens = await prisma.refreshToken.count({
      where: { usuario_id: usuarioId },
    })
    if (existingTokens >= 5) {
      const oldest = await prisma.refreshToken.findMany({
        where: { usuario_id: usuarioId },
        orderBy: { criado_em: 'asc' },
        take: existingTokens - 4,
      })
      await prisma.refreshToken.deleteMany({
        where: { id: { in: oldest.map((t) => t.id) } },
      })
    }
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
    const code = crypto.randomInt(1000, 9999).toString()
    const codeExpira = new Date(Date.now() + 15 * 60 * 1000)

    const usuario = await prisma.usuario.create({
      data: {
        nome: input.nome,
        email: input.email,
        senha_hash: senhaHash,
        role: input.role,
        telefone: input.telefone || null,
        email_verify_code: code,
        email_verify_code_expira: codeExpira,
        email_verified: false,
      },
      select: { id: true, nome: true, email: true, role: true, criado_em: true },
    })

    // Enviar e-mail de verificação em background
    sendVerificationEmail(input.email, code).catch(() => {})

    return { message: 'Conta criada com sucesso.', usuario }
  }

  /**
   * Login com e-mail e senha — retorna par de tokens JWT
   */
  static async login(input: LoginInput, jwtSign: (payload: object, opts?: object) => string): Promise<AuthTokens> {
    const usuario = await prisma.usuario.findUnique({
      where: { email: input.email },
      select: { id: true, nome: true, email: true, role: true, senha_hash: true, email_verified: true, admin: true },
    })

    if (!usuario) {
      throw new UnauthorizedError('E-mail ou senha inválidos')
    }

    if (!usuario.senha_hash) {
      throw new UnauthorizedError('Esta conta usa login com Google. Entre com o botão do Google.')
    }

    const senhaCorreta = await bcrypt.compare(input.senha, usuario.senha_hash)
    if (!senhaCorreta) {
      throw new UnauthorizedError('E-mail ou senha inválidos')
    }

    // ROOT users bypass email verification
    if (!usuario.email_verified && usuario.role !== Role.ROOT) {
      throw new ForbiddenError('E-mail não verificado. Verifique sua caixa de entrada.')
    }

    // Usuário está ativo no momento do login — zera o contador de inatividade
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultima_atividade_em: new Date() },
    })

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

    const payload = { sub: usuario.id, role: usuario.role, admin: usuario.admin, tenantId }

    const accessToken = jwtSign(payload, { expiresIn: env.JWT_EXPIRES_IN })
    const refreshToken = jwtSign(
      { sub: usuario.id },
      { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES_IN },
    )

    // Limitar refresh tokens por usuário
    await AuthService.enforceRefreshTokenLimit(usuario.id)

    // Persistir refresh token
    const expiresIn = 30 * 24 * 60 * 60 * 1000 // 30 dias em ms
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
        expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    // Refresh bem-sucedido prova atividade — renova o contador de inatividade
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultima_atividade_em: new Date() },
    })

    return { accessToken: newAccessToken, refreshToken: newRefreshToken }
  }

  /**
   * Verifica o código enviado por e-mail
   */
  static async verifyEmail(email: string, code: string): Promise<void> {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, email_verified: true, email_verify_code: true, email_verify_code_expira: true },
    })
    if (!usuario) throw new NotFoundError('Usuário')
    if (usuario.email_verified) throw new ConflictError('E-mail já verificado.')
    if (usuario.email_verify_code !== code) throw new UnauthorizedError('Código inválido.')
    if (!usuario.email_verify_code_expira || usuario.email_verify_code_expira < new Date()) {
      throw new UnauthorizedError('Código expirado. Solicite um novo.')
    }
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { email_verified: true, email_verify_code: null, email_verify_code_expira: null },
    })
  }

  /**
   * Reenvia código de verificação
   */
  static async resendCode(email: string): Promise<void> {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, email_verified: true },
    })
    if (!usuario) throw new NotFoundError('Usuário')
    if (usuario.email_verified) throw new ConflictError('E-mail já verificado.')

    const code = crypto.randomInt(1000, 9999).toString()
    const codeExpira = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { email_verify_code: code, email_verify_code_expira: codeExpira },
    })

    await sendVerificationEmail(email, code)
  }

  /**
   * Login com Google OAuth — verifica credential, upsert usuario, retorna JWT
   */
  static async loginWithGoogle(
    credential: string,
    jwtSign: (payload: object, opts?: object) => string,
    googleAccessToken?: string,
  ): Promise<AuthTokens & { isNew: boolean; nome: string }> {
    if (!googleClient) {
      throw new Error('Google OAuth não está configurado. Defina GOOGLE_CLIENT_ID.')
    }

    let email: string
    let nome: string
    let fotoUrl: string | null = null
    let googleId: string | null = null

    if (credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: env.GOOGLE_CLIENT_ID,
        })
        const payload = ticket.getPayload()
        if (!payload || !payload.email) {
          throw new UnauthorizedError('Token Google inválido.')
        }
        email = payload.email
        nome = payload.name || email.split('@')[0]
        fotoUrl = payload.picture || null
        googleId = payload.sub
      } catch (err: any) {
        if (err instanceof UnauthorizedError) throw err
        throw new UnauthorizedError('Token Google inválido ou expirado.')
      }
    } else if (googleAccessToken) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)
        let response: Response
        try {
          response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${googleAccessToken}` },
            signal: controller.signal,
          })
        } finally {
          clearTimeout(timeoutId)
        }
        if (!response.ok) {
          throw new UnauthorizedError('Access token Google inválido.')
        }
        const data = await response.json() as any
        if (!data.email) {
          throw new UnauthorizedError('Não foi possível obter o e-mail do Google.')
        }
        email = data.email
        nome = data.name || email.split('@')[0]
        fotoUrl = data.picture || null
        googleId = data.sub
      } catch (err: any) {
        if (err instanceof UnauthorizedError) throw err
        throw new UnauthorizedError('Falha ao verificar access token do Google.')
      }
    } else {
      throw new UnauthorizedError('Token Google inválido.')
    }

    let usuario = await prisma.usuario.findUnique({
      where: { email },
    })

    let isNew = false

    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: {
          nome,
          email,
          senha_hash: null,
          role: Role.ALUNO,
          google_id: googleId,
          foto_url: fotoUrl,
          email_verified: true,
        },
      })
      isNew = true
    } else {
      const updateData: Record<string, any> = {}
      if (!usuario.google_id && googleId) updateData.google_id = googleId
      if (!usuario.foto_url && fotoUrl) updateData.foto_url = fotoUrl
      if (Object.keys(updateData).length > 0) {
        await prisma.usuario.update({ where: { id: usuario.id }, data: updateData })
      }
    }

    const tokenPayload = { sub: usuario.id, role: usuario.role, admin: usuario.admin }
    const accessToken = jwtSign(tokenPayload, { expiresIn: env.JWT_EXPIRES_IN })
    const refreshToken = jwtSign(
      { sub: usuario.id },
      { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES_IN },
    )

    // Limitar refresh tokens do usuário
    await AuthService.enforceRefreshTokenLimit(usuario.id)

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        usuario_id: usuario.id,
        expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    // Usuário está ativo no momento do login Google — zera o contador de inatividade
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultima_atividade_em: new Date() },
    })

    return { accessToken, refreshToken, isNew, nome: usuario.nome }
  }

  /**
   * Troca authorization code do Google OAuth por sessão (quando o fluxo code é utilizado)
   */
  static async loginWithGoogleCode(
    code: string,
    jwtSign: (payload: object, opts?: object) => string,
  ): Promise<AuthTokens & { isNew: boolean; nome: string }> {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new Error('Google OAuth não está configurado. Defina GOOGLE_CLIENT_ID.')
    }

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          redirect_uri: `${process.env.APP_URL || 'https://endorfinapp.com'}/auth/google/callback`,
          grant_type: 'authorization_code',
        }).toString(),
      })

      const data = await tokenResponse.json() as any
      if (!tokenResponse.ok || (!data.id_token && !data.access_token)) {
        throw new UnauthorizedError(data.error_description || 'Falha ao trocar código do Google por token.')
      }

      return AuthService.loginWithGoogle(data.id_token || '', jwtSign, data.access_token)
    } catch (err: any) {
      if (err instanceof UnauthorizedError) throw err
      throw new UnauthorizedError('Código Google inválido ou expirado.')
    }
  }

  /**
   * Logout — invalida o refresh token
   */
  static async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
  }

  /**
   * Converte o perfil do usuário atual para PROFESSOR e re-emite os tokens JWT
   */
  static async mudarParaProfessor(
    usuarioId: string,
    cref: string | undefined,
    jwtSign: (payload: object, opts?: object) => string,
  ): Promise<AuthTokens & { usuario: { id: string; nome: string; email: string; role: Role; fotoUrl: string | null } }> {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    })

    if (!usuario) {
      throw new NotFoundError('Usuário não encontrado')
    }

    // 1. Atualizar role para PROFESSOR
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: { role: Role.PROFESSOR },
      select: { id: true, nome: true, email: true, role: true, foto_url: true },
    })

    // 2. Upsert do perfil Professor
    await prisma.professor.upsert({
      where: { usuario_id: usuarioId },
      create: { usuario_id: usuarioId, cref: cref || null },
      update: { cref: cref || null },
    })

    // 3. Re-emitir tokens JWT com role PROFESSOR
    const payload = { sub: usuario.id, role: Role.PROFESSOR }
    const accessToken = jwtSign(payload, { expiresIn: env.JWT_EXPIRES_IN })
    const refreshToken = jwtSign(
      { sub: usuario.id },
      { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES_IN },
    )

    await AuthService.enforceRefreshTokenLimit(usuario.id)

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        usuario_id: usuario.id,
        expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    return {
      accessToken,
      refreshToken,
      usuario: {
        id: usuarioAtualizado.id,
        nome: usuarioAtualizado.nome,
        email: usuarioAtualizado.email,
        role: usuarioAtualizado.role,
        fotoUrl: usuarioAtualizado.foto_url,
      },
    }
  }
}
