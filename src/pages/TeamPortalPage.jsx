import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
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
  const { user, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [showP2Modal, setShowP2Modal] = useState(false)
  const [worksheets, setWorksheets] = useState([])
  const [worksheetsLoading, setWorksheetsLoading] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate(`/sign-in?next=/team/${teamId}`, { replace: true })
      return
    }
    async function load() {
      const { data, error } = await supabase.rpc('get_team_portal', { p_team_id: teamId })
      if (error || data?.error === 'not_found') {
        setNotFound(true)
        setLoading(false)
        return
      }
      const teamData = data.team
      // Check access: coach (created this team) or designated team manager
      const isCoach = teamData.created_by === user.id
      let isManager = false
      if (!isCoach) {
        const { data: profile } = await supabase.rpc('get_my_participant_profile')
        isManager = profile?.id === teamData.manager_id
      }
      if (!isCoach && !isManager) {
        setAccessDenied(true)
        setLoading(false)
        return
      }
      setTeam(teamData)
      const loadedMembers = data.members ?? []
      setMembers(loadedMembers)
      setReports(data.reports ?? [])
      const pre = memberParam
        ? loadedMembers.find(m => m.id === memberParam)
        : emailParam
          ? loadedMembers.find(m => m.email?.toLowerCase() === emailParam.toLowerCase())
          : null
      if (pre) setSelected(pre)
      setLoading(false)
    }
    load()
  }, [teamId, user, authLoading])

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
          description: 'Explore how this team member\'s unique strengths show up in their work.',
          icon: <IconBadge />,
          href: `/personal-insights?email=${email}`,
        })
      }

      if (hasBN) {
        cards.push({
          id: 'bring-need',
          name: 'Bring – Need',
          description: 'See what this team member brings to the team and what energizes them.',
          icon: <IconPeople />,
          href: `/bring-need?email=${email}`,
        })
      }
    }

    // Single Power of 2 card — opens variant picker
    cards.push({
      id: 'power-of-2',
      name: 'The Power of 2',
      description: 'Explore how this team member\'s strengths interact with another person\'s.',
      icon: <IconPeople />,
      action: 'p2modal',
    })

    if (hasStrengths(person)) {
      cards.push({
        id: 'power-of-me',
        name: 'The Power of Me',
        description: 'Explore how the roles and descriptive words of their Top 5 strengths interact.',
        icon: <IconPeople />,
        href: `/power-of-me?email=${email}`,
      })
    }

    if (hasStrengths(person)) {
      cards.push({
        id: 'talent-map',
        name: 'Talent Map',
        description: 'Discover how their Top 5 strengths help them build relationships, communicate, lead change, and more.',
        icon: <IconPeople />,
        href: `/talent-map?email=${email}`,
      })
    }

    reports.forEach(r => {
      cards.push({
        id: r.id,
        name: r.name,
        description: 'A custom report for this team.',
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

  if (notFound || accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center">
            <img src="/logo.png" alt="Gallup Strengths" className="h-[60px] w-auto" />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-700 font-medium mb-2">{accessDenied ? 'Access denied.' : 'Team not found.'}</p>
            <p className="text-sm text-gray-500">
              {accessDenied
                ? 'This page is only available to coaches and the team manager.'
                : 'This link may be invalid or the team may have been deleted.'}
            </p>
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
              <h1 className="text-3xl font-bold text-gray-900">Team Portal</h1>
            </div>

            {/* Team Reports — at top */}
            {members.some(m => (m.top5 ?? []).some(Boolean)) && (
              <div className="mb-10">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Team Reports</h2>
                <p className="text-sm text-gray-500 mb-4">Strengths-based reports for your entire team.</p>
                <div className="grid grid-cols-1 gap-4">
                  <a
                    href={`/team-summary?teamId=${teamId}`}
                    className="flex items-center gap-5 bg-white hover:bg-brand-50 border border-gray-200 hover:border-brand-300 rounded-2xl px-6 py-5 text-left transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 group-hover:bg-brand-200 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">Team Summary</p>
                      <p className="text-sm text-gray-500 mt-0.5">Top 5 themes, domain breakdown, and what the team brings, needs, and is motivated by.</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-500 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                  <a
                    href={`/team-grid?teamId=${teamId}`}
                    className="flex items-center gap-5 bg-white hover:bg-brand-50 border border-gray-200 hover:border-brand-300 rounded-2xl px-6 py-5 text-left transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 group-hover:bg-brand-200 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">Team Strengths Grid</p>
                      <p className="text-sm text-gray-500 mt-0.5">See all team members and their Top 5 strengths organized by domain.</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-500 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                  <a
                    href={`/team-spark?teamId=${teamId}`}
                    className="flex items-center gap-5 bg-white hover:bg-brand-50 border border-gray-200 hover:border-brand-300 rounded-2xl px-6 py-5 text-left transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 group-hover:bg-brand-200 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">Theme Spark</p>
                      <p className="text-sm text-gray-500 mt-0.5">Visual distribution of talent — how strengths are spread across the team.</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-500 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            )}

            {/* Team members — with search always visible */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Team Members</h2>
              <p className="text-gray-500 text-sm mb-4">Select a team member to view their available reports and worksheets.</p>

              {members.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                  <p className="text-gray-500 text-sm">No members have been added to this team yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Add members from the Participants page.</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <input
                      type="search"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search by name…"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
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
            </div>
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
              <h1 className="text-3xl font-bold text-gray-900">{selected.name}</h1>
              <p className="text-gray-500 text-sm mt-2">Reports and worksheets for this team member.</p>
            </div>

            {/* Reports section */}
            {cards.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500 text-sm">No reports available for this team member.</p>
                <p className="text-xs text-gray-400 mt-1">Strengths data may not be on file yet.</p>
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
              <h2 className="text-lg font-bold text-gray-900 mb-1">Session Worksheets</h2>
              <p className="text-sm text-gray-500 mb-4">Worksheets from sessions this team member has participated in.</p>

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
