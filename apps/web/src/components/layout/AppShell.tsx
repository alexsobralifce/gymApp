import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import type { AuthState } from '../../stores/auth'

interface NavItem {
  to: string
  label: string
  end?: boolean
}

function getNavItems(role: string): NavItem[] {
  switch (role) {
    case 'ALUNO':
        return [
          { to: '/', label: 'Dashboard', end: true },
          { to: '/meus-treinos', label: 'Meus Treinos' },
          { to: '/medidas', label: 'Medidas' },
          { to: '/evolucao', label: 'Evolução' },
          { to: '/estudo', label: 'Estudo' },
          { to: '/alterar-senha', label: 'Alterar Senha' },
        ]
    case 'PROFESSOR':
      return [
        { to: '/', label: 'Dashboard', end: true },
        { to: '/treinos', label: 'Treino' },
        { to: '/treinos/criar', label: 'Criar Treino' },
        { to: '/alunos/vincular', label: 'Vincular Aluno' },
        { to: '/fichas', label: 'Fichas' },
        { to: '/exercicios/criar', label: 'Exercícios' },
        { to: '/academias', label: 'Academias' },
        { to: '/alterar-senha', label: 'Alterar Senha' },
      ]
    case 'ACADEMIA':
      return [
        { to: '/', label: 'Dashboard', end: true },
        { to: '/treinos', label: 'Treino' },
        { to: '/professores', label: 'Professores' },
        { to: '/alunos', label: 'Alunos' },
        { to: '/treinos/criar', label: 'Criar Treino' },
        { to: '/alterar-senha', label: 'Alterar Senha' },
      ]
    case 'ROOT':
      return [
        { to: '/', label: 'Painel Global', end: true },
        { to: '/vinculos', label: 'Vínculos Pendentes' },
        { to: '/usuarios', label: 'Gerenciar Plataforma' },
      ]
    default:
      return []
  }
}

const alunoBottomTabs = [
  { to: '/', label: 'Início', icon: '🏠', end: true },
  { to: '/meus-treinos', label: 'Treinos', icon: '🏋️' },
  { to: '/medidas', label: 'Medidas', icon: '📏' },
  { to: '/evolucao', label: 'Evolução', icon: '📈' },
]

export default function AppShell() {
  const logout = useAuthStore((s: AuthState) => s.logout)
  const user = useAuthStore((s: AuthState) => s.user)
  const navigate = useNavigate()
  const location = useLocation()

  const role = user?.role || 'ALUNO'
  const isAluno = role === 'ALUNO'
  const hideNav = location.pathname.includes('/execucao')
  const navItems = getNavItems(role)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded px-3 py-2 text-sm ${isActive ? 'bg-surface-input text-text' : 'text-text-muted'}`

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-56 flex-col border-r border-surface-input p-4 md:flex">
        <h2 className="mb-6 text-lg font-bold text-primary">GymApp</h2>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="w-full rounded px-3 py-2 text-left text-sm text-text-muted hover:bg-surface-input"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1">
        {!isAluno && (
          <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-surface-input bg-surface px-4 md:hidden">
            <h2 className="font-bold text-primary">GymApp</h2>
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="text-sm text-text-muted"
            >
              Sair
            </button>
          </div>
        )}

        <Outlet />

        {isAluno && !hideNav && (
          <nav className="fixed bottom-0 left-0 right-0 flex h-14 items-center justify-around border-t border-surface-input bg-surface-card md:hidden">
            {alunoBottomTabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
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
      </main>
    </div>
  )
}
