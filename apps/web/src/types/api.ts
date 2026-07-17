export interface User {
  id: string
  nome: string
  email: string
  role: 'ROOT' | 'ACADEMIA' | 'PROFESSOR' | 'ALUNO'
  tenantId?: string | null
  expoPushToken?: string | null
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface Treino {
  id: string
  aluno_id: string
  nome: string
  dias_semana: number[]
  status: TreinoStatus
  is_template?: boolean
  iniciado_em?: string | null
  finalizado_em?: string | null
  criado_em: string
  atualizado_em: string
  exercicios?: TreinoExercicio[]
}

export type TreinoStatus =
  | 'CADASTRADO'
  | 'ENVIADO'
  | 'ACEITO'
  | 'RECUSADO'
  | 'EM_ABERTO'
  | 'EM_EXECUCAO'
  | 'CONCLUIDO'

export interface TreinoExercicio {
  id: string
  treino_id: string
  exercicio_id: string
  ordem: number
  series: number
  repeticoes: number
  carga_sugerida_kg?: number | null
  exercicio: Exercicio
}

export interface Exercicio {
  id: string
  nome: string
  maquina?: string | null
  dica?: string | null
  imagem_url?: string | null
  gif_url?: string | null
  descricao_pt?: string | null
  passos_pt?: string[]
  musculo_alvo?: string | null
  musculos_secundarios?: string[]
  nivel?: string | null
  grupo_muscular?: string | null
  equipamento?: string | null
}

export interface ExecucaoExercicio {
  id: string
  treino_id: string
  exercicio_id: string
  serie_numero: number
  repeticoes: number
  carga_kg: number
  registrado_em: string
}

export interface MedidaCorporal {
  id: string
  aluno_id: string
  peso_kg?: number | null
  altura_cm?: number | null
  percentual_bf?: number | null
  massa_magra_kg?: number | null
  imc?: number | null
  data: string
  observacao?: string | null
}

export interface Notificacao {
  id: string
  aluno_id: string
  tipo: 'PROFESSOR_ATRIBUIDO' | 'NOVO_TREINO'
  mensagem: string
  dados?: Record<string, unknown> | null
  lida: boolean
  criado_em: string
}

export interface CorrelacaoResponse {
  dados: {
    alunoId: string
    correlacoes: {
      pesoVsVolume: CorrelacaoMetrica
      bfVsVolume: CorrelacaoMetrica
      massaMagraVsVolume: CorrelacaoMetrica
    }
    volumeSemanal: VolumeSemanalItem[]
    pontos: PontoCorrelacao[]
    calculadoEm: string
  } | null
  sugerirAtualizacao: boolean
  mensagem: string | null
}

export interface CorrelacaoMetrica {
  r: number | null
  interpretacao: string
}

export interface VolumeSemanalItem {
  semana: string
  volumeTotalKg: number
  treinos: number
}

export interface PontoCorrelacao {
  data: string
  deltaPesoKg: number | null
  deltaBf: number | null
  deltaMassaMagraKg: number | null
  volumeAcumuladoKg: number
}

export interface Academia {
  id: string
  nome: string
  cnpj: string
  status: string
}

export interface AcademiaDashboard {
  nome: string
  cnpj: string
  email?: string | null
  telefone?: string | null
  status: string
  totalProfessores: number
  totalAlunos: number
  professoresPendentes: number
}

export interface Aluno {
  id: string
  usuario_id: string
  professor_id?: string | null
  academia_id?: string | null
  usuario?: { nome: string; email: string }
}

export interface PerfilAluno {
  id: string
  usuario_id: string
  professor_id?: string | null
  academia_id?: string | null
  data_nascimento?: string | null
  peso_kg?: number | null
  altura_cm?: number | null
  sexo?: 'MASCULINO' | 'FEMININO' | null
  criado_em: string
  professor?: { usuario: { nome: string; email: string; telefone?: string | null } } | null
  academia?: { nome: string; id?: string } | null
}

export interface ProfessorDashboard {
  id: string
  sexo?: 'MASCULINO' | 'FEMININO' | null
  usuario: { nome: string; email: string; telefone: string | null }
  academia?: { nome: string; id: string } | null
  treinos: Array<{
    id: string
    nome: string
    status: TreinoStatus
    dias_semana: number[]
    is_template?: boolean
    iniciado_em?: string | null
    finalizado_em?: string | null
    atualizado_em: string
  }>
}

export interface AlunoAcademia {
  id: string
  usuario: { nome: string; email: string; telefone: string | null }
  professor?: { id: string; usuario: { nome: string } } | null
  treinos: Array<{
    id: string
    nome: string
    status: TreinoStatus
    dias_semana: number[]
    atualizado_em: string
  }>
}

export interface RootPainel {
  totalAcademias: number
  academiasPendentes: number
  totalProfessores: number
  totalAlunos: number
  academias: Array<{
    id: string
    nome: string
    cnpj: string
    status: string
    max_professores: number
    criado_em: string
    _count: { professores: number; alunos: number }
  }>
}

export interface Vinculo {
  id: string
  professor_id: string
  academia_id: string
  status: string
  criado_em: string
  academia: { id: string; nome: string; cnpj: string }
}

export interface VinculoPendente {
  id: string
  professor_id: string
  academia_id: string
  status: string
  professor: { usuario: { nome: string; email: string } }
  academia: { id: string; nome: string }
}

export interface DiaTreino {
  id: string
  nome: string
  grupos: string[]
}

export interface HistoricoDia {
  data: string
  treinos: DiaTreino[]
}

// ─── Social ──────────────────────────────────────────

export type PostTipo = 'TREINO_INICIADO' | 'TREINO_CONCLUIDO' | 'RECORDE_PESSOAL' | 'BADGE_CONQUISTADO' | 'DESAFIO_COMPLETO'
export type Visibilidade = 'AMIGOS' | 'PUBLICO' | 'PRIVADO'
export type FriendshipStatus = 'PENDENTE' | 'ACEITO' | 'BLOQUEADO'

export interface SocialPost {
  id: string
  alunoId: string
  treinoId?: string | null
  clubeId?: string | null
  autorNome: string
  autorFotoUrl?: string | null
  grupoMuscularResumo?: string | null
  tipo: PostTipo
  visibilidade: Visibilidade
  midiaUrl?: string | null
  curtidasCount: number
  comentariosCount: number
  criadoEm: string
  curtiu?: boolean
}

export interface SocialComment {
  id: string
  postId: string
  alunoId: string
  autorNome: string
  texto: string
  criadoEm: string
}

export interface MuralResponse {
  items: SocialPost[]
  nextCursor: string | null
}

export interface Amizade {
  id: string
  nome: string
  fotoUrl?: string | null
}

export interface AmizadePendente {
  id: string
  nome: string
  status: FriendshipStatus
  solicitante?: boolean
}

export interface PrivacidadeSettings {
  visibilidadePadrao: Visibilidade
  permiteBuscaEmail: boolean
  consentiuFeedSocialEm?: string | null
}

export interface Clube {
  id: string
  nome: string
  tipo: 'ACADEMIA' | 'TEMATICO'
  totalMembros: number
}

export interface LeaderboardEntry {
  alunoId: string
  nome: string
  fotoUrl?: string | null
  xpSemana: number
}
