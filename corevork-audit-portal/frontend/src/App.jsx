import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import ChecklistsPage from '@/pages/ChecklistsPage'
import ChecklistGeneratorPage from '@/pages/ChecklistGeneratorPage'
import AuditsPage from '@/pages/AuditsPage'
import AuditExecutionPage from '@/pages/AuditExecutionPage'
import ReportsPage from '@/pages/ReportsPage'
import CorrectiveActionsPage from '@/pages/CorrectiveActionsPage'
import UsersPage from '@/pages/UsersPage'
import SettingsPage from '@/pages/SettingsPage'

export default function App() {
  const initialize = useAuthStore(s => s.initialize)
  const loading = useAuthStore(s => s.loading)

  useEffect(() => { initialize() }, [initialize])

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-brand-gray-500">Loading CoreVork...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/checklists" element={<ChecklistsPage />} />
            <Route path="/checklists/generate" element={<ChecklistGeneratorPage />} />
            <Route path="/audits" element={<AuditsPage />} />
            <Route path="/audits/:id" element={<AuditExecutionPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/corrective-actions" element={<CorrectiveActionsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
