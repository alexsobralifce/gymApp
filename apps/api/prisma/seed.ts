import { PrismaClient, Role, AcademiaStatus, VinculoStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { exerciseDB } from './exercises-data.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Root ───────────────────────────────────────────────────────────────
  const rootExists = await prisma.usuario.findUnique({ where: { email: 'root@gymapp.com' } })
  if (!rootExists) {
    await prisma.usuario.create({
      data: {
        nome: 'Administrador Root',
        email: 'root@gymapp.com',
        senha_hash: await bcrypt.hash('Root@12345', 12),
        role: Role.ROOT,
      },
    })
    console.log('✅ Root criado: root@gymapp.com / Root@12345')
  }

  // ─── Mensagens Motivacionais (UC-28) ────────────────────────────────────
  const mensagens = [
    {
      titulo: 'Treino de força aumenta densidade óssea',
      resumo: 'Estudo da ACSM mostra que exercícios de resistência aumentam a densidade mineral óssea em até 3% ao ano em adultos sedentários.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example1',
    },
    {
      titulo: 'Consistência supera intensidade',
      resumo: 'Meta-análise de 35 estudos demonstra que atletas que treinam 3-4x por semana de forma consistente obtêm melhores resultados a longo prazo do que aqueles que treinam intensamente de forma irregular.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example2',
    },
    {
      titulo: 'Sono é parte do treino',
      resumo: 'Pesquisadores da Universidade de Stanford provaram que 8h de sono aumenta performance atlética em até 11% e reduz risco de lesão em 68%.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example3',
    },
    {
      titulo: 'Proteína no pós-treino: a janela de 2 horas',
      resumo: 'Revisão sistemática do Journal of Sports Nutrition confirma que o consumo de 20-40g de proteína nas 2 horas após o treino maximiza a síntese proteica muscular.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example4',
    },
    {
      titulo: 'Descanso ativo acelera recuperação',
      resumo: 'Estudo publicado no NSCA mostra que caminhadas leves e alongamentos nos dias de descanso reduzem a dor muscular tardia em 40%.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example5',
    },
    {
      titulo: 'Hidratação e performance',
      resumo: 'Uma desidratação de apenas 2% do peso corporal pode reduzir a força muscular em até 10% e a potência aeróbica em 20%, segundo pesquisa do ACSM.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example6',
    },
    {
      titulo: 'Variação de exercícios previne estagnação',
      resumo: 'O princípio da sobrecarga progressiva, combinado com variação periódica de exercícios, é o método mais eficaz para ganho contínuo de massa muscular, conforme estudos de periodização.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example7',
    },
    {
      titulo: 'Exercício melhora saúde mental',
      resumo: 'Revisão de 49 ensaios clínicos publicada no JAMA Psychiatry confirma que exercício físico regular é tão eficaz quanto antidepressivos leves no tratamento de depressão moderada.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example8',
    },
    {
      titulo: 'Aquecimento reduz risco de lesão em 40%',
      resumo: 'Estudo com 1.200 atletas amadores demonstrou que um aquecimento dinâmico de 10 minutos reduz incidência de lesões musculoesqueléticas em 40%.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example9',
    },
    {
      titulo: 'Força mental é treinável',
      resumo: 'Pesquisa do Comitê Olímpico Internacional mostra que técnicas de visualização mental aumentam performance em até 13% quando combinadas com prática física regular.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example10',
    },
  ]

  for (const msg of mensagens) {
    await prisma.mensagemMotivacional.upsert({
      where: { id: msg.titulo }, // workaround — em produção use campo único
      create: msg,
      update: {},
    }).catch(() => prisma.mensagemMotivacional.create({ data: msg }))
  }

  console.log(`✅ ${mensagens.length} mensagens motivacionais inseridas`)

  // ─── Exercícios (ExerciseDB) ──────────────────────────────────────────────
  console.log('📚 Inserindo exercícios do ExerciseDB...')
  let exerciciosCount = 0

  for (const ex of exerciseDB) {
    const existingExercise = await prisma.exercicio.findFirst({
      where: { nome: ex.name },
    })

    if (!existingExercise) {
      await prisma.exercicio.create({
        data: {
          nome: ex.name,
          grupo_muscular: ex.bodyPart,
          equipamento: ex.equipment,
          dica: ex.instructions.join(' '),
          imagem_url: ex.gifUrl || null,
        },
      })
      exerciciosCount++
    }
  }

  console.log(`✅ ${exerciciosCount} exercícios inseridos (${exerciseDB.length} disponíveis)`)

  // ─── Academias e Professores ──────────────────────────────────────────────
  console.log('🏋️ Criando academias e professores...')

  const academiasData = [
    { nome: 'Academia Fit Center', cnpj: '10.001.001/0001-01' },
    { nome: 'Smart Fit Premium', cnpj: '10.001.001/0001-02' },
    { nome: 'Body Tech', cnpj: '10.001.001/0001-03' },
    { nome: 'Iron Gym', cnpj: '10.001.001/0001-04' },
    { nome: 'Power House', cnpj: '10.001.001/0001-05' },
    { nome: 'Muscle Factory', cnpj: '10.001.001/0001-06' },
    { nome: 'Shape Club', cnpj: '10.001.001/0001-07' },
    { nome: 'Total Fitness', cnpj: '10.001.001/0001-08' },
    { nome: 'Elite Gym', cnpj: '10.001.001/0001-09' },
    { nome: 'Pro Training', cnpj: '10.001.001/0001-10' },
  ]

  const nomesProfessores = [
    'Carlos Silva', 'Ana Oliveira', 'Pedro Santos', 'Maria Costa', 'João Ferreira',
    'Lucia Almeida', 'Roberto Lima', 'Fernanda Souza', 'André Pereira', 'Juliana Rocha',
    'Marcos Ribeiro', 'Camila Cardoso', 'Ricardo Gomes', 'Patricia Martins', 'Bruno Araújo',
    'Tatiana Barbosa', 'Felipe Correia', 'Renata Nunes', 'Gustavo Mendes', 'Aline Freitas',
    'Thiago Moreira', 'Vanessa Pinto', 'Rafael Castro', 'Daniela Melo', 'Leonardo Dias',
    'Carolina Vieira', 'Diego Fonseca', 'Beatriz Lopes', 'Eduardo Cunha', 'Letícia Teixeira',
    'Gabriel Moura', 'Isabela Ramos', 'Henrique Borges', 'Mariana Duarte', 'Vinícius Azevedo',
    'Priscila Campos', 'Lucas Monteiro', 'Natália Carvalho', 'Matheus Rezende', 'Larissa Melo',
    'Paulo Henrique', 'Sabrina Andrade', 'Rodrigo Nogueira', 'Flávia Correia', 'Alexandre Pires',
    'Adriana Brito', 'Fábio Marques', 'Cristina Leal', 'Daniel Fonseca', 'Simone Barreto',
    'Leandro Assis', 'Renata Cavalcanti', 'Caio Dantas', 'Elisa Figueiredo', 'Igor Sales',
    'Mônica Viana', 'Nelson Queiroz', 'Olívia Tavares', 'Otávio Macedo', 'Paula Gusmão',
    'Reginaldo Bastos', 'Sandra Morais', 'Ubiratan Siqueira', 'Vera Lúcia', 'Wagner Portela',
    'Xavier Esteves', 'Yara Medeiros', 'Zeca Cardoso', 'Ângela Reis', 'Beto Fernandes',
    'Cláudio Amaral', 'Diana Fontes', 'Emílio Correia', 'Fátima Guedes', 'Gilberto Paiva',
    'Heloísa Drummond', 'Inácio Britto', 'Jussara Pimentel', 'Kleber Aguiar', 'Lorena Salles',
    'Mauro Vasconcelos', 'Nicole Escobar', 'Osvaldo Mota', 'Pilar Coimbra', 'Quintino Barreto',
    'Rogério Farias', 'Silmara Couto', 'Telmo Ferraz', 'Úrsula Brandão', 'Valdir Matos',
    'Wanda Holanda', 'Xisto Pereira', 'Yolanda Xavier', 'Zilda Arruda', 'Átila Bezerra',
    'Bianca Lemos', 'Cézar Machado', 'Débora Sampaio', 'Elias Veloso', 'Giovanna Rios',
  ]

  let academiasCriadas = 0
  let professoresCriados = 0
  let vinculosCriados = 0

  for (let i = 0; i < academiasData.length; i++) {
    const acad = academiasData[i]

    const academiaExiste = await prisma.academia.findUnique({ where: { cnpj: acad.cnpj } })
    if (academiaExiste) {
      console.log(`  ⏭️ ${acad.nome} já existe, pulando...`)
      continue
    }

    const usuarioAcademia = await prisma.usuario.create({
      data: {
        nome: acad.nome,
        email: `academia${i + 1}@gymapp.com`,
        senha_hash: await bcrypt.hash('Academia@123', 12),
        role: Role.ACADEMIA,
      },
    })

    const academia = await prisma.academia.create({
      data: {
        usuario_id: usuarioAcademia.id,
        nome: acad.nome,
        cnpj: acad.cnpj,
        status: AcademiaStatus.ATIVO,
        max_professores: 20,
      },
    })

    academiasCriadas++
    console.log(`  ✅ ${acad.nome} criada`)

    for (let j = 0; j < 10; j++) {
      const idxProfessor = i * 10 + j
      const nomeProfessor = nomesProfessores[idxProfessor] || `Professor ${idxProfessor + 1}`
      const emailProfessor = `prof${academia.id.slice(-4)}_${j + 1}@gymapp.com`

      const usuarioProfessor = await prisma.usuario.create({
        data: {
          nome: nomeProfessor,
          email: emailProfessor,
          senha_hash: await bcrypt.hash('Professor@123', 12),
          role: Role.PROFESSOR,
        },
      })

      const professor = await prisma.professor.create({
        data: {
          usuario_id: usuarioProfessor.id,
          cref: `CREF-${String(idxProfessor + 1).padStart(4, '0')}/BR`,
        },
      })

      await prisma.professorAcademia.create({
        data: {
          professor_id: professor.id,
          academia_id: academia.id,
          status: VinculoStatus.ATIVO,
        },
      })

      professoresCriados++
      vinculosCriados++
    }
  }

  console.log(`✅ ${academiasCriadas} academias criadas`)
  console.log(`✅ ${professoresCriados} professores criados`)
  console.log(`✅ ${vinculosCriados} vínculos criados`)
  console.log('✅ Seed concluído!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
