import { create } from 'zustand'

type Dicionario = Record<string, string>

let EN: Dicionario = {}
let carregando: Promise<void> | null = null

/** Sobe a cada carga; quem traduz assina para renderizar de novo quando o dicionário chega. */
export const useDicionarioStore = create<{ versao: number }>(() => ({ versao: 0 }))

export function dicionarioEn(): Dicionario {
  return EN
}

/** O dicionário em inglês é grande: só baixa quando alguém precisa dele. */
export function carregarEn(): Promise<void> {
  carregando ??= import('./en/index').then((m) => {
    EN = m.EN
    useDicionarioStore.setState((s) => ({ versao: s.versao + 1 }))
  })
  return carregando
}
