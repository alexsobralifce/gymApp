import { env } from '../../shared/env.js'
import { AppError } from '../../domain/errors/AppError.js'

export interface InstagramTokenResult {
  access_token: string
  user_id?: string
  expires_in?: number
}

export interface InstagramProfile {
  id: string
  username: string
  account_type?: string
}

export interface PublicacaoResult {
  mediaId: string
  permalink?: string
}

export class InstagramClient {
  private static get appId() {
    return process.env.META_APP_ID || env.META_APP_ID
  }

  private static get appSecret() {
    return process.env.META_APP_SECRET || env.META_APP_SECRET
  }

  /**
   * Gera a URL para redirecionamento do usuário ao OAuth do Instagram
   */
  static gerarUrlAutorizacao(redirectUri: string, state?: string): string {
    if (!this.appId) {
      throw new AppError('Integração com Instagram não configurada no servidor (META_APP_ID ausente).', 500)
    }

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      scope: 'instagram_basic,instagram_content_publish',
      response_type: 'code',
      ...(state ? { state } : {}),
    })

    return `https://api.instagram.com/oauth/authorize?${params.toString()}`
  }

  /**
   * Troca o código de autorização recebido pelo short-lived token
   */
  static async trocarCodePorToken(code: string, redirectUri: string): Promise<InstagramTokenResult> {
    if (!this.appId || !this.appSecret) {
      throw new AppError('Credenciais da Meta/Instagram não configuradas.', 500)
    }

    const formData = new URLSearchParams()
    formData.append('client_id', this.appId)
    formData.append('client_secret', this.appSecret)
    formData.append('grant_type', 'authorization_code')
    formData.append('redirect_uri', redirectUri)
    formData.append('code', code)

    const response = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new AppError(
        `Erro ao autenticar com Instagram: ${(err as any)?.error_message || response.statusText}`,
        400
      )
    }

    return response.json() as Promise<InstagramTokenResult>
  }

  /**
   * Troca o token de curta duração por um token de longa duração (60 dias)
   */
  static async obterLongLivedToken(shortToken: string): Promise<InstagramTokenResult> {
    if (!this.appSecret) {
      throw new AppError('META_APP_SECRET não configurado.', 500)
    }

    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: this.appSecret,
      access_token: shortToken,
    })

    const response = await fetch(
      `https://graph.instagram.com/access_token?${params.toString()}`
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new AppError(
        `Erro ao obter token de longa duração do Instagram: ${(err as any)?.error?.message || response.statusText}`,
        400
      )
    }

    return response.json() as Promise<InstagramTokenResult>
  }

  /**
   * Renova um token de longa duração antes de expirar
   */
  static async refreshLongLivedToken(token: string): Promise<InstagramTokenResult> {
    const params = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: token,
    })

    const response = await fetch(
      `https://graph.instagram.com/refresh_access_token?${params.toString()}`
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new AppError(
        `Erro ao renovar token do Instagram: ${(err as any)?.error?.message || response.statusText}`,
        400
      )
    }

    return response.json() as Promise<InstagramTokenResult>
  }

  /**
   * Obtém informações do perfil do Instagram autenticado
   */
  static async obterPerfilInstagram(accessToken: string): Promise<InstagramProfile> {
    const response = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${encodeURIComponent(accessToken)}`
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new AppError(
        `Erro ao buscar dados do perfil no Instagram: ${(err as any)?.error?.message || response.statusText}`,
        400
      )
    }

    return response.json() as Promise<InstagramProfile>
  }

  /**
   * Publica uma imagem diretamente no feed do Instagram do usuário
   * (Requer conta Creator ou Business com permissão instagram_content_publish)
   */
  static async publicarFoto(
    igUserId: string,
    accessToken: string,
    imagemUrl: string,
    caption?: string
  ): Promise<PublicacaoResult> {
    // 1. Criar container de mídia
    const containerParams = new URLSearchParams({
      image_url: imagemUrl,
      ...(caption ? { caption } : {}),
      access_token: accessToken,
    })

    const containerRes = await fetch(
      `https://graph.instagram.com/v19.0/${encodeURIComponent(igUserId)}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: containerParams.toString(),
      }
    )

    if (!containerRes.ok) {
      const err = await containerRes.json().catch(() => ({}))
      const msg = (err as any)?.error?.message || containerRes.statusText
      throw new AppError(`Erro ao preparar publicação no Instagram: ${msg}`, 400)
    }

    const containerData = (await containerRes.json()) as { id: string }
    const creationId = containerData.id

    // Aguardar 1.5s para processamento do container pela Meta
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // 2. Publicar o container
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken,
    })

    const publishRes = await fetch(
      `https://graph.instagram.com/v19.0/${encodeURIComponent(igUserId)}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: publishParams.toString(),
      }
    )

    if (!publishRes.ok) {
      const err = await publishRes.json().catch(() => ({}))
      const msg = (err as any)?.error?.message || publishRes.statusText
      throw new AppError(`Erro ao finalizar publicação no Instagram: ${msg}`, 400)
    }

    const publishData = (await publishRes.json()) as { id: string }
    return {
      mediaId: publishData.id,
    }
  }
}
