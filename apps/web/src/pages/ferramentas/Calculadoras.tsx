import { useState } from 'react'
import {
  imcDe, pesoIdealDe, gastoDiarioDe, metaCaloricaDe, LIMITES, dentroDoLimite,
  type FaixaIMC, type NivelAtividade, type Objetivo, type Sexo,
} from '../../lib/calculadoras'
import type { Idioma } from '../../lib/i18n'
import { UI } from './interface'
import { CampoNumero, Escolha, Cartao, Numero, Resultado, Mensagem, numero } from './componentes'

interface Props { idioma: Idioma }

const NIVEIS: NivelAtividade[] = ['sedentario', 'leve', 'moderado', 'intenso', 'muitoIntenso']
const SEXOS: Sexo[] = ['M', 'F']

function SeletorSexo({ idioma, valor, aoMudar }: Props & { valor: Sexo; aoMudar: (s: Sexo) => void }) {
  const t = UI[idioma]
  return <Escolha rotulo={t.sexo} valor={valor} aoMudar={aoMudar} opcoes={SEXOS.map((s) => ({ valor: s, rotulo: s === 'M' ? t.masculino : t.feminino }))} />
}

function Disposicao({ formulario, resultado }: { formulario: React.ReactNode; resultado: React.ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <Cartao><div className="space-y-5">{formulario}</div></Cartao>
      <Cartao>{resultado}</Cartao>
    </div>
  )
}

/** Cor da faixa do IMC; o nome da faixa também aparece em texto, nunca só pela cor. */
const COR_FAIXA: Record<FaixaIMC, string> = {
  abaixo: 'bg-info', normal: 'bg-success', sobrepeso: 'bg-warning', obesidade1: 'bg-warning', obesidade2: 'bg-destructive', obesidade3: 'bg-destructive',
}

function Escala({ imc }: { imc: number }) {
  const posicao = Math.min(100, Math.max(0, ((imc - 15) / (40 - 15)) * 100))
  return (
    <div aria-hidden="true" className="mt-5">
      <div className="relative h-2.5 rounded-full overflow-hidden flex">
        <span className="bg-info" style={{ width: `${((18.5 - 15) / 25) * 100}%` }} />
        <span className="bg-success" style={{ width: `${((25 - 18.5) / 25) * 100}%` }} />
        <span className="bg-warning" style={{ width: `${((30 - 25) / 25) * 100}%` }} />
        <span className="bg-destructive flex-1" />
      </div>
      <div className="relative h-3">
        <span className="absolute -translate-x-1/2 text-foreground text-xs leading-none" style={{ left: `${posicao}%` }}>▲</span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground"><span>15</span><span>18,5</span><span>25</span><span>30</span><span>40</span></div>
    </div>
  )
}

export function CalculadoraIMC({ idioma }: Props) {
  const t = UI[idioma]
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  const vazio = peso.trim() === '' || altura.trim() === ''
  const r = vazio ? null : imcDe(numero(peso), numero(altura))
  return (
    <Disposicao
      formulario={<>
        <CampoNumero rotulo={t.peso} unidade="kg" valor={peso} aoMudar={setPeso} />
        <CampoNumero rotulo={t.altura} unidade="cm" valor={altura} aoMudar={setAltura} />
      </>}
      resultado={
        <Resultado>
          {vazio ? <Mensagem>{t.vazio}</Mensagem> : !r ? <Mensagem alerta>{t.invalido}</Mensagem> : (
            <>
              <Numero rotulo={t.seuImc} valor={String(r.imc).replace('.', idioma === 'pt' ? ',' : '.')} unidade="kg/m²" destaque />
              <p className="mt-3 flex items-center gap-2 font-semibold"><span className={`h-3 w-3 rounded-full ${COR_FAIXA[r.faixa]}`} aria-hidden="true" />{t.faixas[r.faixa]}</p>
              <Escala imc={r.imc} />
            </>
          )}
        </Resultado>
      }
    />
  )
}

