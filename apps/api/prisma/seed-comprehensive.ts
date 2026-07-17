import { PrismaClient, Role, AcademiaStatus, VinculoStatus, TreinoStatus, TreinoAtor, Sexo, PostTipo, Visibilidade, FriendshipStatus, ClubTipo } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ACADEMIAS = [
  { nome: 'Iron Body Fitness', email: 'seed_acad1@gymapp.com', cnpj: '30.001.001/0001-01' },
  { nome: 'PowerFit Academy', email: 'seed_acad2@gymapp.com', cnpj: '30.001.001/0001-02' },
  { nome: 'Elite Training Center', email: 'seed_acad3@gymapp.com', cnpj: '30.001.001/0001-03' },
  { nome: 'VivaFit Studio', email: 'seed_acad4@gymapp.com', cnpj: '30.001.001/0001-04' },
  { nome: 'MaxForma Gym', email: 'seed_acad5@gymapp.com', cnpj: '30.001.001/0001-05' },
]

const PROF_NOMES = [
  'Carlos Silva', 'Ana Oliveira', 'Pedro Santos', 'Maria Costa', 'Joao Ferreira',
  'Lucia Almeida', 'Roberto Lima', 'Fernanda Souza', 'Andre Pereira', 'Juliana Rocha',
  'Marcos Ribeiro', 'Camila Cardoso', 'Ricardo Gomes', 'Patricia Martins', 'Bruno Araujo',
  'Tatiana Barbosa', 'Felipe Correia', 'Renata Nunes', 'Gustavo Mendes', 'Aline Freitas',
  'Thiago Moreira', 'Vanessa Pinto', 'Rafael Castro', 'Daniela Melo', 'Leonardo Dias',
  'Carolina Vieira', 'Diego Fonseca', 'Beatriz Lopes', 'Eduardo Cunha', 'Leticia Teixeira',
  'Gabriel Moura', 'Isabela Ramos', 'Henrique Borges', 'Mariana Duarte', 'Vinicius Azevedo',
  'Priscila Campos', 'Lucas Monteiro', 'Natalia Carvalho', 'Matheus Rezende', 'Larissa Melo',
  'Paulo Henrique', 'Sabrina Andrade', 'Rodrigo Nogueira', 'Flavia Correia', 'Alexandre Pires',
  'Adriana Brito', 'Fabio Marques', 'Cristina Leal', 'Daniel Fonseca', 'Simone Barreto',
]

const ALUNO_NOMES = [
  'Miguel', 'Helena', 'Arthur', 'Laura', 'Heitor', 'Alice', 'Bernardo', 'Valentina', 'Davi', 'Isabella',
  'Lorenzo', 'Manuela', 'Theo', 'Julia', 'Pedro', 'Luiza', 'Gabriel', 'Livia', 'Enzo', 'Clara',
  'Gustavo', 'Cecilia', 'Nicolas', 'Eloa', 'Rafael', 'Lara', 'Joao', 'Marina', 'Lucas', 'Bianca',
  'Samuel', 'Beatriz', 'Felipe', 'Nicole', 'Daniel', 'Sofia', 'Leonardo', 'Leticia', 'Vitor', 'Carolina',
  'Eduardo', 'Gabriela', 'Henrique', 'Amanda', 'Caio', 'Fernanda', 'Matheus', 'Patricia', 'Otavio', 'Bruna',
  'Igor', 'Juliana', 'Marcos', 'Renata', 'Bruno', 'Vanessa', 'Alexandre', 'Daniela', 'Thiago', 'Camila',
  'Rodrigo', 'Tatiana', 'Marcelo', 'Priscila', 'Ricardo', 'Larissa', 'Fabio', 'Sabrina', 'Leandro', 'Aline',
  'Anderson', 'Monica', 'Wesley', 'Daiane', 'Douglas', 'Jessica', 'Roberto', 'Tais', 'Sergio', 'Vivian',
  'Paulo', 'Elaine', 'Diego', 'Michele', 'Ivan', 'Raquel', 'Alan', 'Debora', 'Cesar', 'Yasmin',
  'Erick', 'Lorena', 'Jorge', 'Tamires', 'Cristiano', 'Suelen', 'Flavio', 'Paloma', 'Edson', 'Giovanna',
]

