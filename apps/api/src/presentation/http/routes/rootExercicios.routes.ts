import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import path from 'path'
import fs from 'fs/promises'
import { Prisma, Role, Sexo } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError, ConflictError, BadRequestError } from '../../../domain/errors/AppError.js'
import { ensureDir, getExerciciosGifsDir } from '../../../infrastructure/storage/paths.js'
import { env } from '../../../shared/env.js'
import { GIF_REGRAS, processarGif, medirEnquadramento } from '../../../application/usecases/exercicio/ExercicioGifService.js'

const texto = z.string().trim().max(500).nullish().transform((v) => v || null)
const lista = z.array(z.string().trim().min(1).max(500)).max(40).default([])
const url = z.string().trim().url().max(1000).nullish().transform((v) => v || null)

const exercicioSchema = z.object({
  nome: z.string().trim().min(2).max(200),
  grupo_muscular: texto,
  equipamento: texto,
  nivel: texto,
  musculo_alvo: texto,
  musculos_secundarios: lista,
  descricao_pt: z.string().trim().max(3000).nullish().transform((v) => v || null),
  dica: z.string().trim().max(1000).nullish().transform((v) => v || null),
  passos_pt: lista,
  gif_url: url,
  imagem_url: url,
  sexo_figura: z.enum(['MASCULINO', 'FEMININO']).nullish().transform((v) => v ?? null),
})

const paramSexo = z.object({ id: z.string(), sexo: z.enum(['MASCULINO', 'FEMININO']) })

interface Midia {
  gif_url: string
  foco_x: number | null
  foco_y: number | null
  foco_larg: number | null
  foco_alt: number | null
}
type Variantes = Partial<Record<Sexo, Midia>>

function lerVariantes(valor: Prisma.JsonValue | null | undefined): Variantes {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Variantes) : {}
}

function gravarVariantes(v: Variantes): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return Object.keys(v).length > 0 ? (v as unknown as Prisma.InputJsonValue) : Prisma.DbNull
}

/** Remove do disco um GIF que foi enviado por upload (URLs externas são ignoradas). */
async function removerArquivoLocal(gifUrl: string | null) {
  if (!gifUrl || !gifUrl.includes('/uploads/exercicios/')) return
  const nome = gifUrl.split('/').pop() ?? ''
  if (!/^[a-zA-Z0-9._-]+$/.test(nome) || nome.includes('..')) return
  await fs.unlink(path.join(getExerciciosGifsDir(), nome)).catch(() => undefined)
}

async function contarUsos(id: string) {
  const [treinos, execucoes, planos, alternativos] = await Promise.all([
    prisma.treinoExercicio.count({ where: { exercicio_id: id } }),
    prisma.execucaoExercicio.count({ where: { exercicio_id: id } }),
    prisma.planoSessaoExercicio.count({ where: { exercicio_id: id } }),
    prisma.planoSessaoExercicio.count({ where: { alternativo_id: id } }),
  ])
  return { treinos, execucoes, planos: planos + alternativos }
}

async function lerArquivo(request: FastifyRequest): Promise<Buffer> {
  const data = await request.file({ limits: { fileSize: GIF_REGRAS.pesoMaxBytes } })
  if (!data) throw new BadRequestError('Nenhum arquivo enviado.')
  const buffer = await data.toBuffer()
  if (data.file.truncated) throw new BadRequestError('O arquivo deve ter no máximo 5 MB.')
  return buffer
}

