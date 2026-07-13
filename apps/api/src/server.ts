import 'dotenv/config'
import { buildApp } from './app.js'
import { env } from './shared/env.js'
import { PrismaClient, TreinoStatus, TreinoAtor } from '@prisma/client'

async function migrarTreinosCadastrados() {
  const prisma = new PrismaClient()
  try {
    const pendentes = await prisma.treino.findMany({
      where: { status: TreinoStatus.CADASTRADO },
      select: { id: true, aluno_id: true, nome: true },
    })

    if (pendentes.length === 0) return

    console.log(`🔧 Migrando ${pendentes.length} treinos CADASTRADO → ENVIADO...`)

    for (const t of pendentes) {
      await prisma.$transaction(async (tx) => {
        await tx.treino.update({ where: { id: t.id }, data: { status: TreinoStatus.ENVIADO } })
        await tx.treinoHistorico.create({
          data: {
            treino_id: t.id,
            status_anterior: TreinoStatus.CADASTRADO,
            status_novo: TreinoStatus.ENVIADO,
            ator_id: 'SISTEMA',
            ator_tipo: TreinoAtor.SISTEMA,
          },
        })
        await tx.notificacao.create({
          data: {
            aluno_id: t.aluno_id,
            tipo: 'NOVO_TREINO',
            mensagem: `Voc\u00ea recebeu uma nova ficha de treino: ${t.nome}!`,
            dados: { treinoId: t.id, treinoNome: t.nome },
          },
        })
      })
    }

    console.log('✅ Todos os treinos CADASTRADO foram migrados para ENVIADO.')
  } catch (err) {
    console.error('⚠️ Falha ao migrar treinos CADASTRADO:', err)
  } finally {
    await prisma.$disconnect()
  }
}

async function start() {
  await migrarTreinosCadastrados()

  const app = await buildApp()

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    console.log(`🚀 GymApp API running on http://0.0.0.0:${env.PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()

