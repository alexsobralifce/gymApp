export interface ItemRss { titulo: string; link: string; data: Date | null; categorias: string[]; trecho: string }
export function decodificar(texto: string): string
export function semHtml(html: string): string
export function lerRss(xml: string): ItemRss[]
