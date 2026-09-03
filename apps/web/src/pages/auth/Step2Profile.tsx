import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
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
  forceTouched?: boolean
}

interface FieldError {
  peso?: string
  altura?: string
  sexo?: string
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

function validateSexo(v: string): string | undefined {
  if (!v) return 'Selecione o sexo'
  return undefined
}

export default function Step2Profile({
  dataNascimento, setDataNascimento,
  peso, setPeso, altura, setAltura,
  sexo, setSexo, consentiuSocial, setConsentiuSocial,
  forceTouched,
}: Step2ProfileProps) {
  const [errors, setErrors] = useState<FieldError>({})
  const [touched, setTouched] = useState<{ peso: boolean; altura: boolean; sexo: boolean }>({
    peso: false,
    altura: false,
    sexo: false,
  })

  const isPesoTouched = forceTouched || touched.peso
  const isAlturaTouched = forceTouched || touched.altura
  const isSexoTouched = forceTouched || touched.sexo

  const debouncedValidate = useCallback(() => {
    setErrors({
      peso: isPesoTouched ? validatePeso(peso) : undefined,
      altura: isAlturaTouched ? validateAltura(altura) : undefined,
      sexo: isSexoTouched ? validateSexo(sexo) : undefined,
    })
  }, [peso, altura, sexo, isPesoTouched, isAlturaTouched, isSexoTouched])

  useEffect(() => {
    const timer = setTimeout(debouncedValidate, 200)
    return () => clearTimeout(timer)
  }, [debouncedValidate])

  const pesoValid = isPesoTouched && !errors.peso && peso !== ''
  const alturaValid = isAlturaTouched && !errors.altura && altura !== ''

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField label="Data de nascimento" htmlFor="dataNascimento">
        <Input
          id="dataNascimento"
          type="date"
          value={dataNascimento}
          onChange={(e) => setDataNascimento(e.target.value)}
        />
      </FormField>

      <FormField label="Peso (kg)" htmlFor="peso" error={errors.peso} required>
        <Input
          id="peso"
          type="number"
          step="0.1"
          min="20"
          max="500"
          placeholder="70.5"
          value={peso}
          onChange={(e) => {
            setPeso(e.target.value)
            setTouched((t) => ({ ...t, peso: true }))
          }}
          onBlur={() => setTouched((t) => ({ ...t, peso: true }))}
          className={pesoValid ? 'border-success' : undefined}
          error={errors.peso}
          required
        />
      </FormField>

      <FormField label="Altura (cm)" htmlFor="altura" error={errors.altura} required>
        <Input
          id="altura"
          type="number"
          step="1"
          min="50"
          max="250"
          placeholder="175"
          value={altura}
          onChange={(e) => {
            setAltura(e.target.value)
            setTouched((t) => ({ ...t, altura: true }))
          }}
          onBlur={() => setTouched((t) => ({ ...t, altura: true }))}
          className={alturaValid ? 'border-success' : undefined}
          error={errors.altura}
          required
        />
      </FormField>

      <FormField label="Sexo" htmlFor="sexo" error={errors.sexo} required>
        <Select
          id="sexo"
          value={sexo}
          onChange={(e) => {
            setSexo(e.target.value)
            setTouched((t) => ({ ...t, sexo: true }))
          }}
          onBlur={() => setTouched((t) => ({ ...t, sexo: true }))}
          error={errors.sexo}
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
        <p className="mt-2 text-xs text-text-muted">
          Ao continuar, você concorda com a{' '}
          <Link to="/politica-privacidade" className="text-primary underline">
            Política de Privacidade
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
