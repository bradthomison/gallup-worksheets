import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { getStrengthColors, STRENGTH_DOMAIN } from '../lib/strengthColors'
import SiteFooter from '../components/SiteFooter'
import { printNameTents } from '../lib/printNameTent'

const ALL_STRENGTHS = Object.keys(STRENGTH_DOMAIN).sort()

// ── Evergreen worksheet cards ─────────────────────────────────────────────────

function evergreenCards(email, teamId) {
  const e = encodeURIComponent(email)
  const t = teamId ? `&teamId=${teamId}` : ''
  return [
    {
      id: 'talent-map',
      name: 'Talent Map',
      description: 'Explore how your strengths help you build relationships, communicate, lead change, and more.',
      href: `/talent-map?email=${e}`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 7" />
        </svg>
      ),
    },
    {
      id: 'power-of-me',
      name: 'The Power of Me',
      description: 'Discover how your Top 5 strengths interact with each other.',
      href: `/power-of-me?email=${e}`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: 'power-of-2',
      name: 'The Power of 2',
      description: 'Pair with a teammate to explore how your strengths work together.',
      href: `/power-of-2?email=${e}${t}`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ submittedAt, responseCount }) {
  if (submittedAt) return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Complete</span>
  )
  if (responseCount > 0) return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">In Progress</span>
  )
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Not Started</span>
  )
}

// ── Edit Top 5 modal ──────────────────────────────────────────────────────────

