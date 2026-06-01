import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, FileCheck, ArrowRight, Search } from 'lucide-react'
import { useAuditStore } from '@/store/auditStore'
import { useChecklistStore } from '@/store/checklistStore'
import { useAuthStore } from '@/store/authStore'
import { Modal, Badge, EmptyState, Spinner } from '@/components/ui'
import { formatDate, getComplianceLabel } from '@/lib/utils'

function CreateAuditModal({ open, onClose }) {
  const { profile } = useAuthStore()
  const { checklists, fetchChecklists } = useChecklistStore()
  const { createAudit } = useAuditStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ checklist_id: '', site_name: '', site_location: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (open) fetchChecklists() }, [open])

  const update = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.checklist_id) { setError('Please select a checklist.'); return }
    if (!profile) { setError('Profile not loaded. Please refresh the page and try again.'); return }
    setLoading(true)
    try {
      const audit = await createAudit({
        ...form,
        inspector_id: profile.id,
        org_id: profile.org_id,
      })
      onClose()
      navigate(`/audits/${audit.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Start New Audit">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Checklist</label>
          <select className="input" value={form.checklist_id} onChange={update('checklist_id')} required>
            <option value="">Select a checklist...</option>
            {checklists.map(c => (
              <option key={c.id} value={c.id}>{c.title} — {c.standard}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Site / Facility name</label>
          <input className="input" placeholder="e.g. Chennai Unit 2" value={form.site_name} onChange={update('site_name')} required />
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input" placeholder="e.g. Chennai, Tamil Nadu" value={form.site_location} onChange={update('site_location')} />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Start Audit'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function AuditsPage() {
  const { profile } = useAuthStore()
  const { audits, fetchAudits, loading } = useAuditStore()
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    if (profile) fetchAudits(profile.id, profile.role)
  }, [profile])

  const filtered = audits.filter(a => {
    const matchSearch = !search || a.site_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.checklists?.title?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || a.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="max-w-5xl mx-auto animate-slide-up">
      <div className="page-header flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Audits</h1>
          <p className="page-subtitle">Manage and execute your safety audits.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary self-start sm:self-auto">
          <Plus size={14} /> New Audit
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
          <input className="input pl-9" placeholder="Search by site or checklist..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={24} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title="No audits found"
          description="Start a new audit to begin your compliance inspection."
          action={<button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={14} />New Audit</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Checklist</th>
                <th>Site</th>
                <th>Inspector</th>
                <th>Status</th>
                <th>Score</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(audit => {
                const compliance = audit.compliance_score !== null ? getComplianceLabel(audit.compliance_score) : null
                return (
                  <tr key={audit.id}>
                    <td>
                      <p className="font-medium">{audit.checklists?.title}</p>
                      <p className="text-[11px] text-brand-gray-400">{audit.checklists?.standard}</p>
                    </td>
                    <td>
                      <p>{audit.site_name}</p>
                      {audit.site_location && <p className="text-[11px] text-brand-gray-400">{audit.site_location}</p>}
                    </td>
                    <td className="text-brand-gray-600 text-xs">{audit.profiles?.full_name}</td>
                    <td>
                      <Badge color={audit.status === 'submitted' ? 'black' : 'gray'}>{audit.status}</Badge>
                    </td>
                    <td>
                      {audit.compliance_score !== null ? (
                        <span className={`font-medium text-sm ${compliance?.color === 'green' ? 'text-green-600' : compliance?.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {audit.compliance_score}%
                        </span>
                      ) : <span className="text-brand-gray-400">—</span>}
                    </td>
                    <td className="text-xs text-brand-gray-400">{formatDate(audit.created_at)}</td>
                    <td>
                      <Link to={`/audits/${audit.id}`} className="btn-ghost py-1 px-2 text-xs">
                        Open <ArrowRight size={11} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreateAuditModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
