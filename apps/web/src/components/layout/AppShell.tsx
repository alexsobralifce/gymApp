import { useState, useRef, useEffect } from 'react'
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

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return nome.slice(0, 2).toUpperCase()
}

function getNavItems(role: string): NavEntry[] {
  switch (role) {
    case 'ALUNO':
        return [
          { to: '/', label: 'Dashboard', end: true },
          { to: '/meus-treinos', label: 'Meus Treinos' },
          { to: '/medidas', label: 'Medidas' },
          { to: '/evolucao', label: 'Evolução' },
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

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  const role = user?.role || 'ALUNO'
  const isAluno = role === 'ALUNO'
  const hideNav = location.pathname.includes('/execucao')
  const navItems = getNavItems(role)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded px-3 py-2 text-sm ${isActive ? 'bg-surface-input text-text' : 'text-text-muted'}`

  function handleLogout() {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }

  function handleDados() {
    setMenuOpen(false)
    if (isAluno) {
      navigate('/medidas')
    }
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar — desktop */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-surface-input p-4 md:flex">
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
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar — todas as telas */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-surface-input bg-surface px-4 shrink-0">
          <span className="text-sm font-bold text-primary md:hidden">GymApp</span>
          <span className="hidden md:block" />

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white hover:brightness-110 transition-all cursor-pointer"
            >
              {user ? getInitials(user.nome) : '?'}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-surface-input bg-surface-card shadow-xl z-30 overflow-hidden">
                <div className="flex flex-col items-center gap-1 px-4 py-4 border-b border-surface-input">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {user ? getInitials(user.nome) : '?'}
                  </div>
                  <p className="text-sm font-semibold text-text text-center">{user?.nome || 'Usuário'}</p>
                  <p className="text-xs text-text-muted text-center truncate max-w-full">{user?.email || ''}</p>
                </div>

                <div className="py-1">
                  <button
                    onClick={handleDados}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text hover:bg-surface-input transition-colors cursor-pointer"
                  >
                    <span className="text-base">👤</span>
                    Dados do Aluno
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-muted hover:bg-surface-input transition-colors cursor-pointer"
                  >
                    <span className="text-base">🚪</span>
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 pb-14 md:pb-0">
          <Outlet />
        </main>

        {/* Bottom tabs — mobile ALUNO */}
        {isAluno && !hideNav && (
          <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-around border-t border-surface-input bg-surface-card md:hidden">
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
      </div>
    </div>
  )
}
