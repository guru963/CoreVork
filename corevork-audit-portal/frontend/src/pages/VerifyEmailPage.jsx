import { Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-brand-white flex items-center justify-center p-6">
      <div className="w-full max-w-md card p-8 text-center animate-slide-up">
        {/* Animated Mail Icon wrapper */}
        <div className="w-16 h-16 rounded-full bg-brand-black/5 flex items-center justify-center mx-auto mb-6">
          <Mail size={28} className="text-brand-black animate-pulse" />
        </div>

        <h1 className="text-2xl font-semibold text-brand-black tracking-tight mb-3">
          Check your email
        </h1>
        
        <p className="text-sm text-brand-gray-500 leading-relaxed mb-6">
          We have sent a verification link to your email address. Please click the link to activate your account and log in.
        </p>

        <div className="p-4 rounded-lg bg-brand-gray-50 border border-brand-gray-100 text-xs text-brand-gray-500 mb-8 text-left leading-relaxed">
          <span className="font-semibold text-brand-black block mb-1">Didn't receive the email?</span>
          Check your spam folder or make sure you entered the correct email address during registration.
        </div>

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
