/** Cliente mínimo da API System One da TypeSafe (modelo Jev), sem SDK, no mesmo estilo de openai.ts. */
export interface PerguntaJev {
  type: 'choice' | 'noul'
  instructions: string
  criteria?: Record<string, string | null>
}

export interface RespostaJevChoice {
  choice: string
  confidence: number
  probabilities: Record<string, number>
}

export interface RespostasJev {
  choice(id: string): RespostaJevChoice | undefined
  noul(id: string): number | undefined
}

export interface ClienteJev {
  perguntar(state: unknown, perguntas: Record<string, PerguntaJev>): Promise<RespostasJev>
}

interface RespostaBruta {
  answers?: Record<string, { type?: string; choice?: string; confidence?: number; probabilities?: Record<string, number>; noul?: number }>
}

export function respostasDe(bruta: RespostaBruta): RespostasJev {
  const answers = bruta.answers ?? {}
  return {
    choice(id) {
      const a = answers[id]
      if (!a || typeof a.choice !== 'string' || typeof a.confidence !== 'number') return undefined
      return { choice: a.choice, confidence: a.confidence, probabilities: a.probabilities ?? {} }
    },
    noul(id) {
      const a = answers[id]
      return typeof a?.noul === 'number' ? a.noul : undefined
    },
  }
}

export function criarClienteJev(apiKey: string, modelo = 'jev-latest'): ClienteJev {
  return {
    async perguntar(state, perguntas) {
      for (let tentativa = 1; tentativa <= 3; tentativa++) {
        const res = await fetch('https://api.typesafe.ai/v1/systemone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({ state, model: modelo, questions: perguntas }),
        })
        if ((res.status === 429 || res.status === 529) && tentativa < 3) {
          await new Promise((r) => setTimeout(r, 1000 * 2 ** tentativa))
          continue
        }
        if (!res.ok) throw new Error(`TypeSafe HTTP ${res.status}`)
        return respostasDe((await res.json()) as RespostaBruta)
      }
      throw new Error('TypeSafe: tentativas esgotadas')
    },
  }
}
