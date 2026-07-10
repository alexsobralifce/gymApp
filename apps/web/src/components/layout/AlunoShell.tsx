import { Outlet, NavLink, useLocation } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Treino', icon: '🏋️' },
  { to: '/medidas', label: 'Medidas', icon: '📏' },
  { to: '/evolucao', label: 'Evolução', icon: '📈' },
]

export default function AlunoShell() {
  const location = useLocation()
  const hideNav = location.pathname.includes('/execucao')

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 flex h-14 items-center justify-around border-t border-surface-input bg-surface-card">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.to === '/'}
                className={({ isActive }: { isActive: boolean }) =>
                  `flex flex-col items-center text-xs gap-0.5 ${isActive ? 'text-primary' : 'text-text-muted'}`
                }
              >
              <span className="text-lg">{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
