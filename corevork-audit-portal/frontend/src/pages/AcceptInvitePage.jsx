import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, CheckCircle, Users, Building2, UserCheck, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const { updateUserPassword, user } = useAuthStore()
  const navigate = useNavigate()

  // Extract invitation context from multiple sources (URL search params, hash fragment, or user metadata)
  const inviteContext = useMemo(() => {
    // 1. Try URL search params first (most reliable)
    let orgName = searchParams.get('orgName')
    let roleName = searchParams.get('roleName')
    let inviterName = searchParams.get('inviterName')

    // 2. If not in search params, try hash fragment (Supabase sometimes puts everything in hash)
    if (!orgName && location.hash) {
      const hashParams = new URLSearchParams(location.hash.replace('#', '?').split('?').pop())
      orgName = orgName || hashParams.get('orgName')
      roleName = roleName || hashParams.get('roleName')
      inviterName = inviterName || hashParams.get('inviterName')
    }

    // 3. Fallback to user metadata from Supabase session
    if (!orgName && user?.user_metadata) {
      const meta = user.user_metadata
      roleName = roleName || meta.role
    }

    return {
      orgName: orgName || 'your organization',
      roleName: roleName || 'member',
      inviterName: inviterName || '',
    }
  }, [searchParams, location.hash, user])

  const { orgName, roleName, inviterName } = inviteContext
  const roleLabel = roleName.charAt(0).toUpperCase() + roleName.slice(1)

  // Wait for Supabase to process the invite token from the URL hash
  useEffect(() => {
    const handleSession = async () => {
      // Supabase auto-processes the hash fragment and creates a session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSessionReady(true)
      } else {
        // Listen for auth state change (Supabase may still be processing)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            setSessionReady(true)
          }
        })
        // Cleanup listener after 30 seconds
        setTimeout(() => subscription.unsubscribe(), 30000)
      }
    }
    handleSession()
  }, [])

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
        navigate('/dashboard')
      }, 3000)
    } catch (err) {
      setError(err.message || 'Failed to create account. The invitation link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-brand-white flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center animate-slide-up">
          {/* Success Animation */}
          <div className="relative mb-8">
            <div className="w-20 h-20 rounded-full bg-green-50 border-2 border-green-100 flex items-center justify-center mx-auto" style={{ animation: 'pulse 2s infinite' }}>
              <CheckCircle size={36} className="text-green-600" style={{ animation: 'bounceIn 0.6s ease-out' }} />
            </div>
            <div className="absolute -top-2 -right-2 w-24 h-24 rounded-full border border-green-100 mx-auto left-0 right-0" style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', opacity: 0.3 }} />
          </div>

          <div className="card p-8 border border-green-100 bg-gradient-to-b from-green-50/30 to-white">
            <h1 className="text-2xl font-semibold text-brand-black tracking-tight mb-3">
              Welcome to {orgName}! 🎉
            </h1>
            
            <p className="text-sm text-brand-gray-500 leading-relaxed mb-2">
              Your account has been set up successfully. You're now {roleLabel === 'Admin' ? 'an' : 'a'} <strong className="text-brand-black">{roleLabel}</strong> at <strong className="text-brand-black">{orgName}</strong>.
            </p>

            <p className="text-xs text-brand-gray-400 mb-6">
              Redirecting you to the dashboard...
            </p>

            <div className="w-5 h-5 border-2 border-brand-black border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-white flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-brand-black rounded-lg flex items-center justify-center">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <span className="font-semibold text-brand-black">CoreVork</span>
        </div>

        {/* Invitation Banner */}
        <div className="card mb-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)' }}>
          <div className="p-6 relative">
            {/* Decorative Elements */}
            <div className="absolute top-3 right-3 opacity-10">
              <Sparkles size={48} className="text-white" />
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-medium text-white/90 border border-white/10">
                <Users size={12} />
                Team Invitation
              </span>
            </div>

            <h1 className="text-xl font-semibold text-white tracking-tight mb-2" style={{ lineHeight: 1.3 }}>
              You've been invited to join<br />
              <span style={{ color: '#60a5fa' }}>{orgName}</span>
            </h1>

            {inviterName && (
              <p className="text-sm text-white/60 mb-4">
                Invited by <strong className="text-white/80">{inviterName}</strong>
              </p>
            )}

            {/* Role & Org Info Cards */}
            <div className="flex gap-3 mt-4">
              <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 size={12} className="text-white/50" />
                  <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Organization</span>
                </div>
                <p className="text-sm font-medium text-white truncate">{orgName}</p>
              </div>
              <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck size={12} className="text-white/50" />
                  <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Your Role</span>
                </div>
                <p className="text-sm font-medium text-white capitalize">{roleName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Password Form */}
        <div className="card p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-brand-black tracking-tight">Create your password</h2>
            <p className="mt-1 text-xs text-brand-gray-500">Set a secure password to activate your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input !pr-10"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
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
              <label className="label">Confirm password</label>
              <input
                type="password"
                className="input"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* Password strength indicator */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: password.length === 0
                      ? '#e5e7eb'
                      : password.length < 6 && i <= 1
                        ? '#ef4444'
                        : password.length < 8 && i <= 2
                          ? '#f59e0b'
                          : password.length >= 8 && password.length < 12 && i <= 3
                            ? '#22c55e'
                            : password.length >= 12
                              ? '#22c55e'
                              : '#e5e7eb'
                  }}
                />
              ))}
              <span className="text-[10px] text-brand-gray-400 ml-1">
                {password.length === 0 ? '' : password.length < 6 ? 'Weak' : password.length < 8 ? 'Fair' : password.length < 12 ? 'Good' : 'Strong'}
              </span>
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
              ) : (
                <>
                  <UserCheck size={14} />
                  Accept Invitation & Create Account
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-brand-gray-400 mt-4">
            By accepting, you agree to join <strong>{orgName}</strong> as {roleLabel === 'Admin' ? 'an' : 'a'} {roleLabel}.
          </p>
        </div>
      </div>
    </div>
  )
}
