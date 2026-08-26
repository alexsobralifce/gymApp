import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { assistenteRespostas, responder } from '../../lib/assistenteRespostas'

// Rotas reais do app (apps/web/src/App.tsx) referenciadas pelas ações da base
const ROTAS_VALIDAS = [
  '/',
  '/meus-treinos',
  '/dados',
  '/evolucao',
  '/medidas',
  '/notificacoes/preferencias',
  '/privacidade',
  '/wearables',
  '/documentacao',
]

const TOPICOS_OBRIGATORIOS = [
  'registrar-serie',
  'trocar-exercicio',
  'meta-semanal',
  'evolucao',
  'medidas',
  'offline',
  'rpe',
  'notificacoes',
  'tema',
  'retomada',
  'privacidade',
  'wearables',
  'fallback',
]

describe('AssistenteAjuda — UX-014 assistente de ajuda', () => {
  describe('Base de conhecimento (assistenteRespostas.ts)', () => {
    it('toda entrada tem id e resposta não vazios; chaves vazias apenas no fallback', () => {
      for (const entrada of assistenteRespostas) {
        expect(entrada.id.length).toBeGreaterThan(0)
        expect(entrada.resposta.length).toBeGreaterThan(0)
        if (entrada.id === 'fallback') {
          expect(entrada.chaves).toEqual([])
        } else {
          expect(entrada.chaves.length).toBeGreaterThan(0)
        }
      }
    })

    it('toda rota de ação existe na lista de rotas do app', () => {
      for (const entrada of assistenteRespostas) {
        if (entrada.acao) {
          expect(ROTAS_VALIDAS).toContain(entrada.acao.rota)
        }
      }
    })

    it('cobre todos os tópicos obrigatórios do UX-014', () => {
      const ids = assistenteRespostas.map((entrada) => entrada.id)
      for (const id of TOPICOS_OBRIGATORIOS) {
        expect(ids).toContain(id)
      }
    })
  })

  describe('responder()', () => {
    it('"como troco um exercício?" → troca de exercício', () => {
      expect(responder('como troco um exercício?').id).toBe('trocar-exercicio')
    })

    it('"silenciar notificação" → preferências de notificação', () => {
      expect(responder('silenciar notificação').id).toBe('notificacoes')
    })

    it('é insensível a acentos ("evolução" casa com "evolucao")', () => {
      expect(responder('evolução').id).toBe('evolucao')
      expect(responder('como vejo meu progresso?').id).toBe('evolucao')
    })

    it('"meta semanal" → editar meta em Meu Perfil', () => {
      const resposta = responder('onde edito minha meta semanal?')
      expect(resposta.id).toBe('meta-semanal')
      expect(resposta.acao?.rota).toBe('/dados')
    })

    it('texto sem correspondência → fallback', () => {
      const resposta = responder('xyzzy plugh quux')
      expect(resposta.id).toBe('fallback')
      expect(resposta.acao?.rota).toBe('/documentacao')
    })
  })

  describe('Componente (AssistenteAjuda.tsx)', () => {
    const src = fs.readFileSync(path.resolve(__dirname, 'AssistenteAjuda.tsx'), 'utf-8')
    const kb = fs.readFileSync(
      path.resolve(__dirname, '../../lib/assistenteRespostas.ts'),
      'utf-8'
    )

    it('é claramente rotulado como ajuda automática (sem parecer coach)', () => {
      expect(src).toContain('Assistente de ajuda')
      expect(src).toContain('para orientação de treino, fale com seu professor')
      // O fallback da base de conhecimento reforça o limite de atuação
      expect(kb).toContain('não dou orientação de treino')
    })

    it('usa rótulo acessível e área de toque ≥ 48px no botão flutuante', () => {
      expect(src).toContain('aria-label="Abrir assistente de ajuda"')
      expect(src).toContain('h-14 w-14')
    })

    it('anuncia mensagens com aria-live="polite" e fecha com Escape', () => {
      expect(src).toContain('aria-live="polite"')
      expect(src).toContain("evento.key === 'Escape'")
    })

    it('simula digitação respeitando prefers-reduced-motion', () => {
      expect(src).toContain("'(prefers-reduced-motion: reduce)'")
      expect(src).toContain('TEMPO_DIGITACAO_MS')
    })

    it('navega pelas ações via react-router (fecha painel e navega)', () => {
      expect(src).toContain("import { useNavigate } from 'react-router-dom'")
      expect(src).toMatch(/function irPara\(rota: string\)/)
      expect(src).toContain('navigate(rota)')
    })

    it('não faz chamadas de rede nem persiste conversa', () => {
      expect(src).not.toMatch(/fetch\(/)
      expect(src).not.toMatch(/axios/)
      expect(src).not.toMatch(/localStorage/)
    })
  })
})
