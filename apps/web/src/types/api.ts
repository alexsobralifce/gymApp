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
  data: string
  observacao?: string | null
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
  criado_em: string
  professor?: { usuario: { nome: string } } | null
  academia?: { nome: string } | null
}

export interface ProfessorDashboard {
  id: string
  usuario: { nome: string; email: string }
  academia?: { nome: string } | null
  treinos: Array<{
    id: string
    nome: string
    status: TreinoStatus
    iniciado_em?: string | null
    finalizado_em?: string | null
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
