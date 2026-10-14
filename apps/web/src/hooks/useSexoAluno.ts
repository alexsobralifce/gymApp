import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../stores/auth'
import type { SexoAluno } from '../lib/midiaPorSexo'

// Uma busca por sessão: o sexo do aluno só muda no perfil
let cache: { usuarioId: string; sexo: SexoAluno | null } | null = null
let pendente: Promise<SexoAluno | null> | null = null

/** Sexo do aluno logado (para escolher a imagem do exercício). Outros perfis: null. */
export function carregarSexoAluno(): Promise<SexoAluno | null> {
  const user = useAuthStore.getState().user
  if (!user || user.role !== 'ALUNO') return Promise.resolve(null)
  if (cache?.usuarioId === user.id) return Promise.resolve(cache.sexo)
  pendente ??= api
    .getPerfilAluno()
    .then((p) => p.sexo ?? null)
    .catch(() => null)
    .then((sexo) => {
      cache = { usuarioId: user.id, sexo }
      pendente = null
      return sexo
    })
  return pendente
}

export function useSexoAluno(): SexoAluno | null {
  const user = useAuthStore((s) => s.user)
  const [, forcar] = useState(0)

  useEffect(() => {
    if (user?.role === 'ALUNO' && cache?.usuarioId !== user.id) void carregarSexoAluno().then(() => forcar((n) => n + 1))
  }, [user?.id, user?.role])

  return user?.role === 'ALUNO' && cache?.usuarioId === user.id ? cache.sexo : null
}
