import 'dotenv/config'
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function setRootUser(emailToPromote = 'alexandresobral2004@gmail.com') {
  console.log(`🔍 Verificando usuário ROOT: ${emailToPromote}...`)

  const existing = await prisma.usuario.findUnique({
    where: { email: emailToPromote },
  })

  if (existing) {
    const updated = await prisma.usuario.update({
      where: { email: emailToPromote },
      data: {
        role: Role.ROOT,
        ativo: true,
        email_verified: true,
      },
    })
    console.log(`✅ Usuário ${updated.email} promovido a ROOT com sucesso (ID: ${updated.id})`)
    return updated
  } else {
    // Caso o usuário ainda não esteja cadastrado, cria uma conta ROOT padrão
    const defaultPassword = await bcrypt.hash('Root@12345', 12)
    const created = await prisma.usuario.create({
      data: {
        nome: 'Alexandre Sobral',
        email: emailToPromote,
        senha_hash: defaultPassword,
        role: Role.ROOT,
        ativo: true,
        email_verified: true,
      },
    })
    console.log(`✅ Usuário ROOT criado com sucesso: ${created.email} (ID: ${created.id})`)
    return created
  }
}

// Executa se chamado diretamente via CLI (ex: npx tsx prisma/set-root-user.ts)
if (process.argv[1] && process.argv[1].endsWith('set-root-user.ts')) {
  setRootUser()
    .catch((err) => {
      console.error('❌ Erro ao configurar usuário ROOT:', err)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
