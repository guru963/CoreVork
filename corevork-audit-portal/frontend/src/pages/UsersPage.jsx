import { useEffect, useState } from 'react'
import { Users, Plus, MoreVertical } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Badge, EmptyState, Modal, Spinner, ConfirmDialog } from '@/components/ui'
import { formatDate, getInitials } from '@/lib/utils'

export default function UsersPage() {
  const { profile, session } = useAuthStore()

  if (profile && profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', role: 'inspector' })
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')

  const [activeMenuId, setActiveMenuId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

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

  const handleResendInvite = async (user) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_PDF_SERVICE_URL}/users/resend-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          orgId: profile.org_id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to resend invite')
      }

      const data = await response.json()
      if (data.emailSent) {
        alert('✉ Invitation email resent successfully to ' + user.email + '!')
      } else if (data.inviteLink) {
        try {
          await navigator.clipboard.writeText(data.inviteLink)
          alert('Invitation regenerated! ' + (data.emailNote || '') + '\n\nThe invite link has been copied to your clipboard.')
        } catch {
          alert('Invitation regenerated! ' + (data.emailNote || '') + '\n\nInvite link:\n' + data.inviteLink)
        }
      } else {
        alert('Invitation resent successfully!')
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_PDF_SERVICE_URL}/users/${deleteTarget.id}?orgId=${profile?.org_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove user')
      }

      await fetchUsers()
      setDeleteTarget(null)
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviting(true)
    setError('')
    try {
      const response = await fetch(`${import.meta.env.VITE_PDF_SERVICE_URL}/users/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          email: inviteForm.email,
          fullName: inviteForm.full_name,
          role: inviteForm.role,
          orgId: profile.org_id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send invite')
      }

      const data = await response.json()
      await fetchUsers()
      setShowInvite(false)
      setInviteForm({ email: '', full_name: '', role: 'inspector' })

      if (data.emailSent) {
        alert('✉ Invitation email sent successfully to ' + inviteForm.email + '!')
      } else if (data.inviteLink) {
        try {
          await navigator.clipboard.writeText(data.inviteLink)
          alert('User invited! ' + (data.emailNote || '') + '\n\nThe invitation link has been copied to your clipboard.')
        } catch {
          alert('User invited! ' + (data.emailNote || '') + '\n\nInvite link:\n' + data.inviteLink)
        }
      } else {
        alert('Invitation sent successfully!')
      }
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
              {users.map((user, idx) => {
                const isLast = idx === users.length - 1
                return (
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
                    <td className="relative text-right">
                      {user.id !== profile?.id && (
                        <>
                          <button onClick={() => setActiveMenuId(activeMenuId === user.id ? null : user.id)} className="btn-ghost p-1.5">
                            <MoreVertical size={14} />
                          </button>
                          {activeMenuId === user.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                              <div className={`absolute right-4 w-36 bg-white border border-brand-gray-100 rounded-lg shadow-card py-1 z-20 text-left dark:bg-brand-gray-900 dark:border-brand-gray-800 ${isLast ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                              <button 
                                type="button" 
                                onClick={() => { handleResendInvite(user); setActiveMenuId(null) }} 
                                className="w-full text-left px-3 py-1.5 text-xs text-brand-black dark:text-brand-white hover:bg-brand-gray-50 dark:hover:bg-brand-gray-800"
                              >
                                Resend Invite
                              </button>
                              <button 
                                type="button" 
                                onClick={() => { setDeleteTarget(user); setActiveMenuId(null) }} 
                                className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                              >
                                Remove Member
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              )})}
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

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${deleteTarget?.full_name || 'this member'}? They will lose access to the organization immediately.`}
        confirmLabel={deleting ? "Removing..." : "Remove"}
        danger
      />
    </div>
  )
}
