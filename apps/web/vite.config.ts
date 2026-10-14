import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { rotasPublicas } from './scripts/rotasPublicas.mjs'
import { PARES_IDIOMA } from './scripts/paresIdioma.mjs'

const ROTAS_PUBLICAS = rotasPublicas()
const ROTAS_PRIVADAS = [
  '/login', '/auth/', '/billing/', '/onboarding/', '/welcome', '/meus-treinos', '/treino/', '/treinos',
  '/dados', '/medidas', '/evolucao', '/feed', '/amizades', '/clubes', '/privacidade', '/alterar-senha',
  '/notificacoes/', '/exercicios/', '/alunos/', '/fichas', '/academias', '/avaliacoes', '/usuarios',
  '/vinculos', '/financeiro', '/social', '/biblioteca-planos', '/documentacao', '/parceiros',
]

/** Gera robots.txt, sitemap.xml e as tags dependentes do domínio (defina VITE_SITE_URL no build). */
function seoPlugin(siteUrl: string): Plugin {
  const base = siteUrl.replace(/\/+$/, '')
  return {
    name: 'endorfinapp-seo',
    // Pré-carrega a fonte do texto (DM Sans latin) para o LCP não esperar o CSS terminar de descobri-la.
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const fonte = Object.keys(ctx.bundle ?? {}).find((f) => /dm-sans-latin-wght-normal.*\.woff2$/.test(f))
        if (fonte) html = html.replace('</title>', `</title>\n    <link rel="preload" href="/${fonte}" as="font" type="font/woff2" crossorigin />`)
        const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'ENDORFINAPP',
        applicationCategory: 'HealthApplication',
        operatingSystem: 'Web, Android',
        description: 'Gestão de treinos, evolução e rede social fitness para alunos, personal trainers e academias.',
        inLanguage: 'pt-BR',
        ...(base && { url: base }),
      }
      return html
        .replace('<!-- %SEO_OG_IMAGE% -->', base ? `<meta property="og:image" content="${base}/feature-graphic.png" />\n    <meta name="twitter:image" content="${base}/feature-graphic.png" />` : '')
        .replace('<!-- %SEO_JSONLD% -->', `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`)
      },
    },
    generateBundle() {
      const robots = [
        'User-agent: *',
        ...ROTAS_PUBLICAS.filter((r) => r.indexavel && r.caminho !== '/').map((r) => `Allow: ${r.caminho}`),
        ...ROTAS_PRIVADAS.map((r) => `Disallow: ${r}`),
        ...(base ? ['', `Sitemap: ${base}/sitemap.xml`] : []),
        '',
      ].join('\n')
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
      if (!base) return
      const url = (caminho: string) => `${base}${caminho === '/' ? '' : caminho}`
      // lastmod só onde há data real (artigos do blog): páginas fixas não ganham a data do build, que o Google aprende a ignorar.
      // hreflang: cada URL lista as duas versões (inclusive ela mesma) e o x-default em português.
      const alternativas = (caminho: string) => {
        const par = PARES_IDIOMA.find((p) => p.pt === caminho || p.en === caminho)
        if (!par) return ''
        return [['pt-BR', par.pt], ['en', par.en], ['x-default', par.pt]]
          .map(([h, c]) => `<xhtml:link rel="alternate" hreflang="${h}" href="${url(c)}"/>`)
          .join('')
      }
      const urls = ROTAS_PUBLICAS.filter((r) => r.indexavel).map(
        (r) => `  <url><loc>${url(r.caminho)}</loc>${alternativas(r.caminho)}${r.lastmod ? `<lastmod>${r.lastmod}</lastmod>` : ''}</url>`,
      ).join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [tailwindcss(), react(), seoPlugin(env.VITE_SITE_URL ?? '')],
    server: { port: 5173, proxy: { '/api': 'http://localhost:3333', '/exercises': 'http://localhost:3333' } },
  }
})
