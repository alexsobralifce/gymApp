import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import EndorfinappLogo from '../branding/EndorfinappLogo'
import { PAGINAS_SEO } from '../../pages/seo/paginasSeo'
import { ARTIGOS } from '../../lib/blog'

const ROTULO_LINK: Record<string, string> = {
  '/app-para-personal-trainer': 'App para personal trainer',
  '/software-para-academia': 'Software para academia',
  '/app-de-treino': 'App de treino para alunos',
}

/** Cabeçalho e rodapé das páginas públicas indexáveis (páginas de produto e blog). */
export default function LayoutPublico({ children, atual }: { children: ReactNode; atual?: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <header className="border-b border-border bg-background/90 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" aria-label="ENDORFINAPP, página inicial">
            <EndorfinappLogo variant="horizontal" size={26} showSlogan={false} />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3 shrink-0" aria-label="Principal">
            {ARTIGOS.length > 0 && (
              <Link to="/blog" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground">Blog</Link>
            )}
            <Link to="/planos" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground">Planos</Link>
            <Link to="/login" className="px-2 text-sm text-muted-foreground hover:text-foreground whitespace-nowrap">Entrar</Link>
            <Link to="/register" className="px-3 sm:px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:brightness-110 whitespace-nowrap">
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="border-t border-border py-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row gap-4 justify-between text-sm text-muted-foreground">
          <nav aria-label="Veja também" className="flex flex-wrap gap-x-5 gap-y-2">
            {PAGINAS_SEO.filter((p) => p.caminho !== atual).map((o) => (
              <Link key={o.caminho} to={o.caminho} className="hover:text-foreground">{ROTULO_LINK[o.caminho]}</Link>
            ))}
            {ARTIGOS.length > 0 && atual !== '/blog' && <Link to="/blog" className="hover:text-foreground">Blog</Link>}
            <Link to="/planos" className="hover:text-foreground">Planos</Link>
            <Link to="/politica-privacidade" className="hover:text-foreground">Privacidade</Link>
          </nav>
          <span>© 2026 ENDORFINAPP</span>
        </div>
      </footer>
    </div>
  )
}
