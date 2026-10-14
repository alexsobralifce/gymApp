export interface SchemaIA {
  nome: string
  json: Record<string, unknown>
}

/** Arquivo enviado junto ao pedido: foto da ficha (imagem) ou PDF escaneado. */
export interface AnexoIA {
  mime: string
  base64: string
  nome?: string
}

export interface ClienteIA {
  gerar(args: { modelo: string; sistema: string; usuario: string; schema: SchemaIA; anexos?: AnexoIA[] }): Promise<{ texto?: string; fim?: string; recusa?: string }>
}

function parteDoAnexo(a: AnexoIA) {
  const dataUri = `data:${a.mime};base64,${a.base64}`
  if (a.mime === 'application/pdf') return { type: 'file', file: { filename: a.nome ?? 'ficha.pdf', file_data: dataUri } }
  return { type: 'image_url', image_url: { url: dataUri } }
}

/** Cliente mínimo da API Chat Completions da OpenAI com saída JSON estruturada (sem SDK). */
export function criarClienteOpenAI(apiKey: string): ClienteIA {
  return {
    async gerar({ modelo, sistema, usuario, schema, anexos }) {
      for (let tentativa = 1; tentativa <= 3; tentativa++) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(120_000),
          body: JSON.stringify({
            model: modelo,
            messages: [
              { role: 'system', content: sistema },
              { role: 'user', content: anexos?.length ? [{ type: 'text', text: usuario }, ...anexos.map(parteDoAnexo)] : usuario },
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
