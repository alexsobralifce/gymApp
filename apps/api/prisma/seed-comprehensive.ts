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

const DIVISOES_TREINO = [
  { nomes: ['Treino A — Push', 'Treino B — Pull', 'Treino C — Legs'], pct: 20 },
  { nomes: ['Treino A — Superiores', 'Treino B — Inferiores'], pct: 15 },
  { nomes: ['Full Body — Seg/Qua/Sex'], pct: 15 },
  { nomes: ['Peito e Triceps', 'Costas e Biceps', 'Pernas', 'Ombros'], pct: 25 },
  { nomes: ['Powerlifting — Agachamento', 'Terra e Remada', 'Supino Forca'], pct: 10 },
  { nomes: ['HIIT — 30min', 'Cardio + Core', 'Resistencia'], pct: 10 },
  { nomes: ['Template — Push', 'Template — Pull', 'Template — Legs'], pct: 5 },
]

const COMENTARIOS = [
  'Bora treinar juntos!', 'Excelente execucao! Continue assim!', 'Inspiracao pura!',
  'Qual a divisao de hoje?', 'Foco, forca e fe!', 'Meta batida! Parabens!',
  'Treino top! Resultados chegando...', 'Quanto pegou no supino hoje?',
  'Essa serie foi pesada! Parabens pela dedicacao.', 'Amanha e dia de perna, nao faltem!',
  'Tamo junto! Bora pra cima!', 'Evolucao constante!', 'Mandou bem demais!',
  'Treino consistente = resultado garantido.', 'Que orgulho de ver sua evolucao!',
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

function cuid(): string {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).substring(2, 10)
  return `c${t}${r}`
}

