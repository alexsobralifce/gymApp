import type { Exercicio } from '../types/api'

export const GRUPOS_MUSCULARES = [
  { value: 'Peito', label: 'Peito' },
  { value: 'Costas', label: 'Costas' },
  { value: 'Ombros', label: 'Ombros' },
  { value: 'Bracos', label: 'Braços' },
  { value: 'Coxas', label: 'Coxas' },
  { value: 'Panturrilhas / Tibiais', label: 'Panturrilhas' },
  { value: 'Abdomen / Lombar', label: 'Abdômen / Lombar' },
  { value: 'Antebraccos', label: 'Antebraços' },
  { value: 'Cardio', label: 'Cardio' },
  { value: 'Pescoco', label: 'Pescoço' },
] as const

export const EQUIPAMENTOS = [
  { value: 'Barra', label: 'Barra' },
  { value: 'Halteres', label: 'Halteres' },
  { value: 'Polia', label: 'Cabo/Polia' },
  { value: 'Máquina', label: 'Máquina' },
  { value: 'Peso Corporal', label: 'Peso Corporal' },
  { value: 'Kettlebell', label: 'Kettlebell' },
  { value: 'Elásticos', label: 'Elásticos' },
] as const

/** Aliases: valor do filtro → substrings aceitas no banco */
const EQUIP_ALIASES: Record<string, string[]> = {
  Barra: ['barra'],
  Halteres: ['halter'],
  Polia: ['polia', 'cabo'],
  Máquina: ['máquina', 'maquina', 'alavanca', 'smith'],
  'Peso Corporal': ['peso corporal', 'bodyweight', 'assistido'],
  Kettlebell: ['kettlebell'],
  Elásticos: ['elástic', 'elastic', 'faixa'],
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function matchEquipamento(equipamento: string | null | undefined, filtro: string): boolean {
  if (!filtro) return true
  if (!equipamento) return false

  const eq = normalize(equipamento)
  const aliases = EQUIP_ALIASES[filtro] ?? [normalize(filtro)]

  return aliases.some((alias) => eq.includes(normalize(alias)))
}

function matchGrupo(grupo: string | null | undefined, filtro: string): boolean {
  if (!filtro) return true
  if (!grupo) return false
  return normalize(grupo).includes(normalize(filtro))
}

function matchBusca(nome: string, busca: string): boolean {
  if (!busca.trim()) return true
  return normalize(nome).includes(normalize(busca))
}

export function filtrarExercicios(
  lista: Exercicio[],
  opts: { grupo?: string; equipamento?: string; busca?: string },
): Exercicio[] {
  const grupo = opts.grupo || ''
  const equipamento = opts.equipamento || ''
  const busca = opts.busca || ''

  if (!grupo && !equipamento && !busca.trim()) return lista

  return lista.filter(
    (ex) =>
      matchGrupo(ex.grupo_muscular, grupo) &&
      matchEquipamento(ex.equipamento, equipamento) &&
      matchBusca(ex.nome, busca),
  )
}
