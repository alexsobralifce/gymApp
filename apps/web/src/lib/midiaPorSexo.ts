export type SexoAluno = 'MASCULINO' | 'FEMININO'

export interface MidiaVariante {
  gif_url: string
  foco_x?: number | null
  foco_y?: number | null
  foco_larg?: number | null
  foco_alt?: number | null
}

export interface ExercicioComVariantes {
  gif_url?: string | null
  imagem_url?: string | null
  foco_x?: number | null
  foco_y?: number | null
  foco_larg?: number | null
  foco_alt?: number | null
  sexo_figura?: SexoAluno | null
  variantes?: Partial<Record<SexoAluno, MidiaVariante>> | null
}

/**
 * Escolhe a imagem do exercício para quem está treinando: se existe versão para o
 * sexo do aluno, usa ela (GIF e enquadramento próprios); senão mantém o GIF principal.
 * Sem sexo informado, mantém o principal.
 */
export function midiaPorSexo<T extends ExercicioComVariantes>(ex: T, sexo: SexoAluno | null | undefined): T {
  const v = sexo ? ex.variantes?.[sexo] : undefined
  if (!v?.gif_url) return ex
  return {
    ...ex,
    gif_url: v.gif_url,
    foco_x: v.foco_x ?? null,
    foco_y: v.foco_y ?? null,
    foco_larg: v.foco_larg ?? null,
    foco_alt: v.foco_alt ?? null,
  }
}

/** Há figura do sexo pedido (no GIF principal ou numa versão)? */
export function temFiguraDoSexo(ex: ExercicioComVariantes, sexo: SexoAluno): boolean {
  return ex.sexo_figura === sexo || Boolean(ex.variantes?.[sexo]?.gif_url)
}
