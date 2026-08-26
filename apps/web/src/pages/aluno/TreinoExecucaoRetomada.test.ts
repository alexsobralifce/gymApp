import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * BUG-003 — Modal espúrio "Sair do treino" ao falhar a retomada de sessão.
 *
 * Convenção de teste estático do repo (sem @testing-library): inspeciona o
 * código-fonte de TreinoExecucao.tsx e garante que o path de erro da retomada
 * (`retomarTreino` rejeitado) NÃO navega para /inicio quando a sessão deste
 * treino já está carregada no store — caso contrário o useBlocker (treino em
 * EM_EXECUCAO) abriria o modal de saída sem ação do usuário, e confirmar
 * cancelaria as séries registradas. A navegação só é permitida quando não há
 * sessão carregada (aí o blocker não dispara).
 */
describe('TreinoExecucao — retomada de sessão (BUG-003)', () => {
  const src = fs.readFileSync(path.resolve(__dirname, 'TreinoExecucao.tsx'), 'utf-8')

  it('o catch da retomada consulta o estado vivo do store antes de navegar', () => {
    expect(src).toContain('useTrainingStore.getState().treinoAtual?.id === id')
  })

  it('com sessão carregada, NÃO navega para /inicio — mostra toast de erro e permanece', () => {
    // O guard de sessão carregada deve vir ANTES do navigate no catch.
    const guardIndex = src.indexOf('useTrainingStore.getState().treinoAtual?.id === id')
    const navigateIndex = src.indexOf('navigate(`/treino/${id}/inicio`')
    expect(guardIndex).toBeGreaterThan(-1)
    expect(navigateIndex).toBeGreaterThan(-1)
    expect(guardIndex).toBeLessThan(navigateIndex)

    // Mensagem de erro exibida quando a sessão carregou mas a atualização falhou
    expect(src).toContain("'Não foi possível atualizar a sessão — tente novamente'")
    expect(src).toContain("showToast('Não foi possível atualizar a sessão — tente novamente', 'error')")
  })

  it('navega para /inicio apenas quando NÃO há sessão carregada (blocker não dispara)', () => {
    // Anchora no catch da retomada (não no .catch(() => {}) do fetch de perfil).
    const retomarIndex = src.indexOf('retomarTreino(id)')
    expect(retomarIndex).toBeGreaterThan(-1)

    const retomarBlock = src.slice(retomarIndex, retomarIndex + 1300)
    expect(retomarBlock).toContain('.catch(() => {')
    expect(retomarBlock).toContain('navigate(`/treino/${id}/inicio`')
    // Nenhum cancelarTreino é chamado neste caminho (as séries ficam intactas)
    expect(retomarBlock).not.toContain('cancelarTreino')
  })

  it('mantém o path de sucesso: retomarTreino(id) continua sendo chamado', () => {
    expect(src).toContain('retomarTreino(id)')
    expect(src).toContain('.finally(() => {')
  })

  it('mantém a proteção do useBlocker para saída manual (EM_EXECUCAO)', () => {
    expect(src).toContain("treinoAtual.status === 'EM_EXECUCAO'")
    expect(src).toContain('useBlocker(')
  })
})
