import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function AuthGuard() {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
