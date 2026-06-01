import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Modal ──────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={cn('relative bg-white rounded-2xl shadow-modal w-full animate-slide-up dark:bg-brand-gray-900 dark:border dark:border-brand-gray-800', width)}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gray-100 dark:border-brand-gray-800">
          <h2 className="text-base font-semibold text-brand-black dark:text-brand-white">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 -mr-1">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── Badge ──────────────────────────────────────────────
const badgeVariants = {
  green: 'bg-green-50 text-green-700',
  yellow: 'bg-yellow-50 text-yellow-700',
  red: 'bg-red-50 text-red-600',
  gray: 'bg-brand-gray-100 text-brand-gray-600',
  blue: 'bg-blue-50 text-blue-700',
  black: 'bg-brand-black text-white',
}

export function Badge({ children, color = 'gray', className }) {
  return (
    <span className={cn('badge', badgeVariants[color], className)}>
      {children}
    </span>
  )
}

// ── Empty State ────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-brand-gray-100 flex items-center justify-center mb-4">
          <Icon size={22} className="text-brand-gray-400" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-brand-black mb-1">{title}</h3>
      {description && <p className="text-sm text-brand-gray-500 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────
export function Spinner({ size = 16 }) {
  return (
    <div
      className="border-2 border-brand-gray-200 border-t-brand-black rounded-full animate-spin"
      style={{ width: size, height: size }}
    />
  )
}

// ── Score Ring ─────────────────────────────────────────
export function ScoreRing({ score, size = 80 }) {
  const r = 30
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 85 ? '#16a34a' : score >= 60 ? '#ca8a04' : '#dc2626'

  return (
    <svg width={size} height={size} viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#F0F0F0" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="600" fill="#0A0A0A" fontFamily="DM Sans">
        {score}%
      </text>
    </svg>
  )
}

// ── Confirm Dialog ─────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-sm">
      <p className="text-sm text-brand-gray-600 mb-5">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>{confirmLabel}</button>
      </div>
    </Modal>
  )
}

// ── Progress Bar ───────────────────────────────────────
export function ProgressBar({ value, max, color = 'black' }) {
  const pct = Math.round((value / max) * 100) || 0
  const trackColor = color === 'black' ? 'bg-brand-black' : color === 'green' ? 'bg-green-500' : 'bg-yellow-500'
  return (
    <div className="w-full bg-brand-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={cn('h-1.5 rounded-full transition-all duration-500', trackColor)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
