// Pede à OpenAI uma curadoria ORIGINAL (não uma cópia) a partir do título e do trecho público do feed.
import { z } from 'zod'

export const MODELO = process.env.CURADORIA_MODELO || 'gpt-4.1'

export const ArtigoGerado = z.object({
  relevante: z.boolean(),
  motivo: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  categoria: z.enum(['Personal trainer', 'Academia', 'Aluno']),
  resumo: z.string(),
  secoes: z.array(z.object({ titulo: z.string(), paragrafos: z.array(z.string()), lista: z.array(z.string()) })),
})

const SISTEMA = `Você escreve para o blog do ENDORFINAPP, um app de treino para alunos, personal trainers e academias, em português do Brasil.
Sua tarefa é uma CURADORIA: apresentar ao leitor uma matéria publicada por outro veículo, com texto 100% seu, e levar o leitor à matéria original.

Regras obrigatórias:
- Use SOMENTE as informações do título e do trecho fornecidos. Não invente dados, números, estudos, nomes ou conclusões que não estejam no trecho. Se o trecho não permitir dizer algo útil, marque relevante=false e explique em "motivo".
- Marque relevante=false se o tema não for útil a quem treina, a personal trainers ou a academias (fofoca, promoções, receitas, produtos).
- Escreva com suas palavras. Nunca copie frases do trecho (nem traduza frase a frase). Não cite o texto original entre aspas.
- Estrutura: seção "O que a matéria aborda" (2 a 3 frases, atribuindo ao veículo: "Segundo o <veículo>..."), seção "O que isso significa na prática" (orientações gerais e prudentes para o aluno, o personal ou a academia, sem promessas de resultado) e, se couber, seção "Cuidados" (limites do que se sabe, quando procurar um profissional). Total de 250 a 450 palavras.
- Não dê conselho médico, não prometa resultado e não recomende suplementos ou doses.
- "descricao": entre 100 e 160 caracteres. "titulo": diferente do título original, claro e sem clickbait.
- "lista" pode ser um array vazio.`

/** Trechos de n palavras consecutivas do original que reaparecem no texto gerado. */
export function trechosCopiados(original, gerado, n = 7) {
  const palavras = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  const o = palavras(original)
  const g = ` ${palavras(gerado).join(' ')} `
  const achados = []
  for (let i = 0; i + n <= o.length; i++) {
    const janela = o.slice(i, i + n).join(' ')
    if (g.includes(` ${janela} `)) achados.push(janela)
  }
  return achados
}

export function textoDoArtigo(a) {
  return [a.titulo, a.descricao, a.resumo, ...a.secoes.flatMap((s) => [s.titulo, ...s.paragrafos, ...s.lista])].join('\n')
}

export function validar(gerado, candidato) {
  const erros = []
  if (gerado.descricao.length < 100 || gerado.descricao.length > 160) erros.push(`descricao com ${gerado.descricao.length} caracteres (precisa de 100 a 160)`)
  if (gerado.titulo.trim().toLowerCase() === candidato.item.titulo.trim().toLowerCase()) erros.push('titulo igual ao original')
  if (gerado.secoes.length < 2) erros.push('menos de 2 seções')
  const copiados = trechosCopiados(`${candidato.item.titulo} ${candidato.item.trecho}`, textoDoArtigo(gerado))
  if (copiados.length) erros.push(`trechos copiados do original: "${copiados[0]}"`)
  return erros
}

/** Cliente mínimo da API Chat Completions da OpenAI com saída JSON estruturada (sem dependências). */
export function criarCliente(apiKey = process.env.OPENAI_API_KEY) {
  const { $schema: _ignorado, ...schema } = z.toJSONSchema(ArtigoGerado)
  return {
    async gerar({ modelo, sistema, usuario }) {
      for (let tentativa = 1; tentativa <= 3; tentativa++) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(120000),
          body: JSON.stringify({
            model: modelo,
            messages: [
              { role: 'system', content: sistema },
              { role: 'user', content: usuario },
            ],
            response_format: { type: 'json_schema', json_schema: { name: 'curadoria', strict: true, schema } },
          }),
        })
        if ((res.status === 429 || res.status >= 500) && tentativa < 3) {
          await new Promise((r) => setTimeout(r, 2000 * tentativa))
          continue
        }
        const json = await res.json()
        if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${json.error?.message ?? 'erro desconhecido'}`)
        const escolha = json.choices?.[0]
        if (escolha?.message?.refusal) return { recusa: escolha.message.refusal }
        return { texto: escolha?.message?.content ?? '', fim: escolha?.finish_reason }
      }
    },
  }
}

export async function redigir(candidato, { cliente = criarCliente(), modelo = MODELO } = {}) {
  const base = `<materia>
<veiculo>${candidato.fonte.nome} (${candidato.fonte.pais})</veiculo>
<idioma_original>${candidato.fonte.idioma}</idioma_original>
<titulo_original>${candidato.item.titulo}</titulo_original>
<trecho_publico_do_feed>${candidato.item.trecho}</trecho_publico_do_feed>
</materia>`
  let feedback = ''
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    const resposta = await cliente.gerar({ modelo, sistema: SISTEMA, usuario: base + feedback })
    if (resposta.recusa) return { ok: false, motivo: `recusado pelo modelo: ${resposta.recusa}` }
    let gerado
    try {
      gerado = ArtigoGerado.parse(JSON.parse(resposta.texto))
    } catch {
      return { ok: false, motivo: `resposta sem JSON válido (finish_reason: ${resposta.fim})` }
    }
    if (!gerado.relevante) return { ok: false, motivo: `descartado pelo redator: ${gerado.motivo}` }
    const erros = validar(gerado, candidato)
    if (!erros.length) return { ok: true, gerado }
    feedback = `\n\nSua tentativa anterior foi rejeitada: ${erros.join('; ')}. Reescreva corrigindo isso.`
    if (tentativa === 2) return { ok: false, motivo: `reprovado na validação: ${erros.join('; ')}` }
  }
}

export function slugificar(titulo) {
  return titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

export function montarArtigo(candidato, gerado, hoje = new Date().toISOString().slice(0, 10)) {
  return {
    titulo: gerado.titulo.trim(),
    descricao: gerado.descricao.trim(),
    categoria: gerado.categoria,
    autor: 'Equipe ENDORFINAPP',
    publicadoEm: hoje,
    atualizadoEm: hoje,
    tipo: 'curadoria',
    resumo: gerado.resumo.trim(),
    secoes: gerado.secoes.map((s) => ({ titulo: s.titulo.trim(), paragrafos: s.paragrafos, ...(s.lista.length ? { lista: s.lista } : {}) })),
    origem: { veiculo: candidato.fonte.nome, pais: candidato.fonte.pais, titulo: candidato.item.titulo, url: candidato.item.link },
    fontes: [{ titulo: `${candidato.fonte.nome}: ${candidato.item.titulo}`, url: candidato.item.link }],
    cta: { texto: 'Conhecer o ENDORFINAPP', href: '/register' },
  }
}