const ALUNO_SOBRENOMES = [
  'Oliveira', 'Santos', 'Silva', 'Costa', 'Ferreira', 'Almeida', 'Ribeiro', 'Lima', 'Pereira', 'Souza',
  'Rocha', 'Cardoso', 'Gomes', 'Martins', 'Araujo', 'Barbosa', 'Correia', 'Nunes', 'Mendes', 'Freitas',
  'Moreira', 'Pinto', 'Castro', 'Melo', 'Dias', 'Vieira', 'Fonseca', 'Lopes', 'Cunha', 'Teixeira',
  'Moura', 'Ramos', 'Borges', 'Duarte', 'Azevedo', 'Carvalho', 'Rezende', 'Andrade', 'Nogueira', 'Pires',
]

const GRUPOS_MUSCULARES = ['Peito', 'Costas', 'Ombros', 'Coxas', 'Biceps', 'Triceps', 'Panturrilhas', 'Abdomen']

const DIVISOES_TREINO = [
  { tipo: 'push_pull_legs', nomes: ['Treino A — Push', 'Treino B — Pull', 'Treino C — Legs'], pct: 20 },
  { tipo: 'upper_lower', nomes: ['Treino A — Superiores', 'Treino B — Inferiores'], pct: 15 },
  { tipo: 'full_body', nomes: ['Full Body — Seg/Qua/Sex'], pct: 15 },
  { tipo: 'bro_split', nomes: ['Peito e Triceps', 'Costas e Biceps', 'Pernas', 'Ombros'], pct: 25 },
  { tipo: 'strength', nomes: ['Powerlifting — Agachamento', 'Terra e Remada', 'Supino Forca'], pct: 10 },
  { tipo: 'hiit', nomes: ['HIIT — 30min', 'Cardio + Core', 'Resistencia'], pct: 10 },
  { tipo: 'template', nomes: ['Template — Push', 'Template — Pull', 'Template — Legs'], pct: 5 },
]

const COMENTARIOS = [
  'Bora treinar juntos! 💪',
  'Excelente execucao! Continue assim!',
  'Inspiracao pura! 🚀',
  'Qual a divisao de hoje?',
  'Foco, forca e fe! 🙏',
  'Meta batida! Parabens!',
  'Treino top! Resultados chegando...',
  'Quanto pegou no supino hoje?',
  'Essa serie foi pesada! Parabens pela dedicacao.',
  'Amanha e dia de perna, nao faltem!',
  'Tamo junto! Bora pra cima!',
  'Evolucao constante, e disso que a gente gosta!',
  'Mandou bem demais! 🔥',
  'Treino consistente = resultado garantido.',
  'Que orgulho de ver sua evolucao!',
]

let academias: { id: string; nome: string }[] = []
let professores: { id: string; usuario_id: string; nome: string; academiaIdx: number }[] = []
let alunos: { id: string; usuario_id: string; nome: string; academiaIdx: number | null; professorId: string | null }[] = []
let exercicios: { id: string; nome: string; grupo_muscular: string | null }[] = []

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)]
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, arr.length))
}

function pickW<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

