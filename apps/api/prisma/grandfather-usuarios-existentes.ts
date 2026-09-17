import 'dotenv/config'
import { PrismaClient, Role } from '@prisma/client'
import { liberarPremiumManual } from '../src/application/usecases/billing/BillingService.js'

const prisma = new PrismaClient()

/**
 * Isenta de cobrança todo usuário (ALUNO/PROFESSOR/ACADEMIA) cadastrado ANTES do corte,
 * usando o mesmo mecanismo do botão "Liberar Premium" do ROOT (premium_manual_em).
 *
 * Rodar UMA VEZ, no momento exato em que a cobrança é ativada — os usuários já
 * cadastrados até esse instante continuam de graça para sempre; quem se cadastrar
 * depois do corte já entra no fluxo pago normal.
 *
 * Uso:
 *   npx tsx prisma/grandfather-usuarios-existentes.ts               # corte = agora
 *   npx tsx prisma/grandfather-usuarios-existentes.ts 2026-09-17    # corte = data fixa (idempotente, seguro rodar de novo)
 */
async function main() {
  const cutoffArg = process.argv[2]
  const cutoff = cutoffArg ? new Date(cutoffArg) : new Date()
  if (Number.isNaN(cutoff.getTime())) {
    throw new Error(`Data de corte inválida: "${cutoffArg}" — use o formato YYYY-MM-DD`)
  }

  console.log(`📅 Corte: usuários cadastrados até ${cutoff.toISOString()} serão isentos de cobrança.`)

  const root = await prisma.usuario.findFirst({
    where: { role: Role.ROOT },
    orderBy: { criado_em: 'asc' },
  })
  if (!root) {
    throw new Error('Nenhum usuário ROOT encontrado — rode prisma/set-root-user.ts primeiro.')
  }

  const usuarios = await prisma.usuario.findMany({
    where: {
      role: { in: [Role.ALUNO, Role.PROFESSOR, Role.ACADEMIA] },
      premium_manual_em: null,
      criado_em: { lte: cutoff },
    },
    select: { id: true, nome: true, email: true, role: true },
  })

  if (usuarios.length === 0) {
    console.log('✅ Nenhum usuário pendente — nada a fazer.')
    return
  }

  console.log(`🔍 ${usuarios.length} usuário(s) cadastrados antes do corte — isentando de cobrança...`)

  const nota = `Grandfather — cadastrado antes da ativação da cobrança (corte: ${cutoff.toISOString().slice(0, 10)})`

  let ok = 0
  for (const u of usuarios) {
    try {
      await liberarPremiumManual(root.id, u.id, nota)
      ok++
      console.log(`  ✅ [${u.role}] ${u.nome} (${u.email})`)
    } catch (err) {
      console.error(`  ❌ [${u.role}] ${u.nome} (${u.email}):`, err instanceof Error ? err.message : err)
    }
  }

  console.log(`✅ ${ok}/${usuarios.length} usuário(s) isentos de cobrança.`)
}

main()
  .catch((err) => {
    console.error('❌ Erro:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
