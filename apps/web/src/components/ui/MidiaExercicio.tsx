import { useEffect, useRef, useState } from 'react'
import { resolveMediaUrl } from '../../lib/media'
import { useT } from '../../i18n'
import { useSexoAluno } from '../../hooks/useSexoAluno'
import { midiaPorSexo, type ExercicioComVariantes, type SexoAluno } from '../../lib/midiaPorSexo'

export interface FocoExercicio {
  foco_x?: number | null
  foco_y?: number | null
  foco_larg?: number | null
  foco_alt?: number | null
}

interface MidiaExercicioProps {
  /** Exercício (ou qualquer objeto) com gif_url/imagem_url e, se houver, o enquadramento */
  exercicio: FocoExercicio & ExercicioComVariantes & { nome: string }
  /** Sexo de quem treina, quando não é o usuário logado (ex.: professor vendo o treino do aluno) */
  sexo?: SexoAluno | null
  /**
   * "livre": o recorte vira o quadro, com a proporção da figura, ocupando a largura
   * disponível até `alturaMaxVh` da tela (modais). "quadro": cabe num quadrado
   * definido por `className` (miniaturas).
   */
  formato?: 'livre' | 'quadro'
  /** Só no formato livre: altura máxima do quadro, em % da altura da tela */
  alturaMaxVh?: number
  /** No formato quadro, define o tamanho do quadrado (ex.: "h-24 w-24"); no livre, margens e afins */
  className?: string
  /** Toque abre a imagem em tela cheia */
  ampliavel?: boolean
  /** Antecipa o carregamento (primeiros itens da tela) */
  prioridade?: boolean
}

interface Recorte {
  x: number
  y: number
  larg: number
  alt: number
}

/** Recorte válido do exercício, ou null para mostrar o GIF inteiro */
function recorteDe(f: FocoExercicio): Recorte | null {
  const { foco_x: x, foco_y: y, foco_larg: larg, foco_alt: alt } = f
  if (x == null || y == null || larg == null || alt == null || larg <= 0 || alt <= 0) return null
  if (larg >= 1 && alt >= 1) return null
  return { x, y, larg, alt }
}

/** Posiciona o GIF quadrado dentro do quadro para mostrar só o recorte */
function estiloRecorte(r: Recorte): React.CSSProperties {
  return {
    position: 'absolute',
    maxWidth: 'none',
    width: `${100 / r.larg}%`,
    left: `${(-100 * r.x) / r.larg}%`,
    top: `${(-100 * r.y) / r.alt}%`,
  }
}

function Figura({ src, alt, recorte, prioridade, onFalha }: { src: string; alt: string; recorte: Recorte | null; prioridade?: boolean; onFalha?: () => void }) {
  return (
    <img
      src={src}
      alt={alt}
      loading={prioridade ? 'eager' : 'lazy'}
      decoding="async"
      onError={onFalha}
      style={recorte ? estiloRecorte(recorte) : undefined}
      className={recorte ? 'h-auto' : 'h-full w-full object-contain'}
      draggable={false}
    />
  )
}

/** Quadro com a proporção do recorte (quadrado quando não há recorte) */
function Quadro({ recorte, alturaMaxVh, className = '', children }: { recorte: Recorte | null; alturaMaxVh: number; className?: string; children: React.ReactNode }) {
  const proporcao = recorte ? recorte.larg / recorte.alt : 1
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-white ${className}`}
      style={{ aspectRatio: String(proporcao), width: `min(100%, ${(alturaMaxVh * proporcao).toFixed(1)}vh)` }}
    >
      {children}
    </div>
  )
}

/**
 * Figura do exercício ampliada: recorta o espaço vazio do GIF para a pessoa
 * ocupar o quadro (facilita para baixa visão e idosos). Sem enquadramento
 * cadastrado, mostra o GIF inteiro.
 */
export default function MidiaExercicio({
  exercicio: exercicioBase,
  sexo,
  formato = 'livre',
  alturaMaxVh = 65,
  className = '',
  ampliavel = false,
  prioridade = false,
}: MidiaExercicioProps) {
  const { t } = useT()
  const sexoLogado = useSexoAluno()
  const exercicio = midiaPorSexo(exercicioBase, sexo !== undefined ? sexo : sexoLogado)
  const [falhou, setFalhou] = useState(false)
  const [aberto, setAberto] = useState(false)
  const [dobro, setDobro] = useState(false)
  const rolagem = useRef<HTMLDivElement>(null)
  const src = !falhou ? resolveMediaUrl(exercicio.gif_url || exercicio.imagem_url) : null
  const recorte = recorteDe(exercicio)
  const proporcao = recorte ? recorte.larg / recorte.alt : 1

  // Trocou de exercício ou de imagem: tenta carregar de novo
  useEffect(() => { setFalhou(false) }, [exercicioBase.gif_url, exercicioBase.imagem_url, sexo, sexoLogado])

  // Ao ampliar mais, começa com a figura centralizada
  useEffect(() => {
    const el = rolagem.current
    if (dobro && el) {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2
    }
  }, [dobro])

  useEffect(() => {
    if (!aberto) return
    const fechar = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [aberto])

  if (!src) {
    return (
      <div className={`flex aspect-square items-center justify-center rounded-xl bg-surface-input text-3xl ${className}`} aria-hidden="true">💪</div>
    )
  }

  const figura = <Figura src={src} alt={exercicio.nome} recorte={recorte} prioridade={prioridade} onFalha={() => setFalhou(true)} />

  // Miniatura: quadrado fixo, com o quadro do recorte centralizado dentro dele
  const quadro = formato === 'quadro' ? (
    <div className={`flex items-center justify-center rounded-xl bg-white ${className}`}>
      <div
        className="relative max-h-full max-w-full overflow-hidden"
        style={{ aspectRatio: String(recorte ? recorte.larg / recorte.alt : 1), ...(recorte && recorte.larg / recorte.alt < 1 ? { height: '100%' } : { width: '100%' }) }}
      >
        {figura}
      </div>
    </div>
  ) : (
    <Quadro recorte={recorte} alturaMaxVh={alturaMaxVh} className={className}>{figura}</Quadro>
  )

  if (!ampliavel) return quadro

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setDobro(false); setAberto(true) }}
        aria-label={t('Ampliar imagem de {nome}', { nome: exercicio.nome })}
        className="block w-full cursor-zoom-in rounded-xl focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div className="flex justify-center">{quadro}</div>
      </button>
      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={exercicio.nome}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-3 bg-black p-3"
          onClick={(e) => { e.stopPropagation(); setAberto(false) }}
        >
          {/* Com "Ampliar mais" a figura fica no dobro do tamanho e a área rola para os lados */}
          <div ref={rolagem} className="w-full max-h-[78vh] overflow-auto rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div
              className="relative mx-auto overflow-hidden rounded-2xl bg-white"
              style={{
                aspectRatio: String(proporcao),
                width: dobro ? '200%' : `min(100%, ${(78 * proporcao).toFixed(1)}vh)`,
              }}
            >
              <Figura src={src} alt={exercicio.nome} recorte={recorte} prioridade />
            </div>
          </div>
          <p className="text-center text-lg font-bold text-white">{exercicio.nome}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDobro((d) => !d) }}
              className="rounded-xl bg-white/15 px-6 py-3 text-base font-semibold text-white"
            >
              {dobro ? t('Reduzir') : t('Ampliar mais')}
            </button>
            <button type="button" className="rounded-xl bg-white/15 px-6 py-3 text-base font-semibold text-white">{t('Fechar')}</button>
          </div>
        </div>
      )}
    </>
  )
}
