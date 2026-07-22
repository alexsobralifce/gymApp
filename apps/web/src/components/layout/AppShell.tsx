import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import type { AuthState } from '../../stores/auth'
import { api } from '../../api/client'
import { useThemeStore } from '../../stores/theme'
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
  PaletteIcon,
  MoreHorizontalIcon,
} from '../icons/Icon'
import AcademySidebar from '../social/AcademySidebar'
import { resolveMediaUrl } from '../../lib/media'

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

function UserAvatar({
  nome,
  fotoUrl,
  size = 'sm',
  ringClass = '',
}: {
  nome?: string | null
  fotoUrl?: string | null
  size?: 'sm' | 'md'
  ringClass?: string
}) {
  const dim = size === 'md' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs'
  const src = resolveMediaUrl(fotoUrl)

  if (src) {
    return (
      <img
        src={src}
        alt={nome || 'Avatar'}
        className={`${dim} shrink-0 rounded-full object-cover ring-2 ring-offset-2 ring-offset-surface ${ringClass}`}
      />
    )
  }

  return (
    <div className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white ring-2 ring-offset-2 ring-offset-surface ${ringClass}`}>
      {nome ? getInitials(nome) : '?'}
    </div>
  )
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
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const navigate = useNavigate()
  const location = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)
  const [colegasSheetOpen, setColegasSheetOpen] = useState(false)
  const [atividadeMural, setAtividadeMural] = useState(0)
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
    setMoreSheetOpen(false)
    setColegasSheetOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (user?.role !== 'ALUNO') return
    api.getAtividadeMural()
      .then((r) => setAtividadeMural(r.totalComentarios))
      .catch(() => {})
    const interval = setInterval(() => {
      api.getAtividadeMural()
        .then((r) => setAtividadeMural(r.totalComentarios))
        .catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [user])

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
    navigate('/', { replace: true })
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
              {entry.label === 'Mural' && atividadeMural > 0 && (
                <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {atividadeMural}
                </span>
              )}
            </NavLink>
          )
        )}
      </nav>

      <div className="border-t border-surface-input p-3 space-y-1">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text hover:bg-surface-input transition-colors cursor-pointer"
        >
          <PaletteIcon className="h-5 w-5 text-primary" />
          <span>Tema: {theme === 'lime' ? 'Lima & Navy' : theme === 'red' ? 'Vermelho & Preto' : theme === 'violet' ? 'Violeta & Preto' : 'Laranja & Grafite'}</span>
        </button>

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
    <div className="flex min-h-screen bg-surface overflow-x-hidden">
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
                {entry.label === 'Mural' && atividadeMural > 0 && (
                  <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {atividadeMural}
                  </span>
                )}
              </NavLink>
            )
          )}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        {!hideNav && (
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-surface-input glass px-4 shrink-0 safe-top" style={{ minHeight: `calc(3.5rem + env(safe-area-inset-top, 0px))` }}>
            <div className="flex items-center gap-3 min-w-0">
              {/* Hamburger for all users on mobile */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="md:hidden rounded-xl p-2.5 text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer -ml-2 min-h-11 min-w-11 flex items-center justify-center"
                title="Abrir Menu"
              >
                <MenuIcon className="h-5 w-5" />
              </button>
              <span className="text-sm font-bold text-primary md:hidden">GymApp</span>
              {pageTitle && (
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs text-text-muted">/</span>
                  <span className="text-sm font-semibold text-text">{pageTitle}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Theme toggle button */}
              <button
                onClick={toggleTheme}
                title={`Tema atual: ${theme === 'lime' ? 'Verde Lima & Navy' : theme === 'red' ? 'Vermelho & Preto' : theme === 'violet' ? 'Violeta & Preto' : 'Laranja & Grafite'}. Clique para alterar.`}
                className="flex items-center gap-1.5 rounded-xl border border-surface-input bg-surface-card px-2.5 py-1.5 text-xs font-semibold text-text hover:bg-surface-input active:scale-95 transition-all cursor-pointer"
              >
                <PaletteIcon className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">{theme === 'lime' ? 'Lima & Navy' : theme === 'red' ? 'Vermelho' : theme === 'violet' ? 'Violeta' : 'Laranja'}</span>
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="rounded-full hover:brightness-110 active:scale-95 transition-all cursor-pointer overflow-hidden"
                >
                  <UserAvatar nome={user?.nome} fotoUrl={user?.fotoUrl} size="sm" ringClass={ringColor} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-surface-input bg-surface-card shadow-xl z-30 overflow-hidden animate-scale-in">
                    <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-input">
                      <UserAvatar nome={user?.nome} fotoUrl={user?.fotoUrl} size="md" ringClass={`${ringColor} ring-offset-surface-card`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{user?.nome || 'Usuário'}</p>
                        <p className="text-xs text-text-muted truncate">{user?.email || ''}</p>
                        <span className="inline-block mt-0.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-text-muted">
                          {getRoleLabel(role)}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={toggleTheme}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-text hover:bg-surface-input transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <PaletteIcon className="h-4 w-4 text-primary" />
                          <span>Alternar Tema</span>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {theme === 'lime' ? 'Lima/Navy' : theme === 'red' ? 'Vermelho' : theme === 'violet' ? 'Violeta' : 'Laranja'}
                        </span>
                      </button>

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
            </div>
          </header>
        )}

        <div className="flex flex-1 min-h-0">
          <main className="flex-1 pb-20 md:pb-0 min-w-0">
            <Outlet />
          </main>
          {/* Academy sidebar — right panel desktop */}
          <aside className="hidden xl:block w-56 shrink-0 border-l border-surface-input bg-surface/50">
            <AcademySidebar />
          </aside>
        </div>

        {/* Bottom Sheet "Mais" para Aluno no Mobile */}
        {isAluno && moreSheetOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
              onClick={() => setMoreSheetOpen(false)}
            />
            <div className="relative bg-surface-card border-t border-surface-input rounded-t-3xl p-5 shadow-2xl space-y-4 animate-modal-pop z-10 safe-bottom">
              <div className="flex items-center justify-between border-b border-surface-input pb-3">
                <h3 className="text-base font-bold text-text flex items-center gap-2">
                  <span>✨</span> Acesso Rápido & Recursos
                </h3>
                <button
                  type="button"
                  onClick={() => setMoreSheetOpen(false)}
                  className="rounded-full bg-surface-input p-2 text-text-muted hover:text-text cursor-pointer"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { to: '/treino/ia', label: 'Treino por IA', icon: '✨', desc: 'Prescricao inteligente' },
                  { to: '/biblioteca-planos', label: 'Biblioteca Planos', icon: '📚', desc: '30+ fichas curadas' },
                  { to: '/amizades', label: 'Amigos', icon: '👥', desc: 'Rede social fitness' },
                  { to: '/medidas', label: 'Minhas Medidas', icon: '📏', desc: 'Peso e dobras' },
                  { to: '/clubes', label: 'Clubes', icon: '🏆', desc: 'Ranking & XP' },
                  { to: '/dados', label: 'Meu Perfil', icon: '👤', desc: 'Dados & Restricoes' },
                ].map((item) => (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => {
                      setMoreSheetOpen(false)
                      navigate(item.to)
                    }}
                    className="flex flex-col text-left p-3 rounded-2xl bg-surface border border-surface-input hover:border-primary/40 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="text-xl mb-1">{item.icon}</span>
                    <span className="text-xs font-bold text-text">{item.label}</span>
                    <span className="text-[10px] text-text-muted">{item.desc}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setMoreSheetOpen(false)
                  setTimeout(() => setColegasSheetOpen(true), 150)
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-surface-input py-3 text-sm font-bold text-text hover:bg-surface-input/70 active:scale-95 transition-all cursor-pointer min-h-11"
              >
                <UsersIcon className="h-4 w-4" />
                Alunos da Academia
              </button>

              <div className="pt-2 border-t border-surface-input flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMoreSheetOpen(false)
                    navigate('/alterar-senha')
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-muted hover:text-text cursor-pointer"
                >
                  <KeyIcon className="h-4 w-4" />
                  <span>Alterar Senha</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMoreSheetOpen(false)
                    navigate('/privacidade')
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-muted hover:text-text cursor-pointer"
                >
                  <ShieldIcon className="h-4 w-4" />
                  <span>Privacidade</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-primary-light hover:bg-primary/10 rounded-xl transition-all cursor-pointer"
                >
                  <LogOutIcon className="h-4 w-4" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Sheet "Colegas da Academia" para Aluno no Mobile */}
        {isAluno && colegasSheetOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
              onClick={() => setColegasSheetOpen(false)}
            />
            <div className="relative bg-surface-card border-t border-surface-input rounded-t-3xl shadow-2xl animate-modal-pop z-10 safe-bottom overflow-hidden max-h-[75vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-input shrink-0">
                <h3 className="text-base font-bold text-text flex items-center gap-2">
                  <Building2Icon className="h-5 w-5 text-primary" />
                  Alunos da Academia
                </h3>
                <button
                  type="button"
                  onClick={() => setColegasSheetOpen(false)}
                  className="rounded-full bg-surface-input p-2 text-text-muted hover:text-text cursor-pointer"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <AcademySidebar />
              </div>
            </div>
          </div>
        )}

        {/* Bottom tabs — mobile ALUNO */}
        {isAluno && !hideNav && (
          <nav className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-surface-input safe-bottom md:hidden">
            <div className="flex h-16 items-center justify-around px-1">
              {alunoBottomTabs.map((t) => {
                const isActive = t.end ? location.pathname === t.to : location.pathname.startsWith(t.to)
                const Icon = t.icon
                return (
                  <NavLink
                    key={t.to}
                    to={t.to}
                    end={t.end}
                    className="relative flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-11 min-h-11 cursor-pointer group"
                  >
                    <div className="relative">
                      <Icon className={`h-5 w-5 transition-all duration-200 ${isActive ? 'text-primary scale-110' : 'text-text-muted group-hover:text-text'}`} />
                      {t.label === 'Mural' && atividadeMural > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-primary font-bold' : 'text-text-muted'}`}>
                      {t.label}
                    </span>
                    {isActive && (
                      <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-0.5 w-7 rounded-full bg-primary animate-scale-in" />
                    )}
                  </NavLink>
                )
              })}

              {/* Tab: Mais */}
              <button
                type="button"
                onClick={() => setMoreSheetOpen(true)}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-11 min-h-11 cursor-pointer group ${
                  moreSheetOpen ? 'text-primary font-bold' : 'text-text-muted hover:text-text'
                }`}
              >
                <MoreHorizontalIcon className={`h-5 w-5 transition-all duration-200 ${moreSheetOpen ? 'text-primary scale-110' : ''}`} />
                <span className="text-[10px] font-medium">Mais</span>
                {moreSheetOpen && (
                  <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-0.5 w-7 rounded-full bg-primary animate-scale-in" />
                )}
              </button>
            </div>
          </nav>
        )}

        {/* Bottom nav placeholder for non-ALUNO on mobile when not in execution */}
        {!isAluno && !hideNav && <div className="md:hidden h-4" />}
      </div>
    </div>
  )
}
