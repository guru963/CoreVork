import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const { profile, fetchProfile, user } = useAuthStore()
  const [form, setForm] = useState({ full_name: profile?.full_name || '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ full_name: form.full_name })
        .eq('id', user.id)
      if (err) throw err
      await fetchProfile(user.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your profile and organisation settings.</p>
      </div>

      <div className="card p-6 mb-4">
        <h2 className="text-sm font-semibold text-brand-black mb-4">Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input
              className="input max-w-sm"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input max-w-sm" value={user?.email || ''} disabled readOnly />
          </div>
          <div>
            <label className="label">Role</label>
            <input className="input max-w-sm capitalize" value={profile?.role || ''} disabled readOnly />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-brand-black mb-4">Organisation</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Organisation name</label>
            <input className="input max-w-sm" value={profile?.organizations?.name || ''} disabled readOnly />
          </div>
          <p className="text-xs text-brand-gray-400">Contact your administrator to change organisation settings.</p>
        </div>
      </div>
    </div>
  )
}
