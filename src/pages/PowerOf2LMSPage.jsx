import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { POWER_OF_2 } from '../data/powerOf2'
import { getStrengthColors } from '../lib/strengthColors'
import { downloadPowerOf2PDF } from '../lib/downloadReportPDF'
import SiteFooter from '../components/SiteFooter'

const INSTRUCTIONS = [
  {
    title: 'Understand the Layout',
    body: [
      'The top row lists one person\'s Top 5 CliftonStrengths.',
      'The left column lists the other person\'s Top 5 CliftonStrengths.',
      'Each intersecting box represents a specific interaction between two strengths — one from each person.',
      'Each box includes two prompts: I bring… and I need…',
    ],
  },
  {
    title: 'Work Through the Intersections Together',
    body: [
      'For each intersecting box, discuss the interaction between the two strengths shown.',
      'Consider both perspectives: What does this strength contribute to the partnership? What support helps it function alongside the other?',
      'Complete the box with "I bring…" → what this strength contributes, and "I need…" → what helps it work well alongside the other.',
      'Keep responses short, practical, and based on real work experience.',
    ],
  },
  {
    title: 'Focus on Insight, Not Completion',
    body: [
      'You are not expected to perfect every box.',
      'Look for patterns or recurring themes.',
      'Note intersections that feel especially strong or challenging.',
      'Prioritize boxes most relevant to how you currently work together.',
    ],
  },
  {
    title: 'Reflect and Align',
    body: [
      'Where your strengths clearly reinforce one another.',
      'Where misunderstandings or tension could arise.',
      'One or two takeaways you can apply immediately to improve collaboration.',
    ],
  },
]

const GUIDELINES = [
  'There are no "good" or "bad" strengths — only strengths used intentionally or unintentionally.',
  '"I need…" statements are not demands; they clarify how to work well together.',
  'Approach the conversation with curiosity and shared accountability.',
]

