import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import type { AuthState } from '../../stores/auth'
import {
  HomeIcon,
  DumbbellIcon,
  RulerIcon,
  ChartLineIcon,
  UsersIcon,
  UserPlusIcon,
  ClipboardListIcon,
  Building2Icon,
  BookOpenIcon,
  KeyIcon,
  TicketIcon,
  LayoutDashboardIcon,
  PlusIcon,
  LinkIcon,
  LogOutIcon,
  UserCircleIcon,
  MenuIcon,
  XIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  UserSearchIcon,
  ShieldIcon,
  TrophyIcon,
} from '../icons/Icon'
import AcademySidebar from '../social/AcademySidebar'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  end?: boolean
}

interface NavSection {
  label: string
  icon: React.ReactNode
  children: NavItem[]
}

type NavEntry = NavItem | NavSection

function isSection(entry: NavEntry): entry is NavSection {
  return 'children' in entry
}

function getInitials(nome?: string): string {
  if (!nome) return '?'
  const parts = nome.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return nome.slice(0, 2).toUpperCase()
}

function getRoleRingColor(role: string): string {
  switch (role) {
    case 'ALUNO': return 'ring-accent'
    case 'PROFESSOR': return 'ring-blue-500'
    case 'ACADEMIA': return 'ring-success'
    case 'ROOT': return 'ring-primary'
    default: return 'ring-text-muted'
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'ALUNO': return 'Aluno'
    case 'PROFESSOR': return 'Professor'
    case 'ACADEMIA': return 'Academia'
    case 'ROOT': return 'Root'
    default: return role
  }
}

function getNavItems(role: string): NavEntry[] {
  switch (role) {
    case 'ALUNO':
      return [
        { to: '/', label: 'Dashboard', icon: <LayoutDashboardIcon className="h-5 w-5" />, end: true },
        { to: '/meus-treinos', label: 'Meus Treinos', icon: <ClipboardListIcon className="h-5 w-5" /> },
        { to: '/dados', label: 'Meu Perfil', icon: <UserCircleIcon className="h-5 w-5" /> },
        { to: '/mural', label: 'Mural', icon: <MessageCircleIcon className="h-5 w-5" /> },
        { to: '/amizades', label: 'Amigos', icon: <UserSearchIcon className="h-5 w-5" /> },
        { to: '/medidas', label: 'Medidas', icon: <RulerIcon className="h-5 w-5" /> },
        { to: '/evolucao', label: 'Evolucao', icon: <ChartLineIcon className="h-5 w-5" /> },
        { to: '/clubes', label: 'Clubes', icon: <TrophyIcon className="h-5 w-5" /> },
        { to: '/alterar-senha', label: 'Alterar Senha', icon: <KeyIcon className="h-5 w-5" /> },
      ]
    case 'PROFESSOR':
      return [
        { to: '/', label: 'Dashboard', icon: <LayoutDashboardIcon className="h-5 w-5" />, end: true },
        {
          label: 'Treino',
          icon: <DumbbellIcon className="h-5 w-5" />,
          children: [
            { to: '/treinos', label: 'Listar Treinos', icon: <ClipboardListIcon className="h-4 w-4" /> },
            { to: '/treinos/criar', label: 'Criar Treino', icon: <PlusIcon className="h-4 w-4" /> },
          ],
        },
        { to: '/alunos/vincular', label: 'Vincular Aluno', icon: <UserPlusIcon className="h-5 w-5" /> },
        { to: '/fichas', label: 'Fichas', icon: <TicketIcon className="h-5 w-5" /> },
        { to: '/exercicios/criar', label: 'Exercicios', icon: <BookOpenIcon className="h-5 w-5" /> },
        { to: '/academias', label: 'Academias', icon: <Building2Icon className="h-5 w-5" /> },
        { to: '/alterar-senha', label: 'Alterar Senha', icon: <KeyIcon className="h-5 w-5" /> },
      ]
    case 'ACADEMIA':
      return [
        { to: '/', label: 'Dashboard', icon: <LayoutDashboardIcon className="h-5 w-5" />, end: true },
        {
          label: 'Treino',
          icon: <DumbbellIcon className="h-5 w-5" />,
          children: [
            { to: '/treinos', label: 'Listar Treinos', icon: <ClipboardListIcon className="h-4 w-4" /> },
            { to: '/treinos/criar', label: 'Criar Treino', icon: <PlusIcon className="h-4 w-4" /> },
          ],
        },
        { to: '/professores', label: 'Professores', icon: <UsersIcon className="h-5 w-5" /> },
        { to: '/alunos', label: 'Alunos', icon: <UsersIcon className="h-5 w-5" /> },
        { to: '/alterar-senha', label: 'Alterar Senha', icon: <KeyIcon className="h-5 w-5" /> },
      ]
    case 'ROOT':
      return [
        { to: '/', label: 'Painel Global', icon: <LayoutDashboardIcon className="h-5 w-5" />, end: true },
        { to: '/vinculos', label: 'Vinculos Pendentes', icon: <LinkIcon className="h-5 w-5" /> },
        { to: '/usuarios', label: 'Gerenciar Plataforma', icon: <UsersIcon className="h-5 w-5" /> },
        { to: '/social', label: 'Moderacao Social', icon: <MessageCircleIcon className="h-5 w-5" /> },
      ]
    default:
      return []
  }
}

