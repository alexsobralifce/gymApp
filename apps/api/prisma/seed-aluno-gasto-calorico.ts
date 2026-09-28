/**
 * Cria (idempotente) um aluno fictício com peso e um treino pronto para testar o
 * gasto calórico por METs no fim do treino. Só em banco LOCAL.
 * Uso: npx tsx prisma/seed-aluno-gasto-calorico.ts
 */
import { PrismaClient, Role, TreinoStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SENHA = 'Teste@12345'
const EMAIL = 'bruno.kcal@gymapp.local'
const NOME_TREINO = 'Peito e Tríceps (teste kcal)'

async function main() {
  const url = process.env.DATABASE_URL ?? ''
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    throw new Error('Recusado: DATABASE_URL não aponta para localhost. Este seed é só para banco local.')
  }

  const senha_hash = await bcrypt.hash(SENHA, 12)
  const agora = new Date()

  const usuario = await prisma.usuario.upsert({
    where: { email: EMAIL },
    update: { senha_hash, ativo: true, email_verified: true, premium_manual_em: agora },
    create: {
      nome: 'Bruno Lima',
      email: EMAIL,
      senha_hash,
      role: Role.ALUNO,
      email_verified: true,
      premium_manual_em: agora,
      premium_manual_nota: 'seed local de teste',
    },
  })

  const aluno = await prisma.aluno.upsert({
    where: { usuario_id: usuario.id },
    update: { peso_kg: 75, sexo: 'MASCULINO' },
    create: {
      usuario_id: usuario.id,
      peso_kg: 75,
      sexo: 'MASCULINO',
      data_nascimento: new Date('1995-03-10'),
      meta_semanal: 4,
      consentiu_feed_social_em: agora,
    },
  })

  const exercicios = await prisma.exercicio.findMany({ take: 4, orderBy: { nome: 'asc' } })
  if (exercicios.length === 0) throw new Error('Nenhum exercício no banco. Rode db:seed antes.')

  // Recria o treino a cada execução, sempre pronto para iniciar (ACEITO)
  const existente = await prisma.treino.findFirst({ where: { aluno_id: aluno.id, nome: NOME_TREINO } })
  if (existente) {
    await prisma.treinoHistorico.deleteMany({ where: { treino_id: existente.id } })
    await prisma.execucaoExercicio.deleteMany({ where: { treino_id: existente.id } })
    await prisma.treinoExercicio.deleteMany({ where: { treino_id: existente.id } })
    await prisma.treino.delete({ where: { id: existente.id } })
  }
  const treino = await prisma.treino.create({
    data: {
      aluno_id: aluno.id,
      nome: NOME_TREINO,
      dias_semana: [1, 3, 5],
      status: TreinoStatus.ACEITO,
      exercicios: {
        create: exercicios.map((e, i) => ({
          exercicio_id: e.id,
          ordem: i + 1,
          series: 3,
          repeticoes: 10,
          carga_sugerida_kg: 20,
        })),
      },
    },
  })

  console.log('✅ Aluno:', EMAIL, '/', SENHA, `(aluno ${aluno.id}, ${aluno.peso_kg} kg)`)
  console.log('✅ Treino:', treino.nome, `(${treino.id}) com ${exercicios.length} exercícios`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
