/**
 * Cadastra (idempotente) a Onix Academia (Sobral/CE) com CNPJ real e logo, mais um aluno de teste vinculado.
 *
 * Se a Onix já existir (por CNPJ real, e-mail ou nome do seed-academias-ce), o registro é atualizado.
 * A senha vem de ONIX_SEED_PASSWORD; sem ela, é gerada uma aleatória e impressa no fim.
 *
 * Uso (apontando DATABASE_URL e o cwd para o ambiente alvo):
 *   ONIX_SEED_PASSWORD='...' npx tsx prisma/seed-onix.ts
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

const ACADEMIA_EMAIL = 'onix.academia@gymapp.local'
const ALUNO_EMAIL = 'aluno.onix@gymapp.local'
const ACADEMIA_NOME = 'Onix Academia'
const ACADEMIA_CNPJ = '21.392.488/0001-10'
const CNPJ_PLACEHOLDER = '10.001.002/0001-05' // seed-academias-ce.ts

async function main() {
  const senha = process.env.ONIX_SEED_PASSWORD || crypto.randomBytes(9).toString('base64url') + 'aA1'
  const senha_hash = await bcrypt.hash(senha, 12)
  const agora = new Date()

  const existente = await prisma.academia.findFirst({
    where: { OR: [{ cnpj: ACADEMIA_CNPJ }, { cnpj: CNPJ_PLACEHOLDER }, { usuario: { email: ACADEMIA_EMAIL } }] },
  })

  let academiaId: string
  if (existente) {
    await prisma.academia.update({
      where: { id: existente.id },
      data: { nome: ACADEMIA_NOME, cnpj: ACADEMIA_CNPJ, status: AcademiaStatus.ATIVO },
    })
    academiaId = existente.id
    console.log(`↻ Academia já existia (${existente.id}); dados atualizados`)
  } else {
    const usuario = await prisma.usuario.upsert({
      where: { email: ACADEMIA_EMAIL },
      update: { senha_hash, ativo: true, email_verified: true },
      create: { nome: ACADEMIA_NOME, email: ACADEMIA_EMAIL, senha_hash, role: Role.ACADEMIA, email_verified: true },
    })
    const academia = await prisma.academia.create({
      data: { usuario_id: usuario.id, nome: ACADEMIA_NOME, cnpj: ACADEMIA_CNPJ, status: AcademiaStatus.ATIVO, max_professores: 20 },
    })
    academiaId = academia.id
  }

  // Mesma validação/normalização do upload feito pela própria academia
  const aqui = path.dirname(fileURLToPath(import.meta.url))
  const logoUrl = await salvarLogoAcademia(academiaId, await fs.readFile(path.join(aqui, 'assets', 'logo-onix.png')))

  const usuarioAluno = await prisma.usuario.upsert({
    where: { email: ALUNO_EMAIL },
    update: { senha_hash, ativo: true, email_verified: true, premium_manual_em: agora },
    create: {
      nome: 'Aluno Onix',
      email: ALUNO_EMAIL,
      senha_hash,
      role: Role.ALUNO,
      email_verified: true,
      premium_manual_em: agora,
      premium_manual_nota: 'seed Onix Academia (teste)',
    },
  })
  const aluno = await prisma.aluno.upsert({
    where: { usuario_id: usuarioAluno.id },
    update: { academia_id: academiaId, peso_kg: 75, altura_cm: 178, sexo: 'MASCULINO' },
    create: { usuario_id: usuarioAluno.id, academia_id: academiaId, peso_kg: 75, altura_cm: 178, sexo: 'MASCULINO' },
  })
  const temMedida = await prisma.medidaCorporal.findFirst({ where: { aluno_id: aluno.id } })
  if (!temMedida) await prisma.medidaCorporal.create({ data: { aluno_id: aluno.id, peso_kg: 75, altura_cm: 178 } })

  console.log(`✅ Academia: ${ACADEMIA_NOME} (${academiaId}) — CNPJ ${ACADEMIA_CNPJ}`)
  console.log(`   Logo: ${logoUrl}`)
  console.log(`   Login aluno: ${ALUNO_EMAIL}`)
  if (!process.env.ONIX_SEED_PASSWORD) console.log(`   Senha (gerada, anote agora): ${senha}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
