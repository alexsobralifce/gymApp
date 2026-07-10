import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import type { AuthState } from '../stores/auth'

export default function ProtectedRoute({ role }: { role?: string }) {
  const user = useAuthStore((s: AuthState) => s.user)

  if (!user) return <Navigate to="/login" />
  if (role && user.role !== role) return <Navigate to="/" />

  return <Outlet />
}
