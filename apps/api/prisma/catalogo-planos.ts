export interface CatalogoExercicio {
  termos: string[]
  grupo: string
  equipamentoPref?: string[]
  restricoes?: string[]
  cargaSugeridaKg?: number | null
}

export interface CatalogoGrupo {
  INICIANTE: CatalogoExercicio[]
  INTERMEDIARIO: CatalogoExercicio[]
  AVANCADO: CatalogoExercicio[]
}

export interface CatalogoSessao {
  grupos: string[]
  labelA: string
  labelB: string
  labelCompleto: string
}

export const SESSOES: Record<string, CatalogoSessao> = {
  PUSH: {
    grupos: ['PEITO', 'OMBRO', 'TRICEPS'],
    labelA: 'Peito / Ombro / Tríceps',
    labelB: 'Push — Peito + Ombro + Tríceps',
    labelCompleto: 'Supino, desenvolvimento, tríceps e ombros — padrão empurrar',
  },
  PULL: {
    grupos: ['COSTAS', 'BICEPS'],
    labelA: 'Costas / Bíceps',
    labelB: 'Pull — Costas + Bíceps',
    labelCompleto: 'Puxadas, remadas e roscas — padrão puxar',
  },
  LEGS: {
    grupos: ['QUAD', 'POSTERIOR', 'PANTURRILHA'],
    labelA: 'Quad / Posterior / Panturrilha',
    labelB: 'Legs — Coxas + Posterior + Panturrilhas',
    labelCompleto: 'Agachamento, flexora, extensora e panturrilhas — inferior completo',
  },
  FULL: {
    grupos: ['PEITO', 'COSTAS', 'OMBRO', 'QUAD', 'POSTERIOR', 'BICEPS', 'TRICEPS', 'CORE'],
    labelA: 'Corpo Inteiro',
    labelB: 'Full Body',
    labelCompleto: 'Um exercício por grande área muscular',
  },
}

