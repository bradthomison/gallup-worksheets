import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIsCoach } from '../hooks/useIsCoach'

export default function ParticipantSignInPage() {
  const { user, loading } = useAuth()
  const coach = useIsCoach(user)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  // Already signed in → coaches go to the coach home, everyone else to their own page
  useEffect(() => {
    if (!loading && user && !coach.loading) navigate(coach.isCoach ? '/coach' : '/me', { replace: true })
  }, [user, loading, coach.loading, coach.isCoach])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/me` },
    })
    setSubmitting(false)
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
  }

  if (loading) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Gallup Strengths" className="w-full h-auto mb-4" />
          <p className="text-2xl font-bold text-gray-800 w-1/2 mx-auto">Your Strengths</p>
        </div>

        {sent ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Check your email</h2>
            <p className="text-sm text-gray-500">
              We sent a sign-in link to <span className="font-medium text-gray-700">{email}</span>. Click the link to open your strengths dashboard.
            </p>
            <p className="text-xs text-gray-400">Didn't get it? Check your spam folder, or{' '}
              <button
                onClick={() => setSent(false)}
                className="text-brand-500 underline underline-offset-2"
              >
                try again
              </button>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Sign in</h2>
              <p className="text-sm text-gray-500">Enter the email your coach has on file and we'll send you a link.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >
              {submitting ? 'Sending…' : 'Send sign-in link'}
            </button>
            <p className="text-center text-xs text-gray-400">
              Coach?{' '}
              <a href="/coach" className="text-brand-500 hover:underline">Sign in here</a>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
