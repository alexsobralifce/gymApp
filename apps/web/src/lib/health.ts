export function calcularIMC(pesoKg: number | null | undefined, alturaCm: number | null | undefined): number | null {
  if (!pesoKg || !alturaCm || alturaCm <= 0) return null
  return parseFloat((pesoKg / ((alturaCm / 100) ** 2)).toFixed(1))
}

export function classificarIMC(imc: number): { label: string; cor: string } {
  if (imc < 18.5) return { label: 'Abaixo do peso', cor: 'text-primary' }
  if (imc < 25) return { label: 'Peso normal', cor: 'text-success' }
  if (imc < 30) return { label: 'Sobrepeso', cor: 'text-accent' }
  if (imc < 35) return { label: 'Obesidade I', cor: 'text-accent' }
  if (imc < 40) return { label: 'Obesidade II', cor: 'text-destructive' }
  return { label: 'Obesidade III', cor: 'text-destructive' }
}

export function calcularIdade(dataNascimento: string | null | undefined): number | null {
  if (!dataNascimento) return null
  const today = new Date()
  const birth = new Date(dataNascimento)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}
