import { PrismaClient } from '@prisma/client'

/**
 * Estende refresh tokens ainda válidos de 7 dias para 30 dias.
 * Necessário após a mudança de JWT_REFRESH_EXPIRES_IN '7d' → '30d':
 * os tokens já emitidos mantêm expira_em antigo no banco e derrubariam
 * usuários no 7º dia mesmo com o novo código.
 *
 * Roda no startup via railway-start.sh (idempotente).
 */
const prisma = new PrismaClient()

async function main() {
  const result = await prisma.$executeRawUnsafe(`
    UPDATE refresh_tokens
    SET expira_em = expira_em + INTERVAL '23 days'
    WHERE expira_em > NOW()
  `)
  console.log(`[Migration] Refresh tokens estendidos: ${result} token(s) afetado(s)`)
}

main()
  .catch((e) => {
    console.error('[Migration] Falha ao estender refresh tokens:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