export default function PowerOf2LMSPage() {
  const [searchParams] = useSearchParams()
  const emailParam = searchParams.get('email')
  const teamIdParam = searchParams.get('teamId')

  const [email, setEmail] = useState(emailParam ?? '')
  const [loading, setLoading] = useState(false)
  const [person, setPerson] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState(null)
  const [partner, setPartner] = useState(null)
  const [partnerSearch, setPartnerSearch] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)

  async function loadData(emailVal, teamId) {
    setLoading(true)
    setError(null)

    const [{ data: personData, error: personErr }, portalResult] = await Promise.all([
      supabase.rpc('get_personal_insights_by_email', { p_email: emailVal.trim().toLowerCase() }),
      teamId
        ? supabase.rpc('get_team_portal', { p_team_id: teamId })
        : Promise.resolve({ data: null }),
    ])

    setLoading(false)

    if (personErr || personData?.error === 'not_found') {
      setError("We couldn't find an account with that email address. Please check your email and try again, or contact your coach.")
      return
    }

    setPerson(personData)

    let portal = portalResult?.data
    if (!portal && !personData.team_id) {
      setError('You must be on a team to use the Power of 2 worksheet. Contact your coach.')
      return
    }

    if (!portal && personData.team_id) {
      const { data: p2 } = await supabase.rpc('get_team_portal', { p_team_id: personData.team_id })
      portal = p2
    }

    if (!portal || portal.error === 'not_found') {
      setError('Could not load team data. Contact your coach.')
      return
    }

    setTeamName(portal.team?.name ?? '')
    const others = (portal.members ?? []).filter(m => m.email !== emailVal.trim().toLowerCase())
    setTeamMembers(others)
  }

  async function handleLookup(e) {
    e.preventDefault()
    if (!email.trim()) return
    await loadData(email, teamIdParam)
  }

  useEffect(() => {
    if (emailParam) loadData(emailParam, teamIdParam)
  }, [])

  const rowStrengths = (person?.top5 ?? []).filter(s => POWER_OF_2[s])
  const colStrengths = (partner?.top5 ?? []).filter(s => POWER_OF_2[s])

  const filteredMembers = teamMembers.filter(m =>
    m.name.toLowerCase().includes(partnerSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center">
          <img src="/logo.png" alt="Gallup Strengths" className="h-[60px] w-auto" />
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-gray-400 text-sm">Loading…</p>
          </div>

        ) : !person ? (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <div className="mb-6">
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">The Power of 2</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Enter the email address your coach has on file to get started.
                </p>
              </div>
              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
                )}
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  Continue
                </button>
              </form>
            </div>
          </div>

        ) : !partner ? (
          <div className="max-w-xl mx-auto">
            <div className="mb-6">
              <p className="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-1">{teamName}</p>
              <h1 className="text-2xl font-bold text-gray-900">The Power of 2</h1>
              <p className="text-gray-500 text-sm mt-1">Hi {person.name.split(' ')[0]}! Who would you like to pair with?</p>
            </div>

            {teamMembers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500 text-sm">No other team members found.</p>
                <p className="text-xs text-gray-400 mt-1">Contact your coach to add teammates.</p>
              </div>
            ) : (
              <>
                {teamMembers.length > 5 && (
                  <div className="mb-3">
                    <input
                      type="search"
                      value={partnerSearch}
                      onChange={e => setPartnerSearch(e.target.value)}
                      placeholder="Search teammates…"
                      autoFocus
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredMembers.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setPartner(m)}
                      className="flex items-center gap-3 bg-white hover:bg-brand-50 border border-gray-200 hover:border-brand-300 rounded-xl px-5 py-4 text-left transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-semibold text-sm shrink-0 group-hover:bg-brand-200 transition-colors">
                        {m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{m.name}</span>
                    </button>
                  ))}
                  {filteredMembers.length === 0 && (
                    <p className="col-span-2 text-sm text-gray-400 text-center py-6">No matches for &ldquo;{partnerSearch}&rdquo;</p>
                  )}
                </div>
              </>
            )}
          </div>

        ) : (
          <div>
            {/* Top bar */}
            <div className="flex items-start justify-between mb-6 flex-wrap gap-3 print:hidden">
              <div>
                <button
                  onClick={() => setPartner(null)}
                  className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-700 font-medium mb-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Change partner
                </button>
                <h1 className="text-2xl font-bold text-gray-900">The Power of 2</h1>
                <p className="text-gray-500 text-sm mt-0.5">{person.name} &amp; {partner.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setPdfLoading(true)
                    await downloadPowerOf2PDF(person, partner)
                    setPdfLoading(false)
                  }}
                  disabled={pdfLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {pdfLoading ? 'Generating…' : 'Download PDF'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
              </div>
            </div>

            {/* Worksheet grid */}
            <div className="overflow-auto rounded-2xl border border-gray-200 bg-white mb-6"
              style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
              <table className="w-full border-collapse text-xs" style={{ minWidth: `${180 + colStrengths.length * 200}px` }}>
                <colgroup>
                  <col style={{ width: '180px' }} />
                  {colStrengths.map(s => <col key={s} style={{ minWidth: '200px' }} />)}
                </colgroup>

                {/* Column header row — partner's strengths */}
                <thead>
                  <tr>
                    {/* Top-left corner */}
                    <th className="border border-gray-200 bg-gray-50 p-3 align-bottom text-left">
                      <p className="font-semibold text-gray-700 text-xs">{person.name}</p>
                      <p className="text-gray-400 text-[10px] mt-0.5">↓ rows</p>
                      <p className="font-semibold text-gray-700 text-xs mt-2">{partner.name}</p>
                      <p className="text-gray-400 text-[10px] mt-0.5">→ columns</p>
                    </th>
                    {colStrengths.map(s => {
                      const c = getStrengthColors(s)
                      return (
                        <th
                          key={s}
                          className="border border-gray-200 p-3 text-left align-top font-normal"
                          style={{ background: c.headerBg, color: c.headerText, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                        >
                          <p className="font-bold text-sm mb-1.5">{s}</p>
                          <p className="text-[11px] leading-snug opacity-90"><span className="font-semibold">I Bring</span> {POWER_OF_2[s]?.bring ?? ''}</p>
                          <p className="text-[11px] leading-snug opacity-90 mt-1"><span className="font-semibold">I Need</span> {POWER_OF_2[s]?.need ?? ''}</p>
                        </th>
                      )
                    })}
                  </tr>
                </thead>

                {/* Body rows — person's strengths */}
                <tbody>
                  {rowStrengths.map(s => {
                    const c = getStrengthColors(s)
                    return (
                      <tr key={s}>
                        <th
                          className="border border-gray-200 p-3 text-left align-top font-normal"
                          style={{ background: c.headerBg, color: c.headerText, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                        >
                          <p className="font-bold text-sm mb-1.5">{s}</p>
                          <p className="text-[11px] leading-snug opacity-90"><span className="font-semibold">I Bring</span> {POWER_OF_2[s]?.bring ?? ''}</p>
                          <p className="text-[11px] leading-snug opacity-90 mt-1"><span className="font-semibold">I Need</span> {POWER_OF_2[s]?.need ?? ''}</p>
                        </th>
                        {colStrengths.map(cs => (
                          <td
                            key={cs}
                            className="border border-gray-200 bg-white"
                            style={{ minHeight: '120px', height: '120px' }}
                          />
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-400 mb-8 print:mb-4">
              Cascade© 2021 Releasing Strengths Ltd. All rights reserved. Gallup®, CliftonStrengths® and the 34 theme names of CliftonStrengths® are trademarks of Gallup, Inc.
            </p>

            {/* Instructions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 print:mt-8">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Power of 2 Worksheet – Instructions</h2>
              <p className="text-sm text-gray-500 mb-5">
                The Power of 2 worksheet helps paired participants understand how their CliftonStrengths interact in day-to-day work. By examining the intersections of each person's Top 5 strengths, partners identify what they bring to the collaboration and what they need from one another to work effectively.
              </p>

              <h3 className="text-sm font-semibold text-gray-700 mb-3">How to Use the Worksheet</h3>
              <div className="space-y-5">
                {INSTRUCTIONS.map((section, i) => (
                  <div key={i}>
                    <p className="text-sm font-semibold text-gray-800 mb-1.5">{i + 1}. {section.title}</p>
                    <ul className="space-y-1">
                      {section.body.map((line, j) => (
                        <li key={j} className="flex gap-2 text-sm text-gray-600">
                          <span className="text-gray-300 mt-0.5 shrink-0">•</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-3">Guidelines for Productive Discussion</h3>
              <ul className="space-y-1">
                {GUIDELINES.map((g, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600">
                    <span className="text-gray-300 mt-0.5 shrink-0">•</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
