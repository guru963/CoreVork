import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Menu, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/checklists': 'Checklist Library',
  '/audits': 'Audits',
  '/reports': 'Reports',
  '/users': 'User Management',
  '/settings': 'Settings',
}

export default function TopBar({ onToggleSidebar }) {
  const { pathname } = useLocation()
  const profile = useAuthStore(s => s.profile)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  const title = pageTitles[pathname] ?? 'CoreVork'
  const org = profile?.organizations?.name

  return (
    <header className="h-14 bg-white border-b border-brand-gray-100 px-4 sm:px-6 flex items-center justify-between shrink-0 dark:bg-brand-gray-900 dark:border-brand-gray-800 transition-colors duration-150">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 -ml-1 rounded-lg text-brand-gray-500 hover:bg-brand-gray-100 hover:text-brand-black md:hidden transition-colors dark:text-brand-gray-400 dark:hover:bg-brand-gray-800 dark:hover:text-brand-white"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-brand-black leading-none dark:text-brand-white">{title}</h1>
          {org && <p className="text-[10px] text-brand-gray-400 mt-0.5 dark:text-brand-gray-500">{org}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="btn-ghost p-2 text-brand-gray-500 hover:text-brand-black dark:text-brand-gray-400 dark:hover:text-brand-white"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="btn-ghost p-2 relative">
          <Bell size={16} />
        </button>
      </div>
    </header>
  )
}
