import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', orgName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp, user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      const data = await signUp(form.email, form.password, form.fullName, form.orgName)
      if (data?.session) {
        navigate('/dashboard')
      } else {
        navigate('/verify-email')
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-brand-black rounded-lg flex items-center justify-center">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <span className="font-semibold text-brand-black">CoreVork</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-brand-black tracking-tight">Create your account</h1>
          <p className="mt-1.5 text-sm text-brand-gray-500">Set up your organisation's audit portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input type="text" className="input" placeholder="Rajan Kumar" value={form.fullName} onChange={update('fullName')} required />
          </div>
          <div>
            <label className="label">Organisation name</label>
            <input type="text" className="input" placeholder="Acme Industries" value={form.orgName} onChange={update('orgName')} required />
          </div>
          <div>
            <label className="label">Work email</label>
            <input type="email" className="input" placeholder="you@company.com" value={form.email} onChange={update('email')} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" placeholder="Min. 8 characters" value={form.password} onChange={update('password')} required />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600">{error}</div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
            {loading
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-black font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
