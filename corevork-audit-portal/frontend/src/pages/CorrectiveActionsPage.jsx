import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, CircleDot, GripVertical } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useCorrectiveStore } from '@/store/correctiveStore'
import { Badge, EmptyState, Spinner } from '@/components/ui'
import { formatDate, cn } from '@/lib/utils'

const STATUS_COLS = [
  { key: 'open',        label: 'Open',        icon: CircleDot,    color: 'text-red-500',    bg: 'bg-red-50'    },
  { key: 'in_progress', label: 'In Progress',  icon: Clock,        color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { key: 'resolved',    label: 'Resolved',     icon: CheckCircle2, color: 'text-green-500',  bg: 'bg-green-50'  },
]
const PRIORITY_COLOR = { critical: 'red', high: 'yellow', medium: 'blue', low: 'gray' }

function ActionCard({ action, onStatusChange, onDragStart, onDragEnd, isDragging }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, action.id)}
      onDragEnd={onDragEnd}
      className={cn(
        'card p-3 hover:shadow-card-hover transition-all duration-200 cursor-grab active:cursor-grabbing select-none',
        isDragging
          ? 'opacity-30 border-dashed border-brand-gray-300 dark:border-brand-gray-700 shadow-none bg-brand-gray-50 dark:bg-brand-gray-800/40'
          : 'bg-white dark:bg-brand-gray-800'
      )}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-start gap-2">
        <div className="text-brand-gray-300 dark:text-brand-gray-600 hover:text-brand-gray-400 dark:hover:text-brand-gray-500 shrink-0 mt-0.5 cursor-grab">
          <GripVertical size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-brand-black dark:text-brand-white leading-snug line-clamp-2">{action.action}</p>
          <p className="text-[11px] text-brand-gray-400 dark:text-brand-gray-500 mt-1 truncate">{action.section_title}</p>
        </div>
        <Badge color={PRIORITY_COLOR[action.priority] || 'gray'} className="shrink-0 capitalize text-[10px]">
          {action.priority}
        </Badge>
      </div>
      {action.due_date && (
        <p className="text-[11px] text-brand-gray-400 dark:text-brand-gray-500 mt-2 ml-5">Due {formatDate(action.due_date)}</p>
      )}
      {open && (
        <div className="mt-3 pt-3 border-t border-brand-gray-100 dark:border-brand-gray-700 space-y-2 animate-slide-up ml-5">
          <p className="text-[11px] text-brand-gray-500 dark:text-brand-gray-400 leading-relaxed">
            <span className="font-medium text-brand-gray-700 dark:text-brand-gray-300">Finding: </span>{action.question_text}
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_COLS.map(s => (
              <button key={s.key} onClick={e => { e.stopPropagation(); onStatusChange(action.id, s.key) }}
                className={cn('flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-all',
                  action.status === s.key
                    ? 'border-brand-black bg-brand-black text-white dark:border-brand-white dark:bg-brand-white dark:text-brand-black'
                    : 'border-brand-gray-200 text-brand-gray-600 hover:border-brand-gray-400 dark:border-brand-gray-700 dark:text-brand-gray-400 dark:hover:border-brand-gray-500'
                )}>
                <s.icon size={10} />{s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CorrectiveActionsPage() {
  const { profile, user } = useAuthStore()
  const { actions, fetchActions, updateStatus, loading } = useCorrectiveStore()
  const [priority, setPriority] = useState('')
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)

  // Use org_id if available, otherwise fetch all accessible actions
  const orgId = profile?.org_id || null

  useEffect(() => {
    // Fetch as soon as we have either profile or user
    if (profile || user) fetchActions(orgId)
  }, [profile?.org_id, user?.id])

  const filtered   = actions.filter(a => !priority || a.priority === priority)
  const byStatus   = (status) => filtered.filter(a => a.status === status)
  const counts     = {
    open:        actions.filter(a => a.status === 'open').length,
    in_progress: actions.filter(a => a.status === 'in_progress').length,
    resolved:    actions.filter(a => a.status === 'resolved').length,
  }

  // Drag and Drop handlers
  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id)
    setDraggedId(id)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverCol(null)
  }

  const handleDragOver = (e, colKey) => {
    e.preventDefault()
    setDragOverCol(colKey)
  }

  const handleDragLeave = () => {
    setDragOverCol(null)
  }

  const handleDrop = async (e, colKey) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (id) {
      await updateStatus(id, colKey)
    }
    setDraggedId(null)
    setDragOverCol(null)
  }

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="page-header flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Corrective Actions</h1>
          <p className="page-subtitle">Track and resolve non-compliance findings from submitted audits.</p>
        </div>
        <select className="input sm:w-auto self-start" value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {STATUS_COLS.map(col => (
          <div key={col.key} className="stat-card flex items-center gap-3">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', col.bg)}>
              <col.icon size={15} className={col.color} />
            </div>
            <div>
              <p className="stat-label">{col.label}</p>
              <p className="text-xl font-semibold text-brand-black">{counts[col.key]}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={24} /></div>
      ) : actions.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No corrective actions" description="Corrective actions are auto-created when you submit an audit with failed items." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_COLS.map(col => {
            const colActions = byStatus(col.key)
            const isOver = dragOverCol === col.key
            return (
              <div
                key={col.key}
                className={cn(
                  'bg-brand-gray-50 rounded-xl p-3 border-2 border-transparent transition-all duration-200 min-h-[400px] flex flex-col dark:bg-brand-gray-900/60',
                  isOver ? 'border-brand-black bg-brand-gray-100/80 shadow-sm dark:border-brand-white dark:bg-brand-gray-900/80' : ''
                )}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                <div className="flex items-center gap-2 mb-3 px-1 shrink-0">
                  <col.icon size={13} className={col.color} />
                  <span className="text-xs font-semibold text-brand-black dark:text-brand-white">{col.label}</span>
                  <span className="ml-auto text-[11px] text-brand-gray-400 dark:text-brand-gray-500 font-medium">{colActions.length}</span>
                </div>
                <div className="space-y-2 flex-1 flex flex-col justify-start">
                  {colActions.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center justify-center flex-1 border border-dashed border-brand-gray-200 dark:border-brand-gray-800 rounded-xl bg-white/50 dark:bg-brand-gray-900/30">
                      <p className="text-xs text-brand-gray-300 dark:text-brand-gray-600">Drop tasks here</p>
                    </div>
                  ) : (
                    colActions.map(action => (
                      <ActionCard
                        key={action.id}
                        action={action}
                        onStatusChange={updateStatus}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedId === action.id}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
