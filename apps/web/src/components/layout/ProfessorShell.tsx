import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import type { AuthState } from '../../stores/auth'

export default function ProfessorShell() {
  const logout = useAuthStore((s: AuthState) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-56 flex-col border-r border-surface-input p-4 md:flex">
        <h2 className="mb-6 text-lg font-bold text-primary">GymApp</h2>
        <nav className="flex flex-col gap-1">
          <NavLink to="/" end className={({ isActive }: { isActive: boolean }) => `rounded px-3 py-2 text-sm ${isActive ? 'bg-surface-input text-text' : 'text-text-muted'}`}>Dashboard</NavLink>
          <NavLink to="/alunos/vincular" className={({ isActive }: { isActive: boolean }) => `rounded px-3 py-2 text-sm ${isActive ? 'bg-surface-input text-text' : 'text-text-muted'}`}>Vincular Aluno</NavLink>
          <NavLink to="/treinos/criar" className={({ isActive }: { isActive: boolean }) => `rounded px-3 py-2 text-sm ${isActive ? 'bg-surface-input text-text' : 'text-text-muted'}`}>Criar Treino</NavLink>
          <NavLink to="/exercicios/criar" className={({ isActive }: { isActive: boolean }) => `rounded px-3 py-2 text-sm ${isActive ? 'bg-surface-input text-text' : 'text-text-muted'}`}>Exercícios</NavLink>
          <NavLink to="/academias" className={({ isActive }: { isActive: boolean }) => `rounded px-3 py-2 text-sm ${isActive ? 'bg-surface-input text-text' : 'text-text-muted'}`}>Academias</NavLink>
        </nav>
        <div className="mt-auto">
          <button onClick={() => { logout(); navigate('/login') }} className="w-full rounded px-3 py-2 text-left text-sm text-text-muted hover:bg-surface-input">Sair</button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-surface-input bg-surface px-4 md:hidden">
          <h2 className="font-bold text-primary">GymApp</h2>
          <button onClick={() => { logout(); navigate('/login') }} className="text-sm text-text-muted">Sair</button>
        </div>
        {location.pathname === '/' ? null : (
          <button onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-text-muted md:hidden">Voltar</button>
        )}
        <Outlet />
      </main>
    </div>
  )
}