const alunoBottomTabs = [
  { to: '/', label: 'Inicio', icon: HomeIcon, end: true },
  { to: '/meus-treinos', label: 'Treinos', icon: DumbbellIcon },
  { to: '/mural', label: 'Mural', icon: MessageCircleIcon },
  { to: '/evolucao', label: 'Evolucao', icon: ChartLineIcon },
]

function getPageTitle(pathname: string, role: string): string {
  const navItems = getNavItems(role)
  for (const entry of navItems) {
    if (isSection(entry)) {
      for (const child of entry.children) {
        if (child.end ? pathname === child.to : pathname.startsWith(child.to)) {
          return child.label
        }
      }
    } else {
      if (entry.end ? pathname === entry.to : pathname.startsWith(entry.to)) {
        return entry.label
      }
    }
  }
  return ''
}

function NavSectionComponent({ section, collapsed = false, onClick }: { section: NavSection; collapsed?: boolean; onClick?: () => void }) {
  const location = useLocation()
  const isChildActive = section.children.some((c) =>
    c.end ? location.pathname === c.to : location.pathname.startsWith(c.to)
  )
  const [open, setOpen] = useState(isChildActive)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
          isChildActive ? 'text-text bg-white/5' : 'text-text-muted hover:bg-white/5 hover:text-text'
        }`}
      >
        <span className="shrink-0">{section.icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{section.label}</span>
            <ChevronRightIcon className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
          </>
        )}
      </button>
      {open && (
        <div className={`ml-4 flex flex-col gap-0.5 border-l border-surface-input ${collapsed ? '' : 'ml-9 pl-3'}`}>
          {section.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              end={child.end}
              onClick={onClick}
              className={({ isActive }: { isActive: boolean }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all duration-200 ${
                  isActive ? 'bg-white/5 text-text font-medium' : 'text-text-muted hover:bg-white/5 hover:text-text'
                }`
              }
            >
              {child.icon}
              <span>{child.label}</span>
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
  const [drawerOpen, setDrawerOpen] = useState(false)
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

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  const role = user?.role || 'ALUNO'
  const isAluno = role === 'ALUNO'
  const hideNav = location.pathname.includes('/execucao')
  const navItems = getNavItems(role)
  const pageTitle = getPageTitle(location.pathname, role)
  const ringColor = getRoleRingColor(role)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
      isActive ? 'bg-white/5 text-text' : 'text-text-muted hover:bg-white/5 hover:text-text'
    }`

  function handleLogout() {
    setMenuOpen(false)
    setDrawerOpen(false)
    logout()
    navigate('/login')
  }

  function handleDados() {
    setMenuOpen(false)
    setDrawerOpen(false)
    navigate('/dados')
  }

  const renderDrawerContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-4 border-b border-surface-input">
        <span className="text-sm font-semibold text-text">Navegacao</span>
        <button
          onClick={() => setDrawerOpen(false)}
          className="rounded-lg p-2 text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((entry, i) =>
          isSection(entry) ? (
            <NavSectionComponent key={i} section={entry} onClick={() => setDrawerOpen(false)} />
          ) : (
            <NavLink
              key={entry.to}
              to={entry.to}
              end={entry.end}
              onClick={() => setDrawerOpen(false)}
              className={linkClass}
            >
              {entry.icon}
              <span>{entry.label}</span>
            </NavLink>
          )
        )}
      </nav>

      <AcademySidebar />

      <div className="border-t border-surface-input p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-primary-light hover:bg-primary/10 transition-all duration-200 cursor-pointer"
        >
          <LogOutIcon className="h-5 w-5" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-surface border-r border-surface-input shadow-2xl animate-slide-right">
            {renderDrawerContent()}
          </div>
        </div>
      )}

      {/* Sidebar — Desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-surface-input bg-surface/50 md:flex">
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((entry, i) =>
            isSection(entry) ? (
              <NavSectionComponent key={i} section={entry} />
            ) : (
              <NavLink key={entry.to} to={entry.to} end={entry.end} className={linkClass}>
                {entry.icon}
                <span>{entry.label}</span>
              </NavLink>
            )
          )}
        </nav>
        <AcademySidebar />
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        {!hideNav && (
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-surface-input glass px-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {/* Hamburger for non-ALUNO on mobile */}
              {!isAluno && (
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="md:hidden rounded-lg p-2 text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer -ml-2"
                >
                  <MenuIcon className="h-5 w-5" />
                </button>
              )}
              <span className="text-sm font-bold text-primary md:hidden">GymApp</span>
              {pageTitle && (
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs text-text-muted">/</span>
                  <span className="text-sm font-semibold text-text">{pageTitle}</span>
                </div>
              )}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white ring-2 ring-offset-2 ring-offset-surface ${ringColor} hover:brightness-110 transition-all cursor-pointer`}
              >
                {user ? getInitials(user.nome) : '?'}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-surface-input bg-surface-card shadow-xl z-30 overflow-hidden animate-scale-in">
                  <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-input">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white ring-2 ring-offset-2 ring-offset-surface-card ${ringColor}`}>
                      {user ? getInitials(user.nome) : '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{user?.nome || 'Usuário'}</p>
                      <p className="text-xs text-text-muted truncate">{user?.email || ''}</p>
                      <span className="inline-block mt-0.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-text-muted">
                        {getRoleLabel(role)}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    {isAluno && (
                      <>
                        <button
                          onClick={handleDados}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text hover:bg-surface-input transition-colors cursor-pointer"
                        >
                          <UserCircleIcon className="h-4 w-4 text-text-muted" />
                          Dados do Aluno
                        </button>
                        <button
                          onClick={() => { setMenuOpen(false); navigate('/privacidade') }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text hover:bg-surface-input transition-colors cursor-pointer"
                        >
                          <ShieldIcon className="h-4 w-4 text-text-muted" />
                          Privacidade
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-primary-light hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <LogOutIcon className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>
        )}

        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* Bottom tabs — mobile ALUNO */}
        {isAluno && !hideNav && (
          <nav className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-surface-input safe-bottom md:hidden">
            <div className="flex h-16 items-center justify-around px-2">
              {alunoBottomTabs.map((t) => {
                const isActive = t.end ? location.pathname === t.to : location.pathname.startsWith(t.to)
                const Icon = t.icon
                return (
                  <NavLink
                    key={t.to}
                    to={t.to}
                    end={t.end}
                    className="relative flex flex-col items-center justify-center gap-0.5 py-1 px-3 min-w-0 cursor-pointer group"
                  >
                    <Icon className={`h-6 w-6 transition-all duration-200 ${isActive ? 'text-primary scale-110' : 'text-text-muted group-hover:text-text'}`} />
                    <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-primary' : 'text-text-muted'}`}>
                      {t.label}
                    </span>
                    {isActive && (
                      <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary animate-scale-in" />
                    )}
                  </NavLink>
                )
              })}
            </div>
          </nav>
        )}

        {/* Bottom nav placeholder for non-ALUNO on mobile when not in execution */}
        {!isAluno && !hideNav && <div className="md:hidden h-4" />}
      </div>
    </div>
  )
}
