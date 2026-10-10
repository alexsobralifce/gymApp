import { useState } from 'react'

interface CampoInteiroProps {
  value: number
  onChange: (valor: number) => void
  min?: number
  max?: number
  className?: string
}

/**
 * Campo numérico que aceita ficar vazio enquanto a pessoa digita (no celular, apagar o valor
 * para digitar outro é o fluxo normal). Ao sair do campo vazio, volta ao mínimo.
 */
export default function CampoInteiro({ value, onChange, min = 1, max = 999, className }: CampoInteiroProps) {
  const [rascunho, setRascunho] = useState<string | null>(null)

  return (
    <input
      type="tel"
      inputMode="numeric"
      value={rascunho ?? String(value)}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const digitos = e.target.value.replace(/\D/g, '').slice(0, String(max).length)
        setRascunho(digitos)
        if (digitos !== '') onChange(Math.min(max, Math.max(min, Number(digitos))))
      }}
      onBlur={() => {
        if (rascunho === '') onChange(min)
        setRascunho(null)
      }}
      className={className}
    />
  )
}
