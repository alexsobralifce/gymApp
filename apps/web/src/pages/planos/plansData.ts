/**
 * Dados estáticos da página pública de planos.
 * Fonte de verdade: `docs/planning/catalogo-de-precos.md`.
 *
 * A página NÃO depende da API de propósito (não quebra se o backend estiver fora).
 */

export type SegmentoPublico = 'PERSONAL' | 'ACADEMIA'

export interface PlanoPublico {
  codigo: string
  nome: string
  subtitulo: string
  /** Limite de alunos exibido no card. */
  alunosLabel: string
  /** Limite de professores (academia). */
  professoresLabel?: string
  /** Unidades inclusas (academia). */
  unidadesLabel?: string
  /** Preço mensal em reais. `null` = sob consulta. */
  precoMensal: number | null
  /** Preço por aluno no teto, em reais. `null` = não se aplica. */
  porAluno: number | null
  destaque?: boolean
  selo?: string
  ctaLabel: string
  recursos: string[]
}

export const PLANOS_PERSONAL: PlanoPublico[] = [
  {
    codigo: 'PT_FREE',
    nome: 'Personal Free',
    subtitulo: 'Para experimentar sem custo',
    alunosLabel: 'Até 3 alunos ativos',
    precoMensal: 0,
    porAluno: 0,
    ctaLabel: 'Começar grátis',
    recursos: [
      'Monte treinos por objetivo, nível e dias',
      'Aluno executa no app com cronômetro',
      'Histórico de cargas por aluno',
    ],
  },
  {
    codigo: 'PT_STARTER',
    nome: 'Personal Starter',
    subtitulo: 'Para quem está começando a atender',
    alunosLabel: 'Até 10 alunos ativos',
    precoMensal: 49,
    porAluno: 4.9,
    ctaLabel: 'Testar 15 dias grátis',
    recursos: [
      'Tudo do Free',
      'Avaliação física do aluno',
      'Convites para vincular alunos',
      'Fichas e templates de treino',
    ],
  },
  {
    codigo: 'PT_PRO',
    nome: 'Personal Pro',
    subtitulo: 'O mais escolhido por personais',
    alunosLabel: 'Até 30 alunos ativos',
    precoMensal: 89,
    porAluno: 2.97,
    destaque: true,
    selo: 'Mais popular',
    ctaLabel: 'Testar 15 dias grátis',
    recursos: [
      'Tudo do Starter',
      'Relatórios e laudos de avaliação',
      'Evolução mensal e correlações',
      'Clubes e feed com seus alunos',
    ],
  },
  {
    codigo: 'PT_PLUS',
    nome: 'Personal Plus',
    subtitulo: 'Para carteira consolidada',
    alunosLabel: 'Até 60 alunos ativos',
    professoresLabel: 'Até 2 professores',
    precoMensal: 149,
    porAluno: 2.48,
    ctaLabel: 'Falar com especialista',
    recursos: [
      'Tudo do Pro',
      'Templates ilimitados',
      'Sua marca no app do aluno',
      'Clonagem de treino em lote',
    ],
  },
  {
    codigo: 'PT_SCALE',
    nome: 'Personal Scale',
    subtitulo: 'Para grandes carteiras',
    alunosLabel: 'Até 120 alunos ativos',
    professoresLabel: 'Até 3 professores',
    precoMensal: 249,
    porAluno: 2.08,
    ctaLabel: 'Falar com especialista',
    recursos: [
      'Tudo do Plus',
      'Importação de alunos',
      'Suporte prioritário',
    ],
  },
  {
    codigo: 'PT_STUDIO',
    nome: 'Personal Studio',
    subtitulo: 'Equipe e alunos sem limite',
    alunosLabel: 'Alunos ativos ilimitados',
    professoresLabel: 'Até 3 professores',
    precoMensal: 349,
    porAluno: null,
    ctaLabel: 'Falar com especialista',
    recursos: [
      'Tudo do Scale',
      'Workspace com 3 professores',
      'Marca própria no app',
    ],
  },
]

export const PLANOS_ACADEMIA: PlanoPublico[] = [
  {
    codigo: 'AC_ESSENCIAL',
    nome: 'Academia Essencial',
    subtitulo: 'Academia de bairro e estúdios',
    alunosLabel: 'Até 150 alunos ativos',
    professoresLabel: 'Até 5 professores',
    unidadesLabel: '1 unidade',
    precoMensal: 199,
    porAluno: 1.33,
    ctaLabel: 'Testar 30 dias grátis',
    recursos: [
      'Gestão de alunos e professores',
      'Fichas de treino em lote',
      'Clube da academia para os alunos',
      'Nota fiscal (NFS-e)',
    ],
  },
  {
    codigo: 'AC_CRESCIMENTO',
    nome: 'Academia Crescimento',
    subtitulo: 'Academia consolidada, vários turnos',
    alunosLabel: 'Até 400 alunos ativos',
    professoresLabel: 'Até 15 professores',
    unidadesLabel: '1 unidade',
    precoMensal: 399,
    porAluno: 1.0,
    destaque: true,
    selo: 'Melhor custo por aluno',
    ctaLabel: 'Testar 30 dias grátis',
    recursos: [
      'Tudo do Essencial',
      'Avaliação física com laudo',
      'Relatórios de evolução por aluno',
      'Integração com check-in',
    ],
  },
  {
    codigo: 'AC_PERFORMANCE',
    nome: 'Academia Performance',
    subtitulo: 'Academia de grande porte',
    alunosLabel: 'Até 1.000 alunos ativos',
    professoresLabel: 'Até 40 professores',
    unidadesLabel: '1 unidade (adicional disponível)',
    precoMensal: 749,
    porAluno: 0.75,
    ctaLabel: 'Falar com especialista',
    recursos: [
      'Tudo do Crescimento',
      'Indicadores e comparativos por unidade',
      'Marca da academia no app',
      'Prioridade no suporte',
    ],
  },
  {
    codigo: 'AC_REDE',
    nome: 'Academia Rede',
    subtitulo: 'Redes e franquias regionais',
    alunosLabel: 'Até 2.500 alunos ativos',
    professoresLabel: 'Até 100 professores',
    unidadesLabel: 'Até 5 unidades',
    precoMensal: 1499,
    porAluno: 0.6,
    ctaLabel: 'Falar com especialista',
    recursos: [
      'Tudo do Performance',
      'Gestão multiunidade',
      'App com a marca da rede',
      'Suporte prioritário',
    ],
  },
  {
    codigo: 'AC_ENTERPRISE',
    nome: 'Academia Enterprise',
    subtitulo: 'Redes nacionais e operações sob medida',
    alunosLabel: 'Alunos ilimitados',
    professoresLabel: 'Professores ilimitados',
    unidadesLabel: 'Unidades ilimitadas',
    precoMensal: null,
    porAluno: null,
    ctaLabel: 'Falar com especialista',
    recursos: [
      'Tudo do Rede',
      'Implantação e migração assistidas',
      'Acordo de nível de serviço (SLA)',
      'Acesso via SSO corporativo',
    ],
  },
]

/** Add-ons exibidos abaixo dos planos, conforme o segmento. */
export const ADDONS_POR_SEGMENTO: Record<SegmentoPublico, Array<{ item: string; preco: string }>> = {
  PERSONAL: [{ item: 'Professor extra', preco: 'R$ 39/mês' }],
  ACADEMIA: [
    { item: 'Professor extra', preco: 'R$ 29/mês' },
    { item: 'Bloco de +100 alunos', preco: 'R$ 79/mês' },
    { item: 'Unidade extra', preco: 'R$ 199/mês' },
  ],
}

export function formatarBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}