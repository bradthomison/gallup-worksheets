import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { getStrengthColors } from '../lib/strengthColors'
import { p2Path } from '../data/powerOf2'
import SiteFooter from '../components/SiteFooter'

// ── Worksheet card definitions ────────────────────────────────────────────────

function worksheetCards(email, teamId) {
  const e = encodeURIComponent(email)
  const t = teamId ? `&teamId=${teamId}` : ''
  return [
    {
      id: 'talent-map',
      name: 'Talent Map',
      description: 'Explore how each of your strengths helps you build relationships, communicate, lead change, and more.',
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ParticipantDashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [worksheets, setWorksheets] = useState([])
  const [worksheetsLoading, setWorksheetsLoading] = useState(false)

  // Guard: not signed in
  useEffect(() => {
    if (!authLoading && !user) navigate('/sign-in', { replace: true })
  }, [user, authLoading])

  // Load participant profile + link account on first sign-in
  useEffect(() => {
    if (!user) return
    async function load() {
      setProfileLoading(true)
      // Link any unlinked participant rows for this email (no-op if already done)
      await supabase.rpc('link_participant_account')
      // Load profile
      const { data } = await supabase.rpc('get_my_participant_profile')
      setProfileLoading(false)
      if (!data || data.error) return
      setProfile(data)
    }
    load()
  }, [user])

  // Load assigned session worksheets
  useEffect(() => {
    if (!profile?.team_id || !profile?.email) return
    setWorksheetsLoading(true)
    supabase
      .rpc('get_portal_worksheets', { p_email: profile.email, p_team_id: profile.team_id })
      .then(({ data }) => {
        setWorksheets(data ?? [])
        setWorksheetsLoading(false)
      })
  }, [profile])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/sign-in', { replace: true })
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (!user) return null

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <img src="/logo.png" alt="Gallup Strengths" className="h-16 w-auto mb-6" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">No participant profile found</h1>
        <p className="text-sm text-gray-500 max-w-sm">
          We couldn't find a participant record for <span className="font-medium">{user.email}</span>. Make sure your coach has added you to a session, then try again.
        </p>
        <button onClick={handleSignOut} className="mt-6 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2">
          Sign out
        </button>
      </div>
    )
  }

  const firstName = profile.name?.split(' ')[0] ?? 'there'
  const hasStrengths = Array.isArray(profile.top5) && profile.top5.length > 0
  const cards = worksheetCards(profile.email, profile.team_id)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <img src="/logo.png" alt="Gallup Strengths" className="h-10 w-auto" />
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 space-y-10">

        {/* Welcome + Top 5 */}
        <section>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Hi {firstName}!</h1>
          <p className="text-gray-500 text-sm mb-6">Your CliftonStrengths dashboard.</p>

          {hasStrengths ? (
            <div className="flex flex-wrap gap-2">
              {profile.top5.map((s, i) => {
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
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
              Your Top 5 strengths haven't been entered yet. Your coach will add them before your session.
            </div>
          )}
        </section>

        {/* Evergreen worksheets */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-4">Your Worksheets</h2>
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

        {/* Session worksheets */}
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
      </main>

      <SiteFooter />
    </div>
  )
}
