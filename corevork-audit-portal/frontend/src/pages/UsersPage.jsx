import { useEffect, useState } from 'react'
import { Users, Plus, MoreVertical } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Badge, EmptyState, Modal, Spinner } from '@/components/ui'
import { formatDate, getInitials } from '@/lib/utils'

export default function UsersPage() {
  const { profile } = useAuthStore()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', role: 'inspector' })
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('org_id', profile?.org_id)
      .order('created_at')
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { if (profile) fetchUsers() }, [profile])

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviting(true)
    setError('')
    try {
      // In a real app this would send an email invite via Supabase Auth
      // For now we create a placeholder profile
      const { error: err } = await supabase.from('profiles').insert({
        email: inviteForm.email,
        full_name: inviteForm.full_name,
        role: inviteForm.role,
        org_id: profile.org_id,
      })
      if (err) throw err
      await fetchUsers()
      setShowInvite(false)
      setInviteForm({ email: '', full_name: '', role: 'inspector' })
    } catch (err) {
      setError(err.message)
    } finally {
      setInviting(false)
    }
  }

  const roleColor = { admin: 'black', inspector: 'blue', viewer: 'gray' }

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="page-header flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage team members and their access levels.</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary self-start sm:self-auto">
          <Plus size={14} /> Invite User
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={24} /></div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users yet" description="Invite team members to collaborate on audits." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-gray-200 flex items-center justify-center text-xs font-semibold text-brand-gray-700">
                        {getInitials(user.full_name || '')}
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name || '—'}</p>
                        <p className="text-xs text-brand-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge color={roleColor[user.role] || 'gray'} className="capitalize">{user.role}</Badge>
                  </td>
                  <td className="text-xs text-brand-gray-500">{formatDate(user.created_at)}</td>
                  <td>
                    <button className="btn-ghost p-1.5"><MoreVertical size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite Team Member">
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" placeholder="Jane Doe" value={inviteForm.full_name} onChange={e => setInviteForm(f => ({ ...f, full_name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="jane@company.com" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
              <option value="inspector">Inspector</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={inviting} className="btn-primary">
              {inviting ? <Spinner size={14} /> : 'Send Invite'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
