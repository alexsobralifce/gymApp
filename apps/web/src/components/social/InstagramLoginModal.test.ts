import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('InstagramLoginModal e integração com SharePostModal', () => {
  const modalSrc = fs.readFileSync(path.resolve(__dirname, 'InstagramLoginModal.tsx'), 'utf-8')
  const shareSrc = fs.readFileSync(path.resolve(__dirname, 'SharePostModal.tsx'), 'utf-8')

  it('InstagramLoginModal consulta o status da conexão via api.obterStatusInstagram', () => {
    expect(modalSrc).toContain('api.obterStatusInstagram()')
  })

  it('InstagramLoginModal suporta autenticação via popup com fallback', () => {
    expect(modalSrc).toMatch(/window\.open\(/)
    expect(modalSrc).toContain('/auth/instagram?token=')
  })

  it('InstagramLoginModal trata o caso de chaves da Meta não configuradas de forma amigável', () => {
    expect(modalSrc).toContain('configurado === false')
    expect(modalSrc).toContain('Instagram Stories')
  })

  it('InstagramLoginModal oferece botão de desconectar quando conectado', () => {
    expect(modalSrc).toContain('api.desconectarInstagram()')
    expect(modalSrc).toContain('Desconectar')
  })

  it('InstagramLoginModal oferece atalho direto para Stories sem necessidade de login', () => {
    expect(modalSrc).toContain('onSelectStoriesFallback')
    expect(modalSrc).toContain('Postar nos Stories sem login')
  })

  it('SharePostModal importa e abre o InstagramLoginModal ao clicar em compartilhar no feed quando não conectado', () => {
    expect(shareSrc).toContain("import InstagramLoginModal from './InstagramLoginModal'")
    expect(shareSrc).toMatch(/if \(!igConectado\)\s*\{\s*setLoginModalOpen\(true\)/)
    expect(shareSrc).toContain('<InstagramLoginModal')
  })
})
