import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { STRENGTH_DOMAIN } from '../lib/strengthColors'
import SiteFooter from '../components/SiteFooter'

export default function LMSLandingPage() {
  const { themeId } = useParams()
  const [themeName, setThemeName] = useState(null)
  const [themeLoading, setThemeLoading] = useState(true)

  // Email lookup form
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // First-time visitor: name + Top 5
  const [regName, setRegName] = useState('')
  const [regTop5, setRegTop5] = useState(['', '', '', '', ''])
  const [registering, setRegistering] = useState(false)
  const [regError, setRegError] = useState(null)

  useEffect(() => {
    async function loadTheme() {
      const { data } = await supabase
        .from('prompt_themes')
        .select('name')
        .eq('id', themeId)
        .single()
      setThemeName(data?.name ?? null)
      setThemeLoading(false)
    }
    loadTheme()
  }, [themeId])

  async function handleSubmit(e) {
    e.preventDefault()
    setNotFound(false)
    setLoading(true)

    const { data, error: fnErr } = await supabase.functions.invoke('lms-access', {
      body: { email: email.trim().toLowerCase(), theme_id: themeId },
    })

    setLoading(false)

    if (fnErr || data?.error === 'server_error') {
      setNotFound(false)
      return
    }

    if (data?.error === 'not_found') {
      setNotFound(true)
      return
    }

    if (data?.slug) {
      window.location.href = `/lms-worksheet/${data.slug}`
    }
  }

  const allStrengths = Object.keys(STRENGTH_DOMAIN).sort()
  const top5Complete = regTop5.every(Boolean)

  function setTop5At(i, value) {
    setRegTop5(prev => prev.map((s, idx) => (idx === i ? value : s)))
  }

  async function handleRegister(e) {
    e.preventDefault()
    setRegError(null)
    setRegistering(true)

    const { data, error: fnErr } = await supabase.functions.invoke('lms-access', {
      body: {
        email: email.trim().toLowerCase(),
        theme_id: themeId,
        register: { name: regName.trim(), top5: regTop5 },
      },
    })

    setRegistering(false)

    if (data?.slug) {
      window.location.href = `/lms-worksheet/${data.slug}`
      return
    }
    if (data?.error === 'busy') {
      setRegError('We are getting a lot of sign-ups right now. Please try again in a few minutes.')
    } else if (fnErr || data?.error) {
      setRegError('Something went wrong. Please check your entries and try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center">
          <img src="/logo.png" alt="Gallup Strengths" className="h-[60px] w-auto" />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-4">

          {/* Email lookup card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            {themeLoading ? (
              <p className="text-gray-400 text-sm text-center">Loading…</p>
            ) : (
              <>
                <div className="mb-6 text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    {themeName ?? 'Strengths Worksheet'}
                  </h1>
                  <p className="text-sm text-gray-500">
                    Enter your email to access your worksheet
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setNotFound(false) }}
                      required
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
                  >
                    {loading ? 'Looking up…' : 'Access My Worksheet'}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* First visit: tell us your Top 5 */}
          {notFound && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-8">
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
                Welcome! We don&rsquo;t have you on file yet. Enter your name and your Top 5 CliftonStrengths and we&rsquo;ll set up your worksheet right now.
              </p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reg-name">
                    Full name
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    required
                    maxLength={100}
                    placeholder="Jane Smith"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <p className="block text-sm font-medium text-gray-700 mb-1">Your Top 5, in order</p>
                  <div className="space-y-2">
                    {regTop5.map((value, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-5 text-right text-xs text-gray-400">{i + 1}.</span>
                        <select
                          value={value}
                          onChange={e => setTop5At(i, e.target.value)}
                          required
                          className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="">Choose a strength…</option>
                          {allStrengths
                            .filter(s => s === value || !regTop5.includes(s))
                            .map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {regError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {regError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={registering || !regName.trim() || !top5Complete}
                  className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
                >
                  {registering ? 'Setting up your worksheet…' : 'Create My Worksheet'}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  Your coach will review your details. You can sign in later with this email to see your strengths page.
                </p>
              </form>
            </div>
          )}

        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
