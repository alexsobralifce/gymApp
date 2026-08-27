import path from 'path'
import fs from 'fs/promises'

/** Magic bytes das extensões permitidas */
const MAGIC_BYTES: Record<string, number[]> = {
  jpg: [0xff, 0xd8, 0xff],
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  gif: [0x47, 0x49, 0x46, 0x38],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF .... WEBP
}

/** Verifica que o buffer começa com os magic bytes da extensão informada */
export function validateMagicBytes(buffer: Buffer, ext: string): boolean {
  const cleanExt = ext.replace('.', '').toLowerCase()
  const expected = MAGIC_BYTES[cleanExt]
  if (!expected) return false
  if (buffer.length < expected.length) return false

  for (let i = 0; i < expected.length; i++) {
    if (buffer[i] !== expected[i]) return false
  }

  // WebP check adicional: bytes 8-11 devem ser "WEBP"
  if (cleanExt === 'webp' && buffer.length >= 12) {
    if (buffer[8] !== 0x57 || buffer[9] !== 0x45 || buffer[10] !== 0x42 || buffer[11] !== 0x50) {
      return false
    }
  }

  return true
}

/** Diretório public — process.cwd() = apps/api no start do Railway */
export function getPublicDir(): string {
  return path.join(process.cwd(), 'public')
}

export function getAvatarsDir(): string {
  return path.join(getPublicDir(), 'uploads', 'avatars')
}

export function getFeedDir(year: string, month: string): string {
  return path.join(getPublicDir(), 'uploads', 'feed', year, month)
}

export function getAvaliacoesFotosDir(avaliacaoId: string): string {
  return path.join(getPublicDir(), 'uploads', 'avaliacoes', avaliacaoId)
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}
