import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, FileCheck, FileText, AlertTriangle, Users, Settings, LogOut, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn, getInitials } from '@/lib/utils'

const navItems = [
  { to: '/dashboard',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/checklists',          icon: ClipboardList,   label: 'Checklists' },
  { to: '/checklists/generate', icon: Sparkles,        label: 'AI Generator' },
  { to: '/audits',              icon: FileCheck,       label: 'Audits' },
  { to: '/corrective-actions',  icon: AlertTriangle,   label: 'Actions' },
  { to: '/reports',             icon: FileText,        label: 'Reports' },
]

const adminItems = [
  { to: '/users',    icon: Users,    label: 'Users'    },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar({ isOpen, onClose }) {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    if (onClose) onClose()
    await signOut()
    navigate('/login')
  }

  const handleNavLinkClick = () => {
    if (onClose) onClose()
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-200 md:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar drawer container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-brand-gray-100 transition-transform duration-300 md:translate-x-0 md:static md:w-56 shrink-0 h-full dark:bg-brand-gray-900 dark:border-brand-gray-800 transition-colors duration-150',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo and close button on mobile */}
        <div className="px-5 py-5 border-b border-brand-gray-100 flex items-center justify-between dark:border-brand-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand-black rounded-lg flex items-center justify-center dark:bg-brand-white">
              <ShieldCheck size={14} className="text-white dark:text-brand-black" />
            </div>
            <div>
              <span className="font-semibold text-sm text-brand-black tracking-tight dark:text-brand-white">CoreVork</span>
              <p className="text-[10px] text-brand-gray-400 -mt-0.5 dark:text-brand-gray-500">Audit Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-brand-gray-400 hover:bg-brand-gray-100 hover:text-brand-black transition-colors dark:text-brand-gray-400 dark:hover:bg-brand-gray-800 dark:hover:text-brand-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-2 mb-2 text-[10px] font-medium text-brand-gray-400 uppercase tracking-widest dark:text-brand-gray-500">Menu</p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/checklists'}
              onClick={handleNavLinkClick}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-brand-black text-white dark:bg-brand-white dark:text-brand-black'
                  : 'text-brand-gray-600 hover:bg-brand-gray-100 hover:text-brand-black dark:text-brand-gray-400 dark:hover:bg-brand-gray-800 dark:hover:text-brand-white'
              )}
            >
              <Icon size={15} />
              {label}
              {label === 'AI Generator' && (
                <span className="ml-auto text-[9px] bg-white/20 text-current px-1.5 py-0.5 rounded-full font-medium border border-current/20">NEW</span>
              )}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <p className="px-2 pt-4 mb-2 text-[10px] font-medium text-brand-gray-400 uppercase tracking-widest dark:text-brand-gray-500">Admin</p>
              {adminItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={handleNavLinkClick}
                  className={({ isActive }) => cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-brand-black text-white dark:bg-brand-white dark:text-brand-black'
                      : 'text-brand-gray-600 hover:bg-brand-gray-100 hover:text-brand-black dark:text-brand-gray-400 dark:hover:bg-brand-gray-800 dark:hover:text-brand-white'
                  )}
                >
                  <Icon size={15} />{label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-brand-gray-100 dark:border-brand-gray-800">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-brand-gray-200 flex items-center justify-center text-[11px] font-semibold text-brand-gray-700 shrink-0 dark:bg-brand-gray-800 dark:text-brand-gray-300">
              {getInitials(profile?.full_name || '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-brand-black truncate dark:text-brand-white">{profile?.full_name || 'User'}</p>
              <p className="text-[10px] text-brand-gray-400 capitalize dark:text-brand-gray-500">{profile?.role || 'inspector'}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-brand-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150 dark:text-brand-gray-400 dark:hover:bg-red-950/20 dark:hover:text-red-400">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
