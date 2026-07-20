import path from 'path'
import fs from 'fs/promises'

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

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}
