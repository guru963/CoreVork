import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileCheck, ClipboardList, TrendingUp, Clock, Plus, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuditStore } from '@/store/auditStore'
import { Badge, ScoreRing, Spinner } from '@/components/ui'
import { formatDate, getComplianceLabel } from '@/lib/utils'

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="stat-card flex items-start justify-between">
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {sub && <p className="text-xs text-brand-gray-400 dark:text-brand-gray-500 mt-1">{sub}</p>}
      </div>
      <div className="w-9 h-9 rounded-xl bg-brand-gray-50 dark:bg-brand-gray-800 flex items-center justify-center transition-colors">
        <Icon size={16} className="text-brand-gray-500 dark:text-brand-gray-400" />
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

export default function DashboardPage() {
  const { profile, user } = useAuthStore()
  const { audits, fetchAudits, loading } = useAuditStore()
  const [stats, setStats] = useState({ total: 0, submitted: 0, draft: 0, avgScore: 0 })

  // Use user.id as fallback if profile hasn't loaded yet
  const userId = profile?.id || user?.id
  const role   = profile?.role || 'inspector'
  const isViewer = role === 'viewer'

  useEffect(() => {
    if (userId) fetchAudits(userId, role)
  }, [userId, role])

  useEffect(() => {
    if (!audits.length) return
    const submitted = audits.filter(a => a.status === 'submitted')
    const scores    = submitted.map(a => a.compliance_score).filter(s => s !== null)
    setStats({
      total:     audits.length,
      submitted: submitted.length,
      draft:     audits.filter(a => a.status === 'draft').length,
      avgScore:  scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    })
  }, [audits])

  const recent = audits.slice(0, 5)
  const displayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  return (
    <div className="max-w-5xl mx-auto animate-slide-up">
      <div className="page-header flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="page-title">
            Good {getGreeting()}, <span className="font-display italic">{displayName}</span>
          </h1>
          <p className="page-subtitle">
            {isViewer ? 'Overview of your organization\'s audit activity.' : "Here's what's happening with your audits today."}
          </p>
        </div>
        {!isViewer && (
          <Link to="/audits" className="btn-primary self-start sm:self-auto">
            <Plus size={14} /> New Audit
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FileCheck}     label="Total Audits" value={stats.total}                                 sub="all time"   />
        <StatCard icon={TrendingUp}    label="Submitted"    value={stats.submitted}                             sub="completed"  />
        <StatCard icon={Clock}         label="Drafts"       value={stats.draft}                                 sub="in progress"/>
        <StatCard icon={ClipboardList} label="Avg. Score"   value={stats.avgScore ? `${stats.avgScore}%` : '—'} sub="compliance" />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-brand-gray-100 dark:border-brand-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-black dark:text-brand-white">Recent Audits</h2>
          <Link to="/audits" className="text-xs text-brand-gray-500 hover:text-brand-black dark:text-brand-gray-400 dark:hover:text-brand-white flex items-center gap-1 transition-colors">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : recent.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-brand-gray-500 mb-4">No audits yet.</p>
            {!isViewer && (
              <Link to="/audits" className="btn-primary inline-flex">
                <Plus size={14} /> Start first audit
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>Checklist</th><th>Site</th><th>Status</th><th>Score</th><th>Date</th><th></th></tr>
              </thead>
              <tbody>
                {recent.map(audit => {
                  const compliance = audit.compliance_score !== null ? getComplianceLabel(audit.compliance_score) : null
                  return (
                    <tr key={audit.id}>
                      <td>
                        <p className="font-medium text-sm dark:text-brand-white">{audit.checklists?.title}</p>
                        <p className="text-[11px] text-brand-gray-400 dark:text-brand-gray-500">{audit.checklists?.standard}</p>
                      </td>
                      <td className="text-brand-gray-600 dark:text-brand-gray-400">{audit.site_name}</td>
                      <td><Badge color={audit.status === 'submitted' ? 'black' : 'gray'}>{audit.status}</Badge></td>
                      <td>
                        {audit.compliance_score !== null
                          ? <span className={`text-sm font-medium ${compliance?.color === 'green' ? 'text-green-600' : compliance?.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>{audit.compliance_score}%</span>
                          : '—'}
                      </td>
                      <td className="text-brand-gray-500 dark:text-brand-gray-400 text-xs">{formatDate(audit.created_at)}</td>
                      <td>
                        <Link to={`/audits/${audit.id}`} className="btn-ghost py-1 px-2 text-xs">Open <ArrowRight size={11} /></Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
