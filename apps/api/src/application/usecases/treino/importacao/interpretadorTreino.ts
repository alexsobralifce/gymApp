// Pede à OpenAI que transforme o texto livre de uma ficha de treino em uma lista estruturada, dia a dia.
import { z } from 'zod'
import { ValidationError } from '../../../../domain/errors/AppError.js'
import type { ClienteIA, SchemaIA } from '../../../../infrastructure/ia/openai.js'

export const TreinoInterpretado = z.object({
  treinos: z.array(
    z.object({
      rotulo: z.string(),
      diasSemana: z.array(z.number().int().min(0).max(6)),
      exercicios: z.array(
        z.object({
          textoOriginal: z.string(),
          nomeProvavel: z.string(),
          series: z.number().int().min(1).max(20),
          repeticoes: z.number().int().min(1).max(200),
          cargaKg: z.number().min(0).max(1000).nullable(),
          observacao: z.string().nullable(),
        }),
      ),
    }),
  ),
})
export type TreinoInterpretadoT = z.infer<typeof TreinoInterpretado>

/** JSON Schema (modo estrito da OpenAI): todos os campos obrigatórios e sem propriedades extras. */
const SCHEMA_JSON = {
  type: 'object',
  additionalProperties: false,
  required: ['treinos'],
  properties: {
    treinos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['rotulo', 'diasSemana', 'exercicios'],
        properties: {
          rotulo: { type: 'string' },
          diasSemana: { type: 'array', items: { type: 'integer' } },
          exercicios: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['textoOriginal', 'nomeProvavel', 'series', 'repeticoes', 'cargaKg', 'observacao'],
              properties: {
                textoOriginal: { type: 'string' },
                nomeProvavel: { type: 'string' },
                series: { type: 'integer' },
                repeticoes: { type: 'integer' },
                cargaKg: { type: ['number', 'null'] },
                observacao: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
  },
} as const

export const SCHEMA_IMPORTACAO: SchemaIA = { nome: 'ficha_treino', json: SCHEMA_JSON }

export const SISTEMA = `Você organiza fichas de treino de academia escritas em texto livre, em português do Brasil.

Receba o texto e devolva os treinos separados dia a dia, na mesma ordem do texto.

Regras:
- Cada bloco do texto (Treino A, Segunda, Dia 1, Peito e Tríceps...) vira um item de "treinos". "rotulo" é o título do bloco como está escrito; se não houver título, use "Treino A", "Treino B" e assim por diante.
- "diasSemana": números de 0 (domingo) a 6 (sábado), só quando o texto citar dias da semana para aquele bloco. Caso contrário, devolva uma lista vazia. Nunca invente dias.
- "exercicios": um item por exercício, SEMPRE na mesma ordem em que aparecem. Não pule, não junte e não invente exercícios.
- "textoOriginal": a linha do exercício como foi escrita.
- "nomeProvavel": o nome do exercício limpo, sem séries, repetições, cargas ou observações (ex.: "Supino reto c/ barra 4x10" vira "Supino reto com barra"). Desfaça abreviações óbvias.
- "series" e "repeticoes": números inteiros. Em "4x10", series = 4 e repeticoes = 10. Em faixas como "10-12", use o maior valor em "repeticoes" e escreva a faixa inteira em "observacao". Se o texto não disser, use series = 3 e repeticoes = 12.
- "cargaKg": só quando o texto trouxer a carga em kg; senão, null.
- "observacao": o que sobrar de útil (faixa de repetições, até a falha, drop-set, descanso, cadência). Sem nada, null.
- Ignore saudações, comentários soltos e linhas que não sejam exercícios. Não dê conselho médico nem altere a prescrição.`

export async function interpretarTexto(
  texto: string,
  { cliente, modelo }: { cliente: ClienteIA; modelo: string },
): Promise<TreinoInterpretadoT> {
  const resposta = await cliente.gerar({ modelo, sistema: SISTEMA, usuario: texto, schema: SCHEMA_IMPORTACAO })
  if (resposta.recusa) throw new ValidationError('Não foi possível ler esse texto. Revise e tente de novo.')
  if (resposta.fim === 'length') throw new ValidationError('O texto é grande demais. Envie menos treinos por vez.')
  try {
    return TreinoInterpretado.parse(JSON.parse(resposta.texto ?? ''))
  } catch {
    throw new ValidationError('Não consegui entender o texto. Tente separar os treinos por dia, um exercício por linha.')
  }
}

