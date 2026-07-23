import { useState, useEffect, useCallback } from 'react'

interface Step2ProfileProps {
  dataNascimento: string
  setDataNascimento: (v: string) => void
  peso: string
  setPeso: (v: string) => void
  altura: string
  setAltura: (v: string) => void
  sexo: string
  setSexo: (v: string) => void
  consentiuSocial: boolean
  setConsentiuSocial: (v: boolean) => void
}

interface FieldError {
  peso?: string
  altura?: string
}

function validatePeso(v: string): string | undefined {
  if (!v) return 'Peso é obrigatório'
  const n = Number(v)
  if (isNaN(n) || n < 20) return 'Peso mínimo: 20 kg'
  if (n > 500) return 'Peso máximo: 500 kg'
  return undefined
}

function validateAltura(v: string): string | undefined {
  if (!v) return 'Altura é obrigatória'
  const n = Number(v)
  if (isNaN(n) || n < 50) return 'Altura mínima: 50 cm'
  if (n > 250) return 'Altura máxima: 250 cm'
  return undefined
}

export default function Step2Profile({
  dataNascimento, setDataNascimento,
  peso, setPeso, altura, setAltura,
  sexo, setSexo, consentiuSocial, setConsentiuSocial,
}: Step2ProfileProps) {
  const [errors, setErrors] = useState<FieldError>({})
  const [touched, setTouched] = useState<{ peso: boolean; altura: boolean }>({ peso: false, altura: false })

  const debouncedValidate = useCallback(() => {
    setErrors({
      peso: touched.peso ? validatePeso(peso) : undefined,
      altura: touched.altura ? validateAltura(altura) : undefined,
    })
  }, [peso, altura, touched])

  useEffect(() => {
    const timer = setTimeout(debouncedValidate, 400)
    return () => clearTimeout(timer)
  }, [debouncedValidate])

  const hasErrors = !!errors.peso || !!errors.altura
  const pesoValid = touched.peso && !errors.peso && peso !== ''
  const alturaValid = touched.altura && !errors.altura && altura !== ''

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-text-muted mb-1">Data de nascimento</label>
        <input
          type="date" value={dataNascimento}
          onChange={(e) => setDataNascimento(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-text-muted mb-1">Peso (kg)</label>
          <input
            type="number" step="0.1" min="20" max="500" placeholder="70.5"
            value={peso}
            onChange={(e) => { setPeso(e.target.value); setTouched((t) => ({ ...t, peso: true })) }}
            onBlur={() => setTouched((t) => ({ ...t, peso: true }))}
            className={`w-full rounded border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none transition-colors ${
              pesoValid ? 'border-success' : errors.peso ? 'border-red-400' : 'border-surface-input focus:border-primary'
            }`}
            required
          />
          {errors.peso && (
            <p className="text-xs text-destructive mt-1 animate-[fade-in_0.2s_ease]">{errors.peso}</p>
          )}
        </div>
        <div className="flex-1">
          <label className="block text-xs text-text-muted mb-1">Altura (cm)</label>
          <input
            type="number" step="1" min="50" max="250" placeholder="175"
            value={altura}
            onChange={(e) => { setAltura(e.target.value); setTouched((t) => ({ ...t, altura: true })) }}
            onBlur={() => setTouched((t) => ({ ...t, altura: true }))}
            className={`w-full rounded border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none transition-colors ${
              alturaValid ? 'border-success' : errors.altura ? 'border-red-400' : 'border-surface-input focus:border-primary'
            }`}
            required
          />
          {errors.altura && (
            <p className="text-xs text-destructive mt-1 animate-[fade-in_0.2s_ease]">{errors.altura}</p>
          )}
        </div>
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">Sexo</label>
        <select
          value={sexo} onChange={(e) => setSexo(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          required
        >
          <option value="">Selecionar...</option>
          <option value="MASCULINO">Masculino</option>
          <option value="FEMININO">Feminino</option>
        </select>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={consentiuSocial}
          onChange={(e) => setConsentiuSocial(e.target.checked)}
          className="rounded border-surface-input"
        />
        <span className="text-xs text-text-muted">Desejo que meus amigos vejam quando eu treino</span>
      </label>
      {hasErrors && (
        <p className="text-xs text-destructive text-center">Corrija os campos acima para continuar</p>
      )}
    </div>
  )
}
