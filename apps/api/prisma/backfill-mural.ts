/**
 * Backfill do Mural Social — cria posts de TREINO_CONCLUIDO para treinos
 * concluídos HOJE que não possuem post correspondente no mural.
 *
 * Uso:
 *   npx tsx apps/api/prisma/backfill-mural.ts            # executa
 *   npx tsx apps/api/prisma/backfill-mural.ts --dry-run  # só lista
 *
 * Regras:
 * - Considera treinos com entrada em treino_historico (status_novo=CONCLUIDO)
 *   com timestamp de HOJE (início do dia local até agora).
 * - Pula alunos com visibilidade_padrao = PRIVADO.
 * - Pula se já existe post TREINO_CONCLUIDO do treino criado hoje (evita duplicar).
 */
import { PrismaClient, PostTipo, Visibilidade } from '@prisma/client'
import { env } from '../src/shared/env.js'

const prisma = new PrismaClient()

function absolutizeMedia(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return `${env.API_BASE_URL}${url}`
  return `${env.API_BASE_URL}/${url}`
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const inicioHoje = new Date()
  inicioHoje.setHours(0, 0, 0, 0)

  const conclusoes = await prisma.treinoHistorico.findMany({
    where: {
      status_novo: 'CONCLUIDO',
      timestamp: { gte: inicioHoje },
    },
    include: {
      treino: {
        include: {
          aluno: {
            include: {
              usuario: { select: { nome: true, foto_url: true } },
              academia: { select: { nome: true } },
            },
          },
        },
      },
    },
    orderBy: { timestamp: 'asc' },
  })

  // Remove duplicatas (mesma sessão pode ter múltiplas linhas de histórico)
  const vistos = new Set<string>()
  const unicos = conclusoes.filter((c) => {
    const key = `${c.treino_id}:${c.ator_id}`
    if (vistos.has(key)) return false
    vistos.add(key)
    return true
  })

  const criados: string[] = []
  const pulados: string[] = []

  for (const c of unicos) {
    const aluno = c.treino.aluno
    if (!aluno) {
      pulados.push(`Treino ${c.treino_id}: aluno não encontrado`)
      continue
    }
    if (aluno.visibilidade_padrao === 'PRIVADO') {
      pulados.push(`Aluno ${aluno.id}: visibilidade PRIVADO — sem post`)
      continue
    }

    // Já existe post deste treino criado hoje?
    const jaExiste = await prisma.socialPost.findFirst({
      where: {
        treino_id: c.treino_id,
        aluno_id: aluno.id,
        tipo: 'TREINO_CONCLUIDO',
        criado_em: { gte: inicioHoje },
      },
      select: { id: true },
    })
    if (jaExiste) {
      pulados.push(`Treino ${c.treino_id}: post já existe (${jaExiste.id})`)
      continue
    }

    const label = `Treino ${c.treino_id} | aluno ${aluno.usuario.nome} (${aluno.id}) | ${c.timestamp.toISOString()}`
    if (dryRun) {
      criados.push(`[dry-run] criaria post: ${label}`)
      continue
    }

    const post = await prisma.socialPost.create({
      data: {
        aluno_id: aluno.id,
        treino_id: c.treino_id,
        autor_nome: aluno.usuario.nome,
        autor_foto_url: absolutizeMedia(aluno.usuario.foto_url),
        academia_nome: aluno.academia?.nome ?? null,
        grupo_muscular_resumo: null,
        tipo: 'TREINO_CONCLUIDO',
        visibilidade: aluno.visibilidade_padrao,
      },
    })
    criados.push(`criado: ${label} → post ${post.id}`)

    // Fanout para clubes do aluno
    const clubes = await prisma.socialClubMember.findMany({
      where: { aluno_id: aluno.id },
      select: { clube_id: true },
    })
    if (clubes.length > 0) {
      await prisma.socialPostClub.createMany({
        data: clubes.map((cl) => ({ post_id: post.id, clube_id: cl.clube_id })),
        skipDuplicates: true,
      })
    }
  }

  console.log('=== Backfill Mural ===')
  console.log(`Conclusões hoje (únicas): ${unicos.length}`)
  console.log(`Criados: ${criados.length}`)
  for (const c of criados) console.log('  ' + c)
  console.log(`Pulados: ${pulados.length}`)
  for (const p of pulados.slice(0, 50)) console.log('  - ' + p)
  if (pulados.length > 50) console.log(`  ... e mais ${pulados.length - 50}`)
}

main()
  .catch((err) => {
    console.error('Erro no backfill:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
