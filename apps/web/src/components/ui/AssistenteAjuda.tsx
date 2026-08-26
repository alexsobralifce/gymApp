import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircleQuestion, X, Send, ArrowRight } from 'lucide-react'
import { responder } from '../../lib/assistenteRespostas'

interface Mensagem {
  autor: 'usuario' | 'bot'
  texto: string
  acao?: { label: string; rota: string }
}

const TITULO = 'Assistente de ajuda'
const SUBTITULO = 'Dúvidas sobre o app — para orientação de treino, fale com seu professor.'
const TEMPO_DIGITACAO_MS = 400

const SUGESTOES = [
  'Como registro uma série?',
  'Como troco um exercício?',
  'Onde vejo minha evolução?',
]

function prefereMovimentoReduzido(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function AssistenteAjuda() {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [digitando, setDigitando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<number | null>(null)

  function fechar() {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setDigitando(false)
    setMensagens([])
    setTexto('')
    setAberto(false)
  }

  // Escape fecha; foco vai para o campo ao abrir
  useEffect(() => {
    if (!aberto) return
    inputRef.current?.focus()
    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        fechar()
      }
    }
    window.addEventListener('keydown', aoPressionarTecla)
    return () => window.removeEventListener('keydown', aoPressionarTecla)
  }, [aberto])

  // Limpa timeout pendente ao desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  // Mantém a lista de mensagens rolada até o fim
  useEffect(() => {
    if (listaRef.current) {
      listaRef.current.scrollTop = listaRef.current.scrollHeight
    }
  }, [mensagens, digitando, aberto])

  function enviar(pergunta: string) {
    const limpa = pergunta.trim()
    if (!limpa || digitando) return
    setMensagens((atual) => [...atual, { autor: 'usuario', texto: limpa }])
    setTexto('')
    setDigitando(true)
    const resposta = responder(limpa)
    const atraso = prefereMovimentoReduzido() ? 0 : TEMPO_DIGITACAO_MS
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null
      setMensagens((atual) => [
        ...atual,
        { autor: 'bot', texto: resposta.resposta, acao: resposta.acao },
      ])
      setDigitando(false)
    }, atraso)
  }

  function irPara(rota: string) {
    fechar()
    navigate(rota)
  }

  return (
    <>
      {/* Botão flutuante — acima da barra de navegação mobile e da sidebar desktop */}
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Abrir assistente de ajuda"
        title="Assistente de ajuda"
        className="fixed right-4 bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+0.75rem)] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95 cursor-pointer md:right-6 md:bottom-6 xl:right-[15.5rem]"
      >
        <MessageCircleQuestion className="h-6 w-6" />
      </button>

      {aberto && (
        <>
          {/* Backdrop — apenas mobile (bottom-sheet); desktop usa side-card sem véu */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in md:hidden"
            onClick={fechar}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={TITULO}
            className="fixed inset-x-0 bottom-0 z-50 flex h-[80vh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface-card border-t border-surface-input shadow-2xl animate-modal-pop safe-bottom md:inset-auto md:right-6 md:bottom-6 md:h-[70vh] md:max-h-[600px] md:w-[400px] md:rounded-2xl md:border md:border-surface-input xl:right-[15.5rem]"
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between gap-3 border-b border-surface-input px-4 py-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MessageCircleQuestion className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-text truncate">{TITULO}</h2>
                  <p className="text-xs text-text-muted leading-snug">{SUBTITULO}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar assistente de ajuda"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-input text-text-muted hover:text-text cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mensagens */}
            <div ref={listaRef} aria-live="polite" className="flex-1 overflow-y-auto space-y-3 p-4">
              {mensagens.length === 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-text-muted leading-relaxed">
                    Olá! Pergunte como usar o app — por exemplo, como registrar séries ou onde ver
                    sua evolução.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGESTOES.map((sugestao) => (
                      <button
                        key={sugestao}
                        type="button"
                        onClick={() => enviar(sugestao)}
                        className="rounded-full border border-surface-input bg-surface px-3 py-2 text-xs font-medium text-text-muted hover:text-text hover:border-primary/40 transition-colors cursor-pointer"
                      >
                        {sugestao}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mensagens.map((msg, indice) =>
                msg.autor === 'usuario' ? (
                  <div key={indice} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground whitespace-pre-wrap">
                      {msg.texto}
                    </div>
                  </div>
                ) : (
                  <div key={indice} className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-surface border border-surface-input px-4 py-3 text-sm text-text leading-relaxed">
                      <p className="whitespace-pre-wrap">{msg.texto}</p>
                      {msg.acao && (
                        <button
                          type="button"
                          onClick={() => irPara(msg.acao!.rota)}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/15 transition-colors cursor-pointer"
                        >
                          {msg.acao.label}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              )}

              {digitando && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-surface border border-surface-input px-4 py-2.5 text-sm text-text-muted">
                    Digitando…
                  </div>
                </div>
              )}
            </div>

            {/* Entrada de texto */}
            <form
              onSubmit={(evento) => {
                evento.preventDefault()
                enviar(texto)
              }}
              className="flex items-center gap-2 border-t border-surface-input p-3 shrink-0"
            >
              <input
                ref={inputRef}
                type="text"
                value={texto}
                onChange={(evento) => setTexto(evento.target.value)}
                placeholder="Digite sua dúvida…"
                aria-label="Digite sua dúvida"
                enterKeyHint="send"
                className="min-h-11 flex-1 rounded-xl bg-surface-input px-4 py-3 text-sm text-text placeholder:text-text-disabled outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="submit"
                disabled={!texto.trim() || digitando}
                aria-label="Enviar mensagem"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 cursor-pointer active:scale-95 transition-all"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </>
      )}
    </>
  )
}
