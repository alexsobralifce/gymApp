export interface SchemaIA {
  nome: string
  json: Record<string, unknown>
}

export interface ClienteIA {
  gerar(args: { modelo: string; sistema: string; usuario: string; schema: SchemaIA }): Promise<{ texto?: string; fim?: string; recusa?: string }>
}

/** Cliente mínimo da API Chat Completions da OpenAI com saída JSON estruturada (sem SDK). */
export function criarClienteOpenAI(apiKey: string): ClienteIA {
  return {
    async gerar({ modelo, sistema, usuario, schema }) {
      for (let tentativa = 1; tentativa <= 3; tentativa++) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(120_000),
          body: JSON.stringify({
            model: modelo,
            messages: [
              { role: 'system', content: sistema },
              { role: 'user', content: usuario },
            ],
            response_format: { type: 'json_schema', json_schema: { name: schema.nome, strict: true, schema: schema.json } },
          }),
        })
        if ((res.status === 429 || res.status >= 500) && tentativa < 3) {
          await new Promise((r) => setTimeout(r, 2000 * tentativa))
          continue
        }
        const json = (await res.json()) as {
          error?: { message?: string }
          choices?: Array<{ message?: { content?: string; refusal?: string }; finish_reason?: string }>
        }
        if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${json.error?.message ?? 'erro desconhecido'}`)
        const escolha = json.choices?.[0]
        if (escolha?.message?.refusal) return { recusa: escolha.message.refusal }
        return { texto: escolha?.message?.content ?? '', fim: escolha?.finish_reason }
      }
      throw new Error('OpenAI: tentativas esgotadas')
    },
  }
}
