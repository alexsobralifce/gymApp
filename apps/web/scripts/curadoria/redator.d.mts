export const MODELO: string
export function trechosCopiados(original: string, gerado: string, n?: number): string[]
export function textoDoArtigo(a: any): string
export function validar(gerado: any, candidato: any): string[]
export function redigir(candidato: any, opcoes?: { cliente?: any; modelo?: string }): Promise<{ ok: true; gerado: any } | { ok: false; motivo: string }>
export function slugificar(titulo: string): string
export function montarArtigo(candidato: any, gerado: any, hoje?: string): any
