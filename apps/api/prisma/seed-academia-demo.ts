/**
 * Cria (idempotente) a academia fictícia "Iron Demo Fitness" com logo e um aluno vinculado,
 * para demonstrar o card de treino concluído com a logo da academia no Instagram.
 *
 * A academia (e-mails @gymapp.local) fica fora da listagem pública GET /academias.
 * A senha vem de DEMO_SEED_PASSWORD; sem ela, é gerada uma aleatória e impressa no fim.
 *
 * Uso (local ou produção, apontando DATABASE_URL e API_BASE_URL para o ambiente):
 *   DEMO_SEED_PASSWORD='...' npx tsx prisma/seed-academia-demo.ts
 */
import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { PrismaClient, Role, AcademiaStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { salvarLogoAcademia } from '../src/application/usecases/academia/LogoService.js'

const prisma = new PrismaClient()

const ACADEMIA_EMAIL = 'academia.demo@gymapp.local'
const ALUNO_EMAIL = 'aluno.demo@gymapp.local'
const ACADEMIA_NOME = 'Iron Demo Fitness'
const ACADEMIA_CNPJ = '99.999.999/0001-99'

async function main() {
  const senha = process.env.DEMO_SEED_PASSWORD || crypto.randomBytes(9).toString('base64url') + 'aA1'
  const senha_hash = await bcrypt.hash(senha, 12)
  const agora = new Date()

  const usuarioAcademia = await prisma.usuario.upsert({
    where: { email: ACADEMIA_EMAIL },
    update: { senha_hash, ativo: true, email_verified: true },
    create: { nome: ACADEMIA_NOME, email: ACADEMIA_EMAIL, senha_hash, role: Role.ACADEMIA, email_verified: true },
  })

  const academia = await prisma.academia.upsert({
    where: { usuario_id: usuarioAcademia.id },
    update: { nome: ACADEMIA_NOME, status: AcademiaStatus.ATIVO },
    create: {
      usuario_id: usuarioAcademia.id,
      nome: ACADEMIA_NOME,
      cnpj: ACADEMIA_CNPJ,
      status: AcademiaStatus.ATIVO,
      max_professores: 5,
    },
  })

  // Mesma validação/normalização do upload feito pela própria academia
  const aqui = path.dirname(fileURLToPath(import.meta.url))
  const logoUrl = await salvarLogoAcademia(academia.id, await fs.readFile(path.join(aqui, 'assets', 'logo-demo.png')))

  const usuarioAluno = await prisma.usuario.upsert({
    where: { email: ALUNO_EMAIL },
    update: { senha_hash, ativo: true, email_verified: true, premium_manual_em: agora },
    create: {
      nome: 'Aluno Demo',
      email: ALUNO_EMAIL,
      senha_hash,
      role: Role.ALUNO,
      email_verified: true,
      premium_manual_em: agora,
      premium_manual_nota: 'seed academia demo',
    },
  })

  const aluno = await prisma.aluno.upsert({
    where: { usuario_id: usuarioAluno.id },
    update: { academia_id: academia.id, peso_kg: 75, altura_cm: 178, sexo: 'MASCULINO' },
    create: { usuario_id: usuarioAluno.id, academia_id: academia.id, peso_kg: 75, altura_cm: 178, sexo: 'MASCULINO' },
  })

  const temMedida = await prisma.medidaCorporal.findFirst({ where: { aluno_id: aluno.id } })
  if (!temMedida) {
    await prisma.medidaCorporal.create({ data: { aluno_id: aluno.id, peso_kg: 75, altura_cm: 178 } })
  }

  console.log(`✅ Academia: ${ACADEMIA_NOME} (${academia.id})`)
  console.log(`   Logo: ${logoUrl}`)
  console.log(`   Login academia: ${ACADEMIA_EMAIL}`)
  console.log(`   Login aluno:    ${ALUNO_EMAIL}`)
  if (!process.env.DEMO_SEED_PASSWORD) console.log(`   Senha (gerada, anote agora): ${senha}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
