// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  gerarCardTreinoFoto,
  montarDiasDaSemana,
  mesesDaSemana,
  formatarDataCard,
  nomeProfessorNoCard,
  CARD_LARGURA,
  CARD_ALTURA,
  CARD_SITE_PADRAO,
  type CardTreinoFotoData,
} from './cardTreinoFotoGenerator'

// 2026-09-19 é um sábado
const SABADO = new Date(2026, 8, 19)
// 2026-09-30 é uma quarta: a semana (27/09 a 03/10) cruza dois meses
const QUARTA_VIRADA_MES = new Date(2026, 8, 30)

describe('montarDiasDaSemana', () => {
  it('marca só hoje quando não há histórico', () => {
    const r = montarDiasDaSemana(SABADO, [])
    expect(r.hojeIdx).toBe(6)
    expect(r.diasTreinados).toEqual([false, false, false, false, false, false, true])
  })

  it('destaca os dias treinados da semana (domingo a sábado) e ignora outras semanas', () => {
    const r = montarDiasDaSemana(SABADO, [
      '2026-09-13', // domingo desta semana
      '2026-09-15', // terça
      '2026-09-17', // quinta
      '2026-09-12', // sábado da semana anterior: fora
      '2026-09-20', // domingo seguinte: fora
    ])
    expect(r.diasTreinados).toEqual([true, false, true, false, true, false, true])
  })

  it('conta hoje como treinado mesmo que o histórico ainda não o traga', () => {
    const r = montarDiasDaSemana(QUARTA_VIRADA_MES, ['2026-09-28'])
    expect(r.hojeIdx).toBe(3)
    expect(r.diasTreinados).toEqual([false, true, false, true, false, false, false])
  })

  it('enxerga treinos no mês seguinte quando a semana vira o mês', () => {
    const r = montarDiasDaSemana(QUARTA_VIRADA_MES, ['2026-10-02'])
    expect(r.diasTreinados[5]).toBe(true)
  })
})

describe('mesesDaSemana', () => {
  it('retorna um mês quando a semana cabe nele', () => {
    expect(mesesDaSemana(SABADO)).toEqual(['2026-09'])
  })

  it('retorna os dois meses quando a semana cruza o mês', () => {
    expect(mesesDaSemana(QUARTA_VIRADA_MES)).toEqual(['2026-09', '2026-10'])
  })
})

describe('formatarDataCard', () => {
  it('formata dia, mês abreviado e ano sem pontos', () => {
    const txt = formatarDataCard(SABADO)
    expect(txt).toContain('19')
    expect(txt).toContain('2026')
    expect(txt).not.toContain('.')
    expect(txt).not.toContain(' de ')
  })
})

describe('nomeProfessorNoCard', () => {
  it('professor treinando aparece com o próprio nome', () => {
    expect(nomeProfessorNoCard('PROFESSOR', ' Carlos Silva ', null)).toBe('Carlos Silva')
  })

  it('aluno usa o professor vinculado', () => {
    expect(nomeProfessorNoCard('ALUNO', 'Ana Souza', 'Carlos Silva')).toBe('Carlos Silva')
  })

  it('aluno sem professor fica sem o bloco', () => {
    expect(nomeProfessorNoCard('ALUNO', 'Ana Souza', null)).toBeNull()
    expect(nomeProfessorNoCard('ALUNO', 'Ana Souza', undefined)).toBeNull()
    expect(nomeProfessorNoCard(undefined, undefined, '  ')).toBeNull()
  })
})

describe('gerarCardTreinoFoto', () => {
  let fillText: ReturnType<typeof vi.fn>
  let ctx: Record<string, any>
  let canvasSizes: { w: number; h: number }[]

  const dados: CardTreinoFotoData = {
    treinoNome: 'Peito e Tríceps',
    duracaoFormatada: '58 min',
    data: '19 set 2026',
    professorNome: 'Carlos Silva',
    diasTreinados: [false, true, false, true, true, false, true],
    hojeIdx: 6,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    fillText = vi.fn()
    canvasSizes = []
    ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      textBaseline: '',
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText,
      drawImage: vi.fn(),
      measureText: vi.fn((t: string) => ({ width: t.length * 10 })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      canvasSizes.push({ w: this.width, h: this.height })
      return ctx as any
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb: any, type?: string) {
      cb(new Blob(['x'], { type: type || 'image/png' }))
    })
  })

  it('gera JPEG 4:5 (1080x1350) mesmo sem foto', async () => {
    const blob = await gerarCardTreinoFoto(dados)
    expect(blob.type).toBe('image/jpeg')
    expect(canvasSizes[0]).toEqual({ w: CARD_LARGURA, h: CARD_ALTURA })
    expect(CARD_LARGURA / CARD_ALTURA).toBeCloseTo(0.8)
  })

  it('escreve concluído, treino, data e tempo, professor, cargo e site padrão', async () => {
    await gerarCardTreinoFoto(dados)
    const textos = fillText.mock.calls.map((c) => c[0] as string)
    expect(textos.some((t) => t.includes('TREINO CONCLUÍDO'))).toBe(true)
    expect(textos).toContain('Peito e Tríceps')
    expect(textos).toContain('19 set 2026   ·   58 min')
    expect(textos).toContain('Carlos Silva')
    expect(textos).toContain('Personal Trainer')
    expect(textos).toContain(CARD_SITE_PADRAO)
  })

  it('desenha as 7 letras dos dias da semana', async () => {
    await gerarCardTreinoFoto(dados)
    const letras = fillText.mock.calls.map((c) => c[0] as string).filter((t) => t.length === 1)
    expect(letras).toEqual(['D', 'S', 'T', 'Q', 'Q', 'S', 'S'])
  })

  it('preenche só os dias treinados (círculos cheios) e contorna os demais', async () => {
    await gerarCardTreinoFoto(dados)
    // 4 dias treinados => 4 fill() de círculo; 3 sem treino => 3 stroke() de contorno
    expect(ctx.fill).toHaveBeenCalledTimes(4)
    expect(ctx.stroke).toHaveBeenCalledTimes(3)
  })

  it('sem professor, o rodapé direito não é desenhado', async () => {
    await gerarCardTreinoFoto({ ...dados, professorNome: null })
    const textos = fillText.mock.calls.map((c) => c[0] as string)
    expect(textos).not.toContain('Personal Trainer')
    expect(textos).not.toContain('Carlos Silva')
    expect(textos).toContain(CARD_SITE_PADRAO)
  })

  it('usa o site informado no lugar do padrão', async () => {
    await gerarCardTreinoFoto({ ...dados, site: 'meusite.com' })
    const textos = fillText.mock.calls.map((c) => c[0] as string)
    expect(textos).toContain('meusite.com')
    expect(textos).not.toContain(CARD_SITE_PADRAO)
  })

  it('corta nome de professor muito longo com reticências', async () => {
    await gerarCardTreinoFoto({ ...dados, professorNome: 'Professor Com Um Nome Extremamente Longo Demais Para Caber' })
    const textos = fillText.mock.calls.map((c) => c[0] as string)
    expect(textos.some((t) => t.endsWith('…'))).toBe(true)
  })

  it('desenha a foto em tela cheia quando fornecida', async () => {
    const originalImage = global.Image
    class MockImage {
      crossOrigin = ''
      width = 800
      height = 600
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_v: string) {
        setTimeout(() => this.onload?.(), 0)
      }
    }
    global.Image = MockImage as any

    await gerarCardTreinoFoto(dados, 'data:image/png;base64,AAAA')
    expect(ctx.drawImage).toHaveBeenCalledTimes(1)

    global.Image = originalImage
  })
})
