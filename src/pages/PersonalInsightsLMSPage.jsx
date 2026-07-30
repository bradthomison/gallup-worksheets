import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PERSONAL_INSIGHTS, ROWS } from '../data/personalInsights'
import { getStrengthColors } from '../lib/strengthColors'
import SiteFooter from '../components/SiteFooter'

export default function PersonalInsightsLMSPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [person, setPerson] = useState(null) // { name, top5: string[] }
  const [insights, setInsights] = useState(null) // merged content map keyed by strength
  const [error, setError] = useState(null)

  async function handleLookup(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    setPerson(null)

    const { data, error: rpcErr } = await supabase
      .rpc('get_personal_insights_by_email', { p_email: email.trim().toLowerCase() })

    setLoading(false)

    if (rpcErr) {
      setError('An error occurred. Please try again.')
      return
    }
    if (data?.error === 'not_found') {
      setError("We couldn't find an account with that email address. Please check your email and try again, or contact your coach.")
      return
    }

    setPerson(data)

    // Try to load custom DB content; fall back to static data
    const strengths = data.top5?.filter(Boolean) ?? []
    const map = {}
    strengths.forEach(s => { map[s] = { ...PERSONAL_INSIGHTS[s] } })

    if (strengths.length > 0) {
      const { data: dbRows } = await supabase
        .from('report_content')
        .select('strength_name, content')
        .eq('report_type', 'personal_insights')
        .in('strength_name', strengths)

      ;(dbRows ?? []).forEach(r => {
        if (r.content) map[r.strength_name] = r.content
      })
    }

    setInsights(map)
  }

  const strengths = person?.top5?.filter(Boolean) ?? []

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center">
          <img src="/logo.png" alt="Gallup Strengths" className="h-[60px] w-auto" />
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10">
        {!person ? (
          // ── Email lookup form ──
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <div className="mb-6">
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Personal Insights</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Enter the email address your coach has on file to view your CliftonStrengths Personal Insights report.
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
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  {loading ? 'Looking up…' : 'View My Report'}
                </button>
              </form>
            </div>
          </div>
        ) : strengths.length === 0 ? (
          // ── Found person but no strengths ──
          <div className="max-w-md mx-auto text-center py-16">
            <p className="text-gray-700 font-medium mb-2">Hi, {person.name.split(' ')[0]}!</p>
            <p className="text-sm text-gray-500">
              Your coach hasn't entered your CliftonStrengths results yet. Please check back later or contact your coach.
            </p>
            <button onClick={() => { setPerson(null); setEmail('') }} className="mt-6 text-sm text-brand-500 hover:underline">
              Try a different email
            </button>
          </div>
        ) : (
          // ── Report ──
          <div>
            <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Personal Insights</h1>
                <p className="text-gray-500 text-sm mt-0.5">{person.name}</p>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium print:hidden"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / PDF
              </button>
            </div>

            <div className="overflow-auto rounded-2xl border border-gray-200 bg-white mb-4"
              style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
              <table className="w-full border-collapse text-sm" style={{ minWidth: `${150 + strengths.length * 180}px` }}>
                <colgroup>
                  <col style={{ width: '150px' }} />
                  {strengths.map(s => <col key={s} />)}
                </colgroup>
                <thead>
                  <tr>
                    <th className="border border-gray-200 bg-gray-50 p-3" />
                    {strengths.map(s => {
                      const c = getStrengthColors(s)
                      return (
                        <th
                          key={s}
                          className="border border-gray-200 p-3 text-center font-bold"
                          style={{ background: c.headerBg, color: c.headerText, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                        >
                          {s}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(row => (
                    <tr key={row.key} className="even:bg-gray-50/50">
                      <th className="border border-gray-200 bg-gray-50 p-3 text-left text-xs font-semibold text-gray-700 align-top whitespace-nowrap">
                        {row.key === 'description' ? person.name : row.label}
                      </th>
                      {strengths.map(s => (
                        <td key={s} className="border border-gray-200 p-3 text-xs text-gray-700 align-top leading-relaxed">
                          {insights?.[s]?.[row.key] ?? PERSONAL_INSIGHTS[s]?.[row.key] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mb-2">
              Cascade© 2021 Releasing Strengths Ltd. All rights reserved. Gallup®, CliftonStrengths® and the 34 theme names of CliftonStrengths® are trademarks of Gallup, Inc.
            </p>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
