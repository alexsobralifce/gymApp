import { Link } from 'react-router-dom'
import LayoutPublico from '../components/seo/LayoutPublico'
import { useSeo } from '../lib/seo'
import { EMAIL_SUPORTE, SITE_URANO } from '../config/contato'

const dadosEstruturados = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'Quem somos | ENDORFINAPP',
  inLanguage: 'pt-BR',
  mainEntity: {
    '@type': 'Organization',
    name: 'ENDORFINAPP',
    email: EMAIL_SUPORTE,
    parentOrganization: { '@type': 'Organization', name: 'Urano Sistemas', url: SITE_URANO },
  },
}

export default function QuemSomos() {
  useSeo({
    title: 'Quem somos | ENDORFINAPP',
    description: 'Conheça a equipe por trás do ENDORFINAPP, o app de treino para alunos, personal trainers e academias, desenvolvido pela Urano Sistemas.',
    path: '/quem-somos',
    jsonLd: dadosEstruturados,
  })

  return (
    <LayoutPublico atual="/quem-somos">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-6">Quem somos</h1>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-3">O que é o ENDORFINAPP</h2>
          <p className="mb-3 leading-relaxed text-foreground/90">
            O ENDORFINAPP nasceu para tirar o treino do papel solto e da conversa perdida no WhatsApp. O aluno acompanha a ficha com demonstração em GIF,
            o personal monta e ajusta os treinos sem planilha, e a academia enxerga tudo em um só lugar.
          </p>
          <p className="leading-relaxed text-foreground/90">
            Funciona no navegador do celular e dá para instalar na tela inicial. Você usa sozinho, com seu professor ou pela sua academia.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-3">Quem faz</h2>
          <p className="leading-relaxed text-foreground/90">
            O ENDORFINAPP é desenvolvido pela{' '}
            <a href={SITE_URANO} target="_blank" rel="noopener noreferrer" className="underline text-primary">Urano Sistemas</a>
            , empresa que cria software sob medida. Os textos do blog são assinados pela Equipe ENDORFINAPP.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-3">Como escrevemos no blog</h2>
          <p className="leading-relaxed text-foreground/90">
            Escrevemos para quem treina e para quem orienta quem treina. Quando comentamos uma matéria de outro veículo, citamos a fonte e levamos você até o texto original.
            Nada do que publicamos substitui a orientação de um profissional de saúde ou de educação física.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-surface-card p-5 mb-8">
          <h2 className="text-lg font-bold mb-2">Fale com a gente</h2>
          <p className="text-sm text-muted-foreground">
            Suporte:{' '}
            <a href={`mailto:${EMAIL_SUPORTE}`} className="underline text-primary">{EMAIL_SUPORTE}</a>
          </p>
        </section>

        <Link to="/register" className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110">
          Conhecer o ENDORFINAPP
        </Link>
      </main>
    </LayoutPublico>
  )
}