export async function rootExerciciosRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.ROOT)]

  /** GET /root/exercicios — catálogo completo (com quantos treinos usam cada exercício) */
  app.get('/', { preHandler }, async (_request, reply) => {
    const exercicios = await prisma.exercicio.findMany({
      orderBy: { nome: 'asc' },
      include: { _count: { select: { treinos: true } } },
    })
    return reply.status(200).send(
      exercicios.map(({ _count, maquina: _maquina, ...ex }) => ({ ...ex, usos: _count.treinos })),
    )
  })

  /** POST /root/exercicios — cria exercício */
  app.post('/', { preHandler }, async (request, reply) => {
    const body = exercicioSchema.parse(request.body)
    const exercicio = await prisma.exercicio.create({ data: body })
    return reply.status(201).send(exercicio)
  })

  /** PUT /root/exercicios/:id — edita exercício */
  app.put('/:id', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const body = exercicioSchema.parse(request.body)
    const atual = await prisma.exercicio.findUnique({ where: { id }, select: { gif_url: true } })
    if (!atual) throw new NotFoundError('Exercício')

    // O enquadramento pertence à imagem: trocou o GIF, o recorte antigo deixa de valer
    const gifMudou = atual.gif_url !== body.gif_url
    const exercicio = await prisma.exercicio.update({
      where: { id },
      data: gifMudou ? { ...body, foco_x: null, foco_y: null, foco_larg: null, foco_alt: null } : body,
    })
    if (atual.gif_url && gifMudou) await removerArquivoLocal(atual.gif_url)
    return reply.status(200).send(exercicio)
  })

  /** DELETE /root/exercicios/:id — apaga; recusa se já houver treino, execução ou plano usando-o */
  app.delete('/:id', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const atual = await prisma.exercicio.findUnique({ where: { id }, select: { gif_url: true, variantes: true } })
    if (!atual) throw new NotFoundError('Exercício')

    const usos = await contarUsos(id)
    if (usos.treinos + usos.execucoes + usos.planos > 0) {
      throw new ConflictError(
        `Exercício em uso (${usos.treinos} treinos, ${usos.execucoes} execuções, ${usos.planos} planos). Edite-o em vez de apagar.`,
      )
    }

    await prisma.exercicio.delete({ where: { id } })
    await removerArquivoLocal(atual.gif_url)
    for (const m of Object.values(lerVariantes(atual.variantes))) await removerArquivoLocal(m.gif_url)
    return reply.status(204).send()
  })

  /** GET /root/exercicios/regras-gif — padrões exigidos do GIF (exibidos na tela de cadastro) */
  app.get('/regras-gif', { preHandler }, async (_request, reply) => reply.status(200).send(GIF_REGRAS))

  /** POST /root/exercicios/gif-previa — valida e normaliza sem gravar; devolve a prévia do resultado */
  app.post('/gif-previa', { preHandler }, async (request, reply) => {
    const buffer = await lerArquivo(request)
    const r = await processarGif(buffer)
    return reply.status(200).send({
      original: { kb: Math.round(buffer.length / 1024) },
      final: { kb: Math.round(r.buffer.length / 1024), largura: r.largura, altura: r.altura, animado: r.animado, quadros: r.quadros },
      previa: `data:image/webp;base64,${r.buffer.toString('base64')}`,
    })
  })

  /** POST /root/exercicios/:id/gif — upload do GIF (multipart); normaliza, grava e troca o anterior */
  app.post('/:id/gif', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const atual = await prisma.exercicio.findUnique({ where: { id }, select: { gif_url: true } })
    if (!atual) throw new NotFoundError('Exercício')

    const r = await processarGif(await lerArquivo(request))

    const filename = `${id}_${Date.now()}.webp`
    await ensureDir(getExerciciosGifsDir())
    await fs.writeFile(path.join(getExerciciosGifsDir(), filename), r.buffer)

    const gifUrl = `${env.API_BASE_URL}/uploads/exercicios/${filename}`
    const foco = await medirEnquadramento(r.buffer)
    await prisma.exercicio.update({
      where: { id },
      data: { gif_url: gifUrl, foco_x: foco?.foco_x ?? null, foco_y: foco?.foco_y ?? null, foco_larg: foco?.foco_larg ?? null, foco_alt: foco?.foco_alt ?? null },
    })
    await removerArquivoLocal(atual.gif_url)
    return reply.status(200).send({ gifUrl })
  })

  /** POST /root/exercicios/:id/gif-variante/:sexo — versão do GIF para um sexo; normaliza, mede e troca a anterior */
  app.post('/:id/gif-variante/:sexo', { preHandler }, async (request, reply) => {
    const { id, sexo } = paramSexo.parse(request.params)
    const atual = await prisma.exercicio.findUnique({ where: { id }, select: { variantes: true } })
    if (!atual) throw new NotFoundError('Exercício')

    const r = await processarGif(await lerArquivo(request))
    const filename = `${id}_${sexo.toLowerCase()}_${Date.now()}.webp`
    await ensureDir(getExerciciosGifsDir())
    await fs.writeFile(path.join(getExerciciosGifsDir(), filename), r.buffer)

    const foco = await medirEnquadramento(r.buffer)
    const variantes = lerVariantes(atual.variantes)
    const anterior = variantes[sexo]?.gif_url ?? null
    variantes[sexo] = {
      gif_url: `${env.API_BASE_URL}/uploads/exercicios/${filename}`,
      foco_x: foco?.foco_x ?? null,
      foco_y: foco?.foco_y ?? null,
      foco_larg: foco?.foco_larg ?? null,
      foco_alt: foco?.foco_alt ?? null,
    }
    await prisma.exercicio.update({ where: { id }, data: { variantes: gravarVariantes(variantes) } })
    await removerArquivoLocal(anterior)
    return reply.status(200).send({ variantes })
  })

  /** DELETE /root/exercicios/:id/gif-variante/:sexo — remove a versão daquele sexo */
  app.delete('/:id/gif-variante/:sexo', { preHandler }, async (request, reply) => {
    const { id, sexo } = paramSexo.parse(request.params)
    const atual = await prisma.exercicio.findUnique({ where: { id }, select: { variantes: true } })
    if (!atual) throw new NotFoundError('Exercício')

    const variantes = lerVariantes(atual.variantes)
    const anterior = variantes[sexo]?.gif_url ?? null
    delete variantes[sexo]
    await prisma.exercicio.update({ where: { id }, data: { variantes: gravarVariantes(variantes) } })
    await removerArquivoLocal(anterior)
    return reply.status(200).send({ variantes })
  })
}
