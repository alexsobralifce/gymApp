import { GERAL } from './geral'
import { APP } from './app'
import { APP2 } from './app2'
import { API } from './api'
import { PUBLICAS_EN } from './publicas'

/** Tradução por texto em português. Um arquivo por área, juntados aqui. */
export const EN: Record<string, string> = {
  ...APP,
  ...APP2,
  ...API,
  ...PUBLICAS_EN,
  ...GERAL,
}
