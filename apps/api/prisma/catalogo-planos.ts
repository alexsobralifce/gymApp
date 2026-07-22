/**
 * Catálogo canônico da Biblioteca de Planos.
 * Termos alinhados aos nomes reais do GifDoTreino (sem acento, ordem invertida).
 * 3 exercícios por grupo × nível. SEM alongamento.
 */

export interface CatalogoExercicio {
  /** Termos que DEVEM aparecer no nome (AND entre arrays internos = OR de grupos) */
  termos: string[]
  /** Termos que NÃO podem aparecer */
  excluir?: string[]
  grupo: string
  /** Preferência de equipamento (normalizado) */
  equipamentoPref?: string[]
  restricoes?: string[]
  cargaSugeridaKg?: number | null
}

export interface CatalogoGrupo {
  INICIANTE: CatalogoExercicio[]
  INTERMEDIARIO: CatalogoExercicio[]
  AVANCADO: CatalogoExercicio[]
}

export const CATALOGO: Record<string, CatalogoGrupo> = {
  PEITO: {
    INICIANTE: [
      { termos: ['supino', 'reto'], grupo: 'Peito', equipamentoPref: ['halter', 'barra'] },
      { termos: ['crucifixo'], grupo: 'Peito', equipamentoPref: ['polia', 'halter'], excluir: ['inverso', 'ombro'] },
      { termos: ['smith', 'desenvolvimento'], grupo: 'Peito', equipamentoPref: ['smith'] },
    ],
    INTERMEDIARIO: [
      { termos: ['supino', 'reto', 'barra'], grupo: 'Peito', equipamentoPref: ['barra'] },
      { termos: ['supino', 'inclinado'], grupo: 'Peito', equipamentoPref: ['halter', 'barra'] },
      { termos: ['crucifixo'], grupo: 'Peito', equipamentoPref: ['halter', 'polia'], excluir: ['inverso'] },
    ],
    AVANCADO: [
      { termos: ['supino', 'reto'], grupo: 'Peito', equipamentoPref: ['barra'] },
      { termos: ['supino', 'inclinado'], grupo: 'Peito', equipamentoPref: ['barra', 'halter'] },
      { termos: ['dip'], grupo: 'Peito', excluir: ['triceps'] },
    ],
  },

  COSTAS: {
    INICIANTE: [
      { termos: ['puxada'], grupo: 'Costas', equipamentoPref: ['polia'], excluir: ['barra fixa'] },
      { termos: ['remada', 'sentado'], grupo: 'Costas', equipamentoPref: ['polia'] },
      { termos: ['remada'], grupo: 'Costas', equipamentoPref: ['polia', 'alavanca'], excluir: ['curvado'] },
    ],
    INTERMEDIARIO: [
      { termos: ['barra fixa'], grupo: 'Costas', excluir: ['assistid'] },
      { termos: ['remada', 'curvado'], grupo: 'Costas', equipamentoPref: ['barra'], restricoes: ['lombar'] },
      { termos: ['remada', 'unilateral'], grupo: 'Costas', equipamentoPref: ['halter', 'polia'] },
    ],
    AVANCADO: [
      { termos: ['levantamento terra'], grupo: 'Costas', equipamentoPref: ['barra'], restricoes: ['lombar'], excluir: ['stiff'] },
      { termos: ['remada', 'curvado'], grupo: 'Costas', equipamentoPref: ['barra'], restricoes: ['lombar'] },
      { termos: ['barra fixa'], grupo: 'Costas', excluir: ['assistid'] },
    ],
  },

  OMBRO: {
    INICIANTE: [
      { termos: ['desenvolvimento'], grupo: 'Ombros', equipamentoPref: ['smith', 'alavanca', 'halter'], restricoes: ['ombro'], excluir: ['peito', 'pullover'] },
      { termos: ['elevacao', 'lateral'], grupo: 'Ombros', equipamentoPref: ['polia', 'halter'] },
      { termos: ['elevacao', 'front'], grupo: 'Ombros', equipamentoPref: ['polia', 'halter', 'barra'] },
    ],
    INTERMEDIARIO: [
      { termos: ['military', 'desenvolvimento'], grupo: 'Ombros', equipamentoPref: ['barra', 'halter'], restricoes: ['ombro'] },
      { termos: ['elevacao', 'lateral'], grupo: 'Ombros', equipamentoPref: ['halter', 'polia'] },
      { termos: ['posterior', 'ombro'], grupo: 'Ombros', equipamentoPref: ['barra', 'halter', 'polia'] },
    ],
    AVANCADO: [
      { termos: ['military', 'desenvolvimento'], grupo: 'Ombros', equipamentoPref: ['barra'], restricoes: ['ombro'] },
      { termos: ['elevacao', 'lateral'], grupo: 'Ombros' },
      { termos: ['upright', 'remada'], grupo: 'Ombros', equipamentoPref: ['barra'] },
    ],
  },

  QUAD: {
    INICIANTE: [
      { termos: ['agachamento'], grupo: 'Coxas', equipamentoPref: ['smith', 'alavanca', 'halter'], restricoes: ['joelho'], excluir: ['acima', 'overhead', 'salto', 'alongamento'] },
      { termos: ['hack', 'agachamento'], grupo: 'Coxas', equipamentoPref: ['barra', 'alavanca'], restricoes: ['joelho'] },
      { termos: ['agachamento', 'halter'], grupo: 'Coxas', equipamentoPref: ['halter'], restricoes: ['joelho'] },
    ],
    INTERMEDIARIO: [
      { termos: ['agachamento', 'barra'], grupo: 'Coxas', equipamentoPref: ['barra'], restricoes: ['joelho', 'lombar'], excluir: ['acima', 'salto', 'alongamento'] },
      { termos: ['avanco'], grupo: 'Coxas', equipamentoPref: ['barra', 'halter'], restricoes: ['joelho'] },
      { termos: ['agachamento', 'halter'], grupo: 'Coxas', equipamentoPref: ['halter'], restricoes: ['joelho'] },
    ],
    AVANCADO: [
      { termos: ['agachamento', 'barra'], grupo: 'Coxas', equipamentoPref: ['barra'], restricoes: ['joelho', 'lombar'], excluir: ['acima', 'salto'] },
      { termos: ['front', 'agachamento'], grupo: 'Coxas', equipamentoPref: ['barra'], restricoes: ['joelho', 'lombar'] },
      { termos: ['split', 'agachamento'], grupo: 'Coxas', equipamentoPref: ['barra', 'halter'], restricoes: ['joelho'] },
    ],
  },

  POSTERIOR: {
    INICIANTE: [
      { termos: ['stiff'], grupo: 'Coxas', equipamentoPref: ['halter', 'barra'], restricoes: ['lombar'], excluir: ['alongamento'] },
      { termos: ['gluteo', 'ponte'], grupo: 'Coxas', excluir: ['alongamento'] },
      { termos: ['levantamento terra'], grupo: 'Coxas', equipamentoPref: ['halter', 'barra'], restricoes: ['lombar'], excluir: ['alongamento'] },
    ],
    INTERMEDIARIO: [
      { termos: ['stiff'], grupo: 'Coxas', equipamentoPref: ['barra', 'halter'], restricoes: ['lombar'] },
      { termos: ['gluteo', 'ponte'], grupo: 'Coxas', equipamentoPref: ['barra'] },
      { termos: ['levantamento terra'], grupo: 'Coxas', equipamentoPref: ['barra'], restricoes: ['lombar'] },
    ],
    AVANCADO: [
      { termos: ['stiff', 'barra'], grupo: 'Coxas', equipamentoPref: ['barra'], restricoes: ['lombar'] },
      { termos: ['gluteo', 'ponte'], grupo: 'Coxas', equipamentoPref: ['barra'] },
      { termos: ['levantamento terra'], grupo: 'Coxas', equipamentoPref: ['barra'], restricoes: ['lombar'] },
    ],
  },

  PANTURRILHA: {
    INICIANTE: [
      { termos: ['panturrilha', 'pe'], grupo: 'Panturrilhas / Tibiais', equipamentoPref: ['barra', 'halter', 'maquina'], excluir: ['alongamento'] },
      { termos: ['panturrilha', 'sentado'], grupo: 'Panturrilhas / Tibiais', excluir: ['alongamento'] },
    ],
    INTERMEDIARIO: [
      { termos: ['panturrilha', 'pe'], grupo: 'Panturrilhas / Tibiais', excluir: ['alongamento'] },
      { termos: ['panturrilha', 'sentado'], grupo: 'Panturrilhas / Tibiais', excluir: ['alongamento'] },
      { termos: ['panturrilha'], grupo: 'Panturrilhas / Tibiais', equipamentoPref: ['halter'], excluir: ['alongamento', 'bola'] },
    ],
    AVANCADO: [
      { termos: ['panturrilha', 'pe'], grupo: 'Panturrilhas / Tibiais', excluir: ['alongamento'] },
      { termos: ['panturrilha', 'sentado'], grupo: 'Panturrilhas / Tibiais', excluir: ['alongamento'] },
      { termos: ['panturrilha', 'rocking'], grupo: 'Panturrilhas / Tibiais', excluir: ['alongamento'] },
    ],
  },

  BICEPS: {
    INICIANTE: [
      { termos: ['rosca'], grupo: 'Bracos', equipamentoPref: ['polia', 'halter'], excluir: ['punho', 'triceps', 'alongamento'] },
      { termos: ['rosca', 'alternado'], grupo: 'Bracos', equipamentoPref: ['barra', 'halter'], excluir: ['punho'] },
      { termos: ['rosca', 'concentrado'], grupo: 'Bracos', excluir: ['punho'] },
    ],
    INTERMEDIARIO: [
      { termos: ['rosca', 'direta'], grupo: 'Bracos', equipamentoPref: ['barra'], restricoes: ['punho'], excluir: ['punho', 'triceps'] },
      { termos: ['rosca', 'alternado'], grupo: 'Bracos', equipamentoPref: ['halter', 'barra'], excluir: ['punho'] },
      { termos: ['rosca', 'polia'], grupo: 'Bracos', equipamentoPref: ['polia'], excluir: ['punho', 'triceps'] },
    ],
    AVANCADO: [
      { termos: ['rosca', 'direta', 'barra'], grupo: 'Bracos', equipamentoPref: ['barra'], restricoes: ['punho'], excluir: ['punho'] },
      { termos: ['rosca', 'inclinado'], grupo: 'Bracos', equipamentoPref: ['halter'], excluir: ['punho'] },
      { termos: ['rosca', 'hammer'], grupo: 'Bracos', equipamentoPref: ['halter', 'polia'], excluir: ['punho'] },
    ],
  },

  TRICEPS: {
    INICIANTE: [
      { termos: ['triceps', 'pushdown'], grupo: 'Bracos', equipamentoPref: ['polia'], excluir: ['alongamento'] },
      { termos: ['triceps', 'extensao'], grupo: 'Bracos', equipamentoPref: ['polia', 'halter'], excluir: ['alongamento'] },
      { termos: ['triceps', 'dip'], grupo: 'Bracos', excluir: ['peito'] },
    ],
    INTERMEDIARIO: [
      { termos: ['triceps', 'testa'], grupo: 'Bracos', restricoes: ['punho'] },
      { termos: ['triceps', 'extensao'], grupo: 'Bracos', equipamentoPref: ['barra', 'halter'] },
      { termos: ['triceps', 'pushdown'], grupo: 'Bracos', equipamentoPref: ['polia'] },
    ],
    AVANCADO: [
      { termos: ['triceps', 'dip'], grupo: 'Bracos', excluir: ['peito'] },
      { termos: ['triceps', 'extensao', 'barra'], grupo: 'Bracos', equipamentoPref: ['barra'] },
      { termos: ['triceps', 'pushdown'], grupo: 'Bracos', equipamentoPref: ['polia'] },
    ],
  },

  CORE: {
    INICIANTE: [
      { termos: ['abdominal'], grupo: 'Abdomen / Lombar', excluir: ['alongamento', 'desenvolvimento'] },
      { termos: ['prancha'], grupo: 'Abdomen / Lombar', excluir: ['alongamento', 'equilibrio'] },
      { termos: ['elevacao', 'joelho'], grupo: 'Abdomen / Lombar', excluir: ['alongamento'] },
    ],
    INTERMEDIARIO: [
      { termos: ['abdominal'], grupo: 'Abdomen / Lombar', equipamentoPref: ['polia'], excluir: ['alongamento'] },
      { termos: ['prancha'], grupo: 'Abdomen / Lombar', excluir: ['alongamento'] },
      { termos: ['elevacao', 'pernas'], grupo: 'Abdomen / Lombar', excluir: ['alongamento'] },
    ],
    AVANCADO: [
      { termos: ['elevacao', 'pernas'], grupo: 'Abdomen / Lombar', excluir: ['alongamento'] },
      { termos: ['roller', 'wheel'], grupo: 'Abdomen / Lombar', excluir: ['alongamento'] },
      { termos: ['abdominal'], grupo: 'Abdomen / Lombar', equipamentoPref: ['polia'], excluir: ['alongamento'] },
    ],
  },
}

