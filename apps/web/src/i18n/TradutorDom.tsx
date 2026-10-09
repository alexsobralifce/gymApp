import { useEffect } from 'react'
import { useT } from './index'
import { EN } from './en/index'

const ATRIBUTOS = ['placeholder', 'title', 'aria-label', 'alt']
const IGNORAR = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'INPUT'])

/**
 * Rede de segurança para o inglês: textos que não passam por `t()` (listas em módulos,
 * rótulos desestruturados, mensagens vindas de dados) são trocados no DOM quando
 * coincidem exatamente com uma chave do dicionário. Guarda o original para voltar ao português.
 */
export default function TradutorDom() {
  const { idioma } = useT()

  useEffect(() => {
    if (idioma !== 'en') return
    const textos = new Map<Text, string>()
    const atributos = new Map<Element, Map<string, string>>()

    function traduzirTexto(no: Text) {
      const bruto = no.nodeValue ?? ''
      const chave = bruto.trim()
      if (chave.length < 2) return
      const em = EN[chave]
      if (!em || em === chave) return
      const pai = no.parentElement
      if (!pai || IGNORAR.has(pai.tagName) || pai.closest('[data-sem-traducao]')) return
      if (!textos.has(no)) textos.set(no, bruto)
      const ini = bruto.indexOf(chave)
      no.nodeValue = bruto.slice(0, ini) + em + bruto.slice(ini + chave.length)
    }

    function traduzirAtributos(el: Element) {
      for (const a of ATRIBUTOS) {
        const v = el.getAttribute(a)
        if (!v) continue
        const em = EN[v.trim()]
        if (!em || em === v) continue
        if (el.closest('[data-sem-traducao]')) continue
        let m = atributos.get(el)
        if (!m) atributos.set(el, (m = new Map()))
        if (!m.has(a)) m.set(a, v)
        el.setAttribute(a, em)
      }
    }

    function varrer(raiz: Node) {
      if (raiz.nodeType === Node.TEXT_NODE) return traduzirTexto(raiz as Text)
      if (raiz.nodeType !== Node.ELEMENT_NODE) return
      const el = raiz as Element
      traduzirAtributos(el)
      el.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(traduzirAtributos)
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      while (w.nextNode()) traduzirTexto(w.currentNode as Text)
    }

    let pendente = new Set<Node>()
    let agendado = 0
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'childList') m.addedNodes.forEach((n) => pendente.add(n))
        else if (m.type === 'characterData') pendente.add(m.target)
        else if (m.type === 'attributes') pendente.add(m.target)
      }
      if (agendado) return
      agendado = requestAnimationFrame(() => {
        agendado = 0
        const lote = pendente
        pendente = new Set()
        obs.disconnect()
        lote.forEach((n) => { if (n.isConnected) varrer(n) })
        observar()
      })
    })
    function observar() {
      obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS })
    }

    varrer(document.body)
    observar()

    return () => {
      obs.disconnect()
      cancelAnimationFrame(agendado)
      textos.forEach((original, no) => { if (no.isConnected) no.nodeValue = original })
      atributos.forEach((m, el) => m.forEach((v, a) => el.setAttribute(a, v)))
    }
  }, [idioma])

  return null
}
