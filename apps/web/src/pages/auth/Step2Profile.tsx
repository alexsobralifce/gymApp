import { useState, useEffect, useCallback } from 'react'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import FormField from '../../components/ui/FormField'

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField label="Data de nascimento" htmlFor="dataNascimento">
        <Input
          id="dataNascimento" type="date" value={dataNascimento}
          onChange={(e) => setDataNascimento(e.target.value)}
        />
      </FormField>
      <FormField label="Peso (kg)" htmlFor="peso" error={errors.peso}>
        <Input
          id="peso" type="number" step="0.1" min="20" max="500" placeholder="70.5"
          value={peso}
          onChange={(e) => { setPeso(e.target.value); setTouched((t) => ({ ...t, peso: true })) }}
          onBlur={() => setTouched((t) => ({ ...t, peso: true }))}
          className={pesoValid ? 'border-success' : undefined}
          error={errors.peso}
          required
        />
      </FormField>
      <FormField label="Altura (cm)" htmlFor="altura" error={errors.altura}>
        <Input
          id="altura" type="number" step="1" min="50" max="250" placeholder="175"
          value={altura}
          onChange={(e) => { setAltura(e.target.value); setTouched((t) => ({ ...t, altura: true })) }}
          onBlur={() => setTouched((t) => ({ ...t, altura: true }))}
          className={alturaValid ? 'border-success' : undefined}
          error={errors.altura}
          required
        />
      </FormField>
      <FormField label="Sexo" htmlFor="sexo">
        <Select
          id="sexo" value={sexo} onChange={(e) => setSexo(e.target.value)}
          required
        >
          <option value="">Selecionar...</option>
          <option value="MASCULINO">Masculino</option>
          <option value="FEMININO">Feminino</option>
        </Select>
      </FormField>
      <div className="md:col-span-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={consentiuSocial}
            onChange={(e) => setConsentiuSocial(e.target.checked)}
            className="rounded border-surface-input"
          />
          <span className="text-xs text-text-muted">Desejo que meus amigos vejam quando eu treino</span>
        </label>
      </div>
      {hasErrors && (
        <p className="text-xs text-destructive text-center md:col-span-2">Corrija os campos acima para continuar</p>
      )}
    </div>
  )
}