async function main() {
  console.log('🌱 GymApp — Seed Comprehensive')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const hash = await bcrypt.hash('Aluno@123', 12)
  const hashProf = await bcrypt.hash('Professor@123', 12)
  const hashAcad = await bcrypt.hash('Academia@123', 12)

  // ─── Carregar exercicios existentes ──────────────────────────────────
  exercicios = await prisma.exercicio.findMany({ select: { id: true, nome: true, grupo_muscular: true }, take: 500 })
  console.log(`📚 ${exercicios.length} exercicios carregados`)

  // ─── 1. Academias + Clubes ──────────────────────────────────────────
  console.log('\n🏢 Criando academias...')
  academias = []

  for (let i = 0; i < ACADEMIAS.length; i++) {
    const a = ACADEMIAS[i]
    const existente = await prisma.academia.findUnique({ where: { cnpj: a.cnpj } })
    if (existente) {
      academias.push({ id: existente.id, nome: existente.nome })
      console.log(`  ⏭️  ${a.nome} ja existe`)
      continue
    }

    const user = await prisma.usuario.create({
      data: { nome: a.nome, email: a.email, senha_hash: hashAcad, role: Role.ACADEMIA },
    })
    const academia = await prisma.academia.create({
      data: { usuario_id: user.id, nome: a.nome, cnpj: a.cnpj, status: AcademiaStatus.ATIVO, max_professores: 20 },
    })
    academias.push({ id: academia.id, nome: academia.nome })

    await prisma.socialClub.upsert({
      where: { academia_id: academia.id },
      create: { academia_id: academia.id, nome: a.nome, tipo: ClubTipo.ACADEMIA },
      update: {},
    })

    console.log(`  ✅ ${a.nome} (${a.email} / Academia@123)`)
  }

  // ─── 2. Professores ─────────────────────────────────────────────────
  console.log('\n👨‍🏫 Criando professores...')
  professores = []

  for (let aIdx = 0; aIdx < academias.length; aIdx++) {
    for (let j = 0; j < 10; j++) {
      const nomeIdx = aIdx * 10 + j
      const nome = PROF_NOMES[nomeIdx]
      const email = `seed_prof_${aIdx + 1}_${j + 1}@gymapp.com`

      const existente = await prisma.usuario.findUnique({ where: { email } })
      if (existente) {
        const prof = await prisma.professor.findUnique({ where: { usuario_id: existente.id } })
        if (prof) {
          professores.push({ id: prof.id, usuario_id: existente.id, nome, academiaIdx: aIdx })
        }
        continue
      }

      const user = await prisma.usuario.create({
        data: { nome, email, senha_hash: hashProf, role: Role.PROFESSOR },
      })
      const professor = await prisma.professor.create({
        data: { usuario_id: user.id, cref: `CREF-${String(nomeIdx + 1).padStart(4, '0')}/BR` },
      })
      await prisma.professorAcademia.create({
        data: { professor_id: professor.id, academia_id: academias[aIdx].id, status: VinculoStatus.ATIVO },
      })
      professores.push({ id: professor.id, usuario_id: user.id, nome, academiaIdx: aIdx })
    }
  }
  console.log(`  ✅ ${professores.length} professores criados (10 por academia)`)

  // ─── 3. Alunos ──────────────────────────────────────────────────────
  console.log('\n👥 Criando alunos...')
  alunos = []

  for (let n = 1; n <= 200; n++) {
    const nome = `${pick(ALUNO_NOMES)} ${pick(ALUNO_SOBRENOMES)}`
    const email = `seed_aluno_${n}@gymapp.com`

    const existente = await prisma.usuario.findUnique({ where: { email } })
    if (existente) {
      const al = await prisma.aluno.findUnique({ where: { usuario_id: existente.id } })
      if (al) {
        const aIdx = al.academia_id ? academias.findIndex(a => a.id === al.academia_id) : null
        alunos.push({ id: al.id, usuario_id: existente.id, nome: existente.nome, academiaIdx: aIdx, professorId: al.professor_id })
      }
      continue
    }

    const sexo = Math.random() < 0.55 ? Sexo.MASCULINO : Sexo.FEMININO
    const isMale = sexo === Sexo.MASCULINO
    const idade = rand(18, 65)

    let academiaIdx: number | null = null
    let professorId: string | null = null

    if (n <= 160) {
      academiaIdx = (n - 1) % 5
      if (n <= 80) {
        const profsDaAcademia = professores.filter(p => p.academiaIdx === academiaIdx)
        if (profsDaAcademia.length > 0) {
          professorId = profsDaAcademia[n % profsDaAcademia.length].id
        }
      }
    }

    const pesoKg = isMale ? rand(65, 110) : rand(50, 85)
    const alturaCm = isMale ? rand(165, 195) : rand(150, 180)
    const nascimento = new Date()
    nascimento.setFullYear(nascimento.getFullYear() - idade)
    nascimento.setMonth(rand(0, 11))
    nascimento.setDate(rand(1, 28))

    const tipoVisibilidade = pickW<Visibilidade>([Visibilidade.AMIGOS, Visibilidade.PUBLICO, Visibilidade.PRIVADO], [60, 30, 10])
    const permiteBusca = Math.random() < 0.8
    const consentiuSocial = Math.random() < 0.7

    const user = await prisma.usuario.create({
      data: { nome, email, senha_hash: hash, role: Role.ALUNO },
    })

    const aluno = await prisma.aluno.create({
      data: {
        usuario_id: user.id,
        professor_id: professorId,
        academia_id: academiaIdx !== null ? academias[academiaIdx].id : null,
        data_nascimento: nascimento,
        peso_kg: pesoKg,
        altura_cm: alturaCm,
        sexo,
        visibilidade_padrao: tipoVisibilidade,
        permite_busca_email: permiteBusca,
        consentiu_feed_social_em: consentiuSocial ? new Date() : null,
      },
    })

    alunos.push({ id: aluno.id, usuario_id: user.id, nome, academiaIdx, professorId })

    if (academiaIdx !== null) {
      const club = await prisma.socialClub.findUnique({ where: { academia_id: academias[academiaIdx].id } })
      if (club) {
        await prisma.socialClubMember.upsert({
          where: { clube_id_aluno_id: { clube_id: club.id, aluno_id: aluno.id } },
          create: { clube_id: club.id, aluno_id: aluno.id, xp_semana: rand(0, 500) },
          update: {},
        })
      }
    }
  }

  const grupoA = alunos.filter(a => a.professorId !== null).length
  const grupoB = alunos.filter(a => a.academiaIdx !== null && a.professorId === null).length
  const grupoC = alunos.filter(a => a.academiaIdx === null).length
  console.log(`  ✅ ${alunos.length} alunos: ${grupoA} c/ professor, ${grupoB} autogestao academia, ${grupoC} autogestao pura`)

  // ─── 4. Treinos ─────────────────────────────────────────────────────
  console.log('\n🏋️ Criando treinos...')
  let totalTreinos = 0
  let totalExerciciosTreino = 0
  const todosTreinos: { id: string; alunoId: string; nome: string; status: TreinoStatus }[] = []

  for (const aluno of alunos) {
    const qtdTreinos = rand(1, 3)
    const divisao = pick(DIVISOES_TREINO)

    for (let t = 0; t < qtdTreinos; t++) {
      const nomeTreino = divisao.nomes[t % divisao.nomes.length]
      const qtdExercicios = rand(4, 8)
      const qtdDias = rand(1, 6)
      const diasSemana = pickN([0, 1, 2, 3, 4, 5, 6], qtdDias).sort((a, b) => a - b)

      let status: TreinoStatus
      const roll = Math.random()

      if (aluno.professorId !== null) {
        status = pickW<TreinoStatus>(
          [TreinoStatus.CADASTRADO, TreinoStatus.ENVIADO, TreinoStatus.ACEITO, TreinoStatus.CONCLUIDO],
          [10, 8, 30, 52],
        )
      } else {
        status = pickW<TreinoStatus>(
          [TreinoStatus.ACEITO, TreinoStatus.CONCLUIDO],
          [35, 65],
        )
      }

      const isTemplate = Math.random() < 0.05 && aluno.professorId !== null
      const criadoDiasAtras = rand(0, 90)
      const criadoEm = new Date()
      criadoEm.setDate(criadoEm.getDate() - criadoDiasAtras)

      const treino = await prisma.treino.create({
        data: {
          aluno_id: aluno.id,
          nome: nomeTreino,
          dias_semana: diasSemana,
          status,
          is_template: isTemplate,
          criado_em: criadoEm,
          iniciado_em: [TreinoStatus.EM_EXECUCAO, TreinoStatus.CONCLUIDO].includes(status) ? new Date(criadoEm.getTime() + 60_000) : null,
          finalizado_em: status === TreinoStatus.CONCLUIDO ? new Date(criadoEm.getTime() + rand(20, 90) * 60_000) : null,
          avaliacao_dificuldade: status === TreinoStatus.CONCLUIDO ? pick(['FACIL', 'MODERADO', 'INTENSO', 'MUITO_INTENSO']) : null,
        },
      })

      todosTreinos.push({ id: treino.id, alunoId: aluno.id, nome: nomeTreino, status })

      const exsSelecionados = pickN(exercicios, qtdExercicios)
      for (let o = 0; o < exsSelecionados.length; o++) {
        const ex = exsSelecionados[o]
        let carga: number | null = null
        const grupo = ex.grupo_muscular || ''
        if (grupo.includes('Peito') || grupo.includes('Costas') || grupo.includes('Ombros')) carga = rand(10, 60)
        else if (grupo.includes('Coxas')) carga = rand(30, 120)
        else if (grupo.includes('Biceps') || grupo.includes('Triceps')) carga = rand(5, 30)
        else carga = rand(10, 80)

        await prisma.treinoExercicio.create({
          data: {
            treino_id: treino.id,
            exercicio_id: ex.id,
            ordem: o + 1,
            series: rand(3, 5),
            repeticoes: rand(6, 15),
            carga_sugerida_kg: carga,
          },
        })
        totalExerciciosTreino++
      }

      totalTreinos++
      if (aluno.professorId && (status === TreinoStatus.CADASTRADO || status === TreinoStatus.ENVIADO)) {
        await prisma.treinoHistorico.create({
          data: {
            treino_id: treino.id,
            status_anterior: TreinoStatus.CADASTRADO,
            status_novo: status,
            ator_id: aluno.professorId,
            ator_tipo: TreinoAtor.PROFESSOR,
            timestamp: criadoEm,
          },
        })
      }
    }
  }
  console.log(`  ✅ ${totalTreinos} treinos com ${totalExerciciosTreino} exercicios`)

  // ─── 5. Execucoes ───────────────────────────────────────────────────
  console.log('\n📝 Registrando execucoes...')
  let totalExecucoes = 0

  const treinosExecutados = todosTreinos.filter(t => t.status === TreinoStatus.CONCLUIDO || t.status === TreinoStatus.EM_EXECUCAO)
  const treinosCompleto = treinosExecutados.filter(t => t.status === TreinoStatus.CONCLUIDO)

  for (const treino of treinosExecutados) {
    const treinoExercicios = await prisma.treinoExercicio.findMany({ where: { treino_id: treino.id } })

    for (const te of treinoExercicios) {
      const pctSeries = treino.status === TreinoStatus.CONCLUIDO ? 0.7 : 0.4
      const seriesFeitas = Math.max(1, Math.floor(te.series * pctSeries))

      for (let s = 1; s <= seriesFeitas; s++) {
        const cargaVar = te.carga_sugerida_kg ? Math.round(te.carga_sugerida_kg * (0.8 + Math.random() * 0.4)) : rand(5, 100)
        const repsVar = Math.round(te.repeticoes + rand(-3, 3))

        await prisma.execucaoExercicio.create({
          data: {
            treino_id: treino.id,
            exercicio_id: te.exercicio_id,
            serie_numero: s,
            repeticoes: Math.max(1, repsVar),
            carga_kg: cargaVar,
            registrado_em: new Date(),
          },
        })
        totalExecucoes++
      }
    }
  }
  console.log(`  ✅ ${totalExecucoes} execucoes registradas`)

  // ─── 6. Medidas ─────────────────────────────────────────────────────
  console.log('\n📏 Criando medidas corporais...')
  let totalMedidas = 0
  const alunosComMedidas = pickN(alunos, 70)

  for (const aluno of alunosComMedidas) {
    const qtdMedidas = rand(1, 3)
    const al = await prisma.aluno.findUnique({ where: { id: aluno.id }, select: { peso_kg: true, altura_cm: true, sexo: true } })
    if (!al?.peso_kg || !al?.altura_cm) continue

    let pesoAtual = al.peso_kg

    for (let m = 0; m < qtdMedidas; m++) {
      const variacao = Math.round((Math.random() - 0.5) * 6 * 10) / 10
      pesoAtual = Math.round((pesoAtual + variacao) * 10) / 10
      const bf = Math.round((al.sexo === Sexo.MASCULINO ? rand(8, 25) : rand(15, 35)) * 10) / 10
      const massaMagra = Math.round((pesoAtual * (1 - bf / 100)) * 10) / 10
      const imc = Math.round((pesoAtual / ((al.altura_cm / 100) ** 2)) * 10) / 10
      const data = new Date()
      data.setDate(data.getDate() - (qtdMedidas - m) * rand(15, 30))

      await prisma.medidaCorporal.create({
        data: {
          aluno_id: aluno.id,
          peso_kg: pesoAtual,
          altura_cm: al.altura_cm,
          percentual_bf: bf,
          massa_magra_kg: massaMagra,
          imc,
          data,
        },
      })
      totalMedidas++
    }
  }
  console.log(`  ✅ ${totalMedidas} medidas para ${alunosComMedidas.length} alunos`)

  // ─── 7. Amizades ────────────────────────────────────────────────────
  console.log('\n🤝 Criando amizades...')
  let totalAmizades = 0

  for (let i = 0; i < alunos.length; i++) {
    const a1 = alunos[i]
    if (a1.academiaIdx === null) continue

    const mesmoAcademia = alunos.filter((a, j) => a.academiaIdx === a1.academiaIdx && j > i)
    const outrasAcademias = alunos.filter((a, j) => a.academiaIdx !== null && a.academiaIdx !== a1.academiaIdx && j > i)

    for (const a2 of mesmoAcademia) {
      if (Math.random() < 0.25) {
        const status = Math.random() < 0.7 ? FriendshipStatus.ACEITO : FriendshipStatus.PENDENTE
        try {
          await prisma.socialFriendship.create({
            data: { aluno_id: a1.id, amigo_id: a2.id, status },
          })
          totalAmizades++
        } catch { /* duplicata silenciosa */ }
      }
    }

    if (Math.random() < 0.08 && outrasAcademias.length > 0) {
      const a2 = pick(outrasAcademias)
      const status = Math.random() < 0.7 ? FriendshipStatus.ACEITO : FriendshipStatus.PENDENTE
      try {
        await prisma.socialFriendship.create({
          data: { aluno_id: a1.id, amigo_id: a2.id, status },
        })
        totalAmizades++
      } catch { /* duplicata silenciosa */ }
    }
  }
  console.log(`  ✅ ${totalAmizades} amizades criadas`)

  // ─── 8. Posts ───────────────────────────────────────────────────────
  console.log('\n📢 Criando posts sociais...')
  let totalPosts = 0
  const todosPosts: { id: string; alunoId: string }[] = []

  const alunosConsentiram = alunos.filter(a => {
    return Math.random() < 0.7
  })

  for (const aluno of alunosConsentiram) {
    const alData = await prisma.aluno.findUnique({ where: { id: aluno.id }, select: { visibilidade_padrao: true } })
    if (alData?.visibilidade_padrao === Visibilidade.PRIVADO) continue

    const treinosDoAluno = todosTreinos.filter(t => t.alunoId === aluno.id)

    for (const treino of treinosDoAluno.slice(0, 3)) {
      const diasAtras = rand(0, 60)
      const criadoEm = new Date()
      criadoEm.setDate(criadoEm.getDate() - diasAtras)

      const tipo = treino.status === TreinoStatus.CONCLUIDO ? PostTipo.TREINO_CONCLUIDO : PostTipo.TREINO_INICIADO
      const visibilidade = alData?.visibilidade_padrao || Visibilidade.AMIGOS

      const exsTreino = await prisma.treinoExercicio.findMany({
        where: { treino_id: treino.id },
        include: { exercicio: { select: { grupo_muscular: true } } },
      })
      const grupos = [...new Set(exsTreino.map(e => e.exercicio.grupo_muscular).filter(Boolean))]
      const grupoResumo = grupos.length > 0 ? grupos.join(', ') : null

      const post = await prisma.socialPost.create({
        data: {
          aluno_id: aluno.id,
          treino_id: treino.id,
          autor_nome: aluno.nome,
          tipo,
          visibilidade,
          grupo_muscular_resumo: grupoResumo,
          criado_em: criadoEm,
        },
      })
      todosPosts.push({ id: post.id, alunoId: aluno.id })
      totalPosts++
    }
  }

  for (const aluno of alunosConsentiram) {
    if (Math.random() < 0.8) continue
    const treinosConcluidos = todosTreinos.filter(t => t.alunoId === aluno.id && t.status === TreinoStatus.CONCLUIDO)
    if (treinosConcluidos.length < 10) continue
    const alData = await prisma.aluno.findUnique({ where: { id: aluno.id }, select: { visibilidade_padrao: true } })
    if (alData?.visibilidade_padrao === Visibilidade.PRIVADO) continue

    try {
      const post = await prisma.socialPost.create({
        data: {
          aluno_id: aluno.id,
          autor_nome: 'Sistema',
          tipo: PostTipo.BADGE_CONQUISTADO,
          visibilidade: alData?.visibilidade_padrao || Visibilidade.AMIGOS,
          grupo_muscular_resumo: '🏆 10 Treinos Concluidos',
        },
      })
      todosPosts.push({ id: post.id, alunoId: aluno.id })
      totalPosts++
    } catch { /* ok */ }
  }
  console.log(`  ✅ ${totalPosts} posts criados`)

  // ─── 9. Curtidas ────────────────────────────────────────────────────
  console.log('\n❤️ Criando curtidas...')
  let totalCurtidas = 0

  for (const post of pickN(todosPosts, Math.min(200, todosPosts.length))) {
    const qtdCurtidas = rand(1, 5)
    const curtidores = pickN(alunos.filter(a => a.id !== post.alunoId), qtdCurtidas)

    for (const curtidor of curtidores) {
      try {
        await prisma.socialLike.create({
          data: { post_id: post.id, aluno_id: curtidor.id },
        })

        await prisma.socialPost.update({
          where: { id: post.id },
          data: { curtidas_count: { increment: 1 } },
        })
        totalCurtidas++
      } catch { /* duplicata, ignora */ }
    }
  }
  console.log(`  ✅ ${totalCurtidas} curtidas`)

  // ─── 10. Comentarios ────────────────────────────────────────────────
  console.log('\n💬 Criando comentarios...')
  let totalComentarios = 0

  for (const post of pickN(todosPosts, Math.min(80, todosPosts.length))) {
    if (Math.random() < 0.4) continue
    const qtdComments = rand(1, 3)
    const comentaristas = pickN(alunos.filter(a => a.id !== post.alunoId), qtdComments)

    for (const c of comentaristas) {
      await prisma.socialComment.create({
        data: {
          post_id: post.id,
          aluno_id: c.id,
          autor_nome: c.nome,
          texto: pick(COMENTARIOS),
        },
      })

      await prisma.socialPost.update({
        where: { id: post.id },
        data: { comentarios_count: { increment: 1 } },
      })
      totalComentarios++
    }
  }
  console.log(`  ✅ ${totalComentarios} comentarios`)

  // ─── Resumo Final ──────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ SEED CONCLUIDO!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  🏢 ${academias.length} academias`)
  console.log(`  👨‍🏫 ${professores.length} professores`)
  console.log(`  👥 ${alunos.length} alunos (${grupoA} c/ prof, ${grupoB} autog-acad, ${grupoC} autogestao)`)
  console.log(`  🏋️ ${totalTreinos} treinos`)
  console.log(`  📝 ${totalExecucoes} execucoes`)
  console.log(`  📏 ${totalMedidas} medidas`)
  console.log(`  🤝 ${totalAmizades} amizades`)
  console.log(`  📢 ${totalPosts} posts`)
  console.log(`  ❤️ ${totalCurtidas} curtidas`)
  console.log(`  💬 ${totalComentarios} comentarios`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\nCredenciais de teste:')
  console.log('  ROOT:       root@gymapp.com / Root@12345')
  console.log('  ACADEMIA:   seed_acad1@gymapp.com / Academia@123')
  console.log('  PROFESSOR:  seed_prof_1_1@gymapp.com / Professor@123')
  console.log('  ALUNO:      seed_aluno_1@gymapp.com / Aluno@123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