export function CalculadoraPesoIdeal({ idioma }: Props) {
  const t = UI[idioma]
  const [altura, setAltura] = useState('')
  const [sexo, setSexo] = useState<Sexo>('M')
  const vazio = altura.trim() === ''
  const r = vazio ? null : pesoIdealDe(numero(altura), sexo)
  const formulas: Array<[string, number]> = r ? [['Devine', r.devine], ['Robinson', r.robinson], ['Miller', r.miller], ['Hamwi', r.hamwi]] : []
  return (
    <Disposicao
      formulario={<>
        <CampoNumero rotulo={t.altura} unidade="cm" valor={altura} aoMudar={setAltura} />
        <SeletorSexo idioma={idioma} valor={sexo} aoMudar={setSexo} />
      </>}
      resultado={
        <Resultado>
          {vazio ? <Mensagem>{t.vazio}</Mensagem> : !r ? <Mensagem alerta>{t.invalido}</Mensagem> : (
            <>
              <Numero rotulo={t.faixaSaudavel} valor={`${r.faixa.min} – ${r.faixa.max}`} unidade="kg" destaque />
              <h3 className="mt-5 mb-2 text-sm font-semibold text-muted-foreground">{t.pesoPorFormula}</h3>
              <dl className="grid grid-cols-2 gap-3">
                {formulas.map(([nome, kg]) => (
                  <div key={nome} className="rounded-xl border border-border bg-background px-3 py-2">
                    <dt className="text-xs text-muted-foreground">{nome}</dt>
                    <dd className="text-lg font-bold">{kg} <span className="text-sm font-normal text-muted-foreground">kg</span></dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </Resultado>
      }
    />
  )
}

function useEntradaCorpo() {
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  const [idade, setIdade] = useState('')
  const [sexo, setSexo] = useState<Sexo>('M')
  const [atividade, setAtividade] = useState<NivelAtividade>('moderado')
  const completo = [peso, altura, idade].every((v) => v.trim() !== '')
  const dados = { pesoKg: numero(peso), alturaCm: numero(altura), idade: numero(idade), sexo, atividade }
  const valido = completo && dentroDoLimite(dados.pesoKg, LIMITES.pesoKg) && dentroDoLimite(dados.alturaCm, LIMITES.alturaCm) && dentroDoLimite(dados.idade, LIMITES.idade)
  return { peso, setPeso, altura, setAltura, idade, setIdade, sexo, setSexo, atividade, setAtividade, completo, valido, dados }
}

function CamposCorpo({ idioma, e }: Props & { e: ReturnType<typeof useEntradaCorpo> }) {
  const t = UI[idioma]
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <CampoNumero rotulo={t.peso} unidade="kg" valor={e.peso} aoMudar={e.setPeso} />
        <CampoNumero rotulo={t.altura} unidade="cm" valor={e.altura} aoMudar={e.setAltura} />
      </div>
      <CampoNumero rotulo={t.idade} unidade={t.anos} valor={e.idade} aoMudar={e.setIdade} inteiro />
      <SeletorSexo idioma={idioma} valor={e.sexo} aoMudar={e.setSexo} />
      <Escolha
        rotulo={t.atividade}
        valor={e.atividade}
        aoMudar={e.setAtividade}
        colunas={1}
        opcoes={NIVEIS.map((n) => ({ valor: n, rotulo: t.niveis[n].nome, dica: t.niveis[n].dica }))}
      />
    </>
  )
}

const formatar = (n: number, idioma: Idioma) => n.toLocaleString(idioma === 'pt' ? 'pt-BR' : 'en-US')

export function CalculadoraGasto({ idioma }: Props) {
  const t = UI[idioma]
  const e = useEntradaCorpo()
  const r = e.valido ? gastoDiarioDe(e.dados) : null
  return (
    <Disposicao
      formulario={<CamposCorpo idioma={idioma} e={e} />}
      resultado={
        <Resultado>
          {!e.completo ? <Mensagem>{t.vazio}</Mensagem> : !r ? <Mensagem alerta>{t.invalido}</Mensagem> : (
            <div className="space-y-5">
              <Numero rotulo={t.tdee} valor={formatar(r.tdee, idioma)} unidade={t.kcalDia} dica={t.tdeeDica} destaque />
              <Numero rotulo={t.tmb} valor={formatar(r.tmb, idioma)} unidade={t.kcalDia} dica={t.tmbDica} />
            </div>
          )}
        </Resultado>
      }
    />
  )
}

export function CalculadoraMeta({ idioma }: Props) {
  const t = UI[idioma]
  const e = useEntradaCorpo()
  const [objetivo, setObjetivo] = useState<Objetivo>('perder')
  const [pesoMeta, setPesoMeta] = useState('')
  const meta = numero(pesoMeta)
  const r = e.valido ? metaCaloricaDe({ ...e.dados, objetivo, pesoMetaKg: dentroDoLimite(meta, LIMITES.pesoKg) ? meta : undefined }) : null
  const sinal = (n: number) => (n > 0 ? '+' : '')
  return (
    <Disposicao
      formulario={<>
        <Escolha rotulo={t.objetivo} valor={objetivo} aoMudar={setObjetivo} colunas={1} opcoes={(['perder', 'manter', 'ganhar'] as Objetivo[]).map((o) => ({ valor: o, rotulo: t.objetivos[o] }))} />
        <CamposCorpo idioma={idioma} e={e} />
        {objetivo !== 'manter' && <CampoNumero rotulo={`${t.pesoMeta} (${t.opcional})`} unidade="kg" valor={pesoMeta} aoMudar={setPesoMeta} dica={t.pesoMetaDica} />}
      </>}
      resultado={
        <Resultado>
          {!e.completo ? <Mensagem>{t.vazio}</Mensagem> : !r ? <Mensagem alerta>{t.invalido}</Mensagem> : (
            <div className="space-y-5">
              <Numero rotulo={t.metaDiaria} valor={formatar(r.meta, idioma)} unidade={t.kcalDia} destaque />
              <div className="grid grid-cols-2 gap-4">
                <Numero rotulo={t.ajuste} valor={`${sinal(r.ajuste)}${formatar(r.ajuste, idioma)}`} unidade="kcal" />
                <Numero rotulo={t.ritmo} valor={`${sinal(r.kgPorSemana)}${r.kgPorSemana.toLocaleString(idioma === 'pt' ? 'pt-BR' : 'en-US')}`} unidade={t.kgSemana} />
              </div>
              {objetivo !== 'manter' && (
                r.semanasParaMeta !== null
                  ? <Numero rotulo={t.prazo} valor={t.semanas(r.semanasParaMeta)} />
                  : <Mensagem>{t.semPrazo}</Mensagem>
              )}
              {r.limitadoPeloMinimo && <Mensagem alerta>{t.limitePiso}</Mensagem>}
            </div>
          )}
        </Resultado>
      }
    />
  )
}
