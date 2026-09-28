import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PERSONAL_INSIGHTS } from '../data/personalInsights'
import { BRING_NEED } from '../data/bringNeed'
import SiteFooter from '../components/SiteFooter'

export default function TeamPortalPage() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const memberParam = searchParams.get('member')

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

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
        if (memberParam) {
          const pre = loadedMembers.find(m => m.id === memberParam)
          if (pre) setSelected(pre)
        }
      }
      setLoading(false)
    }
    load()
  }, [teamId])

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
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          ),
          href: `/personal-insights?email=${email}`,
        })
      }

      if (hasBN) {
        cards.push({
          id: 'bring-need',
          name: 'Bring – Need',
          description: 'See what you bring to a team and what energizes you.',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
          href: `/bring-need?email=${email}`,
        })
      }
    }

    cards.push({
      id: 'power-of-2',
      name: 'The Power of 2',
      description: 'Pair with a teammate to explore how your strengths interact.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      href: `/power-of-2?email=${email}&teamId=${teamId}`,
    })

    reports.forEach(r => {
      cards.push({
        id: r.id,
        name: r.name,
        description: 'A custom report created by your coach.',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        href: `/report/${r.id}?email=${email}`,
      })
    })

    return cards
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

            {cards.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500 text-sm">No reports are available for you yet.</p>
                <p className="text-xs text-gray-400 mt-1">Contact your coach to get set up.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {cards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => navigate(card.href)}
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
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
