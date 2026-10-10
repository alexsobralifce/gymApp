import { useState } from 'react'

interface CampoInteiroProps {
  value: number | undefined
  onChange: (valor: number | undefined) => void
  min?: number
  max?: number
  /** Campo opcional: vazio vale `undefined` em vez de voltar ao mínimo. */
  opcional?: boolean
  /** Aceita casas decimais (vírgula ou ponto), ex.: carga de 2,5 kg. */
  decimal?: boolean
  placeholder?: string
  className?: string
}

/**
 * Campo numérico que aceita ficar vazio enquanto a pessoa digita (no celular, apagar o valor
 * para digitar outro é o fluxo normal). Ao sair do campo vazio, volta ao mínimo
 * (ou fica sem valor, se for opcional).
 */
export default function CampoInteiro({
  value, onChange, min = 1, max = 999, opcional = false, decimal = false, placeholder, className,
}: CampoInteiroProps) {
  const [rascunho, setRascunho] = useState<string | null>(null)
  const permitido = decimal ? /[^\d.,]/g : /\D/g

  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      placeholder={placeholder}
      value={rascunho ?? (value === undefined ? '' : String(value).replace('.', decimal ? ',' : '.'))}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const texto = e.target.value.replace(permitido, '').slice(0, decimal ? 7 : String(max).length)
        setRascunho(texto)
        const numero = Number(texto.replace(',', '.'))
        if (texto === '') {
          if (opcional) onChange(undefined)
        } else if (!Number.isNaN(numero)) {
          onChange(Math.min(max, Math.max(min, numero)))
        }
      }}
      onBlur={() => {
        if (rascunho === '' && !opcional) onChange(min)
        setRascunho(null)
      }}
      className={className}
    />
  )
}
