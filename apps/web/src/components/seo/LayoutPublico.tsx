import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import EndorfinappLogo from '../branding/EndorfinappLogo'
import AvisoIdioma from './AvisoIdioma'
import { PAGINAS_SEO } from '../../pages/seo/paginasSeo'
import { PAGINAS_SEO_EN } from '../../pages/seo/paginasSeoEn'
import { ARTIGOS } from '../../lib/blog'
import { EMAIL_SUPORTE } from '../../config/contato'
import { alternativaDe, homeDoIdioma, idiomaDoCaminho } from '../../lib/i18n'

const ROTULO_LINK: Record<string, string> = {
  '/app-para-personal-trainer': 'App para personal trainer',
  '/software-para-academia': 'Software para academia',
  '/app-de-treino': 'App de treino para alunos',
  '/en/personal-trainer-app': 'Personal trainer app',
  '/en/gym-management-software': 'Gym management software',
  '/en/workout-app': 'Workout app for gym-goers',
}

const TEXTO = {
  pt: { principal: 'Principal', blog: 'Blog', planos: 'Planos', ferramentas: 'Ferramentas', entrar: 'Entrar', criar: 'Criar conta', veja: 'Veja também', quem: 'Quem somos', quemHref: '/quem-somos', privacidade: 'Privacidade', suporte: 'Suporte', outroIdioma: 'English', outroIdiomaNome: 'View this page in English', home: 'ENDORFINAPP, página inicial', ferramentasHref: '/ferramentas', planosHref: '/planos', privacidadeHref: '/politica-privacidade' },
  en: { principal: 'Main', blog: 'Blog', planos: 'Pricing', ferramentas: 'Tools', entrar: 'Sign in', criar: 'Sign up', veja: 'See also', quem: 'About us', quemHref: '/en/about-us', privacidade: 'Privacy', suporte: 'Support', outroIdioma: 'Português', outroIdiomaNome: 'Ver esta página em português', home: 'ENDORFINAPP, home', ferramentasHref: '/en/tools', planosHref: '/en/pricing', privacidadeHref: '/en/privacy-policy' },
}

/** Cabeçalho e rodapé das páginas públicas indexáveis (produto, blog, ferramentas), em português ou inglês. */
export default function LayoutPublico({ children, atual }: { children: ReactNode; atual?: string }) {
  const caminho = atual ?? '/'
  const idioma = idiomaDoCaminho(caminho)
  const t = TEXTO[idioma]
  const outro = alternativaDe(caminho)
  const produtos = idioma === 'en' ? PAGINAS_SEO_EN : PAGINAS_SEO
  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'DM Sans Variable', 'DM Sans', sans-serif" }}>
      <AvisoIdioma caminho={caminho} />
      <header className="border-b border-border bg-background/90 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <Link to={homeDoIdioma(idioma)} aria-label={t.home}>
            <EndorfinappLogo variant="horizontal" size={20} showSlogan={false} />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3 shrink-0" aria-label={t.principal}>
            {idioma === 'pt' && ARTIGOS.length > 0 && (
              <Link to="/blog" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground">{t.blog}</Link>
            )}
            <Link to={t.ferramentasHref} className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground">{t.ferramentas}</Link>
            <Link to={t.planosHref} className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground">{t.planos}</Link>
            {outro && (
              <Link to={outro.caminho} hrefLang={outro.idioma === 'en' ? 'en' : 'pt-BR'} lang={outro.idioma === 'en' ? 'en' : 'pt-BR'} aria-label={t.outroIdiomaNome} className="hidden min-h-11 items-center px-2 text-sm sm:inline-flex font-semibold text-muted-foreground hover:text-foreground">
                {t.outroIdioma}
              </Link>
            )}
            <Link to="/login" className="px-1 text-xs max-[340px]:hidden sm:text-sm text-muted-foreground hover:text-foreground whitespace-nowrap">{t.entrar}</Link>
            <Link to="/register" className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:brightness-110 whitespace-nowrap">
              {t.criar}
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="border-t border-border py-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row gap-4 justify-between text-sm text-muted-foreground">
          <nav aria-label={t.veja} className="flex flex-wrap gap-x-5 gap-y-2">
            {produtos.filter((p) => p.caminho !== caminho).map((o) => (
              <Link key={o.caminho} to={o.caminho} className="hover:text-foreground">{ROTULO_LINK[o.caminho]}</Link>
            ))}
            {idioma === 'pt' && ARTIGOS.length > 0 && caminho !== '/blog' && <Link to="/blog" className="hover:text-foreground">{t.blog}</Link>}
            <Link to={t.ferramentasHref} className="hover:text-foreground">{t.ferramentas}</Link>
            <Link to={t.planosHref} className="hover:text-foreground">{t.planos}</Link>
            {caminho !== t.quemHref && <Link to={t.quemHref} className="hover:text-foreground">{t.quem}</Link>}
            <Link to={t.privacidadeHref} className="hover:text-foreground">{t.privacidade}</Link>
            <a href={`mailto:${EMAIL_SUPORTE}`} className="hover:text-foreground">{t.suporte}</a>
            {outro && <Link to={outro.caminho} hrefLang={outro.idioma === 'en' ? 'en' : 'pt-BR'} lang={outro.idioma === 'en' ? 'en' : 'pt-BR'} className="hover:text-foreground sm:hidden">{t.outroIdioma}</Link>}
          </nav>
          <span>© 2026 ENDORFINAPP</span>
        </div>
      </footer>
    </div>
  )
}
