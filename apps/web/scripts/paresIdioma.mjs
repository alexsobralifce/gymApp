// Fonte única dos pares de páginas PT ↔ EN (hreflang, seletor de idioma e sitemap).
// Só entra aqui a página que existe nos dois idiomas.
export const PARES_IDIOMA = [
  { pt: '/', en: '/en' },
  { pt: '/quem-somos', en: '/en/about-us' },
  { pt: '/app-para-personal-trainer', en: '/en/personal-trainer-app' },
  { pt: '/software-para-academia', en: '/en/gym-management-software' },
  { pt: '/app-de-treino', en: '/en/workout-app' },
  { pt: '/planos', en: '/en/pricing' },
  { pt: '/politica-privacidade', en: '/en/privacy-policy' },
  { pt: '/ferramentas', en: '/en/tools' },
  { pt: '/ferramentas/calculadora-imc', en: '/en/tools/bmi-calculator' },
  { pt: '/ferramentas/peso-ideal', en: '/en/tools/ideal-weight-calculator' },
  { pt: '/ferramentas/gasto-calorico', en: '/en/tools/calorie-calculator' },
  { pt: '/ferramentas/calorias-para-meta', en: '/en/tools/calorie-goal-calculator' },
]

/** Caminho equivalente no outro idioma, ou null quando a página não tem tradução. */
export function alternativaDe(caminho) {
  const par = PARES_IDIOMA.find((p) => p.pt === caminho || p.en === caminho)
  if (!par) return null
  return par.pt === caminho ? { idioma: 'en', caminho: par.en } : { idioma: 'pt', caminho: par.pt }
}