function EditTop5Modal({ currentTop5, onSave, onClose }) {
  const [top5, setTop5] = useState(() => {
    const base = currentTop5?.slice(0, 5) ?? []
    while (base.length < 5) base.push('')
    return base
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function setStrength(idx, val) {
    setTop5(prev => prev.map((s, i) => i === idx ? val : s))
  }

  async function handleSave() {
    const filled = top5.filter(Boolean)
    if (filled.length === 0) { setError('Enter at least one strength.'); return }
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.rpc('update_my_top5', { p_top5: top5 })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave(top5)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Edit My Top 5</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500">If your coach entered a strength incorrectly, update it here. Changes take effect immediately.</p>
        <div className="space-y-3">
          {top5.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-400 w-4 text-right">{i + 1}</span>
              <select
                value={s}
                onChange={e => setStrength(i, e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">— Select strength —</option>
                {ALL_STRENGTHS.filter(str => !top5.includes(str) || str === s).map(str => (
                  <option key={str} value={str}>{str}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-2.5 text-sm transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Request Access form ───────────────────────────────────────────────────────

function RequestAccessForm({ userEmail, onSubmitted }) {
  const [name, setName] = useState('')
  const [top5, setTop5] = useState(['', '', '', '', ''])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function setStrength(idx, val) {
    setTop5(prev => prev.map((s, i) => i === idx ? val : s))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Your name is required.'); return }
    const filled = top5.filter(Boolean)
    if (filled.length === 0) { setError('Enter at least one strength.'); return }
    setSubmitting(true)
    setError(null)
    const { data, error: err } = await supabase.rpc('request_access', {
      p_name: name.trim(),
      p_top5: top5,
    })
    setSubmitting(false)
    if (err) { setError(err.message); return }
    onSubmitted()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Gallup Strengths" className="h-16 w-auto mx-auto mb-4" />
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Request Access</h2>
            <p className="text-sm text-gray-500">
              We don't have a profile for <span className="font-medium">{userEmail}</span> yet.
              Fill in your details and a coach will approve your access.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="First and last name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Top 5 CliftonStrengths</label>
            <p className="text-xs text-gray-400 mb-3">Enter what you know — you can leave blanks if you're unsure.</p>
            <div className="space-y-2.5">
              {top5.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4 text-right">{i + 1}</span>
                  <select
                    value={s}
                    onChange={e => setStrength(i, e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">— Select strength —</option>
                    {ALL_STRENGTHS.filter(str => !top5.includes(str) || str === s).map(str => (
                      <option key={str} value={str}>{str}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {submitting ? 'Submitting…' : 'Request Access'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ParticipantDashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [profileState, setProfileState] = useState('loading') // 'loading' | 'found' | 'not_found' | 'pending' | 'error'
  const [worksheets, setWorksheets] = useState([])
  const [worksheetsLoading, setWorksheetsLoading] = useState(false)
  const [reports, setReports] = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [showEditTop5, setShowEditTop5] = useState(false)
  const [requestSubmitted, setRequestSubmitted] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) navigate('/sign-in', { replace: true })
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    async function load() {
      setProfileState('loading')
      await supabase.rpc('link_participant_account')
      const { data } = await supabase.rpc('get_my_participant_profile')
      if (!data || data.error === 'not_authenticated') {
        setProfileState('error')
      } else if (data.error === 'not_found') {
        setProfileState('not_found')
      } else if (data.approved === false) {
        setProfile(data)
        setProfileState('pending')
      } else {
        setProfile(data)
        setProfileState('found')
      }
    }
    load()
  }, [user])

  useEffect(() => {
    if (profileState !== 'found' || !profile?.team_id) return
    setWorksheetsLoading(true)
    supabase
      .rpc('get_portal_worksheets', { p_email: profile.email, p_team_id: profile.team_id })
      .then(({ data }) => { setWorksheets(data ?? []); setWorksheetsLoading(false) })
  }, [profile, profileState])

  useEffect(() => {
    if (profileState !== 'found') return
    setReportsLoading(true)
    supabase.rpc('get_my_reports')
      .then(({ data }) => { setReports(data ?? []); setReportsLoading(false) })
  }, [profile, profileState])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/sign-in', { replace: true })
  }

  function handleTop5Saved(newTop5) {
    setProfile(p => ({ ...p, top5: newTop5 }))
    setShowEditTop5(false)
  }

  function printMyNameTent(person) {
    if (!(person.top5 ?? []).some(Boolean)) return
    printNameTents([person])
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (authLoading || profileState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (!user) return null

  // ── Request Access (not in system) ───────────────────────────────────────────

  if (profileState === 'not_found') {
    if (requestSubmitted) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
          <img src="/logo.png" alt="Gallup Strengths" className="h-16 w-auto mb-6" />
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Request submitted!</h1>
          <p className="text-sm text-gray-500 max-w-sm">
            A coach will review your request and grant access. Check back here after you hear from them.
          </p>
          <button onClick={handleSignOut} className="mt-6 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2">
            Sign out
          </button>
        </div>
      )
    }
    return <RequestAccessForm userEmail={user.email} onSubmitted={() => setRequestSubmitted(true)} />
  }

  // ── Pending approval ─────────────────────────────────────────────────────────

  if (profileState === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <img src="/logo.png" alt="Gallup Strengths" className="h-16 w-auto mb-6" />
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Access pending</h1>
        <p className="text-sm text-gray-500 max-w-sm">
          Your request has been received. A coach will review and approve your account before your worksheets become available.
        </p>
        <button onClick={handleSignOut} className="mt-6 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2">
          Sign out
        </button>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────

  if (profileState === 'error' || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <img src="/logo.png" alt="Gallup Strengths" className="h-16 w-auto mb-6" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 max-w-sm">We couldn't load your profile. Please sign out and try again.</p>
        <button onClick={handleSignOut} className="mt-6 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2">
          Sign out
        </button>
      </div>
    )
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────

  const firstName = profile.name?.split(' ')[0] ?? 'there'
  const hasStrengths = Array.isArray(profile.top5) && profile.top5.some(Boolean)
  const cards = evergreenCards(profile.email, profile.team_id)
  const emailEnc = encodeURIComponent(profile.email)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <img src="/logo.png" alt="Gallup Strengths" className="h-10 w-auto" />
          <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 space-y-10">

        {/* Welcome + Top 5 */}
        <section>
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Hi {firstName}!</h1>
          </div>
          <p className="text-gray-500 text-sm mb-5">Your CliftonStrengths dashboard.</p>

          {hasStrengths ? (
            <div className="flex flex-wrap gap-2 items-center">
              {profile.top5.filter(Boolean).map((s, i) => {
                const c = getStrengthColors(s)
                return (
                  <div
                    key={s}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: c.headerBg, color: c.headerText }}
                  >
                    <span className="text-xs opacity-60 font-normal">{i + 1}</span>
                    {s}
                  </div>
                )
              })}
              <button
                onClick={() => setShowEditTop5(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 border border-dashed border-gray-300 hover:border-brand-400 hover:text-brand-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800 flex items-start justify-between gap-4">
              <p>Your Top 5 strengths haven't been entered yet. Your coach will add them before your session.</p>
              <button
                onClick={() => setShowEditTop5(true)}
                className="shrink-0 text-xs font-medium text-amber-700 underline underline-offset-2"
              >
                Add mine
              </button>
            </div>
          )}
        </section>

        {/* Session Worksheets */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-4">Session Worksheets</h2>
          {worksheetsLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : worksheets.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl px-5 py-8 text-center">
              <p className="text-sm text-gray-400">No session worksheets assigned yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {worksheets.map(ws => (
                <button
                  key={ws.slug}
                  onClick={() => navigate(`/worksheet/${ws.slug}`)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ws.session_title ?? 'Worksheet'}</p>
                    {ws.session_date && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(ws.session_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <StatusPill submittedAt={ws.submitted_at} responseCount={ws.response_count} />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Reports */}
        {hasStrengths && (
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-4">Reports</h2>
            {reportsLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => navigate(`/personal-insights?email=${emailEnc}`)}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-300 hover:shadow-sm transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 mb-3 group-hover:bg-brand-100 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">Personal Insights</p>
                  <p className="text-xs text-gray-500 leading-relaxed">Your unique strengths and how they show up at work</p>
                </button>
                <button
                  onClick={() => navigate(`/bring-need?email=${emailEnc}`)}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-300 hover:shadow-sm transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 mb-3 group-hover:bg-brand-100 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">Bring – Need</p>
                  <p className="text-xs text-gray-500 leading-relaxed">What you bring to a team and what energizes you</p>
                </button>
                <a
                  href="https://login.gallup.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#1a7c3e] hover:shadow-sm transition-all text-left group block"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#e8f5ee] flex items-center justify-center mb-3 group-hover:bg-[#d0ebda] transition-colors">
                    <svg className="w-5 h-5 text-[#1a7c3e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex items-start justify-between gap-1">
                    <p className="font-semibold text-gray-900 text-sm mb-1">Full Narrative Reports</p>
                    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">Access your complete CliftonStrengths reports on Gallup Access</p>
                </a>
                {reports.map(r => (
                  <button
                    key={r.id}
                    onClick={() => navigate(`/report/${r.id}?email=${emailEnc}`)}
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-300 hover:shadow-sm transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 mb-3 group-hover:bg-brand-100 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm mb-1">{r.name}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">Custom report from your coach</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tools for Continued Learning */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-1">Tools for Continued Learning</h2>
          <p className="text-sm text-gray-500 mb-4">Worksheets you can return to anytime — they auto-save as you work.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {cards.map(card => (
              <Link
                key={card.id}
                to={card.href}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 mb-3 group-hover:bg-brand-100 transition-colors">
                  {card.icon}
                </div>
                <p className="font-semibold text-gray-900 text-sm mb-1">{card.name}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{card.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Team Reports */}
        {profile.team_id && hasStrengths && (
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-1">Team Reports</h2>
            <p className="text-sm text-gray-500 mb-4">See how your whole team's strengths fit together.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                to={`/team-summary?teamId=${profile.team_id}`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 mb-3 group-hover:bg-brand-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900 text-sm mb-1">Team Summary</p>
                <p className="text-xs text-gray-500 leading-relaxed">Top 5 themes, domain breakdown, and what your team brings and needs</p>
              </Link>
              <Link
                to={`/team-grid?teamId=${profile.team_id}`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 mb-3 group-hover:bg-brand-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900 text-sm mb-1">Team Strengths Grid</p>
                <p className="text-xs text-gray-500 leading-relaxed">All team members and their Top 5 strengths organized by domain</p>
              </Link>
              <Link
                to={`/team-spark?teamId=${profile.team_id}`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 mb-3 group-hover:bg-brand-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900 text-sm mb-1">Theme Spark</p>
                <p className="text-xs text-gray-500 leading-relaxed">Visual distribution of talent across the team</p>
              </Link>
            </div>
          </section>
        )}

        {/* Print name tent */}
        {hasStrengths && (
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Table Name Tent</h2>
                <p className="text-sm text-gray-500 mt-0.5">Print a folded name tent to place at your seat during a session.</p>
              </div>
              <button
                onClick={() => printMyNameTent(profile)}
                className="shrink-0 ml-4 text-sm font-semibold text-gray-700 hover:text-gray-900 border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
              >
                Print Name Tent
              </button>
            </div>
          </section>
        )}

      </main>

      <SiteFooter />

      {showEditTop5 && (
        <EditTop5Modal
          currentTop5={profile.top5}
          onSave={handleTop5Saved}
          onClose={() => setShowEditTop5(false)}
        />
      )}
    </div>
  )
}
