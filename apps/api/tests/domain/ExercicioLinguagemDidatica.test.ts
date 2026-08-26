import { describe, it, expect } from 'vitest'

/**
 * Palavras e expressões em inglês que NÃO devem aparecer em nomes de exercícios
 * quando não traduzidos para usuários brasileiros leigos.
 */
const FORBIDDEN_ENGLISH_NAME_PATTERNS = [
  /\bbench press\b/i,
  /\blat pulldown\b/i,
  /\bdeadlift\b/i,
  /\bsquat\b/i,
  /\bpull[\s-]?up\b/i,
  /\bpush[\s-]?up\b/i,
  /\bbicep[\s-]?curl\b/i,
  /\btricep[\s-]?extension\b/i,
  /\blying leg curl\b/i,
  /\bstanding calf raise\b/i,
  /\blateral raise\b/i,
  /\brear delt fly\b/i,
  /\bseated cable row\b/i,
  /\boverhead press\b/i,
  /\bbarbell\b/i,
  /\bdumbbell\b/i,
  /\bkneeling\b/i,
  /\bstraight legs\b/i,
  /\bcircular toe touch\b/i,
]

/**
 * Frases e termos típicos de datasets em inglês (ex: ExerciseDB sem tradução)
 * que não devem constar nas instruções/passos didáticos em português.
 */
const FORBIDDEN_ENGLISH_INSTRUCTION_PATTERNS = [
  /\blie flat on your back\b/i,
  /\bwith your knees bent\b/i,
  /\bfeet flat on the floor\b/i,
  /\bplace your hands behind\b/i,
  /\bengaging your abs\b/i,
  /\bslowly lift your\b/i,
  /\bstarting position\b/i,
  /\brepeat for the desired\b/i,
  /\bnumber of repetitions\b/i,
  /\bhold the barbell\b/i,
  /\bhold a dumbbell\b/i,
  /\bkeep your back straight\b/i,
  /\binhale as you lower\b/i,
  /\bexhale as you push\b/i,
  /\bshoulder-width apart\b/i,
]

interface ExercicioData {
  nome: string
  grupo_muscular?: string | null
  musculo_alvo?: string | null
  equipamento?: string | null
  dica?: string | null
  descricao_pt?: string | null
  passos_pt?: string[] | null
}

/**
 * Validador de qualidade e didática de exercícios para usuários leigos
 */
export function validarExercicioLinguagemEDidatica(ex: ExercicioData): {
  valido: boolean
  erros: string[]
} {
  const erros: string[] = []

  // 1. Validação de Nome em Português
  if (!ex.nome || ex.nome.trim().length < 3) {
    erros.push('Nome do exercício vazio ou muito curto.')
  } else {
    for (const pattern of FORBIDDEN_ENGLISH_NAME_PATTERNS) {
      if (pattern.test(ex.nome)) {
        erros.push(`Nome "${ex.nome}" contém termo em inglês não traduzido: ${pattern}`)
      }
    }
  }

  // 2. Validação de Instruções e Didática para Leigos
  const temDica = Boolean(ex.dica && ex.dica.trim().length > 10)
  const temDescricao = Boolean(ex.descricao_pt && ex.descricao_pt.trim().length > 10)
  const temPassos = Array.isArray(ex.passos_pt) && ex.passos_pt.length > 0

  if (!temDica && !temDescricao && !temPassos) {
    erros.push(`Exercício "${ex.nome}" não possui nenhuma instrução didática (passos, dica ou descrição).`)
  }

  // 3. Validação de Ausência de Inglês nas Instruções
  const textoInstrucoes = [
    ex.dica || '',
    ex.descricao_pt || '',
    ...(ex.passos_pt || []),
  ].join(' ')

  for (const pattern of FORBIDDEN_ENGLISH_INSTRUCTION_PATTERNS) {
    if (pattern.test(textoInstrucoes)) {
      erros.push(`Instruções de "${ex.nome}" contêm texto em inglês não traduzido: ${pattern}`)
    }
  }

  // 4. Validação de Clareza e Ausência de Tags HTML brutas
  if (/<[a-z][\s\S]*>/i.test(textoInstrucoes)) {
    erros.push(`Instruções de "${ex.nome}" contêm tags HTML brutas não sanitizadas.`)
  }

  // 5. Validação de Grupo Muscular Canônico em Português
  if (ex.grupo_muscular) {
    const gruposValidosPT = [
      'Peito',
      'Costas',
      'Ombros',
      'Bracos',
      'Antebraccos',
      'Coxas',
      'Glúteos',
      'Gluteos',
      'Panturrilhas',
      'Panturrilhas / Tibiais',
      'Abdomen',
      'Abdomen / Lombar',
      'Cardio',
      'Peso Corporal',
      'Geral',
    ]

    const pertence = gruposValidosPT.some(
      (g) => g.toLowerCase() === ex.grupo_muscular?.toLowerCase()
    )
    if (!pertence) {
      erros.push(`Grupo muscular "${ex.grupo_muscular}" não é uma categoria canônica em português.`)
    }
  }

  return {
    valido: erros.length === 0,
    erros,
  }
}

