import type { AuthTokens, User, Treino, ExecucaoExercicio, MedidaCorporal, CorrelacaoResponse, Academia, Exercicio, ProfessorDashboard, RootPainel, VinculoPendente, Vinculo } from '../types/api'

const API_BASE = import.meta.env.VITE_API_URL || ''

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('accessToken')

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    const refreshed = await refreshTokens()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`
      const retry = await fetch(`${API_BASE}${path}`, { ...options, headers })
      if (!retry.ok) {
        const error = await retry.json().catch(() => ({ message: retry.statusText }))
        throw new ApiError(retry.status, error.message || 'Erro na requisição')
      }
      return retry.json()
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    window.location.href = '/login'
    throw new ApiError(401, 'Sessão expirada')
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(res.status, error.message || 'Erro na requisição')
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

async function refreshTokens(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return false

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) return false

    const tokens: AuthTokens = await res.json()
    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)
    return true
  } catch {
    return false
  }
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  // ─── Auth ──────────────────────────────────────────
  login: (email: string, senha: string) =>
    api.post<AuthTokens>('/auth/login', { email, senha }),

  register: (nome: string, email: string, senha: string, role: string) =>
    api.post<User>('/auth/register', { nome, email, senha, role }),

  getMe: () => api.get<User>('/auth/me'),

  updateMe: (data: { expoPushToken?: string | null; webPushSubscription?: PushSubscriptionJSON | null }) =>
    api.patch<{ id: string }>('/auth/me', data),

  alterarSenha: (senhaAtual: string, novaSenha: string) =>
    api.post('/auth/change-password', { senhaAtual, novaSenha }),

  // ─── Aluno ─────────────────────────────────────────
  criarPerfilAluno: () => api.post('/alunos/perfil'),

  vincularAcademiaAluno: (academiaId: string) => api.patch('/alunos/academia', { academiaId }),

  getPerfilAluno: () => api.get<import('../types/api').PerfilAluno>('/alunos/perfil'),

  // ─── Treinos ───────────────────────────────────────
  getAlunoTreinos: () => api.get<Treino[]>('/alunos/treinos'),

  getTreino: (id: string) =>
    api.get<Treino & { execucoes: ExecucaoExercicio[] }>(`/treinos/${id}`),

  iniciarTreino: (id: string) =>
    api.post<Treino>(`/treinos/${id}/iniciar`),

  registrarExecucao: (treinoId: string, data: { exercicioId: string; serieNumero: number; repeticoes: number; cargaKg: number }) =>
    api.post<ExecucaoExercicio>(`/treinos/${treinoId}/execucoes`, data),

  finalizarTreino: (id: string) =>
    api.post<Treino>(`/treinos/${id}/finalizar`),

  criarTreinoAutogestao: (data: { nome: string; diasSemana: number[]; exercicios: Array<{ exercicioId: string; ordem: number; series: number; repeticoes: number; cargaSugeridaKg?: number }> }) =>
    api.post<Treino>('/treinos/autogestao', data),

  // ─── Medidas ───────────────────────────────────────
  getMedidas: () => api.get<MedidaCorporal[]>('/alunos/medidas'),

  criarMedida: (data: { pesoKg?: number; alturaCm?: number; percentualBf?: number; massaMagraKg?: number; observacao?: string }) =>
    api.post<MedidaCorporal>('/alunos/medidas', data),

  // ─── Correlações ───────────────────────────────────
  getCorrelacoes: () => api.get<CorrelacaoResponse>('/alunos/correlacoes'),

  calcularCorrelacoes: () => api.post<CorrelacaoResponse>('/alunos/correlacoes'),

  // ─── Academias ─────────────────────────────────────
  getAcademias: () => api.get<Academia[]>('/academias'),

  // ─── Professor ─────────────────────────────────────
  criarPerfilProfessor: (cref?: string) => api.post('/professores/perfil', { cref }),

  getDashboard: () => api.get<ProfessorDashboard[]>('/professores/dashboard'),

  vincularAcademia: (academiaId: string) =>
    api.post<{ jaVinculado?: boolean; status?: string }>(`/professores/vincular/${academiaId}`),

  getVinculos: () => api.get<Vinculo[]>('/professores/vinculos'),

  desvincularAcademia: (academiaId: string) =>
    api.delete(`/professores/vinculos/${academiaId}`),

  vincularAluno: (usuarioId: string, academiaId?: string) =>
    api.post('/professores/alunos', { usuarioId, academiaId }),

  getAlunoCorrelacoes: (alunoId: string) =>
    api.get<CorrelacaoResponse>(`/professores/alunos/${alunoId}/correlacoes`),

  // ─── Exercícios ────────────────────────────────────
  getExercicios: (params?: { grupo_muscular?: string; equipamento?: string; nivel?: string; busca?: string }) => {
    const query = new URLSearchParams()
    if (params?.grupo_muscular) query.set('grupo_muscular', params.grupo_muscular)
    if (params?.equipamento) query.set('equipamento', params.equipamento)
    if (params?.nivel) query.set('nivel', params.nivel)
    if (params?.busca) query.set('busca', params.busca)
    const qs = query.toString()
    return api.get<Exercicio[]>(`/professores/exercicios${qs ? `?${qs}` : ''}`)
  },

  criarExercicio: (data: { nome: string; maquina?: string; dica?: string; imagemUrl?: string }) =>
    api.post<Exercicio>('/treinos/exercicios', data),

  // ─── Treinos (professor) ───────────────────────────
  criarTreino: (data: {
    alunoId: string
    nome: string
    diasSemana: number[]
    exercicios: Array<{ exercicioId: string; ordem: number; series: number; repeticoes: number; cargaSugeridaKg?: number }>
  }) => api.post<Treino>('/treinos', data),

  criarFichas: (data: {
    alunoId: string
    fichas: Array<{
      nome: string
      diasSemana: number[]
      exercicios: Array<{ exercicioId: string; ordem: number; series: number; repeticoes: number; cargaSugeridaKg?: number }>
    }>
  }) => api.post<Treino[]>('/professores/fichas', data),

  criarFichasAcademia: (data: {
    alunoId: string
    fichas: Array<{
      nome: string
      diasSemana: number[]
      exercicios: Array<{ exercicioId: string; ordem: number; series: number; repeticoes: number; cargaSugeridaKg?: number }>
    }>
  }) => api.post<Treino[]>('/academias/fichas', data),

  getFichas: () => api.get<any[]>('/professores/fichas'),

  enviarTreino: (id: string) => api.post<Treino>(`/treinos/${id}/enviar`),

  responderTreino: (id: string, acao: 'ACEITAR' | 'RECUSAR') =>
    api.patch<Treino>(`/treinos/${id}/responder`, { acao }),

  // ─── Root ──────────────────────────────────────────
  getPainel: () => api.get<RootPainel>('/root/painel'),

  aprovarAcademia: (id: string, acao: 'APROVAR' | 'REJEITAR', motivo?: string) =>
    api.patch(`/root/academias/${id}/aprovacao`, { acao, motivo }),

  definirLimiteProfessores: (id: string, limite: number) =>
    api.patch(`/root/academias/${id}/limite-professores`, { limite }),

  getVinculosPendentes: () => api.get<VinculoPendente[]>('/root/vinculos'),

  aprovarVinculo: (id: string, acao: 'APROVAR' | 'REJEITAR') =>
    api.patch(`/root/vinculos/${id}/aprovacao`, { acao }),

  alterarStatusAcademia: (id: string, status: 'ATIVO' | 'REJEITADO') =>
    api.patch(`/root/academias/${id}/status`, { status }),

  getUsuarios: () => api.get<any[]>('/root/usuarios'),

  resetPassword: (id: string, senha: string) =>
    api.post(`/root/usuarios/${id}/reset-password`, { senha }),

  getRootAcademias: () => api.get<any[]>('/root/academias'),
  updateRootAcademia: (id: string, data: any) => api.put(`/root/academias/${id}`, data),
  deleteRootAcademia: (id: string) => api.delete(`/root/academias/${id}`),

  getRootProfessores: () => api.get<any[]>('/root/professores'),
  updateRootProfessor: (id: string, data: any) => api.put(`/root/professores/${id}`, data),
  deleteRootProfessor: (id: string) => api.delete(`/root/professores/${id}`),

  getRootAlunos: () => api.get<any[]>('/root/alunos'),
  updateRootAluno: (id: string, data: any) => api.put(`/root/alunos/${id}`, data),
  deleteRootAluno: (id: string) => api.delete(`/root/alunos/${id}`),

  // ─── Academia ──────────────────────────────────────
  cadastrarAcademia: (data: { nome: string; cnpj: string }) =>
    api.post<Academia>('/academias', data),

  autorizarProfessor: (professorId: string) =>
    api.post(`/academias/professores/${professorId}/autorizar`),

  removerProfessor: (professorId: string) =>
    api.delete(`/academias/professores/${professorId}`),

  getAlunosAcademia: () => api.get('/academias/alunos'),

  getProfessoresAcademia: () => api.get<any[]>('/academias/professores'),

  vincularProfessorAluno: (alunoId: string, professorId: string | null) =>
    api.patch(`/academias/alunos/${alunoId}/professor`, { professorId }),

  // ─── WorkoutX ──────────────────────────────────────
  getWorkoutXExercicios: (bodyPart?: string) =>
    api.get<any[]>(bodyPart ? `/professores/workoutx/exercicios?bodyPart=${bodyPart}` : '/professores/workoutx/exercicios'),
}
