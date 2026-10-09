import { Link } from 'react-router-dom'
import LayoutPublico from '../components/seo/LayoutPublico'
import { useSeo } from '../lib/seo'
import { useIdioma, type Idioma } from '../lib/i18n'
import { EMAIL_SUPORTE, SITE_URANO } from '../config/contato'

const CAMINHO: Record<Idioma, string> = { pt: '/quem-somos', en: '/en/about-us' }

const TEXTOS = {
  pt: {
    title: 'Quem somos | ENDORFINAPP',
    description: 'Conheça a equipe por trás do ENDORFINAPP, o app de treino para alunos, personal trainers e academias, desenvolvido pela Urano Sistemas.',
    h1: 'Quem somos',
    oQue: 'O que é o ENDORFINAPP',
    p1: 'O ENDORFINAPP nasceu para tirar o treino do papel solto e da conversa perdida no WhatsApp. O aluno acompanha a ficha com demonstração em GIF, o personal monta e ajusta os treinos sem planilha, e a academia enxerga tudo em um só lugar.',
    p2: 'Funciona no navegador do celular e dá para instalar na tela inicial. Você usa sozinho, com seu professor ou pela sua academia.',
    quemFaz: 'Quem faz',
    desenvolvido: 'O ENDORFINAPP é desenvolvido pela',
    empresa: ', empresa que cria software sob medida. Os textos do blog são assinados pela Equipe ENDORFINAPP.',
    comoEscrevemos: 'Como escrevemos no blog',
    p3: 'Escrevemos para quem treina e para quem orienta quem treina. Quando comentamos uma matéria de outro veículo, citamos a fonte e levamos você até o texto original. Nada do que publicamos substitui a orientação de um profissional de saúde ou de educação física.',
    contato: 'Fale com a gente',
    suporte: 'Suporte:',
    cta: 'Conhecer o ENDORFINAPP',
  },
  en: {
    title: 'About us | ENDORFINAPP',
    description: 'Meet the team behind ENDORFINAPP, the workout app for gym-goers, personal trainers and gyms, built by Urano Sistemas.',
    h1: 'About us',
    oQue: 'What ENDORFINAPP is',
    p1: 'ENDORFINAPP was built to get training off loose paper and out of lost chat threads. Members follow their plan with GIF demos, trainers build and adjust workouts without spreadsheets, and gyms see everything in one place.',
    p2: 'It runs in the phone browser and can be added to the home screen. Use it on your own, with your trainer or through your gym.',
    quemFaz: 'Who builds it',
    desenvolvido: 'ENDORFINAPP is built by',
    empresa: ', a company that creates custom software. Blog posts are signed by the ENDORFINAPP Team.',
    comoEscrevemos: 'How we write',
    p3: 'We write for people who train and for those who coach them. When we comment on an article from another outlet, we credit the source and send you to the original. Nothing we publish replaces advice from a health or fitness professional.',
    contato: 'Get in touch',
    suporte: 'Support:',
    cta: 'Get to know ENDORFINAPP',
  },
}

export default function QuemSomos() {
  const idioma = useIdioma()
  const t = TEXTOS[idioma]
  const caminho = CAMINHO[idioma]
  useSeo({
    title: t.title,
    description: t.description,
    path: caminho,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: t.title,
      inLanguage: idioma === 'en' ? 'en' : 'pt-BR',
      mainEntity: {
        '@type': 'Organization',
        name: 'ENDORFINAPP',
        email: EMAIL_SUPORTE,
        parentOrganization: { '@type': 'Organization', name: 'Urano Sistemas', url: SITE_URANO },
      },
    },
  })

  return (
    <LayoutPublico atual={caminho}>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-6">{t.h1}</h1>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-3">{t.oQue}</h2>
          <p className="mb-3 leading-relaxed text-foreground/90">{t.p1}</p>
          <p className="leading-relaxed text-foreground/90">{t.p2}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-3">{t.quemFaz}</h2>
          <p className="leading-relaxed text-foreground/90">
            {t.desenvolvido}{' '}
            <a href={SITE_URANO} target="_blank" rel="noopener noreferrer" className="underline text-primary">Urano Sistemas</a>
            {t.empresa}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-3">{t.comoEscrevemos}</h2>
          <p className="leading-relaxed text-foreground/90">{t.p3}</p>
        </section>

        <section className="rounded-xl border border-border bg-surface-card p-5 mb-8">
          <h2 className="text-lg font-bold mb-2">{t.contato}</h2>
          <p className="text-sm text-muted-foreground">
            {t.suporte}{' '}
            <a href={`mailto:${EMAIL_SUPORTE}`} className="underline text-primary">{EMAIL_SUPORTE}</a>
          </p>
        </section>

        <Link to="/register" className="inline-flex min-h-11 items-center px-6 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110">
          {t.cta}
        </Link>
      </main>
    </LayoutPublico>
  )
}
