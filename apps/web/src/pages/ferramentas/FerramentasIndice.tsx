import { Link } from 'react-router-dom'
import LayoutPublico from '../../components/seo/LayoutPublico'
import { useSeo } from '../../lib/seo'
import { trilhaDePaginas } from '../../lib/dadosEstruturados'
import { homeDoIdioma, type Idioma } from '../../lib/i18n'
import { FERRAMENTAS, ORDEM } from './conteudo'
import { UI } from './interface'
import { caminhoIndice } from './PaginaFerramenta'

const SEO: Record<Idioma, { title: string; description: string }> = {
  pt: { title: 'Calculadoras fitness gratuitas: IMC, peso ideal e calorias | ENDORFINAPP', description: 'Calculadoras gratuitas para quem treina: IMC, peso ideal, gasto calórico diário e calorias para emagrecer ou ganhar peso. Resultado na hora.' },
  en: { title: 'Free fitness calculators: BMI, ideal weight and calories | ENDORFINAPP', description: 'Free calculators for people who train: BMI, ideal weight, daily calorie needs and calories to lose or gain weight. Instant results.' },
}

export default function FerramentasIndice({ idioma }: { idioma: Idioma }) {
  const t = UI[idioma]
  const caminho = caminhoIndice(idioma)
  useSeo({
    ...SEO[idioma],
    path: caminho,
    jsonLd: trilhaDePaginas([{ nome: t.inicio, caminho: homeDoIdioma(idioma) }, { nome: t.ferramentas, caminho }]),
  })
  return (
    <LayoutPublico atual={caminho}>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-3">{t.todasFerramentas}</h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-8">{SEO[idioma].description}</p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {ORDEM.map((id) => {
            const f = FERRAMENTAS[id][idioma]
            return (
              <li key={id}>
                <Link to={f.caminho} className="flex h-full flex-col rounded-2xl border border-border bg-surface-card p-5 hover:border-primary focus-visible:ring-2 focus-visible:ring-ring">
                  <h2 className="text-lg font-bold mb-1">{f.nome}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{f.resumo}</p>
                  <span className="mt-auto text-sm font-semibold text-primary">{t.abrir} →</span>
                </Link>
              </li>
            )
          })}
        </ul>
        <p className="mt-6 text-xs text-muted-foreground max-w-2xl">{t.aviso}</p>
      </main>
    </LayoutPublico>
  )
}
