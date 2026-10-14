import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PERSONAL_INSIGHTS } from '../data/personalInsights'
import { BRING_NEED } from '../data/bringNeed'
import { P2_VARIANTS, P2_VARIANT_ORDER, p2Path } from '../data/powerOf2'
import SiteFooter from '../components/SiteFooter'

// ── Small icons ───────────────────────────────────────────────────────────────

const IconBadge = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
)

const IconPeople = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const IconChart = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const IconWorksheet = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
)

// ── Power of 2 variant picker modal ──────────────────────────────────────────

function P2Modal({ onSelect, onClose }) {
  const [chosen, setChosen] = useState('bring-need')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-1">The Power of 2</h2>
        <p className="text-sm text-gray-500 mb-5">Choose which version of the worksheet to open.</p>

        <div className="space-y-2 mb-6">
          {P2_VARIANT_ORDER.map(v => (
            <label
              key={v}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                chosen === v
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="p2variant"
                value={v}
                checked={chosen === v}
                onChange={() => setChosen(v)}
                className="accent-brand-500"
              />
              <span className="text-sm font-medium text-gray-800">{P2_VARIANTS[v].label}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSelect(chosen)}
            className="flex-1 rounded-lg bg-brand-500 hover:bg-brand-600 py-2.5 text-sm font-medium text-white transition-colors"
          >
            Open
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Worksheet status pill ─────────────────────────────────────────────────────

function StatusPill({ submittedAt, responseCount }) {
  if (submittedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Complete
      </span>
    )
  }
  if (responseCount > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        In Progress
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
      Not Started
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TeamPortalPage() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const memberParam = searchParams.get('member')
  const emailParam = searchParams.get('email')

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [showP2Modal, setShowP2Modal] = useState(false)
  const [worksheets, setWorksheets] = useState([])
  const [worksheetsLoading, setWorksheetsLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.rpc('get_team_portal', { p_team_id: teamId })
      if (error || data?.error === 'not_found') {
        setNotFound(true)
      } else {
        setTeam(data.team)
        const loadedMembers = data.members ?? []
        setMembers(loadedMembers)
        setReports(data.reports ?? [])
        const pre = memberParam
          ? loadedMembers.find(m => m.id === memberParam)
          : emailParam
            ? loadedMembers.find(m => m.email?.toLowerCase() === emailParam.toLowerCase())
            : null
        if (pre) setSelected(pre)
      }
      setLoading(false)
    }
    load()
  }, [teamId])

  // Load worksheets when a member is selected
  useEffect(() => {
    if (!selected) { setWorksheets([]); return }
    setWorksheetsLoading(true)
    supabase
      .rpc('get_portal_worksheets', { p_email: selected.email, p_team_id: teamId })
      .then(({ data }) => {
        setWorksheets(data ?? [])
        setWorksheetsLoading(false)
      })
  }, [selected, teamId])

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const hasStrengths = (person) => (person.top5 ?? []).some(Boolean)

  function reportCards(person) {
    const cards = []
    const email = encodeURIComponent(person.email)

    if (hasStrengths(person)) {
      const hasPI = (person.top5 ?? []).some(s => PERSONAL_INSIGHTS[s])
      const hasBN = (person.top5 ?? []).some(s => BRING_NEED[s])

      if (hasPI) {
        cards.push({
          id: 'personal-insights',
          name: 'Personal Insights',
          description: 'Explore your unique strengths and how they show up in your work.',
          icon: <IconBadge />,
          href: `/personal-insights?email=${email}`,
        })
      }

      if (hasBN) {
        cards.push({
          id: 'bring-need',
          name: 'Bring – Need',
          description: 'See what you bring to a team and what energizes you.',
          icon: <IconPeople />,
          href: `/bring-need?email=${email}`,
        })
      }
    }

    // Single Power of 2 card — opens variant picker
    cards.push({
      id: 'power-of-2',
      name: 'The Power of 2',
      description: 'Pair with a teammate to explore how your strengths interact.',
      icon: <IconPeople />,
      action: 'p2modal',
    })

    if (hasStrengths(person)) {
      cards.push({
        id: 'power-of-me',
        name: 'The Power of Me',
        description: 'Explore how the roles and descriptive words of your own Top 5 strengths interact.',
        icon: <IconPeople />,
        href: `/power-of-me?email=${email}`,
      })
    }

    reports.forEach(r => {
      cards.push({
        id: r.id,
        name: r.name,
        description: 'A custom report created by your coach.',
        icon: <IconChart />,
        href: `/report/${r.id}?email=${email}`,
      })
    })

    return cards
  }

  function handleCardClick(card) {
    if (card.action === 'p2modal') {
      setShowP2Modal(true)
    } else {
      navigate(card.href)
    }
  }

  function handleP2Select(variant) {
    setShowP2Modal(false)
    const email = encodeURIComponent(selected.email)
    navigate(`${p2Path(variant)}?email=${email}&teamId=${teamId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center">
            <img src="/logo.png" alt="Gallup Strengths" className="h-[60px] w-auto" />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-700 font-medium mb-2">Team not found.</p>
            <p className="text-sm text-gray-500">This link may be invalid or the team may have been deleted.</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const cards = selected ? reportCards(selected) : []

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {showP2Modal && (
        <P2Modal
          onSelect={handleP2Select}
          onClose={() => setShowP2Modal(false)}
        />
      )}

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center">
          <img src="/logo.png" alt="Gallup Strengths" className="h-[60px] w-auto" />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
        {!selected ? (
          <>
            <div className="mb-8">
              <p className="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-1">{team.name}</p>
              <h1 className="text-3xl font-bold text-gray-900">Who are you?</h1>
              <p className="text-gray-500 text-sm mt-2">Select your name to view your available reports.</p>
            </div>

            {members.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500 text-sm">No members have been added to this team yet.</p>
                <p className="text-xs text-gray-400 mt-1">Contact your coach to get set up.</p>
              </div>
            ) : (
              <>
                {members.length > 6 && (
                  <div className="mb-4">
                    <input
                      type="search"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search your name…"
                      autoFocus
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filtered.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setSelected(m); navigate(`/team/${teamId}?member=${m.id}`, { replace: true }) }}
                      className="flex items-center gap-3 bg-white hover:bg-brand-50 border border-gray-200 hover:border-brand-300 rounded-xl px-5 py-4 text-left transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-semibold text-sm shrink-0 group-hover:bg-brand-200 transition-colors">
                        {m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{m.name}</span>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="col-span-2 text-sm text-gray-400 text-center py-6">No matches for &ldquo;{search}&rdquo;</p>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="mb-8">
              <button
                onClick={() => { setSelected(null); setSearch(''); navigate(`/team/${teamId}`, { replace: true }) }}
                className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-700 font-medium mb-4 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to team
              </button>
              <p className="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-1">{team.name}</p>
              <h1 className="text-3xl font-bold text-gray-900">Hi, {selected.name.split(' ')[0]}!</h1>
              <p className="text-gray-500 text-sm mt-2">Select a report to view.</p>
            </div>

            {/* Reports section */}
            {cards.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500 text-sm">No reports are available for you yet.</p>
                <p className="text-xs text-gray-400 mt-1">Contact your coach to get set up.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 mb-10">
                {cards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(card)}
                    className="flex items-center gap-5 bg-white hover:bg-brand-50 border border-gray-200 hover:border-brand-300 rounded-2xl px-6 py-5 text-left transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 group-hover:bg-brand-200 transition-colors">
                      {card.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{card.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{card.description}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-500 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {/* Worksheets section */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Your Worksheets</h2>
              <p className="text-sm text-gray-500 mb-4">Worksheets assigned to you by your coach.</p>

              {worksheetsLoading ? (
                <p className="text-sm text-gray-400">Loading worksheets…</p>
              ) : worksheets.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
                  <p className="text-sm text-gray-500">No worksheets assigned yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {worksheets.map(ws => (
                    <button
                      key={ws.participant_id}
                      onClick={() => navigate(`/worksheet/${ws.slug}`)}
                      className="flex items-center gap-4 bg-white hover:bg-brand-50 border border-gray-200 hover:border-brand-300 rounded-2xl px-5 py-4 text-left transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 group-hover:bg-brand-200 transition-colors">
                        <IconWorksheet />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{ws.session_title}</p>
                        {ws.session_date && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(ws.session_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                        <div className="mt-1.5">
                          <StatusPill submittedAt={ws.submitted_at} responseCount={ws.response_count} />
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-500 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
