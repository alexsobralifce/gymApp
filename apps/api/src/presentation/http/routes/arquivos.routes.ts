import { FastifyInstance } from 'fastify'
import { lerObjeto, tipoDoArquivo } from '../../../infrastructure/storage/objectStorage.js'

/**
 * Serve arquivos públicos (uploads e mídia dos exercícios) a partir do storage.
 * A chave é o próprio caminho da URL sem a barra inicial.
 */
const PREFIXOS_PERMITIDOS = ['uploads/', 'exercises/']

export async function arquivosRoutes(app: FastifyInstance) {
  app.get('/uploads/*', servirArquivo)
  app.get('/exercises/*', servirArquivo)
}

async function servirArquivo(request: { url: string }, reply: any) {
  let key: string
  try {
    key = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '')
  } catch {
    return reply.status(400).send({ message: 'Caminho inválido' })
  }

  if (!PREFIXOS_PERMITIDOS.some((p) => key.startsWith(p)) || key.split('/').includes('..')) {
    return reply.status(404).send({ message: 'Arquivo não encontrado' })
  }

  try {
    const dados = await lerObjeto(key)
    if (!dados) return reply.status(404).send({ message: 'Arquivo não encontrado' })

    return reply
      .header('Content-Type', tipoDoArquivo(key))
      .header('Cache-Control', 'public, max-age=86400')
      .header('Cross-Origin-Resource-Policy', 'cross-origin')
      .send(dados)
  } catch {
    return reply.status(502).send({ message: 'Falha ao ler o arquivo' })
  }
}
