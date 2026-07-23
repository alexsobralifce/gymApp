/**
 * Catálogo canônico da Biblioteca de Planos.
 * 3 exercícios por grupo × nível. SEM alongamento.
 * Programas multi-sessão + variantes F/M.
 */

export interface CatalogoExercicio {
  termos: string[]
  excluir?: string[]
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

/** Programas multi-sessão: nome do programa → [{ split, grupos, dia_label, ordem }] */
export interface ProgramaDef {
  objetivo: string
  nivel: string
  sexo: string
  split_tipo: string
  dias_semana: number
  codigo: string
  nome: string
  descricao: string
  sessoes: Array<{
    nome: string
    dia_label: string
    ordem: number
    grupos: string[]
    /** Se true, omite PANTURRILHA do Legs para reduzir ex */
    legsSemPant?: boolean
    /** Grupos extras (como foco glúteo) */
    extras?: string[]
  }>
}

/** Volume por objetivo (séries/reps) — sobrepõe nível */
export const VOLUME_POR_OBJETIVO: Record<string, Record<string, { series: number; repMin: number; repMax: number }>> = {
  HIPERTROFIA: {
    INICIANTE: { series: 3, repMin: 10, repMax: 12 },
    INTERMEDIARIO: { series: 3, repMin: 8, repMax: 12 },
    AVANCADO: { series: 4, repMin: 6, repMax: 10 },
  },
  FORCA: {
    INICIANTE: { series: 3, repMin: 5, repMax: 6 },
    INTERMEDIARIO: { series: 4, repMin: 3, repMax: 5 },
    AVANCADO: { series: 5, repMin: 1, repMax: 5 },
  },
  EMAGRECIMENTO: {
    INICIANTE: { series: 3, repMin: 12, repMax: 15 },
    INTERMEDIARIO: { series: 3, repMin: 12, repMax: 20 },
    AVANCADO: { series: 4, repMin: 15, repMax: 20 },
  },
  SAUDE: {
    INICIANTE: { series: 2, repMin: 12, repMax: 15 },
    INTERMEDIARIO: { series: 3, repMin: 10, repMax: 15 },
    AVANCADO: { series: 3, repMin: 8, repMax: 12 },
  },
}

/** Programas multi-sessão (ABC / ABCD) */
export const PROGRAMAS: ProgramaDef[] = [
  // ─── HIPERTROFIA ───
  {
    objetivo: 'HIPERTROFIA', nivel: 'INICIANTE', sexo: 'AMBOS', split_tipo: 'ABC', dias_semana: 3,
    codigo: 'ABC_HIPER_INIT',
    nome: 'PPL — Push/Pull/Legs (Iniciante)',
    descricao: 'Divisão clássica 3x/semana: peito+ombro+tríceps, costas+bíceps, pernas completas. 3 exercícios por grupo.',
    sessoes: [
      { nome: 'A — Peito, Ombro e Tríceps', dia_label: 'A', ordem: 1, grupos: ['PEITO', 'OMBRO', 'TRICEPS'] },
      { nome: 'B — Costas e Bíceps', dia_label: 'B', ordem: 2, grupos: ['COSTAS', 'BICEPS'] },
      { nome: 'C — Quad, Posterior e Panturrilha', dia_label: 'C', ordem: 3, grupos: ['QUAD', 'POSTERIOR', 'PANTURRILHA'] },
    ],
  },
  {
    objetivo: 'HIPERTROFIA', nivel: 'INTERMEDIARIO', sexo: 'AMBOS', split_tipo: 'ABC', dias_semana: 3,
    codigo: 'ABC_HIPER_INTER',
    nome: 'PPL — Push/Pull/Legs (Intermediário)',
    descricao: 'Volume moderado PPL 3x/semana para hipertrofia com pesos livres e máquinas.',
    sessoes: [
      { nome: 'A — Peito, Ombro e Tríceps', dia_label: 'A', ordem: 1, grupos: ['PEITO', 'OMBRO', 'TRICEPS'] },
      { nome: 'B — Costas e Bíceps', dia_label: 'B', ordem: 2, grupos: ['COSTAS', 'BICEPS'] },
      { nome: 'C — Quad, Posterior e Panturrilha', dia_label: 'C', ordem: 3, grupos: ['QUAD', 'POSTERIOR', 'PANTURRILHA'] },
    ],
  },
  {
    objetivo: 'HIPERTROFIA', nivel: 'AVANCADO', sexo: 'AMBOS', split_tipo: 'ABC', dias_semana: 3,
    codigo: 'ABC_HIPER_AVAN',
    nome: 'PPL — Push/Pull/Legs (Avançado)',
    descricao: 'Alto volume PPL 3x/semana com 4 séries. Foco em progressão de carga e compostos pesados.',
    sessoes: [
      { nome: 'A — Peito, Ombro e Tríceps', dia_label: 'A', ordem: 1, grupos: ['PEITO', 'OMBRO', 'TRICEPS'] },
      { nome: 'B — Costas e Bíceps', dia_label: 'B', ordem: 2, grupos: ['COSTAS', 'BICEPS'] },
      { nome: 'C — Quad, Posterior e Panturrilha', dia_label: 'C', ordem: 3, grupos: ['QUAD', 'POSTERIOR', 'PANTURRILHA'] },
    ],
  },
  // ─── FEMININO (GLÚTEO) ───
  {
    objetivo: 'HIPERTROFIA', nivel: 'INICIANTE', sexo: 'FEMININO', split_tipo: 'ABC', dias_semana: 3,
    codigo: 'ABC_HIPER_F_INIT',
    nome: 'PPL Feminino — Foco Glúteos (Iniciante)',
    descricao: 'Push/Pull/Legs com volume extra em glúteos e posteriores. 3x/semana.',
    sessoes: [
      { nome: 'A — Peito, Ombro e Tríceps', dia_label: 'A', ordem: 1, grupos: ['PEITO', 'OMBRO', 'TRICEPS'] },
      { nome: 'B — Costas e Bíceps', dia_label: 'B', ordem: 2, grupos: ['COSTAS', 'BICEPS'] },
      { nome: 'C — Quad, Glúteo e Panturrilha', dia_label: 'C', ordem: 3, grupos: ['QUAD', 'POSTERIOR', 'PANTURRILHA'], extras: ['POSTERIOR'] },
    ],
  },
  {
    objetivo: 'HIPERTROFIA', nivel: 'INTERMEDIARIO', sexo: 'FEMININO', split_tipo: 'ABCD', dias_semana: 4,
    codigo: 'ABCD_HIPER_F_INTER',
    nome: 'ABCD Feminino — Glúteo Dedicado (Intermediário)',
    descricao: '4 dias com dia exclusivo de glúteos e posteriores + upper body equilibrado.',
    sessoes: [
      { nome: 'A — Peito e Ombro', dia_label: 'A', ordem: 1, grupos: ['PEITO', 'OMBRO'] },
      { nome: 'B — Glúteo e Posteriores', dia_label: 'B', ordem: 2, grupos: ['POSTERIOR', 'POSTERIOR'], extras: ['POSTERIOR'] },
      { nome: 'C — Costas e Bíceps', dia_label: 'C', ordem: 3, grupos: ['COSTAS', 'BICEPS'] },
      { nome: 'D — Quad e Panturrilha', dia_label: 'D', ordem: 4, grupos: ['QUAD', 'PANTURRILHA'] },
    ],
  },
  // ─── MASCULINO ───
  {
    objetivo: 'HIPERTROFIA', nivel: 'INTERMEDIARIO', sexo: 'MASCULINO', split_tipo: 'ABC', dias_semana: 3,
    codigo: 'ABC_HIPER_M_INTER',
    nome: 'PPL Masculino — Upper/Lower Balance (Intermediário)',
    descricao: 'PPL com ênfase em compostos de peito/costas e volume equilibrado de pernas.',
    sessoes: [
      { nome: 'A — Peito, Ombro e Tríceps', dia_label: 'A', ordem: 1, grupos: ['PEITO', 'OMBRO', 'TRICEPS'] },
      { nome: 'B — Costas e Bíceps', dia_label: 'B', ordem: 2, grupos: ['COSTAS', 'BICEPS'] },
      { nome: 'C — Quad, Posterior e Panturrilha', dia_label: 'C', ordem: 3, grupos: ['QUAD', 'POSTERIOR', 'PANTURRILHA'] },
    ],
  },
  {
    objetivo: 'HIPERTROFIA', nivel: 'AVANCADO', sexo: 'MASCULINO', split_tipo: 'ABCD', dias_semana: 4,
    codigo: 'ABCD_HIPER_M_AVAN',
    nome: 'ABCD Masculino — Bodybuilding Split (Avançado)',
    descricao: 'Divisão clássica 4 dias: peito, costas, pernas, ombros+braços. 4 séries por exercício.',
    sessoes: [
      { nome: 'A — Peito e Tríceps', dia_label: 'A', ordem: 1, grupos: ['PEITO', 'TRICEPS'] },
      { nome: 'B — Costas e Bíceps', dia_label: 'B', ordem: 2, grupos: ['COSTAS', 'BICEPS'] },
      { nome: 'C — Quad, Posterior e Panturrilha', dia_label: 'C', ordem: 3, grupos: ['QUAD', 'POSTERIOR', 'PANTURRILHA'] },
      { nome: 'D — Ombros e Core', dia_label: 'D', ordem: 4, grupos: ['OMBRO', 'CORE'] },
    ],
  },
  // ─── FORÇA ───
  {
    objetivo: 'FORCA', nivel: 'INICIANTE', sexo: 'AMBOS', split_tipo: 'FULL_BODY', dias_semana: 3,
    codigo: 'FULL_FORCA_INIT',
    nome: 'Full Body Força (Iniciante)',
    descricao: 'Compostos principais 3x/semana: agachamento, supino, remada, desenvolvimento. 3 séries × 5-6 reps.',
    sessoes: [
      { nome: 'Full Body Força', dia_label: 'A', ordem: 1, grupos: ['QUAD', 'PEITO', 'COSTAS', 'OMBRO', 'POSTERIOR', 'CORE'] },
    ],
  },
  {
    objetivo: 'FORCA', nivel: 'INTERMEDIARIO', sexo: 'AMBOS', split_tipo: 'ABC', dias_semana: 3,
    codigo: 'ABC_FORCA_INTER',
    nome: 'ABC Força — Upper/Lower (Intermediário)',
    descricao: '3 dias: superior empurrar, superior puxar, pernas. 4 séries × 3-5 reps.',
    sessoes: [
      { nome: 'A — Superior Empurrar', dia_label: 'A', ordem: 1, grupos: ['PEITO', 'OMBRO', 'TRICEPS'] },
      { nome: 'B — Inferior + Posterior', dia_label: 'B', ordem: 2, grupos: ['QUAD', 'POSTERIOR'] },
      { nome: 'C — Superior Puxar', dia_label: 'C', ordem: 3, grupos: ['COSTAS', 'BICEPS'] },
    ],
  },
  {
    objetivo: 'FORCA', nivel: 'AVANCADO', sexo: 'AMBOS', split_tipo: 'ABC', dias_semana: 3,
    codigo: 'ABC_FORCA_AVAN',
    nome: 'ABC Força Pesada (Avançado)',
    descricao: '5x5 nos compostos principais + acessórios. 5 séries × 1-5 reps.',
    sessoes: [
      { nome: 'A — Peito e Ombro Pesado', dia_label: 'A', ordem: 1, grupos: ['PEITO', 'OMBRO', 'TRICEPS'] },
      { nome: 'B — Costas e Posterior Pesado', dia_label: 'B', ordem: 2, grupos: ['COSTAS', 'POSTERIOR'] },
      { nome: 'C — Pernas Pesado', dia_label: 'C', ordem: 3, grupos: ['QUAD', 'PANTURRILHA'] },
    ],
  },
  // ─── EMAGRECIMENTO ───
  {
    objetivo: 'EMAGRECIMENTO', nivel: 'INICIANTE', sexo: 'AMBOS', split_tipo: 'FULL_BODY', dias_semana: 3,
    codigo: 'FULL_EMAG_INIT',
    nome: 'Full Body Circuito (Iniciante)',
    descricao: 'Circuito corpo inteiro 3x/semana, 15-20 reps, pausas curtas. Alto gasto calórico.',
    sessoes: [
      { nome: 'Circuito Full Body', dia_label: 'A', ordem: 1, grupos: ['QUAD', 'PEITO', 'COSTAS', 'OMBRO', 'POSTERIOR', 'BICEPS', 'TRICEPS', 'CORE'] },
    ],
  },
  {
    objetivo: 'EMAGRECIMENTO', nivel: 'INTERMEDIARIO', sexo: 'AMBOS', split_tipo: 'ABC', dias_semana: 3,
    codigo: 'ABC_EMAG_INTER',
    nome: 'PPL Emagrecimento (Intermediário)',
    descricao: 'Push/Pull/Legs com alta densidade: 12-20 reps, pausas curtas. 3x/semana.',
    sessoes: [
      { nome: 'A — Push Metabólico', dia_label: 'A', ordem: 1, grupos: ['PEITO', 'OMBRO', 'TRICEPS'] },
      { nome: 'B — Pull Metabólico', dia_label: 'B', ordem: 2, grupos: ['COSTAS', 'BICEPS'] },
      { nome: 'C — Legs Metabólico', dia_label: 'C', ordem: 3, grupos: ['QUAD', 'POSTERIOR', 'PANTURRILHA'] },
    ],
  },
  {
    objetivo: 'EMAGRECIMENTO', nivel: 'AVANCADO', sexo: 'AMBOS', split_tipo: 'ABC', dias_semana: 3,
    codigo: 'ABC_EMAG_AVAN',
    nome: 'PPL Emagrecimento Intenso (Avançado)',
    descricao: 'PPL 4 séries × 15-20 reps, máxima densidade. Preserva massa magra em déficit.',
    sessoes: [
      { nome: 'A — Push Intenso', dia_label: 'A', ordem: 1, grupos: ['PEITO', 'OMBRO', 'TRICEPS'] },
      { nome: 'B — Pull Intenso', dia_label: 'B', ordem: 2, grupos: ['COSTAS', 'BICEPS'] },
      { nome: 'C — Legs Intenso', dia_label: 'C', ordem: 3, grupos: ['QUAD', 'POSTERIOR', 'PANTURRILHA'] },
    ],
  },
  // ─── SAÚDE ───
  {
    objetivo: 'SAUDE', nivel: 'INICIANTE', sexo: 'AMBOS', split_tipo: 'FULL_BODY', dias_semana: 3,
    codigo: 'FULL_SAUDE_INIT',
    nome: 'Full Body Saúde (Iniciante)',
    descricao: 'Um exercício por grande área, 3x/semana. Volume moderado para saúde e condicionamento.',
    sessoes: [
      { nome: 'Full Body', dia_label: 'A', ordem: 1, grupos: ['QUAD', 'PEITO', 'COSTAS', 'OMBRO', 'POSTERIOR', 'CORE', 'BICEPS', 'TRICEPS'] },
    ],
  },
  {
    objetivo: 'SAUDE', nivel: 'INTERMEDIARIO', sexo: 'AMBOS', split_tipo: 'FULL_BODY', dias_semana: 3,
    codigo: 'FULL_SAUDE_INTER',
    nome: 'Full Body Saúde (Intermediário)',
    descricao: 'Corpo inteiro 3x/semana com 3 séries × 10-15. Rotina equilibrada para bem-estar.',
    sessoes: [
      { nome: 'Full Body', dia_label: 'A', ordem: 1, grupos: ['QUAD', 'PEITO', 'COSTAS', 'OMBRO', 'POSTERIOR', 'CORE', 'BICEPS', 'TRICEPS'] },
    ],
  },
  {
    objetivo: 'SAUDE', nivel: 'AVANCADO', sexo: 'AMBOS', split_tipo: 'ABC', dias_semana: 3,
    codigo: 'ABC_SAUDE_AVAN',
    nome: 'ABC Saúde (Avançado)',
    descricao: 'Divisão 3x para manutenção avançada. Volume controlado, foco em qualidade de movimento.',
    sessoes: [
      { nome: 'A — Peito, Ombro e Tríceps', dia_label: 'A', ordem: 1, grupos: ['PEITO', 'OMBRO', 'TRICEPS'] },
      { nome: 'B — Costas e Bíceps', dia_label: 'B', ordem: 2, grupos: ['COSTAS', 'BICEPS'] },
      { nome: 'C — Quad, Posterior e Core', dia_label: 'C', ordem: 3, grupos: ['QUAD', 'POSTERIOR', 'CORE'] },
    ],
  },
]

export const SESSOES: Record<string, { grupos: string[]; label: string; dia: string; ordem: number }> = {
  PUSH: { grupos: ['PEITO', 'OMBRO', 'TRICEPS'], label: 'Peito + Ombro + Tríceps', dia: 'A', ordem: 1 },
  PULL: { grupos: ['COSTAS', 'BICEPS'], label: 'Costas + Bíceps', dia: 'B', ordem: 2 },
  LEGS: { grupos: ['QUAD', 'POSTERIOR', 'PANTURRILHA'], label: 'Coxas + Posterior + Panturrilhas', dia: 'C', ordem: 3 },
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
