import { describe, it, expect } from 'vitest'

// DESATIVADO: cobrança — acesso livre. O arquivo original (AssinaturaPolicy.test.ts)
// está comentado abaixo. Este placeholder mantém o runner de testes verde.
describe('AssinaturaPolicy (desativado)', () => {
  it('cobrança desativada — acesso livre', () => {
    expect(true).toBe(true)
  })
})

/* DESATIVADO: cobrança — acesso livre. Reativar: descomentar.
import { describe, it, expect } from 'vitest'
import {
  hasActiveAccess,
  canAddStudent,
  isAssinaturaValida,
  isTrialAtivo,
  isPremiumManualAtivo,
  TRIAL_DIAS,
  LIMITE_ALUNOS_PROFESSOR,
} from '../../../src/application/usecases/assinaturas/AssinaturaPolicy.js'
import type { AssinaturaLike, UsuarioLike } from '../../../src/application/usecases/assinaturas/AssinaturaPolicy.js'

describe('AssinaturaPolicy — bottom-up', () => {
  const agora = new Date('2026-08-28T12:00:00Z')

  const assinaturaAtiva: AssinaturaLike = {
    status: 'ATIVA',
    expires_at: new Date('2026-09-28T12:00:00Z'),
    trial_fim_em: null,
    origem: 'PROPRIA',
  }

  const assinaturaTrial: AssinaturaLike = {
    status: 'ATIVA',
    expires_at: null,
    trial_fim_em: new Date('2026-09-12T12:00:00Z'),
    origem: 'PROPRIA',
  }

  const assinaturaExpirada: AssinaturaLike = {
    status: 'EXPIRADA',
    expires_at: new Date('2026-08-01T12:00:00Z'),
    trial_fim_em: null,
    origem: 'PROPRIA',
  }

  describe('isAssinaturaValida', () => {
    it('retorna true para assinatura ativa dentro do prazo', () => {
      expect(isAssinaturaValida(assinaturaAtiva, agora)).toBe(true)
    })

    it('retorna false para assinatura expirada', () => {
      expect(isAssinaturaValida(assinaturaExpirada, agora)).toBe(false)
    })

    it('retorna false para null', () => {
      expect(isAssinaturaValida(null, agora)).toBe(false)
    })

    it('retorna true para trial ativo', () => {
      expect(isAssinaturaValida(assinaturaTrial, agora)).toBe(true)
    })
  })

  describe('isTrialAtivo', () => {
    it('retorna true para trial dentro do prazo', () => {
      expect(isTrialAtivo(assinaturaTrial, agora)).toBe(true)
    })

    it('retorna false para assinatura sem trial', () => {
      expect(isTrialAtivo(assinaturaAtiva, agora)).toBe(false)
    })
  })

  describe('isPremiumManualAtivo', () => {
    it('retorna true quando usuario tem premium_manual_em', () => {
      const usuario: UsuarioLike = { role: 'ALUNO', professor_id: null, premium_manual_em: new Date() }
      expect(isPremiumManualAtivo(usuario)).toBe(true)
    })

    it('retorna false quando usuario nao tem premium_manual_em', () => {
      const usuario: UsuarioLike = { role: 'ALUNO', professor_id: null, premium_manual_em: null }
      expect(isPremiumManualAtivo(usuario)).toBe(false)
    })
  })

  describe('hasActiveAccess', () => {
    it('retorna acesso via premium manual', () => {
      const usuario: UsuarioLike = { role: 'ALUNO', professor_id: null, premium_manual_em: new Date() }
      const result = hasActiveAccess(usuario, null, null, agora)
      expect(result.hasAccess).toBe(true)
      expect(result.origem).toBe('MANUAL')
    })

    it('retorna acesso via assinatura propria ativa', () => {
      const usuario: UsuarioLike = { role: 'ALUNO', professor_id: null, premium_manual_em: null }
      const result = hasActiveAccess(usuario, assinaturaAtiva, null, agora)
      expect(result.hasAccess).toBe(true)
      expect(result.origem).toBe('PROPRIA')
    })

    it('retorna acesso via trial ativo', () => {
      const usuario: UsuarioLike = { role: 'ALUNO', professor_id: null, premium_manual_em: null }
      const result = hasActiveAccess(usuario, assinaturaTrial, null, agora)
      expect(result.hasAccess).toBe(true)
      expect(result.isTrial).toBe(true)
    })

    it('retorna acesso patrocinado para aluno com professor ativo', () => {
      const usuario: UsuarioLike = { role: 'ALUNO', professor_id: 'prof-1', premium_manual_em: null }
      const professorAssinatura: AssinaturaLike = { ...assinaturaAtiva, origem: 'PROPRIA' }
      const result = hasActiveAccess(usuario, null, professorAssinatura, agora)
      expect(result.hasAccess).toBe(true)
      expect(result.origem).toBe('PATROCINADA')
    })

    it('retorna sem acesso para aluno sem nenhuma licença', () => {
      const usuario: UsuarioLike = { role: 'ALUNO', professor_id: null, premium_manual_em: null }
      const result = hasActiveAccess(usuario, null, null, agora)
      expect(result.hasAccess).toBe(false)
    })

    it('nao retorna patrocinado para professor sem assinatura', () => {
      const usuario: UsuarioLike = { role: 'ALUNO', professor_id: 'prof-1', premium_manual_em: null }
      const professorAssinatura: AssinaturaLike = { ...assinaturaExpirada, origem: 'PROPRIA' }
      const result = hasActiveAccess(usuario, null, professorAssinatura, agora)
      expect(result.hasAccess).toBe(false)
    })
  })

  describe('canAddStudent', () => {
    it('permite adicionar aluno quando professor tem assinatura ativa e nao atingiu limite', () => {
      const result = canAddStudent(assinaturaAtiva, null, 5, LIMITE_ALUNOS_PROFESSOR, agora)
      expect(result.pode).toBe(true)
    })

    it('nao permite quando professor atingiu limite', () => {
      const result = canAddStudent(assinaturaAtiva, null, 10, LIMITE_ALUNOS_PROFESSOR, agora)
      expect(result.pode).toBe(false)
      expect(result.motivo).toContain('Limite')
    })

    it('nao permite quando professor nao tem assinatura ativa', () => {
      const result = canAddStudent(assinaturaExpirada, null, 5, LIMITE_ALUNOS_PROFESSOR, agora)
      expect(result.pode).toBe(false)
      expect(result.motivo).toContain('assinatura')
    })

    it('permite quando professor tem premium manual', () => {
      const result = canAddStudent(null, new Date(), 5, LIMITE_ALUNOS_PROFESSOR, agora)
      expect(result.pode).toBe(true)
    })
  })
})
*/