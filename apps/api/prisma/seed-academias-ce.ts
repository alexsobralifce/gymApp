import { PrismaClient, Role, AcademiaStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

type AcademiaSeed = {
  nome: string
  cnpj: string
  cidade: string
}

const academias: AcademiaSeed[] = [
  // ─── Sobral (10) ─────────────────────────────────────────────────
  { nome: 'Carneiro Gym',                     cnpj: '10.001.002/0001-01', cidade: 'Sobral' },
  { nome: 'B2 Training',                      cnpj: '10.001.002/0001-02', cidade: 'Sobral' },
  { nome: 'Oxxi Academia',                    cnpj: '10.001.002/0001-03', cidade: 'Sobral' },
  { nome: 'Smart Fit Sobral',                 cnpj: '10.001.002/0001-04', cidade: 'Sobral' },
  { nome: 'Onix Academia',                    cnpj: '10.001.002/0001-05', cidade: 'Sobral' },
  { nome: 'Trend Fit Academia',               cnpj: '10.001.002/0001-06', cidade: 'Sobral' },
  { nome: 'Academia Romana',                  cnpj: '10.001.002/0001-07', cidade: 'Sobral' },
  { nome: 'Like Fit Academia',                cnpj: '10.001.002/0001-08', cidade: 'Sobral' },
  { nome: 'VIP Training Academia',            cnpj: '10.001.002/0001-09', cidade: 'Sobral' },
  { nome: 'Arena Fitness Sobral',             cnpj: '10.001.002/0001-10', cidade: 'Sobral' },
  // ─── Tianguá (10) ────────────────────────────────────────────────
  { nome: 'Skyfit Academia Tianguá',          cnpj: '10.001.002/0002-01', cidade: 'Tianguá' },
  { nome: 'Power House Tianguá',              cnpj: '10.001.002/0002-02', cidade: 'Tianguá' },
  { nome: 'VIP Academia Tianguá',             cnpj: '10.001.002/0002-03', cidade: 'Tianguá' },
  { nome: 'Academia Fitness Tianguá',         cnpj: '10.001.002/0002-04', cidade: 'Tianguá' },
  { nome: 'Força Plena Academia',             cnpj: '10.001.002/0002-05', cidade: 'Tianguá' },
  { nome: 'Arena Fitness Tianguá',            cnpj: '10.001.002/0002-06', cidade: 'Tianguá' },
  { nome: 'Profitness Academia',              cnpj: '10.001.002/0002-07', cidade: 'Tianguá' },
  { nome: 'A3 Mega Gym',                      cnpj: '10.001.002/0002-08', cidade: 'Tianguá' },
  { nome: 'Studio JN Fitness',                cnpj: '10.001.002/0002-09', cidade: 'Tianguá' },
  { nome: 'C T Evolution',                    cnpj: '10.001.002/0002-10', cidade: 'Tianguá' },
]

async function main() {
  console.log('🌱 Seedando academias de Sobral e Tianguá...\n')

  const senha_hash = await bcrypt.hash('Academia@123', 12)
  let criadas = 0
  let existentes = 0

  for (let i = 0; i < academias.length; i++) {
    const acad = academias[i]

    const jaExiste = await prisma.academia.findUnique({ where: { cnpj: acad.cnpj } })
    if (jaExiste) {
      console.log(`  ⏭️  ${acad.nome} (${acad.cidade}) já existe — pulando`)
      existentes++
      continue
    }

    const email = `academia_ce_${String(i + 1).padStart(2, '0')}@gymapp.com`

    const usuario = await prisma.usuario.create({
      data: {
        nome: acad.nome,
        email,
        senha_hash,
        role: Role.ACADEMIA,
        email_verified: true,
      },
    })

    await prisma.academia.create({
      data: {
        usuario_id: usuario.id,
        nome: acad.nome,
        cnpj: acad.cnpj,
        status: AcademiaStatus.ATIVO,
        max_professores: 20,
      },
    })

    criadas++
    console.log(`  ✅ ${acad.nome} (${acad.cidade}) — ${email} / Academia@123`)
  }

  console.log(`\n✅ ${criadas} academias criadas, ${existentes} já existiam`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
