import { Link } from 'react-router-dom'
import { Dumbbell, Users, Building2, Calculator } from 'lucide-react'
import LayoutPublico from '../../components/seo/LayoutPublico'
import { useSeo } from '../../lib/seo'
import { dadosDoSite } from '../../lib/dadosEstruturados'

const PUBLICOS = [
  { icone: Dumbbell, titulo: 'For gym-goers', texto: 'Build your workouts or use ready-made plans, follow guided exercises and track your progress.', href: '/en/workout-app' },
  { icone: Users, titulo: 'For personal trainers', texto: 'Build plans, send them to clients and follow their sessions and measurements.', href: '/en/personal-trainer-app' },
  { icone: Building2, titulo: 'For gyms', texto: 'Manage trainers and members, follow workouts in progress and promote offers.', href: '/en/gym-management-software' },
]

export default function HomeEn() {
  useSeo({
    title: 'ENDORFINAPP: workout app for gym-goers, trainers and gyms',
    description: 'Build workouts, follow guided exercises and track progress. For gym-goers, personal trainers and gyms, with free fitness calculators.',
    path: '/en',
    jsonLd: dadosDoSite(),
  })
  return (
    <LayoutPublico atual="/en">
      <main>
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">The workout app for gym-goers, trainers and gyms</h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-8">Build workouts, follow guided exercises with GIF demos and watch your progress. Train alone, with a trainer or through your gym.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="inline-flex min-h-11 items-center justify-center px-6 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110">Create free account</Link>
            <Link to="/en/tools" className="inline-flex min-h-11 items-center justify-center px-6 rounded-xl border border-border font-semibold hover:bg-surface-card">Free calculators</Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">The app is available in English and Portuguese.</p>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-14" aria-labelledby="quem">
          <h2 id="quem" className="text-2xl font-bold mb-6 text-center">Who it is for</h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {PUBLICOS.map(({ icone: Icone, titulo, texto, href }) => (
              <li key={href}>
                <Link to={href} className="flex h-full flex-col rounded-2xl border border-border bg-surface-card p-5 hover:border-primary focus-visible:ring-2 focus-visible:ring-ring">
                  <Icone className="mb-3 h-6 w-6 text-primary" aria-hidden="true" />
                  <h3 className="text-lg font-bold mb-1">{titulo}</h3>
                  <p className="text-sm text-muted-foreground">{texto}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
          <div className="rounded-2xl border border-border bg-surface-card p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Calculator className="h-8 w-8 text-primary shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">Free fitness calculators</h2>
              <p className="text-sm text-muted-foreground">BMI, ideal weight, daily calories and calorie goals. Results in seconds, no sign-up.</p>
            </div>
            <Link to="/en/tools" className="inline-flex min-h-11 items-center px-5 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110">Open tools</Link>
          </div>
        </section>
      </main>
    </LayoutPublico>
  )
}
