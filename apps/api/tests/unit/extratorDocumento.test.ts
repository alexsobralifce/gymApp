import { describe, it, expect } from 'vitest'
import { detectarTipo, limparMarkdown, lerArquivo } from '../../src/application/usecases/treino/importacao/extratorDocumento.js'

describe('detectarTipo', () => {
  it('reconhece pelos bytes, não pela extensão', () => {
    expect(detectarTipo(Buffer.from('%PDF-1.7 ...'))?.tipo).toBe('pdf')
    expect(detectarTipo(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toMatchObject({ tipo: 'imagem', mime: 'image/jpeg' })
    expect(detectarTipo(Buffer.from('# Treino A\n- Supino 4x10'))?.tipo).toBe('texto')
    expect(detectarTipo(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]))).toBeNull()
  })
})

describe('limparMarkdown', () => {
  it('tira a marcação e mantém as linhas de tabela legíveis', () => {
    const md = '# Treino A\n\n**Supino** reto\n\n| Exercício | Séries |\n|---|---|\n| Remada | 4x10 |\n'
    const r = limparMarkdown(md)
    expect(r).toContain('Treino A')
    expect(r).toContain('Supino reto')
    expect(r).toContain('Remada | 4x10')
    expect(r).not.toContain('---')
    expect(r).not.toContain('**')
  })
})

describe('lerArquivo', () => {
  it('rejeita vazio e formato desconhecido', async () => {
    await expect(lerArquivo(Buffer.alloc(0))).rejects.toMatchObject({ statusCode: 422 })
    await expect(lerArquivo(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]))).rejects.toMatchObject({ statusCode: 422 })
  })
  it('devolve o texto do Markdown e deixa a imagem sem texto', async () => {
    expect((await lerArquivo(Buffer.from('## Dia 1\nAgachamento 4x8'))).texto).toContain('Agachamento 4x8')
    expect((await lerArquivo(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).texto).toBeUndefined()
  })
  it('PDF corrompido vira erro 422 amigável', async () => {
    await expect(lerArquivo(Buffer.from('%PDF-1.4 lixo'))).rejects.toMatchObject({ statusCode: 422 })
  })
})