export const SESSOES: Record<string, { grupos: string[]; label: string; dia: string; ordem: number }> = {
  PUSH: {
    grupos: ['PEITO', 'OMBRO', 'TRICEPS'],
    label: 'Peito + Ombro + Tríceps',
    dia: 'A',
    ordem: 1,
  },
  PULL: {
    grupos: ['COSTAS', 'BICEPS'],
    label: 'Costas + Bíceps',
    dia: 'B',
    ordem: 2,
  },
  LEGS: {
    grupos: ['QUAD', 'POSTERIOR', 'PANTURRILHA'],
    label: 'Coxas + Posterior + Panturrilhas',
    dia: 'C',
    ordem: 3,
  },
}

export const NIVEL_VOLUME: Record<string, { series: number; repMin: number; repMax: number }> = {
  INICIANTE: { series: 3, repMin: 10, repMax: 12 },
  INTERMEDIARIO: { series: 3, repMin: 8, repMax: 12 },
  AVANCADO: { series: 4, repMin: 6, repMax: 10 },
}

export const PALAVRAS_PROIBIDAS = [
  'alongamento', 'alongar', 'stretch', 'mobilidade', 'mobility',
  'yoga', 'aquecimento', 'warm up', 'cool down',
  'respiracao', 'relaxamento', 'meditacao',
]
