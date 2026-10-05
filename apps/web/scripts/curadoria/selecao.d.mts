import type { ItemRss } from './rss.mjs'
export interface Fonte { id: string; nome: string; pais: string; idioma?: string; peso: number }
export interface Candidato { fonte: Fonte; item: ItemRss; pontos: number }
export function pontuar(item: Pick<ItemRss, 'titulo' | 'trecho' | 'categorias'>, config: unknown, peso?: number): number
export function ehRecente(item: { data: Date | null }, janelaDias: number, agora?: Date): boolean
export function canonicalizarLink(url: string): string
export function rankear(itensPorFonte: Array<{ fonte: Fonte; itens: ItemRss[] }>, config: unknown, historico: string[], agora?: Date): Candidato[]
export function escolher(candidatos: any[], quantidade?: number): any[]