export const CATALOGO: Record<string, CatalogoGrupo> = {
  PEITO: {
    INICIANTE: [
      { termos: ['supino reto', 'máquina'], grupo: 'Peito', equipamentoPref: ['Máquina'] },
      { termos: ['peck deck', 'crucifixo', 'máquina'], grupo: 'Peito', equipamentoPref: ['Máquina'] },
      { termos: ['flexão', 'flexao'], grupo: 'Peito' },
    ],
    INTERMEDIARIO: [
      { termos: ['supino reto', 'barra', 'com barra'], grupo: 'Peito', equipamentoPref: ['Barra'] },
      { termos: ['supino inclinado', 'halter'], grupo: 'Peito', equipamentoPref: ['Halteres'] },
      { termos: ['crucifixo', 'halter'], grupo: 'Peito', equipamentoPref: ['Halteres'] },
    ],
    AVANCADO: [
      { termos: ['supino reto', 'barra'], grupo: 'Peito', equipamentoPref: ['Barra'] },
      { termos: ['supino inclinado'], grupo: 'Peito' },
      { termos: ['paralela', 'dip'], grupo: 'Peito', cargaSugeridaKg: null },
      { termos: ['crossover', 'polia'], grupo: 'Peito', equipamentoPref: ['Polia'] },
    ],
  },

  COSTAS: {
    INICIANTE: [
      { termos: ['puxada', 'frente', 'lat pulldown'], grupo: 'Costas', equipamentoPref: ['Máquina', 'Polia'] },
      { termos: ['remada sentada', 'polia baixa'], grupo: 'Costas', equipamentoPref: ['Polia'] },
      { termos: ['puxada', 'neutra'], grupo: 'Costas', equipamentoPref: ['Máquina', 'Polia'] },
    ],
    INTERMEDIARIO: [
      { termos: ['barra fixa'], grupo: 'Costas', equipamentoPref: ['Barra'] },
      { termos: ['remada curvada', 'barra'], grupo: 'Costas', equipamentoPref: ['Barra'], restricoes: ['lombar'] },
      { termos: ['remada unilateral', 'halter'], grupo: 'Costas', equipamentoPref: ['Halteres'] },
    ],
    AVANCADO: [
      { termos: ['levantamento terra', 'deadlift'], grupo: 'Costas', equipamentoPref: ['Barra'], restricoes: ['lombar'] },
      { termos: ['remada curvada'], grupo: 'Costas', equipamentoPref: ['Barra'], restricoes: ['lombar'] },
      { termos: ['barra fixa'], grupo: 'Costas' },
      { termos: ['remada', 'polia'], grupo: 'Costas', equipamentoPref: ['Polia'] },
    ],
  },

  OMBRO: {
    INICIANTE: [
      { termos: ['desenvolvimento', 'máquina', 'ombro'], grupo: 'Ombros', equipamentoPref: ['Máquina'], restricoes: ['ombro'] },
      { termos: ['elevação lateral'], grupo: 'Ombros' },
      { termos: ['elevação frontal', 'halter'], grupo: 'Ombros', equipamentoPref: ['Halteres'] },
    ],
    INTERMEDIARIO: [
      { termos: ['desenvolvimento militar'], grupo: 'Ombros', restricoes: ['ombro'] },
      { termos: ['elevação lateral', 'halter'], grupo: 'Ombros', equipamentoPref: ['Halteres'] },
      { termos: ['crucifixo inverso', 'rear'], grupo: 'Ombros', equipamentoPref: ['Máquina'] },
    ],
    AVANCADO: [
      { termos: ['desenvolvimento militar', 'barra'], grupo: 'Ombros', equipamentoPref: ['Barra'], restricoes: ['ombro'] },
      { termos: ['elevação lateral'], grupo: 'Ombros' },
      { termos: ['remada alta'], grupo: 'Ombros' },
      { termos: ['crucifixo inverso', 'rear'], grupo: 'Ombros' },
    ],
  },

  QUAD: {
    INICIANTE: [
      { termos: ['leg press'], grupo: 'Coxas', equipamentoPref: ['Máquina'], restricoes: ['joelho'] },
      { termos: ['cadeira extensora', 'extensora'], grupo: 'Coxas', equipamentoPref: ['Máquina'] },
      { termos: ['hack', 'agachamento guiado', 'smith'], grupo: 'Coxas', equipamentoPref: ['Máquina'] },
    ],
    INTERMEDIARIO: [
      { termos: ['agachamento', 'barra'], grupo: 'Coxas', equipamentoPref: ['Barra'], restricoes: ['joelho', 'lombar'] },
      { termos: ['afundo', 'avanço', 'passada', 'lunge'], grupo: 'Coxas', restricoes: ['joelho'] },
      { termos: ['leg press'], grupo: 'Coxas', equipamentoPref: ['Máquina'], restricoes: ['joelho'] },
    ],
    AVANCADO: [
      { termos: ['agachamento', 'barra'], grupo: 'Coxas', equipamentoPref: ['Barra'], restricoes: ['joelho', 'lombar'] },
      { termos: ['agachamento frontal'], grupo: 'Coxas', equipamentoPref: ['Barra'], restricoes: ['joelho', 'lombar'] },
      { termos: ['búlgaro', 'bulgaro', 'afundo'], grupo: 'Coxas', equipamentoPref: ['Halteres'], restricoes: ['joelho'] },
      { termos: ['leg press', 'hack'], grupo: 'Coxas', equipamentoPref: ['Máquina'], restricoes: ['joelho'] },
    ],
  },

  POSTERIOR: {
    INICIANTE: [
      { termos: ['cadeira flexora', 'flexora'], grupo: 'Coxas', equipamentoPref: ['Máquina'] },
      { termos: ['mesa flexora', 'flexor'], grupo: 'Coxas', equipamentoPref: ['Máquina'] },
      { termos: ['extensão quadril', 'máquina'], grupo: 'Coxas', equipamentoPref: ['Máquina'] },
    ],
    INTERMEDIARIO: [
      { termos: ['stiff'], grupo: 'Coxas', equipamentoPref: ['Barra', 'Halteres'], restricoes: ['lombar'] },
      { termos: ['flexora'], grupo: 'Coxas', equipamentoPref: ['Máquina'] },
      { termos: ['elevação pélvica', 'hip thrust', 'glúteo', 'ponte'], grupo: 'Coxas', equipamentoPref: ['Barra'] },
    ],
    AVANCADO: [
      { termos: ['stiff', 'barra'], grupo: 'Coxas', equipamentoPref: ['Barra'], restricoes: ['lombar'] },
      { termos: ['elevação pélvica', 'hip thrust'], grupo: 'Coxas', equipamentoPref: ['Barra'] },
      { termos: ['levantamento terra', 'sumô', 'sumo'], grupo: 'Coxas', equipamentoPref: ['Barra'], restricoes: ['lombar'] },
    ],
  },

  PANTURRILHA: {
    INICIANTE: [
      { termos: ['panturrilha', 'pé', 'máquina'], grupo: 'Panturrilhas / Tibiais', equipamentoPref: ['Máquina'] },
      { termos: ['panturrilha', 'sentado', 'máquina'], grupo: 'Panturrilhas / Tibiais', equipamentoPref: ['Máquina'] },
    ],
    INTERMEDIARIO: [
      { termos: ['panturrilha', 'halter', 'em pé'], grupo: 'Panturrilhas / Tibiais', equipamentoPref: ['Halteres'] },
      { termos: ['panturrilha', 'leg press'], grupo: 'Panturrilhas / Tibiais', equipamentoPref: ['Máquina'] },
      { termos: ['panturrilha', 'degrau'], grupo: 'Panturrilhas / Tibiais' },
    ],
    AVANCADO: [
      { termos: ['panturrilha', 'máquina', 'pé'], grupo: 'Panturrilhas / Tibiais', equipamentoPref: ['Máquina'] },
      { termos: ['panturrilha', 'sentado'], grupo: 'Panturrilhas / Tibiais', equipamentoPref: ['Máquina'] },
      { termos: ['panturrilha', 'leg press'], grupo: 'Panturrilhas / Tibiais', equipamentoPref: ['Máquina'] },
    ],
  },

  BICEPS: {
    INICIANTE: [
      { termos: ['rosca', 'máquina'], grupo: 'Bracos', equipamentoPref: ['Máquina'] },
      { termos: ['rosca', 'polia'], grupo: 'Bracos', equipamentoPref: ['Polia'] },
      { termos: ['rosca alternada', 'halter'], grupo: 'Bracos', equipamentoPref: ['Halteres'] },
      { termos: ['rosca concentrada'], grupo: 'Bracos' },
    ],
    INTERMEDIARIO: [
      { termos: ['rosca direta', 'barra'], grupo: 'Bracos', equipamentoPref: ['Barra'], restricoes: ['punho'] },
      { termos: ['rosca alternada', 'halter'], grupo: 'Bracos', equipamentoPref: ['Halteres'] },
      { termos: ['rosca', 'polia', 'cabo'], grupo: 'Bracos', equipamentoPref: ['Polia'] },
    ],
    AVANCADO: [
      { termos: ['rosca direta', 'barra'], grupo: 'Bracos', equipamentoPref: ['Barra'], restricoes: ['punho'] },
      { termos: ['rosca inclinada', 'halter', 'banco'], grupo: 'Bracos', equipamentoPref: ['Halteres'] },
      { termos: ['rosca martelo'], grupo: 'Bracos', equipamentoPref: ['Halteres'] },
      { termos: ['rosca concentrada'], grupo: 'Bracos' },
    ],
  },

  TRICEPS: {
    INICIANTE: [
      { termos: ['tríceps', 'polia', 'pushdown'], grupo: 'Bracos', equipamentoPref: ['Polia'] },
      { termos: ['tríceps testa', 'máquina'], grupo: 'Bracos', equipamentoPref: ['Máquina'] },
      { termos: ['mergulho', 'banco', 'assistido'], grupo: 'Bracos' },
    ],
    INTERMEDIARIO: [
      { termos: ['supino fechado', 'barra'], grupo: 'Bracos', equipamentoPref: ['Barra'] },
      { termos: ['tríceps testa'], grupo: 'Bracos', restricoes: ['punho'] },
      { termos: ['tríceps', 'polia', 'corda'], grupo: 'Bracos', equipamentoPref: ['Polia'] },
    ],
    AVANCADO: [
      { termos: ['paralela', 'dip'], grupo: 'Bracos' },
      { termos: ['supino fechado', 'barra'], grupo: 'Bracos', equipamentoPref: ['Barra'] },
      { termos: ['tríceps', 'polia', 'corda'], grupo: 'Bracos', equipamentoPref: ['Polia'] },
    ],
  },

  CORE: {
    INICIANTE: [
      { termos: ['abdominal', 'crunch'], grupo: 'Abdomen / Lombar' },
      { termos: ['prancha', 'plank'], grupo: 'Abdomen / Lombar' },
      { termos: ['elevação pernas', 'banco'], grupo: 'Abdomen / Lombar' },
    ],
    INTERMEDIARIO: [
      { termos: ['abdominal', 'crunch', 'inclinado'], grupo: 'Abdomen / Lombar' },
      { termos: ['prancha lateral'], grupo: 'Abdomen / Lombar' },
      { termos: ['cable crunch', 'wood chop'], grupo: 'Abdomen / Lombar', equipamentoPref: ['Polia'] },
    ],
    AVANCADO: [
      { termos: ['elevação pernas', 'barra', 'hang'], grupo: 'Abdomen / Lombar' },
      { termos: ['ab wheel', 'roda abdominal'], grupo: 'Abdomen / Lombar' },
      { termos: ['russian twist'], grupo: 'Abdomen / Lombar' },
    ],
  },
}

export const NIVEL_VOLUME: Record<string, { series: number; repMin: number; repMax: number; cargaSugeridaKg?: number | null }> = {
  INICIANTE: { series: 3, repMin: 10, repMax: 12, cargaSugeridaKg: null },
  INTERMEDIARIO: { series: 3, repMin: 8, repMax: 12, cargaSugeridaKg: null },
  AVANCADO: { series: 4, repMin: 6, repMax: 10, cargaSugeridaKg: null },
}

export const PALAVRAS_PROIBIDAS = [
  'alongamento', 'alongar', 'stretch', 'mobilidade', 'mobility',
  'yoga', 'aquecimento', 'warm up', 'cool down', 'descanso',
  'respiração', 'respiração', 'relaxamento', 'meditação',
]
