import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { rotasPublicas } from './scripts/rotasPublicas.mjs'

const ROTAS_PUBLICAS = rotasPublicas()
const ROTAS_PRIVADAS = [
  '/login', '/auth/', '/billing/', '/onboarding/', '/welcome', '/meus-treinos', '/treino/', '/treinos',
  '/dados', '/medidas', '/evolucao', '/feed', '/amizades', '/clubes', '/privacidade', '/alterar-senha',
  '/notificacoes/', '/exercicios/', '/alunos/', '/fichas', '/academias', '/avaliacoes', '/usuarios',
  '/vinculos', '/financeiro', '/social', '/biblioteca-planos', '/documentacao', '/parceiros', '/noticias',
]

/** Gera robots.txt, sitemap.xml e as tags dependentes do domínio (defina VITE_SITE_URL no build). */
function seoPlugin(siteUrl: string): Plugin {
  const base = siteUrl.replace(/\/+$/, '')
  return {
    name: 'endorfinapp-seo',
    transformIndexHtml(html) {
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
    generateBundle() {
      const robots = [
        'User-agent: *',
        ...ROTAS_PUBLICAS.filter((r) => r.caminho !== '/').map((r) => `Allow: ${r.caminho}`),
        ...ROTAS_PRIVADAS.map((r) => `Disallow: ${r}`),
        ...(base ? ['', `Sitemap: ${base}/sitemap.xml`] : []),
        '',
      ].join('\n')
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
      if (!base) return
      const hoje = new Date().toISOString().slice(0, 10)
      const urls = ROTAS_PUBLICAS.map(
        (r) => `  <url><loc>${base}${r.caminho === '/' ? '' : r.caminho}</loc><lastmod>${r.lastmod ?? hoje}</lastmod></url>`,
      ).join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
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
