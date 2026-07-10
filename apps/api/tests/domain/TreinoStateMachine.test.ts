import { describe, it, expect } from 'vitest'
import { TreinoStatus, TreinoAtor } from '@prisma/client'
import { assertTransicaoValida, proximosStatusPossiveis, podeIniciarTreino } from '../../src/domain/entities/TreinoStateMachine.js'
import { InvalidStateTransitionError } from '../../src/domain/errors/AppError.js'

describe('TreinoStateMachine', () => {
  // ─── Transições válidas ──────────────────────────────────────────────────

  it('professor pode enviar treino CADASTRADO', () => {
    expect(() =>
      assertTransicaoValida(TreinoStatus.CADASTRADO, TreinoStatus.ENVIADO, TreinoAtor.PROFESSOR)
    ).not.toThrow()
  })

  it('aluno pode aceitar treino ENVIADO', () => {
    expect(() =>
      assertTransicaoValida(TreinoStatus.ENVIADO, TreinoStatus.ACEITO, TreinoAtor.ALUNO)
    ).not.toThrow()
  })

  it('aluno pode recusar treino ENVIADO', () => {
    expect(() =>
      assertTransicaoValida(TreinoStatus.ENVIADO, TreinoStatus.RECUSADO, TreinoAtor.ALUNO)
    ).not.toThrow()
  })

  it('aluno pode autoaceitar treino CADASTRADO (autogestão)', () => {
    expect(() =>
      assertTransicaoValida(TreinoStatus.CADASTRADO, TreinoStatus.ACEITO, TreinoAtor.ALUNO)
    ).not.toThrow()
  })

  it('aluno pode iniciar treino ACEITO', () => {
    expect(() =>
      assertTransicaoValida(TreinoStatus.ACEITO, TreinoStatus.EM_EXECUCAO, TreinoAtor.ALUNO)
    ).not.toThrow()
  })

  it('sistema pode marcar treino ACEITO como EM_ABERTO', () => {
    expect(() =>
      assertTransicaoValida(TreinoStatus.ACEITO, TreinoStatus.EM_ABERTO, TreinoAtor.SISTEMA)
    ).not.toThrow()
  })

  it('aluno pode iniciar treino EM_ABERTO', () => {
    expect(() =>
      assertTransicaoValida(TreinoStatus.EM_ABERTO, TreinoStatus.EM_EXECUCAO, TreinoAtor.ALUNO)
    ).not.toThrow()
  })

  it('aluno pode concluir treino EM_EXECUCAO', () => {
    expect(() =>
      assertTransicaoValida(TreinoStatus.EM_EXECUCAO, TreinoStatus.CONCLUIDO, TreinoAtor.ALUNO)
    ).not.toThrow()
  })

  // ─── Transições inválidas ────────────────────────────────────────────────

  it('aluno NÃO pode enviar treino CADASTRADO', () => {
    expect(() =>
      assertTransicaoValida(TreinoStatus.CADASTRADO, TreinoStatus.ENVIADO, TreinoAtor.ALUNO)
    ).toThrow(InvalidStateTransitionError)
  })

  it('professor NÃO pode autoaceitar treino CADASTRADO', () => {
    expect(() =>
      assertTransicaoValida(TreinoStatus.CADASTRADO, TreinoStatus.ACEITO, TreinoAtor.PROFESSOR)
    ).toThrow(InvalidStateTransitionError)
  })

  it('sistema NÃO pode autoaceitar treino CADASTRADO', () => {
    expect(() =>
      assertTransicaoValida(TreinoStatus.CADASTRADO, TreinoStatus.ACEITO, TreinoAtor.SISTEMA)
    ).toThrow(InvalidStateTransitionError)
  })

  it('sistema NÃO pode finalizar treino diretamente', () => {
    expect(() =>
      assertTransicaoValida(TreinoStatus.EM_EXECUCAO, TreinoStatus.CONCLUIDO, TreinoAtor.SISTEMA)
    ).toThrow(InvalidStateTransitionError)
  })

  it('professor NÃO pode fazer aluno aceitar treino', () => {
    expect(() =>
      assertTransicaoValida(TreinoStatus.ENVIADO, TreinoStatus.ACEITO, TreinoAtor.PROFESSOR)
    ).toThrow(InvalidStateTransitionError)
  })

  it('NÃO é possível iniciar treino RECUSADO', () => {
    expect(() =>
      assertTransicaoValida(TreinoStatus.RECUSADO, TreinoStatus.EM_EXECUCAO, TreinoAtor.ALUNO)
    ).toThrow(InvalidStateTransitionError)
  })

  it('NÃO é possível ir de CADASTRADO para CONCLUIDO', () => {
    expect(() =>
      assertTransicaoValida(TreinoStatus.CADASTRADO, TreinoStatus.CONCLUIDO, TreinoAtor.ALUNO)
    ).toThrow(InvalidStateTransitionError)
  })

  it('NÃO é possível ir de CONCLUIDO para qualquer outro status', () => {
    expect(() =>
      assertTransicaoValida(TreinoStatus.CONCLUIDO, TreinoStatus.EM_EXECUCAO, TreinoAtor.ALUNO)
    ).toThrow(InvalidStateTransitionError)
  })

  // ─── Helpers ─────────────────────────────────────────────────────────────

  it('proximosStatusPossiveis retorna status corretos para CADASTRADO', () => {
    const proximos = proximosStatusPossiveis(TreinoStatus.CADASTRADO)
    expect(proximos).toContain(TreinoStatus.ENVIADO)
    expect(proximos).toContain(TreinoStatus.ACEITO)
  })

  it('proximosStatusPossiveis retorna status corretos para ACEITO', () => {
    const proximos = proximosStatusPossiveis(TreinoStatus.ACEITO)
    expect(proximos).toContain(TreinoStatus.EM_EXECUCAO)
    expect(proximos).toContain(TreinoStatus.EM_ABERTO)
    expect(proximos).not.toContain(TreinoStatus.CONCLUIDO)
  })

  it('podeIniciarTreino retorna true para ACEITO e EM_ABERTO', () => {
    expect(podeIniciarTreino(TreinoStatus.ACEITO)).toBe(true)
    expect(podeIniciarTreino(TreinoStatus.EM_ABERTO)).toBe(true)
  })

  it('podeIniciarTreino retorna false para outros status', () => {
    expect(podeIniciarTreino(TreinoStatus.CADASTRADO)).toBe(false)
    expect(podeIniciarTreino(TreinoStatus.CONCLUIDO)).toBe(false)
    expect(podeIniciarTreino(TreinoStatus.EM_EXECUCAO)).toBe(false)
  })
})
