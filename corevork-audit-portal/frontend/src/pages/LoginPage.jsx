import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-white flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-80 xl:w-96 bg-brand-black flex-col justify-between p-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <ShieldCheck size={16} className="text-brand-black" />
          </div>
          <div>
            <span className="font-semibold text-white text-sm">CoreVork</span>
            <p className="text-[10px] text-brand-gray-500 -mt-0.5">Audit Portal</p>
          </div>
        </div>

        <div>
          <blockquote className="text-brand-gray-400 text-sm leading-relaxed italic font-display">
            "Compliance isn't a checkbox — it's a culture."
          </blockquote>
          <div className="mt-8 space-y-3">
            {['India Factories Act', 'OSHA Standards', 'ISO 45001'].map(s => (
              <div key={s} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-gray-600" />
                <span className="text-xs text-brand-gray-500">{s}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-brand-gray-700">© {new Date().getFullYear()} CoreVork. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-brand-black rounded-lg flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <span className="font-semibold text-brand-black">CoreVork</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-brand-black tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-brand-gray-500">Sign in to your audit portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label">Password</label>
                <Link to="/forgot-password" className="text-xs text-brand-gray-500 hover:text-brand-black transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input !pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-400 hover:text-brand-gray-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-brand-gray-500">
            New to CoreVork?{' '}
            <Link to="/register" className="text-brand-black font-medium hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
