import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { Role } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { ConflictError, NotFoundError, UnauthorizedError, ForbiddenError, BadRequestError } from '../../../domain/errors/AppError.js'
import { env } from '../../../shared/env.js'
import { sendVerificationEmail, sendPasswordResetEmail } from '../../../infrastructure/email/mailer.js'
import crypto from 'crypto'

const DEFAULT_GOOGLE_CLIENT_ID = '100874517602-9kjnm8s42j2780albl1eime7dcpqmlpv.apps.googleusercontent.com'

function getGoogleClient(): OAuth2Client {
  const cid = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID
  return new OAuth2Client(cid)
}

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
      select: { id: true, email_verified: true },
    })

    if (emailExistente) {
      if (!emailExistente.email_verified) {
        // Cadastro anterior não concluído por falta de verificação de e-mail.
        // Apaga o registro não verificado para permitir novo cadastro limpo.
        await prisma.usuario.delete({ where: { id: emailExistente.id } })
      } else {
        throw new ConflictError('E-mail já cadastrado')
      }
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
   * Helper para gerar tokens de acesso e refresh para um usuário
   */
  static async generateTokensForUser(
    usuario: { id: string; role: Role; admin: boolean },
    jwtSign: (payload: object, opts?: object) => string,
  ): Promise<AuthTokens> {
    let tenantId: string | undefined
    if (usuario.role === Role.ACADEMIA) {
      const academia = await prisma.academia.findUnique({ where: { usuario_id: usuario.id } })
      tenantId = academia?.id
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

    return AuthService.generateTokensForUser(
      { id: usuario.id, role: usuario.role, admin: usuario.admin },
      jwtSign,
    )
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
   * Solicita código de recuperação de senha (4 dígitos via email)
   */
  static async forgotPassword(email: string): Promise<void> {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, ativo: true },
    })
    // Responde com sucesso genérico para não vazar a existência do email
    if (!usuario || !usuario.ativo) return

    const code = crypto.randomInt(1000, 9999).toString()
    const codeExpira = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { reset_password_code: code, reset_password_code_expira: codeExpira },
    })

    await sendPasswordResetEmail(email, code)
  }

  /**
   * Cancela cadastro em andamento e remove o usuário não verificado do banco
   */
  static async cancelRegistration(email: string): Promise<void> {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, email_verified: true },
    })
    if (usuario && !usuario.email_verified) {
      await prisma.usuario.delete({ where: { id: usuario.id } })
    }
  }

  /**
   * Limpa registros incompletos cujo código de verificação já expirou (TTL de 15 min)
   */
  static async cleanExpiredUnverifiedRegistrations(): Promise<number> {
    const result = await prisma.usuario.deleteMany({
      where: {
        email_verified: false,
        email_verify_code_expira: { lt: new Date() },
      },
    })
    return result.count
  }

  /**
   * Redefine a senha com código de recuperação de 4 dígitos e autentica o usuário imediatamente
   */
  static async resetPassword(
    email: string,
    code: string,
    novaSenha: string,
    jwtSign?: (payload: object, opts?: object) => string,
  ): Promise<{ message: string; tokens?: AuthTokens; usuario?: { id: string; nome: string; email: string; role: Role } }> {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        admin: true,
        reset_password_code: true,
        reset_password_code_expira: true,
      },
    })
    if (!usuario || !usuario.reset_password_code) {
      throw new BadRequestError('Código de recuperação inválido ou expirado.')
    }

    if (usuario.reset_password_code !== code) {
      throw new BadRequestError('Código de recuperação incorreto.')
    }

    if (!usuario.reset_password_code_expira || usuario.reset_password_code_expira < new Date()) {
      throw new BadRequestError('Código de recuperação expirado. Solicite um novo.')
    }

    const novaSenhaHash = await bcrypt.hash(novaSenha, 12)

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senha_hash: novaSenhaHash,
        reset_password_code: null,
        reset_password_code_expira: null,
        email_verified: true,
        ultima_atividade_em: new Date(),
      },
    })

    let tokens: AuthTokens | undefined
    if (jwtSign) {
      tokens = await AuthService.generateTokensForUser(
        { id: usuario.id, role: usuario.role, admin: usuario.admin },
        jwtSign,
      )
    }

    return {
      message: 'Senha redefinida com sucesso!',
      tokens,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
      },
    }
  }

  /**
   * Login com Google OAuth — verifica credential, upsert usuario, retorna JWT
   */
  static async loginWithGoogle(
    credential: string,
    jwtSign: (payload: object, opts?: object) => string,
    googleAccessToken?: string,
  ): Promise<AuthTokens & { isNew: boolean; nome: string }> {
    let email: string | null = null
    let nome: string | null = null
    let fotoUrl: string | null = null
    let googleId: string | null = null

    const clientId = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID

    // 1. Tenta verificar como ID Token via google-auth-library
    if (credential) {
      try {
        const client = getGoogleClient()
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: [clientId, DEFAULT_GOOGLE_CLIENT_ID],
        })
        const payload = ticket.getPayload()
        if (payload?.email) {
          email = payload.email
          nome = payload.name || email.split('@')[0]
          fotoUrl = payload.picture || null
          googleId = payload.sub
          console.log(`[GoogleAuth] Token verificado via google-auth-library para ${email}`)
        }
      } catch (err: any) {
        console.warn('[GoogleAuth] Falha no verifyIdToken local, tentando endpoints oficiais:', err?.message)
      }
    }

    // 2. Tenta verificar via endpoint oficial oauth2 tokeninfo (ID Token)
    if (!email && credential) {
      try {
        const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
        if (res.ok) {
          const data = (await res.json()) as any
          if (data?.email) {
            email = String(data.email)
            nome = data.name || email.split('@')[0]
            fotoUrl = data.picture || null
            googleId = data.sub
            console.log(`[GoogleAuth] Token verificado via tokeninfo id_token para ${data.email}`)
          }
        }
      } catch (err: any) {
        console.warn('[GoogleAuth] Falha no tokeninfo id_token:', err?.message)
      }
    }

    // 3. Tenta verificar via userinfo com access_token (ou credential usado como Bearer)
    const possibleAccessToken = googleAccessToken || credential
    if (!email && possibleAccessToken) {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${possibleAccessToken}` },
        })
        if (res.ok) {
          const data = (await res.json()) as any
          if (data?.email) {
            email = String(data.email)
            nome = data.name || email.split('@')[0]
            fotoUrl = data.picture || null
            googleId = data.sub
            console.log(`[GoogleAuth] Token verificado via userinfo bearer para ${data.email}`)
          }
        }
      } catch (err: any) {
        console.warn('[GoogleAuth] Falha no userinfo:', err?.message)
      }
    }

    // 4. Tenta verificar via endpoint tokeninfo (Access Token)
    if (!email && possibleAccessToken) {
      try {
        const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(possibleAccessToken)}`)
        if (res.ok) {
          const data = (await res.json()) as any
          if (data?.email) {
            email = String(data.email)
            nome = data.name || email.split('@')[0]
            fotoUrl = data.picture || null
            googleId = data.sub || data.user_id
            console.log(`[GoogleAuth] Token verificado via tokeninfo access_token para ${data.email}`)
          }
        }
      } catch (err: any) {
        console.warn('[GoogleAuth] Falha no tokeninfo access_token:', err?.message)
      }
    }

    if (!email) {
      throw new UnauthorizedError('Token Google inválido ou expirado. Por favor, tente novamente.')
    }

    const emailFinal: string = email
    const nomeFinal: string = nome || emailFinal.split('@')[0]

    let usuario = await prisma.usuario.findUnique({
      where: { email: emailFinal },
    })

    let isNew = false

    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: {
          nome: nomeFinal,
          email: emailFinal,
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
    const clientId = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID
    if (!clientId) {
      throw new Error('Google OAuth não está configurado. Defina GOOGLE_CLIENT_ID.')
    }

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
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
