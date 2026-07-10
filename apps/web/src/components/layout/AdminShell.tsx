import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import type { AuthState } from '../../stores/auth'

export default function AdminShell() {
  const logout = useAuthStore((s: AuthState) => s.logout)
  const user = useAuthStore((s: AuthState) => s.user)
  const navigate = useNavigate()
  const isRoot = user?.role === 'ROOT'

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-56 flex-col border-r border-surface-input p-4 md:flex">
        <h2 className="mb-6 text-lg font-bold text-primary">GymApp {isRoot ? 'Root' : ''}</h2>
        <nav className="flex flex-col gap-1">
          <NavLink to="/" end className={({ isActive }: { isActive: boolean }) => `rounded px-3 py-2 text-sm ${isActive ? 'bg-surface-input text-text' : 'text-text-muted'}`}>
            {isRoot ? 'Painel Global' : 'Dashboard'}
          </NavLink>
          {isRoot && (
            <NavLink to="/vinculos" className={({ isActive }: { isActive: boolean }) => `rounded px-3 py-2 text-sm ${isActive ? 'bg-surface-input text-text' : 'text-text-muted'}`}>
              Vínculos Pendentes
            </NavLink>
          )}
          {!isRoot && (
            <>
              <NavLink to="/professores" className={({ isActive }: { isActive: boolean }) => `rounded px-3 py-2 text-sm ${isActive ? 'bg-surface-input text-text' : 'text-text-muted'}`}>
                Professores
              </NavLink>
              <NavLink to="/alunos" className={({ isActive }: { isActive: boolean }) => `rounded px-3 py-2 text-sm ${isActive ? 'bg-surface-input text-text' : 'text-text-muted'}`}>
                Alunos
              </NavLink>
            </>
          )}
        </nav>
        <div className="mt-auto">
          <button onClick={() => { logout(); navigate('/login') }} className="w-full rounded px-3 py-2 text-left text-sm text-text-muted hover:bg-surface-input">Sair</button>
        </div>
      </aside>
      <main className="flex-1">
        <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-surface-input bg-surface px-4 md:hidden">
          <h2 className="font-bold text-primary">GymApp {isRoot ? 'Root' : ''}</h2>
          <button onClick={() => { logout(); navigate('/login') }} className="text-sm text-text-muted">Sair</button>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
