import { describe, it, expect, vi } from 'vitest'
import { BlogStatus, BlogTipo, type ArtigoBlog } from '@prisma/client'
import { paraArquivo } from '../../src/application/usecases/blog/BlogService.js'
import { payloadIndexNow } from '../../src/infrastructure/seo/avisoBuscadores.js'
import { criarAgendador } from '../../src/infrastructure/hosting/railwayRebuild.js'

const base: ArtigoBlog = {
  id: 'a1',
  slug: 'meu-artigo',
  tipo: BlogTipo.ORIGINAL,
  status: BlogStatus.PUBLICADO,
  titulo: 'Título',
  descricao: 'd'.repeat(110),
  categoria: 'Aluno',
  autor: 'Equipe ENDORFINAPP',
  resumo: 'Resumo',
  secoes: [{ titulo: 'S', paragrafos: ['p'] }],
  fontes: [{ titulo: 'F', url: 'https://ex.com' }],
  origem: null,
  cta: null,
  publicado_em: new Date('2026-10-01T12:00:00Z'),
  criado_em: new Date('2026-09-30T12:00:00Z'),
  atualizado_em: new Date('2026-10-05T12:00:00Z'),
}

describe('paraArquivo', () => {
  it('gera o formato lido pelo site, sem campos vazios', () => {
    const r = paraArquivo(base) as Record<string, unknown>
    expect(r).toMatchObject({ slug: 'meu-artigo', publicadoEm: '2026-10-01', atualizadoEm: '2026-10-05', categoria: 'Aluno' })
    expect(r.tipo).toBeUndefined()
    expect(r.origem).toBeUndefined()
    expect(r.cta).toBeUndefined()
  })
  it('curadoria leva tipo e origem', () => {
    const origem = { veiculo: 'NSCA', pais: 'US', titulo: 'T', url: 'https://nsca.com/x' }
    const r = paraArquivo({ ...base, tipo: BlogTipo.CURADORIA, origem }) as Record<string, unknown>
    expect(r.tipo).toBe('curadoria')
    expect(r.origem).toEqual(origem)
  })
  it('usa a data de criação quando nunca foi publicado', () => {
    expect((paraArquivo({ ...base, publicado_em: null }) as { publicadoEm: string }).publicadoEm).toBe('2026-09-30')
  })
})

describe('agendador de rebuild', () => {
  it('junta várias chamadas seguidas em um único redeploy', async () => {
    vi.useFakeTimers()
    const executar = vi.fn().mockResolvedValue(true)
    const ag = criarAgendador(executar, 1000)
    ag.agendar()
    ag.agendar()
    ag.agendar()
    expect(ag.pendente()).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)
    expect(executar).toHaveBeenCalledTimes(1)
    expect(ag.pendente()).toBe(false)
    vi.useRealTimers()
  })
})

describe('payloadIndexNow', () => {
  it('monta URLs absolutas e o local do arquivo da chave', () => {
    expect(payloadIndexNow('https://exemplo.com/', 'abc', ['/', '/blog/guia'])).toEqual({
      host: 'exemplo.com',
      key: 'abc',
      keyLocation: 'https://exemplo.com/abc.txt',
      urlList: ['https://exemplo.com', 'https://exemplo.com/blog/guia'],
    })
  })
})
