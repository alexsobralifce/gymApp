import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import type { AuthState } from '../../stores/auth'

interface NavItem {
  to: string
  label: string
  end?: boolean
}

interface NavSection {
  label: string
  children: NavItem[]
}

type NavEntry = NavItem | NavSection

function isSection(entry: NavEntry): entry is NavSection {
  return 'children' in entry
}

function getNavItems(role: string): NavEntry[] {
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
        {
          label: 'Treino',
          children: [
            { to: '/treinos', label: 'Listar Treinos' },
            { to: '/treinos/criar', label: 'Criar Treino' },
          ],
        },
        { to: '/alunos/vincular', label: 'Vincular Aluno' },
        { to: '/fichas', label: 'Fichas' },
        { to: '/exercicios/criar', label: 'Exercícios' },
        { to: '/academias', label: 'Academias' },
        { to: '/alterar-senha', label: 'Alterar Senha' },
      ]
    case 'ACADEMIA':
      return [
        { to: '/', label: 'Dashboard', end: true },
        {
          label: 'Treino',
          children: [
            { to: '/treinos', label: 'Listar Treinos' },
            { to: '/treinos/criar', label: 'Criar Treino' },
          ],
        },
        { to: '/professores', label: 'Professores' },
        { to: '/alunos', label: 'Alunos' },
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

function NavSectionComponent({ section }: { section: NavSection }) {
  const location = useLocation()
  const isChildActive = section.children.some((c) =>
    c.end ? location.pathname === c.to : location.pathname.startsWith(c.to)
  )
  const [open, setOpen] = useState(isChildActive)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm cursor-pointer ${
          isChildActive ? 'text-text' : 'text-text-muted'
        } hover:bg-surface-input`}
      >
        <span>{section.label}</span>
        <span className={`text-xs transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>
      {open && (
        <div className="ml-3 flex flex-col gap-1 border-l border-surface-input pl-2">
          {section.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              end={child.end}
              className={({ isActive }: { isActive: boolean }) =>
                `rounded px-3 py-1.5 text-sm ${isActive ? 'bg-surface-input text-text' : 'text-text-muted'}`
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

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
          {navItems.map((entry, i) =>
            isSection(entry) ? (
              <NavSectionComponent key={i} section={entry} />
            ) : (
              <NavLink key={entry.to} to={entry.to} end={entry.end} className={linkClass}>
                {entry.label}
              </NavLink>
            )
          )}
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
