import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { parseLocalDate, formatDateShort, todayStr } from '../lib/dateUtils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function isActive(session) {
  if (session.archived) return false
  if (!session.date) return true          // no date → always active
  return session.date >= todayStr()
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────

function MiniCalendar({ sessions }) {
  const now = new Date()
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1))

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const td    = todayStr()

  // Build per-date sets for dot colouring
  const futureDates = new Set()
  const pastDates   = new Set()
  sessions.forEach(s => {
    if (!s.date || s.archived) return
    ;(s.date >= td ? futureDates : pastDates).add(s.date)
  })

  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells       = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-6">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded transition-colors font-bold"
        >‹</button>
        <p className="text-sm font-semibold text-gray-800">{monthLabel}</p>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded transition-colors font-bold"
        >›</button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-[10px] font-medium text-gray-400">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 text-center">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const ds      = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = now.getFullYear() === year && now.getMonth() === month && now.getDate() === day
          const hasFut  = futureDates.has(ds)
          const hasPast = pastDates.has(ds)
          const hasDot  = hasFut || hasPast

          return (
            <div key={i} className="flex items-center justify-center py-0.5">
              <span className={`relative text-xs w-7 h-7 flex items-center justify-center rounded-full
                ${isToday ? 'bg-brand-500 text-white font-bold' : hasFut ? 'text-brand-600 font-semibold' : 'text-gray-700'}`}
              >
                {day}
                {hasDot && (
                  <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full
                    ${isToday ? 'bg-white' : hasFut ? 'bg-brand-500' : 'bg-gray-300'}`}
                  />
                )}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-1.5 h-1.5 bg-brand-500 rounded-full shrink-0" />
          Upcoming session
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full shrink-0" />
          Past session
        </div>
      </div>
    </div>
  )
}

// ── Session Card ──────────────────────────────────────────────────────────────

function SessionCard({ session, user, profiles }) {
  const total       = session.participants.length
  const submitted   = session.participants.filter(p => p.responses?.some(r => r.submitted_at)).length
  const isOwner     = session.created_by === user?.id
  const sharedBy    = !isOwner ? (profiles[session.created_by] ?? 'Another coach') : null

  return (
    <Link
      to={`/sessions/${session.id}`}
      className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-brand-500 hover:shadow-sm transition-all"
    >
      <div className="min-w-0 mr-4">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900 truncate">{session.title}</p>
          {session.archived && (
            <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">Archived</span>
          )}
          {isOwner && session.shared && !session.archived && (
            <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full shrink-0">Shared</span>
          )}
          {!isOwner && (
            <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
              Shared by {sharedBy}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {session.date ? formatDateShort(session.date) : '—'}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-medium text-gray-700">{total} participant{total !== 1 ? 's' : ''}</p>
        <p className="text-xs text-gray-400 mt-0.5">{submitted}/{total} submitted</p>
      </div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const [sessions, setSessions]     = useState([])
  const [profiles, setProfiles]     = useState({})
  const [loading, setLoading]       = useState(true)
  const [pastExpanded, setPastExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: sessData }, { data: profData }] = await Promise.all([
        supabase
          .from('sessions')
          .select(`*, participants ( id, responses ( submitted_at ) )`)
          .order('date', { ascending: false }),
        supabase.from('profiles').select('id, display_name'),
      ])
      setSessions(sessData ?? [])
      const map = {}
      ;(profData ?? []).forEach(p => { map[p.id] = p.display_name })
      setProfiles(map)
      setLoading(false)
    }
    load()
  }, [])

  const activeSessions = sessions
    .filter(isActive)
    .sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date.localeCompare(b.date)   // soonest first
    })

  const pastSessions = sessions
    .filter(s => !isActive(s))
    .sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return -1
      if (!b.date) return 1
      return b.date.localeCompare(a.date)   // most recent first
    })

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
        <Link
          to="/sessions/new"
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Session
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500 mb-4">No sessions yet.</p>
          <Link to="/sessions/new" className="text-brand-500 font-medium hover:underline text-sm">
            Create your first session →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6 items-start">

          {/* ── Left: session lists ────────────────────────────────────────── */}
          <div className="col-span-2 space-y-4">

            {/* Active / upcoming */}
            {activeSessions.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-200">
                <p className="text-gray-400 text-sm">No upcoming sessions.</p>
                <Link to="/sessions/new" className="text-brand-500 text-sm font-medium hover:underline mt-1 inline-block">
                  Create a session →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeSessions.map(s => (
                  <SessionCard key={s.id} session={s} user={user} profiles={profiles} />
                ))}
              </div>
            )}

            {/* Past & Archived — expandable */}
            {pastSessions.length > 0 && (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setPastExpanded(e => !e)}
                  className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-sm font-medium text-gray-600">
                    Past &amp; Archived Sessions
                    <span className="ml-2 text-xs font-normal text-gray-400">({pastSessions.length})</span>
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${pastExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {pastExpanded && (
                  <div className="bg-white divide-y divide-gray-100">
                    {pastSessions.map(s => (
                      <div key={s.id} className="px-3 py-2">
                        <SessionCard session={s} user={user} profiles={profiles} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right: calendar ───────────────────────────────────────────── */}
          <div className="col-span-1">
            <MiniCalendar sessions={sessions} />
          </div>

        </div>
      )}
    </Layout>
  )
}
