import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SiteFooter from '../components/SiteFooter'

export default function LMSLandingPage() {
  const { themeId } = useParams()
  const [themeName, setThemeName] = useState(null)
  const [themeLoading, setThemeLoading] = useState(true)

  // Email lookup form
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Access request form
  const [reqName, setReqName] = useState('')
  const [reqOrg, setReqOrg] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [requestError, setRequestError] = useState(null)

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

  async function handleRequestAccess(e) {
    e.preventDefault()
    setRequestError(null)
    setRequesting(true)

    const { error: fnErr } = await supabase.functions.invoke('send-access-request', {
      body: {
        email: email.trim().toLowerCase(),
        name: reqName.trim(),
        organization: reqOrg.trim(),
        theme_id: themeId,
      },
    })

    setRequesting(false)

    if (fnErr) {
      setRequestError('Something went wrong sending your request. Please try again.')
      return
    }

    setRequestSent(true)
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

          {/* Not found — request access card */}
          {notFound && !requestSent && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-8">
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
                Your email wasn&rsquo;t found in our system. Please complete the form below to request access to this page.
              </p>

              <form onSubmit={handleRequestAccess} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="req-name">
                    Full name
                  </label>
                  <input
                    id="req-name"
                    type="text"
                    value={reqName}
                    onChange={e => setReqName(e.target.value)}
                    required
                    placeholder="Jane Smith"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="req-org">
                    Organization
                  </label>
                  <input
                    id="req-org"
                    type="text"
                    value={reqOrg}
                    onChange={e => setReqOrg(e.target.value)}
                    required
                    placeholder="Country Regional Hospital"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {requestError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {requestError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={requesting || !reqName.trim() || !reqOrg.trim()}
                  className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
                >
                  {requesting ? 'Sending request…' : 'Request Access'}
                </button>
              </form>
            </div>
          )}

          {/* Request sent confirmation */}
          {requestSent && (
            <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Request sent!</h2>
              <p className="text-sm text-gray-500">
                Your request has been sent to your coach. They will be in touch once your access has been set up.
              </p>
            </div>
          )}

        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
