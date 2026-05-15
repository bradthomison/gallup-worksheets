import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LMSLandingPage() {
  const { themeId } = useParams()
  const [themeName, setThemeName] = useState(null)
  const [themeLoading, setThemeLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
    setError(null)
    setLoading(true)

    const { data, error: fnErr } = await supabase.functions.invoke('lms-access', {
      body: { email: email.trim().toLowerCase(), theme_id: themeId },
    })

    setLoading(false)

    if (fnErr) {
      setError('Something went wrong. Please try again.')
      return
    }

    if (data?.error === 'not_found') {
      setError('Your email wasn\'t found in our system. Please contact your coach.')
      return
    }

    if (data?.error) {
      setError('Something went wrong. Please try again.')
      return
    }

    if (data?.slug) {
      window.location.href = `/lms-worksheet/${data.slug}`
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
        <div className="w-full max-w-md">
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
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      autoFocus
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

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
        </div>
      </main>
    </div>
  )
}