async function main() {
  console.log('🌱 GymApp — Seed Comprehensive (bulk)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const hash = await bcrypt.hash('Aluno@123', 12)
  const hashProf = await bcrypt.hash('Professor@123', 12)
  const hashAcad = await bcrypt.hash('Academia@123', 12)

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
  console.log(`  ✅ ${professores.length} professores (10 por academia)`)

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

    const tipoVisibilidade = pickW<Visibilidade>([Visibilidade.AMIGOS, Visibilidade.PUBLICO, Visibilidade.PRIVADO], [60, 30, 10])
    const permiteBusca = true
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
  console.log(`  ✅ ${alunos.length} alunos: ${grupoA} c/ prof, ${grupoB} autog-acad, ${grupoC} autogestao`)

  // ─── 4. Treinos (BULK via createMany) ──────────────────────────────
  console.log('\n🏋️ Criando treinos (bulk)...')
  let totalTreinos = 0
  let totalExerciciosTreino = 0
  const todosTreinos: { id: string; alunoId: string; nome: string; status: TreinoStatus; exercicios: { id: string; exId: string; ordem: number; series: number; repeticoes: number; carga: number | null }[] }[] = []

  for (const aluno of alunos) {
    const qtdTreinos = rand(1, 3)
    const divisao = pick(DIVISOES_TREINO)

    for (let t = 0; t < qtdTreinos; t++) {
      const treinoId = cuid()
      const nomeTreino = divisao.nomes[t % divisao.nomes.length]
      const qtdExercicios = rand(4, 8)
      const qtdDias = rand(1, 6)
      const diasSemana = pickN([0, 1, 2, 3, 4, 5, 6], qtdDias).sort((a, b) => a - b)

      let status: TreinoStatus
      if (aluno.professorId !== null) {
        status = pickW<TreinoStatus>(
          [TreinoStatus.CADASTRADO, TreinoStatus.ENVIADO, TreinoStatus.ACEITO, TreinoStatus.CONCLUIDO],
          [10, 8, 30, 52],
        )
      } else {
        status = pickW<TreinoStatus>([TreinoStatus.ACEITO, TreinoStatus.CONCLUIDO], [35, 65])
      }

      const criadoDiasAtras = rand(0, 90)
      const criadoEm = new Date()
      criadoEm.setDate(criadoEm.getDate() - criadoDiasAtras)
      const iniciadoEm = [TreinoStatus.EM_EXECUCAO, TreinoStatus.CONCLUIDO].includes(status) ? new Date(criadoEm.getTime() + 60_000) : null
      const finalizadoEm = status === TreinoStatus.CONCLUIDO ? new Date(criadoEm.getTime() + rand(20, 90) * 60_000) : null
      const avaliacao = status === TreinoStatus.CONCLUIDO ? pick(['FACIL', 'MODERADO', 'INTENSO', 'MUITO_INTENSO']) : null

      const exsSelecionados = pickN(exercicios, qtdExercicios)
      const exsData = exsSelecionados.map((ex, o) => {
        const grupo = ex.grupo_muscular || ''
        let carga: number | null = null
        if (grupo.includes('Peito') || grupo.includes('Costas') || grupo.includes('Ombros')) carga = rand(10, 60)
        else if (grupo.includes('Coxas')) carga = rand(30, 120)
        else if (grupo.includes('Biceps') || grupo.includes('Triceps')) carga = rand(5, 30)
        else carga = rand(10, 80)
        return { id: cuid(), exId: ex.id, ordem: o + 1, series: rand(3, 5), repeticoes: rand(6, 15), carga }
      })

      todosTreinos.push({ id: treinoId, alunoId: aluno.id, nome: nomeTreino, status, exercicios: exsData })
      totalTreinos++
      totalExerciciosTreino += exsData.length
    }
  }

  // Bulk insert treinos in batches
  const BATCH = 100
  const treinoRows = todosTreinos.map(t => {
    const t2 = todosTreinos.find(x => x.id === t.id)!
    return t2
  })
  for (let i = 0; i < treinoRows.length; i += BATCH) {
    const batch = treinoRows.slice(i, i + BATCH)
    await prisma.treino.createMany({
      data: batch.map(t => {
        const criadoDiasAtras = rand(0, 90)
        const criadoEm = new Date()
        criadoEm.setDate(criadoEm.getDate() - criadoDiasAtras)
        return {
          id: t.id,
          aluno_id: t.alunoId,
          nome: t.nome,
          dias_semana: pickN([0, 1, 2, 3, 4, 5, 6], rand(1, 6)).sort((a, b) => a - b),
          status: t.status,
          is_template: Math.random() < 0.05 && alunos.find(a => a.id === t.alunoId)?.professorId !== null,
          criado_em: criadoEm,
          iniciado_em: null,
          finalizado_em: null,
          avaliacao_dificuldade: null,
        }
      }),
      skipDuplicates: true,
    })
  }

  // Bulk insert treino_exercicios
  const teRows: any[] = []
  for (const t of todosTreinos) {
    for (const e of t.exercicios) {
      teRows.push({ id: e.id, treino_id: t.id, exercicio_id: e.exId, ordem: e.ordem, series: e.series, repeticoes: e.repeticoes, carga_sugerida_kg: e.carga })
    }
  }
  for (let i = 0; i < teRows.length; i += BATCH) {
    await prisma.treinoExercicio.createMany({ data: teRows.slice(i, i + BATCH), skipDuplicates: true })
  }

  console.log(`  ✅ ${totalTreinos} treinos com ${totalExerciciosTreino} exercicios`)

  // ─── 5. Execucoes (BULK) ────────────────────────────────────────────
  console.log('\n📝 Registrando execucoes (bulk)...')
  let totalExecucoes = 0
  const execRows: any[] = []

  const treinosExecutados = todosTreinos.filter(t => t.status === TreinoStatus.CONCLUIDO)
  for (const treino of treinosExecutados) {
    for (const te of treino.exercicios) {
      const seriesFeitas = Math.max(1, Math.floor(te.series * 0.7))
      for (let s = 1; s <= seriesFeitas; s++) {
        execRows.push({
          treino_id: treino.id,
          exercicio_id: te.exId,
          serie_numero: s,
          repeticoes: Math.max(1, te.repeticoes + rand(-3, 3)),
          carga_kg: te.carga ? Math.round(te.carga * (0.8 + Math.random() * 0.4)) : rand(5, 100),
          registrado_em: new Date(),
        })
        totalExecucoes++
      }
    }
  }
  for (let i = 0; i < execRows.length; i += BATCH) {
    await prisma.execucaoExercicio.createMany({ data: execRows.slice(i, i + BATCH), skipDuplicates: true })
  }
  console.log(`  ✅ ${totalExecucoes} execucoes`)

  // ─── 6. Medidas (BULK) ──────────────────────────────────────────────
  console.log('\n📏 Medidas corporais (bulk)...')
  let totalMedidas = 0
  const medidaRows: any[] = []
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

      medidaRows.push({
        aluno_id: aluno.id, peso_kg: pesoAtual, altura_cm: al.altura_cm,
        percentual_bf: bf, massa_magra_kg: massaMagra, imc, data,
      })
      totalMedidas++
    }
  }
  for (let i = 0; i < medidaRows.length; i += BATCH) {
    await prisma.medidaCorporal.createMany({ data: medidaRows.slice(i, i + BATCH), skipDuplicates: true })
  }
  console.log(`  ✅ ${totalMedidas} medidas para ${alunosComMedidas.length} alunos`)

  // ─── 7. Amizades ────────────────────────────────────────────────────
  console.log('\n🤝 Criando amizades...')
  let totalAmizades = 0
  const amizadeRows: any[] = []

  for (let i = 0; i < alunos.length; i++) {
    const a1 = alunos[i]
    if (a1.academiaIdx === null) continue

    const mesmoAcademia = alunos.filter((a, j) => a.academiaIdx === a1.academiaIdx && j > i)
    for (const a2 of mesmoAcademia) {
      if (Math.random() < 0.25) {
        const status = Math.random() < 0.7 ? FriendshipStatus.ACEITO : FriendshipStatus.PENDENTE
        amizadeRows.push({ aluno_id: a1.id, amigo_id: a2.id, status })
        totalAmizades++
      }
    }

    if (Math.random() < 0.08) {
      const outras = alunos.filter((a, j) => a.academiaIdx !== null && a.academiaIdx !== a1.academiaIdx && j > i)
      if (outras.length > 0) {
        const a2 = pick(outras)
        const status = Math.random() < 0.7 ? FriendshipStatus.ACEITO : FriendshipStatus.PENDENTE
        amizadeRows.push({ aluno_id: a1.id, amigo_id: a2.id, status })
        totalAmizades++
      }
    }
  }
  for (let i = 0; i < amizadeRows.length; i += BATCH) {
    await prisma.socialFriendship.createMany({ data: amizadeRows.slice(i, i + BATCH), skipDuplicates: true })
  }
  console.log(`  ✅ ${totalAmizades} amizades`)

  // ─── 8. Posts ───────────────────────────────────────────────────────
  console.log('\n📢 Posts sociais...')
  let totalPosts = 0
  const postRows: any[] = []

  for (const aluno of alunos) {
    if (Math.random() > 0.6) continue
    const alData = await prisma.aluno.findUnique({ where: { id: aluno.id }, select: { visibilidade_padrao: true } })
    if (alData?.visibilidade_padrao === Visibilidade.PRIVADO) continue

    const treinosDoAluno = todosTreinos.filter(t => t.alunoId === aluno.id)
    const visibilidade = alData?.visibilidade_padrao || Visibilidade.AMIGOS

    for (const treino of treinosDoAluno.slice(0, 2)) {
      const tipo = treino.status === TreinoStatus.CONCLUIDO ? PostTipo.TREINO_CONCLUIDO : PostTipo.TREINO_INICIADO
      const diasAtras = rand(0, 60)
      const criadoEm = new Date()
      criadoEm.setDate(criadoEm.getDate() - diasAtras)

      postRows.push({
        id: cuid(), aluno_id: aluno.id, treino_id: treino.id, autor_nome: aluno.nome,
        tipo, visibilidade, criado_em: criadoEm, curtidas_count: 0, comentarios_count: 0,
      })
      totalPosts++
    }
  }
  for (let i = 0; i < postRows.length; i += BATCH) {
    await prisma.socialPost.createMany({ data: postRows.slice(i, i + BATCH), skipDuplicates: true })
  }
  console.log(`  ✅ ${totalPosts} posts`)

  // ─── 9. Curtidas (BULK) ────────────────────────────────────────────
  console.log('\n❤️ Curtidas...')
  let totalCurtidas = 0
  const likeRows: any[] = []
  const seen = new Set<string>()

  const postsSample = postRows.sort(() => Math.random() - 0.5).slice(0, Math.min(150, postRows.length))
  for (const post of postsSample) {
    const qtd = rand(1, 4)
    const curtidores = pickN(alunos.filter(a => a.id !== post.aluno_id), qtd)
    for (const c of curtidores) {
      const key = `${post.id}|${c.id}`
      if (seen.has(key)) continue
      seen.add(key)
      likeRows.push({ post_id: post.id, aluno_id: c.id })
      totalCurtidas++
    }
  }
  for (let i = 0; i < likeRows.length; i += BATCH) {
    await prisma.socialLike.createMany({ data: likeRows.slice(i, i + BATCH), skipDuplicates: true })
  }
  console.log(`  ✅ ${totalCurtidas} curtidas`)

  // ─── 10. Comentarios (BULK) ────────────────────────────────────────
  console.log('\n💬 Comentarios...')
  let totalComentarios = 0
  const commentRows: any[] = []

  const postsComentados = postsSample.slice(0, Math.min(60, postsSample.length))
  for (const post of postsComentados) {
    if (Math.random() < 0.4) continue
    const qtd = rand(1, 2)
    const comentaristas = pickN(alunos.filter(a => a.id !== post.aluno_id), qtd)
    for (const c of comentaristas) {
      commentRows.push({
        id: cuid(), post_id: post.id, aluno_id: c.id, autor_nome: c.nome,
        texto: pick(COMENTARIOS),
      })
      totalComentarios++
    }
  }
  for (let i = 0; i < commentRows.length; i += BATCH) {
    await prisma.socialComment.createMany({ data: commentRows.slice(i, i + BATCH), skipDuplicates: true })
  }
  console.log(`  ✅ ${totalComentarios} comentarios`)

  // ─── Resumo ────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ SEED CONCLUIDO!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  🏢 ${academias.length} academias`)
  console.log(`  👨‍🏫 ${professores.length} professores`)
  console.log(`  👥 ${alunos.length} alunos`)
  console.log(`  🏋️ ${totalTreinos} treinos`)
  console.log(`  📝 ${totalExecucoes} execucoes`)
  console.log(`  📏 ${totalMedidas} medidas`)
  console.log(`  🤝 ${totalAmizades} amizades`)
  console.log(`  📢 ${totalPosts} posts`)
  console.log(`  ❤️ ${totalCurtidas} curtidas`)
  console.log(`  💬 ${totalComentarios} comentarios`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\nCredenciais:')
  console.log('  ROOT:       root@gymapp.com / Root@12345')
  console.log('  ACADEMIA:   seed_acad1@gymapp.com / Academia@123')
  console.log('  PROFESSOR:  seed_prof_1_1@gymapp.com / Professor@123')
  console.log('  ALUNO:      seed_aluno_1@gymapp.com / Aluno@123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
