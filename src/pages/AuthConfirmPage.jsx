import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Emailed sign-in links point here (on our own domain). The token is only used when the person
// clicks Continue, so mail scanners that pre-open links can't use up the one-time token.
const OTP_TYPES = ['magiclink', 'signup', 'invite', 'recovery', 'email']

// Only allow paths on this site (no other hosts, no protocol-relative links).
function safeNext(next) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/me'
  return next
}

export default function AuthConfirmPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const tokenHash = params.get('token_hash')
  const type = params.get('type')
  const next = safeNext(params.get('next'))
  const [working, setWorking] = useState(false)
  const [failed, setFailed] = useState(false)

  const linkIsUsable = !!tokenHash && OTP_TYPES.includes(type)

  async function handleContinue() {
    setWorking(true)
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      setFailed(true)
      setWorking(false)
      return
    }
    navigate(next, { replace: true })
  }

  const showProblem = failed || !linkIsUsable

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Gallup Strengths" className="w-full h-auto mb-4" />
          <p className="text-2xl font-bold text-gray-800 w-1/2 mx-auto">Your Strengths</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-5">
          {showProblem ? (
            <>
              <h2 className="text-lg font-bold text-gray-900">This link can't be used</h2>
              <p className="text-sm text-gray-500">
                Sign-in links work once and expire after a short time. Request a new one and we'll email it right away.
              </p>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
              >
                Get a new sign-in link
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-gray-900">You're almost in</h2>
              <p className="text-sm text-gray-500">Select the button below to open your strengths page.</p>
              <button
                onClick={handleContinue}
                disabled={working}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
              >
                {working ? 'Signing you in…' : 'Continue to your strengths'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
