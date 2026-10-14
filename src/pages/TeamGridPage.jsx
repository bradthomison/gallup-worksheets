import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DOMAINS } from '../lib/strengthColors'
import SiteFooter from '../components/SiteFooter'

// Strengths ordered by domain, matching Gallup's canonical groupings
const DOMAIN_COLUMNS = [
  {
    key: 'strategic',
    label: 'Strategic Thinking',
    strengths: ['Analytical', 'Context', 'Futuristic', 'Ideation', 'Input', 'Intellection', 'Learner', 'Strategic'],
  },
  {
    key: 'influencing',
    label: 'Influencing',
    strengths: ['Activator', 'Command', 'Communication', 'Competition', 'Maximizer', 'Self-Assurance', 'Significance', 'Woo'],
  },
  {
    key: 'relationship',
    label: 'Relationship Building',
    strengths: ['Adaptability', 'Connectedness', 'Developer', 'Empathy', 'Harmony', 'Includer', 'Individualization', 'Positivity', 'Relator'],
  },
  {
    key: 'executing',
    label: 'Executing',
    strengths: ['Achiever', 'Arranger', 'Belief', 'Consistency', 'Deliberative', 'Discipline', 'Focus', 'Responsibility', 'Restorative'],
  },
]

const ALL_COLUMNS = DOMAIN_COLUMNS.flatMap(d => d.strengths)

export default function TeamGridPage() {
  const [searchParams] = useSearchParams()
  const teamId = searchParams.get('teamId')
  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!teamId) { setNotFound(true); setLoading(false); return }
    supabase.rpc('get_team_portal', { p_team_id: teamId }).then(({ data, error }) => {
      if (error || data?.error === 'not_found') { setNotFound(true) }
      else {
        setTeam(data.team)
        setMembers((data.members ?? []).filter(m => (m.top5 ?? []).some(Boolean)))
      }
      setLoading(false)
    })
  }, [teamId])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading…</p>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center px-4">
      <div>
        <p className="text-gray-700 font-medium mb-1">Team not found.</p>
        <p className="text-sm text-gray-400">This link may be invalid or the team may have been deleted.</p>
      </div>
    </div>
  )

  // Build rank lookup: memberId → { strength → rank 1-5 }
  const rankMap = {}
  members.forEach(m => {
    rankMap[m.id] = {}
    ;(m.top5 ?? []).forEach((s, i) => { if (s) rankMap[m.id][s] = i + 1 })
  })

  // Domain totals: how many times each strength appears across all members
  const totals = {}
  ALL_COLUMNS.forEach(s => {
    totals[s] = members.filter(m => rankMap[m.id][s]).length
  })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Print CSS */}
      <style>{`
        @media print {
          @page { size: landscape; margin: 0.5cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-container { padding: 0 !important; }
        }
      `}</style>

      <header className="bg-white border-b border-gray-200 no-print">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <img src="/logo.png" alt="Gallup Strengths" className="h-10 w-auto" />
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg px-3 py-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </header>

      <main className="flex-1 print-container px-4 py-8 overflow-x-auto">
        <div className="mb-6">
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-widest">{team.name}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Team Strengths Grid</h1>
          <p className="text-sm text-gray-500 mt-1">{members.length} member{members.length !== 1 ? 's' : ''} · Top 5 strengths shown</p>
        </div>

        {members.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">No team members with strengths entered yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="border-collapse text-xs" style={{ minWidth: '900px' }}>
              <thead>
                {/* Domain header row */}
                <tr>
                  <th className="w-36 min-w-36 border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-500 sticky left-0 z-10">Name</th>
                  {DOMAIN_COLUMNS.map(d => {
                    const style = DOMAINS[d.key]
                    return (
                      <th
                        key={d.key}
                        colSpan={d.strengths.length}
                        className="border border-gray-200 px-2 py-2 text-center text-xs font-bold text-white"
                        style={{ backgroundColor: style.headerBg }}
                      >
                        {d.label}
                      </th>
                    )
                  })}
                </tr>
                {/* Strength name row */}
                <tr>
                  <th className="border border-gray-200 bg-gray-50 sticky left-0 z-10" />
                  {DOMAIN_COLUMNS.map(d =>
                    d.strengths.map(s => {
                      const style = DOMAINS[d.key]
                      return (
                        <th
                          key={s}
                          className="border border-gray-200 px-1 py-2 font-medium text-center"
                          style={{ backgroundColor: style.bg, color: style.text, writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: '90px', minWidth: '24px' }}
                        >
                          {s}
                        </th>
                      )
                    })
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map((m, mi) => (
                  <tr key={m.id} className={mi % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-200 px-3 py-1.5 font-medium text-gray-900 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                      {m.name}
                    </td>
                    {DOMAIN_COLUMNS.map(d =>
                      d.strengths.map(s => {
                        const rank = rankMap[m.id][s]
                        const style = DOMAINS[d.key]
                        return (
                          <td
                            key={s}
                            className="border border-gray-200 text-center font-bold"
                            style={rank ? { backgroundColor: style.bg, color: style.text } : {}}
                          >
                            {rank ?? ''}
                          </td>
                        )
                      })
                    )}
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="border-t-2 border-gray-300">
                  <td className="border border-gray-200 px-3 py-1.5 font-semibold text-gray-600 sticky left-0 bg-gray-100 z-10 text-xs uppercase tracking-wide">Count</td>
                  {DOMAIN_COLUMNS.map(d =>
                    d.strengths.map(s => {
                      const count = totals[s]
                      const style = DOMAINS[d.key]
                      return (
                        <td
                          key={s}
                          className="border border-gray-200 text-center text-xs font-semibold bg-gray-100"
                          style={count > 0 ? { color: style.text } : { color: '#9ca3af' }}
                        >
                          {count > 0 ? count : '·'}
                        </td>
                      )
                    })
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>

      <SiteFooter className="no-print" />
    </div>
  )
}
