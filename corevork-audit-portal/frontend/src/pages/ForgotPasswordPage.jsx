import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, ArrowLeft, MailCheck } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { resetPasswordEmail } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPasswordEmail(email)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to send password reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-brand-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm card p-8 text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-6">
            <MailCheck size={28} className="text-green-600" />
          </div>

          <h1 className="text-2xl font-semibold text-brand-black tracking-tight mb-3">
            Reset email sent
          </h1>
          
          <p className="text-sm text-brand-gray-500 leading-relaxed mb-8">
            We've sent a password reset link to <strong className="text-brand-black">{email}</strong>. Please check your inbox.
          </p>

          <Link
            to="/login"
            className="btn-secondary w-full justify-center py-2.5 flex items-center gap-2"
          >
            <ArrowLeft size={14} />
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-brand-black rounded-lg flex items-center justify-center">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <span className="font-semibold text-brand-black">CoreVork</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-brand-black tracking-tight">Forgot password?</h1>
          <p className="mt-1.5 text-sm text-brand-gray-500">Enter your email and we'll send you a reset link.</p>
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
            />
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
            ) : 'Send reset link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-gray-500">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-brand-black font-medium hover:underline">
            <ArrowLeft size={14} />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
