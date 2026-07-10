import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Buscando usuários no banco de dados...')
  
  const usuarios = await prisma.usuario.findMany({
    include: {
      academia: true,
      professor: {
        include: {
          academias: {
            include: {
              academia: true
            }
          }
        }
      },
      aluno: {
        include: {
          professor: {
            include: {
              usuario: true
            }
          },
          academia: true
        }
      }
    },
    orderBy: {
      criado_em: 'asc'
    }
  })

  console.log('\n=========================================')
  console.log(`📊 TOTAL DE USUÁRIOS: ${usuarios.length}`)
  console.log('=========================================\n')

  for (const u of usuarios) {
    console.log(`👤 Nome: ${u.nome}`)
    console.log(`   ID Usuário: ${u.id}`)
    console.log(`   E-mail: ${u.email}`)
    console.log(`   Tipo (Role): ${u.role}`)
    console.log(`   Senha Hash: ${u.senha_hash}`)

    if (u.role === 'ACADEMIA' && u.academia) {
      console.log(`   🏦 Dados da Academia:`)
      console.log(`      ID Academia: ${u.academia.id}`)
      console.log(`      CNPJ: ${u.academia.cnpj}`)
      console.log(`      Status: ${u.academia.status}`)
    }

    if (u.role === 'PROFESSOR' && u.professor) {
      console.log(`   💼 Dados do Professor:`)
      console.log(`      ID Professor: ${u.professor.id}`)
      console.log(`      CREF: ${u.professor.cref || 'Não informado'}`)
      const vinculos = u.professor.academias.map(v => `${v.academia.nome} (${v.status})`)
      console.log(`      Vínculos com Academias: ${vinculos.join(', ') || 'Nenhum'}`)
    }

    if (u.role === 'ALUNO' && u.aluno) {
      console.log(`   🏃 Dados do Aluno:`)
      console.log(`      ID Aluno: ${u.aluno.id}`)
      console.log(`      Academia: ${u.aluno.academia?.nome || 'Nenhuma'}`)
      console.log(`      Professor: ${u.aluno.professor?.usuario.nome || 'Autogestão (Nenhum)'}`)
    }

    console.log('\n-----------------------------------------\n')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
