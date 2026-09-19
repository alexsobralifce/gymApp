/**
 * Cria (idempotente) um professor de teste com 1 aluno vinculado, só em banco LOCAL.
 * Uso: npx tsx prisma/seed-professor-teste.ts
 */
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SENHA = 'Teste@12345'
const PROF_EMAIL = 'professor.teste@gymapp.local'
const ALUNO_EMAIL = 'aluno.teste@gymapp.local'

async function main() {
  const url = process.env.DATABASE_URL ?? ''
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    throw new Error('Recusado: DATABASE_URL não aponta para localhost. Este seed é só para banco local.')
  }

  const senha_hash = await bcrypt.hash(SENHA, 12)
  const agora = new Date()

  const profUser = await prisma.usuario.upsert({
    where: { email: PROF_EMAIL },
    update: { senha_hash, ativo: true, email_verified: true, premium_manual_em: agora },
    create: {
      nome: 'Carlos Silva',
      email: PROF_EMAIL,
      senha_hash,
      role: Role.PROFESSOR,
      email_verified: true,
      premium_manual_em: agora,
      premium_manual_nota: 'seed local de teste',
    },
  })
  const professor =
    (await prisma.professor.findUnique({ where: { usuario_id: profUser.id } })) ??
    (await prisma.professor.create({ data: { usuario_id: profUser.id, cref: '012345-G/CE' } }))

  const alunoUser = await prisma.usuario.upsert({
    where: { email: ALUNO_EMAIL },
    update: { senha_hash, ativo: true, email_verified: true, premium_manual_em: agora },
    create: {
      nome: 'Ana Souza',
      email: ALUNO_EMAIL,
      senha_hash,
      role: Role.ALUNO,
      email_verified: true,
      premium_manual_em: agora,
      premium_manual_nota: 'seed local de teste',
    },
  })
  const aluno = await prisma.aluno.upsert({
    where: { usuario_id: alunoUser.id },
    update: { professor_id: professor.id },
    create: {
      usuario_id: alunoUser.id,
      professor_id: professor.id,
      meta_semanal: 4,
      consentiu_feed_social_em: agora,
    },
  })

  console.log('✅ Professor:', PROF_EMAIL, '/', SENHA, `(professor ${professor.id})`)
  console.log('✅ Aluno:    ', ALUNO_EMAIL, '/', SENHA, `(aluno ${aluno.id}, professor_id=${aluno.professor_id})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
