import fs from 'fs/promises'
import path from 'path'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { env } from '../../shared/env.js'
import { getPublicDir } from './paths.js'

/**
 * Armazenamento de arquivos enviados e de mídia dos exercícios.
 *
 * A chave é o próprio caminho da URL sem a barra inicial, por exemplo
 * `uploads/logos/x.png` ou `exercises/gdrive/y.gif`.
 *
 * - Com as variáveis STORAGE_* definidas, usa o bucket S3 (produção, Railway).
 * - Sem elas, usa a pasta `public/` local (desenvolvimento).
 */

const usaBucket = Boolean(
  env.STORAGE_BUCKET && env.STORAGE_ENDPOINT && env.STORAGE_ACCESS_KEY && env.STORAGE_SECRET_KEY,
)

let cliente: S3Client | null = null

function s3(): S3Client {
  if (!cliente) {
    cliente = new S3Client({
      region: env.STORAGE_REGION,
      endpoint: env.STORAGE_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY as string,
        secretAccessKey: env.STORAGE_SECRET_KEY as string,
      },
    })
  }
  return cliente
}

/** Impede chaves com `..` ou segmentos vazios (evita sair da raiz de armazenamento). */
function chaveSegura(key: string): string {
  const limpa = key.replace(/^\/+/, '')
  const partes = limpa.split('/')
  if (!limpa || partes.some((p) => p === '' || p === '..')) {
    throw new Error(`Chave de armazenamento inválida: ${key}`)
  }
  return limpa
}

const MIME_POR_EXTENSAO: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}

export function tipoDoArquivo(nome: string): string {
  return MIME_POR_EXTENSAO[path.extname(nome).toLowerCase()] ?? 'application/octet-stream'
}

/** Grava o arquivo no bucket ou na pasta local, criando as pastas quando preciso. */
export async function salvarObjeto(key: string, dados: Buffer, contentType?: string): Promise<void> {
  const k = chaveSegura(key)
  const tipo = contentType ?? tipoDoArquivo(k)

  if (usaBucket) {
    await s3().send(
      new PutObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: k,
        Body: dados,
        ContentType: tipo,
      }),
    )
    return
  }

  const destino = path.join(getPublicDir(), k)
  await fs.mkdir(path.dirname(destino), { recursive: true })
  await fs.writeFile(destino, dados)
}

/** Como lerObjeto, mas lança erro quando o arquivo não existe (usado dentro de try/catch que responde 404). */
export async function lerObjetoOuFalha(key: string): Promise<Buffer> {
  const dados = await lerObjeto(key)
  if (!dados) throw new Error(`Arquivo não encontrado: ${key}`)
  return dados
}

/** Lê o arquivo. Retorna null quando ele não existe. */
export async function lerObjeto(key: string): Promise<Buffer | null> {
  const k = chaveSegura(key)

  if (usaBucket) {
    try {
      const resposta = await s3().send(new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: k }))
      if (!resposta.Body) return null
      return Buffer.from(await resposta.Body.transformToByteArray())
    } catch (erro) {
      const e = erro as { name?: string; $metadata?: { httpStatusCode?: number } }
      if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) return null
      throw erro
    }
  }

  try {
    return await fs.readFile(path.join(getPublicDir(), k))
  } catch {
    return null
  }
}
