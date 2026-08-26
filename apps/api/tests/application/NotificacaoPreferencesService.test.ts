import { describe, it, expect } from 'vitest'
import {
  isEmHorarioSilencioso,
  podeEnviarComPrefs,
  podeEnviarResumoDiarioComPrefs,
  DEFAULT_PREFERENCIAS_NOTIFICACAO,
  type PreferenciasNotificacao,
} from '../../src/application/usecases/notificacoes/NotificacaoPreferencesService.js'

function asData(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(2026, 0, 1, h, m, 0, 0)
}

function prefs(overrides: Partial<PreferenciasNotificacao> = {}): PreferenciasNotificacao {
  return {
    ...DEFAULT_PREFERENCIAS_NOTIFICACAO,
    horarioSilencioso: { ...DEFAULT_PREFERENCIAS_NOTIFICACAO.horarioSilencioso },
    ...overrides,
  }
}

describe('isEmHorarioSilencioso — virada de meia-noite', () => {
  it('bloqueia 23:00 e 03:00 na janela 22:00→07:00', () => {
    expect(isEmHorarioSilencioso('22:00', '07:00', asData('23:00'))).toBe(true)
    expect(isEmHorarioSilencioso('22:00', '07:00', asData('03:00'))).toBe(true)
  })

  it('permite 12:00 na janela 22:00→07:00', () => {
    expect(isEmHorarioSilencioso('22:00', '07:00', asData('12:00'))).toBe(false)
  })

  it('bloqueia exatamente na hora de início e libera na hora de fim', () => {
    expect(isEmHorarioSilencioso('22:00', '07:00', asData('22:00'))).toBe(true)
    expect(isEmHorarioSilencioso('22:00', '07:00', asData('07:00'))).toBe(false)
  })

  it('janela sem virada (08:00→18:00) bloqueia dentro e libera fora', () => {
    expect(isEmHorarioSilencioso('08:00', '18:00', asData('10:00'))).toBe(true)
    expect(isEmHorarioSilencioso('08:00', '18:00', asData('06:00'))).toBe(false)
    expect(isEmHorarioSilencioso('08:00', '18:00', asData('23:00'))).toBe(false)
  })

  it('janela vazia (inicio === fim) nunca bloqueia', () => {
    expect(isEmHorarioSilencioso('00:00', '00:00', asData('12:00'))).toBe(false)
    expect(isEmHorarioSilencioso('22:00', '22:00', asData('22:00'))).toBe(false)
  })
})

describe('podeEnviarComPrefs — gating dos workers', () => {
  it('frequencia DESATIVADA bloqueia todos os tipos', () => {
    const p = prefs({ frequencia: 'DESATIVADA' })
    expect(podeEnviarComPrefs(p, 'lembreteTreino', asData('12:00'))).toBe(false)
    expect(podeEnviarComPrefs(p, 'social', asData('12:00'))).toBe(false)
    expect(podeEnviarComPrefs(p, 'motivacional', asData('12:00'))).toBe(false)
    expect(podeEnviarComPrefs(p, 'conquistas', asData('12:00'))).toBe(false)
  })

  it('tipo desabilitado bloqueia apenas aquele tipo', () => {
    const p = prefs({ social: false })
    expect(podeEnviarComPrefs(p, 'social', asData('12:00'))).toBe(false)
    expect(podeEnviarComPrefs(p, 'lembreteTreino', asData('12:00'))).toBe(true)
  })

  it('horário silencioso ativo bloqueia dentro da janela e libera fora', () => {
    const p = prefs({
      horarioSilencioso: { ativo: true, inicio: '22:00', fim: '07:00' },
    })
    expect(podeEnviarComPrefs(p, 'motivacional', asData('23:00'))).toBe(false)
    expect(podeEnviarComPrefs(p, 'motivacional', asData('03:00'))).toBe(false)
    expect(podeEnviarComPrefs(p, 'motivacional', asData('12:00'))).toBe(true)
  })

  it('horário silencioso inativo nunca bloqueia', () => {
    const p = prefs({ horarioSilencioso: { ativo: false, inicio: '22:00', fim: '07:00' } })
    expect(podeEnviarComPrefs(p, 'conquistas', asData('23:00'))).toBe(true)
  })

  it('RESUMO_DIARIO suprime pushes individuais (canal vira o digest diário)', () => {
    const p = prefs({
      frequencia: 'RESUMO_DIARIO',
      horarioSilencioso: { ativo: true, inicio: '22:00', fim: '07:00' },
    })
    // Mesmo fora do horário silencioso, nenhum push individual é enviado
    expect(podeEnviarComPrefs(p, 'lembreteTreino', asData('12:00'))).toBe(false)
    expect(podeEnviarComPrefs(p, 'social', asData('12:00'))).toBe(false)
    expect(podeEnviarComPrefs(p, 'motivacional', asData('12:00'))).toBe(false)
    expect(podeEnviarComPrefs(p, 'conquistas', asData('12:00'))).toBe(false)
    // Dentro do silencioso também bloqueado (redundante, mas explícito)
    expect(podeEnviarComPrefs(p, 'lembreteTreino', asData('23:00'))).toBe(false)
  })

  it('defaults permitem envio em qualquer horário', () => {
    const p = prefs()
    expect(podeEnviarComPrefs(p, 'lembreteTreino', asData('23:59'))).toBe(true)
    expect(podeEnviarComPrefs(p, 'social', asData('00:00'))).toBe(true)
  })
})

describe('podeEnviarResumoDiarioComPrefs — gating do digest diário', () => {
  it('libera usuário RESUMO_DIARIO fora do horário silencioso', () => {
    const p = prefs({ frequencia: 'RESUMO_DIARIO' })
    expect(podeEnviarResumoDiarioComPrefs(p, asData('12:00'))).toBe(true)
  })

  it('bloqueia dentro do horário silencioso (ex.: 19:00 na janela 18:00→23:00)', () => {
    const p = prefs({
      frequencia: 'RESUMO_DIARIO',
      horarioSilencioso: { ativo: true, inicio: '18:00', fim: '23:00' },
    })
    expect(podeEnviarResumoDiarioComPrefs(p, asData('19:00'))).toBe(false)
    expect(podeEnviarResumoDiarioComPrefs(p, asData('12:00'))).toBe(true)
  })

  it('não libera para IMEDIATA nem DESATIVADA', () => {
    expect(podeEnviarResumoDiarioComPrefs(prefs({ frequencia: 'IMEDIATA' }), asData('12:00'))).toBe(false)
    expect(podeEnviarResumoDiarioComPrefs(prefs({ frequencia: 'DESATIVADA' }), asData('12:00'))).toBe(false)
  })
})