describe('Validação de Linguagem em Português e Didática para Usuários Leigos', () => {
  it('aprova exercícios com nomes e explicações claras em português', () => {
    const exercicioExemplo: ExercicioData = {
      nome: 'Supino Reto com Barra',
      grupo_muscular: 'Peito',
      musculo_alvo: 'Peitoral Maior',
      equipamento: 'Barra',
      dica: 'Deite-se no banco com os pés firmes no chão. Desça a barra controladamente até o meio do peito e empurre para cima.',
      descricao_pt: 'Exercício fundamental para o desenvolvimento do peitoral, ombros anteriores e tríceps.',
      passos_pt: [
        'Deite-se de costas em um banco reto mantendo a coluna alinhada.',
        'Segure a barra com uma pegada um pouco mais aberta que a largura dos ombros.',
        'Desça a barra de forma suave até a altura do peito, mantendo os cotovelos a 45 graus.',
        'Empurre a barra de volta para a posição inicial expirando o ar.',
      ],
    }

    const resultado = validarExercicioLinguagemEDidatica(exercicioExemplo)
    expect(resultado.valido).toBe(true)
    expect(resultado.erros).toHaveLength(0)
  })

  it('reprova exercícios com termos em inglês não traduzidos no nome', () => {
    const exercicioIngles: ExercicioData = {
      nome: 'Dumbbell Bench Press',
      grupo_muscular: 'Peito',
      dica: 'Deite-se no banco e empurre os halteres.',
      passos_pt: ['Passo 1', 'Passo 2'],
    }

    const resultado = validarExercicioLinguagemEDidatica(exercicioIngles)
    expect(resultado.valido).toBe(false)
    expect(resultado.erros.some((e) => e.includes('termo em inglês'))).toBe(true)
  })

  it('reprova exercícios com instruções em inglês sem tradução', () => {
    const exercicioInstrucaoIngles: ExercicioData = {
      nome: 'Abdominal Tradicional',
      grupo_muscular: 'Abdomen / Lombar',
      dica: 'Lie flat on your back with your knees bent and feet flat on the floor.',
      passos_pt: [
        'Engaging your abs, slowly lift your upper body off the ground.',
        'Repeat for the desired number of repetitions.',
      ],
    }

    const resultado = validarExercicioLinguagemEDidatica(exercicioInstrucaoIngles)
    expect(resultado.valido).toBe(false)
    expect(resultado.erros.some((e) => e.includes('texto em inglês'))).toBe(true)
  })

  it('reprova exercícios sem nenhuma explicação ou passo a passo', () => {
    const exercicioSemDidatica: ExercicioData = {
      nome: 'Rosca Direta com Halteres',
      grupo_muscular: 'Bracos',
      dica: null,
      descricao_pt: null,
      passos_pt: [],
    }

    const resultado = validarExercicioLinguagemEDidatica(exercicioSemDidatica)
    expect(resultado.valido).toBe(false)
    expect(resultado.erros.some((e) => e.includes('não possui nenhuma instrução didática'))).toBe(true)
  })

  it('reprova instruções com HTML bruto não sanitizado', () => {
    const exercicioHtml: ExercicioData = {
      nome: 'Agachamento Livre',
      grupo_muscular: 'Coxas',
      dica: 'Mantenha os pés afastados <br/> e desça o quadril <div>com calma</div>.',
      passos_pt: ['Abaixe o corpo.', 'Retorne à posição inicial.'],
    }

    const resultado = validarExercicioLinguagemEDidatica(exercicioHtml)
    expect(resultado.valido).toBe(false)
    expect(resultado.erros.some((e) => e.includes('tags HTML'))).toBe(true)
  })
})
