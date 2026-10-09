import { t as tx } from '../i18n'
/** Padrões da logo da academia. Espelha LOGO_REGRAS da API; a API é quem decide de fato. */
export const LOGO_REGRAS = {
  tiposAceitos: ['image/png', 'image/jpeg', 'image/webp'],
  pesoMaxBytes: 2 * 1024 * 1024,
  ladoMinPx: 400,
  ladoMaxPx: 2000,
  proporcaoMax: 3,
}

/** Devolve a mensagem de erro, ou null se as dimensões atendem aos padrões. */
export function validarDimensoesLogo(largura: number, altura: number): string | null {
  const r = LOGO_REGRAS
  if (Math.min(largura, altura) < r.ladoMinPx) return tx('A logo deve ter no mínimo {ladoMinPx}×{ladoMinPx2} px.', { ladoMinPx: r.ladoMinPx, ladoMinPx2: r.ladoMinPx })
  if (Math.max(largura, altura) > r.ladoMaxPx) return tx('A logo deve ter no máximo {ladoMaxPx}×{ladoMaxPx2} px.', { ladoMaxPx: r.ladoMaxPx, ladoMaxPx2: r.ladoMaxPx })
  if (altura > largura || largura / altura > r.proporcaoMax) {
    return tx('Proporção inválida. Use logo quadrada ou horizontal (até 3:1).')
  }
  return null
}

function lerDimensoes(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

/** Validação no cliente antes de enviar: tipo, peso e dimensões. */
export async function validarArquivoLogo(file: File): Promise<string | null> {
  if (!LOGO_REGRAS.tiposAceitos.includes(file.type)) return tx('Formato não suportado. Envie PNG, JPG ou WebP.')
  if (file.size > LOGO_REGRAS.pesoMaxBytes) return tx('A logo deve ter no máximo 2 MB.')
  const dim = await lerDimensoes(file)
  if (!dim) return tx('Não foi possível ler a imagem.')
  return validarDimensoesLogo(dim.w, dim.h)
}
