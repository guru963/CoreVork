import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { updateUserPassword } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await updateUserPassword(password)
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-brand-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm card p-8 text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={28} className="text-green-600 animate-bounce" />
          </div>

          <h1 className="text-2xl font-semibold text-brand-black tracking-tight mb-3">
            Password reset successful
          </h1>
          
          <p className="text-sm text-brand-gray-500 leading-relaxed mb-4">
            Your password has been successfully updated. You will now be redirected to the sign in page.
          </p>

          <div className="w-4 h-4 border-2 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mt-6" />
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
          <h1 className="text-2xl font-semibold text-brand-black tracking-tight">Set new password</h1>
          <p className="mt-1.5 text-sm text-brand-gray-500">Choose a new, secure password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">New password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input !pr-10"
                placeholder="Min. 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
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

          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              className="input"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
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
            ) : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  )
}
