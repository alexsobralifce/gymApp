import crypto from 'node:crypto'
import { env } from './env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

// Deriva uma chave de 32 bytes a partir do JWT_REFRESH_SECRET (já exigido em produção)
// para não depender de mais uma variável de ambiente obrigatória.
const key = crypto.createHash('sha256').update(`token-encryption:${env.JWT_REFRESH_SECRET}`).digest()

/** Criptografa um valor sensível (ex: token OAuth) para armazenamento no banco. */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

/** Reverte `encryptSecret`. Lança erro se o valor foi adulterado ou a chave mudou. */
export function decryptSecret(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64')
  const iv = buf.subarray(0, IV_LENGTH)
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}
