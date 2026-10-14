import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DOMAINS } from '../lib/strengthColors'
import { TEAM_SUMMARY_PHRASES } from '../data/teamSummaryPhrases'

// ── Strength → domain map ─────────────────────────────────────────────────────

const STRENGTH_DOMAIN_MAP = {
  Analytical: 'strategic', Context: 'strategic', Futuristic: 'strategic', Ideation: 'strategic',
  Input: 'strategic', Intellection: 'strategic', Learner: 'strategic', Strategic: 'strategic',
  Activator: 'influencing', Command: 'influencing', Communication: 'influencing', Competition: 'influencing',
  Maximizer: 'influencing', 'Self-Assurance': 'influencing', Significance: 'influencing', Woo: 'influencing',
  Adaptability: 'relationship', Connectedness: 'relationship', Developer: 'relationship', Empathy: 'relationship',
  Harmony: 'relationship', Includer: 'relationship', Individualization: 'relationship', Positivity: 'relationship',
  Relator: 'relationship',
  Achiever: 'executing', Arranger: 'executing', Belief: 'executing', Consistency: 'executing',
  Deliberative: 'executing', Discipline: 'executing', Focus: 'executing', Responsibility: 'executing',
  Restorative: 'executing',
}

const DOMAIN_KEYS = ['strategic', 'influencing', 'relationship', 'executing']
const DOMAIN_LABELS = {
  strategic: 'Strategic Thinking',
  influencing: 'Influencing',
  relationship: 'Relationship Building',
  executing: 'Executing',
}

// ── Spark polar chart (mini, embedded) ───────────────────────────────────────

const SPARK_ORDER = [
  { name: 'Analytical', domain: 'strategic' }, { name: 'Context', domain: 'strategic' },
  { name: 'Futuristic', domain: 'strategic' }, { name: 'Ideation', domain: 'strategic' },
  { name: 'Input', domain: 'strategic' }, { name: 'Intellection', domain: 'strategic' },
  { name: 'Learner', domain: 'strategic' }, { name: 'Strategic', domain: 'strategic' },
  { name: 'Activator', domain: 'influencing' }, { name: 'Command', domain: 'influencing' },
  { name: 'Communication', domain: 'influencing' }, { name: 'Competition', domain: 'influencing' },
  { name: 'Maximizer', domain: 'influencing' }, { name: 'Self-Assurance', domain: 'influencing' },
  { name: 'Significance', domain: 'influencing' }, { name: 'Woo', domain: 'influencing' },
  { name: 'Adaptability', domain: 'relationship' }, { name: 'Connectedness', domain: 'relationship' },
  { name: 'Developer', domain: 'relationship' }, { name: 'Empathy', domain: 'relationship' },
  { name: 'Harmony', domain: 'relationship' }, { name: 'Includer', domain: 'relationship' },
  { name: 'Individualization', domain: 'relationship' }, { name: 'Positivity', domain: 'relationship' },
  { name: 'Relator', domain: 'relationship' },
  { name: 'Achiever', domain: 'executing' }, { name: 'Arranger', domain: 'executing' },
  { name: 'Belief', domain: 'executing' }, { name: 'Consistency', domain: 'executing' },
  { name: 'Deliberative', domain: 'executing' }, { name: 'Discipline', domain: 'executing' },
  { name: 'Focus', domain: 'executing' }, { name: 'Responsibility', domain: 'executing' },
  { name: 'Restorative', domain: 'executing' },
]

const N = 34
const SCX = 175, SCY = 185, MAX_R = 80, LABEL_R = 98, MAX_SCALE = 5
const SVG_W = 350, SVG_H = 370

function spokeAngle(i) { return (i / N) * 2 * Math.PI - Math.PI / 2 }
function sxy(angle, r) { return [SCX + r * Math.cos(angle), SCY + r * Math.sin(angle)] }

function SparkMini({ counts }) {
  const ringR = v => (v / MAX_SCALE) * MAX_R
  const boundaryAngles = [0, 8, 16, 25].map(i => spokeAngle(i) - (Math.PI / N))

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
      {[1, 2, 3, 4, 5].map(v => (
        <circle key={v} cx={SCX} cy={SCY} r={ringR(v)} fill="none" stroke="#e5e7eb" strokeWidth={v === 5 ? 1.5 : 1} />
      ))}
      {[1, 2, 3, 4, 5].map(v => (
        <text key={v} x={SCX + 4} y={SCY - ringR(v) + 4} fontSize="7" fill="#9ca3af" textAnchor="start">{v}</text>
      ))}
      {boundaryAngles.map((angle, qi) => {
        const [x2, y2] = sxy(angle, MAX_R + 6)
        return <line key={qi} x1={SCX} y1={SCY} x2={x2} y2={y2} stroke="#d1d5db" strokeWidth={1} strokeDasharray="3 2" />
      })}
      {SPARK_ORDER.map((s, i) => {
        const count = counts[s.name] ?? 0
        if (!count) return null
        const angle = spokeAngle(i)
        const r = (count / MAX_SCALE) * MAX_R
        const [x2, y2] = sxy(angle, r)
        return (
          <line key={s.name} x1={SCX} y1={SCY} x2={x2} y2={y2}
            stroke={DOMAINS[s.domain].headerBg} strokeWidth={5} strokeLinecap="round" opacity={0.85} />
        )
      })}
      <circle cx={SCX} cy={SCY} r={3} fill="#6b7280" />
      {SPARK_ORDER.map((s, i) => {
        const angle = spokeAngle(i)
        const [lx, ly] = sxy(angle, LABEL_R)
        const isRight = Math.cos(angle) >= 0
        const rotateDeg = (angle * 180 / Math.PI) + (isRight ? 0 : 180)
        return (
          <text key={s.name} x={lx} y={ly} fontSize="6" fontFamily="Arial, sans-serif"
            fill={DOMAINS[s.domain].text} textAnchor={isRight ? 'start' : 'end'}
            dominantBaseline="middle" transform={`rotate(${rotateDeg}, ${lx}, ${ly})`}>
            {s.name}
          </text>
        )
      })}
      {[
        { key: 'strategic', label: 'Strategic\nThinking', x: SVG_W - 5, y: 5, ax: 'end', ay: 'hanging' },
        { key: 'influencing', label: 'Influencing', x: SVG_W - 5, y: SVG_H - 5, ax: 'end', ay: 'auto' },
        { key: 'relationship', label: 'Relationship\nBuilding', x: 5, y: SVG_H - 5, ax: 'start', ay: 'auto' },
        { key: 'executing', label: 'Executing', x: 5, y: 5, ax: 'start', ay: 'hanging' },
      ].map(({ key, label, x, y, ax, ay }) => {
        const d = DOMAINS[key]
        const lines = label.split('\n')
        const twoLine = lines.length > 1
        const boxW = twoLine ? 68 : 55
        const boxH = twoLine ? 28 : 18
        const bx = ax === 'end' ? x - boxW : x
        const by = ay === 'hanging' ? y : y - boxH
        return (
          <g key={key}>
            <rect x={bx} y={by} width={boxW} height={boxH} rx={4} fill={d.bg} stroke={d.headerBg} strokeWidth={1.5} />
            {lines.map((line, li) => (
              <text key={li} x={bx + boxW / 2} y={by + (twoLine ? 10 + li * 12 : 12)}
                fontSize="7" fontWeight="700" fontFamily="Arial, sans-serif"
                fill={d.text} textAnchor="middle">
                {line}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

// ── Pie chart ─────────────────────────────────────────────────────────────────

function PieChart({ domainThemes }) {
  const total = Object.values(domainThemes).reduce((a, b) => a + b, 0)
  if (!total) return null

  const R = 52, CX = 70, CY = 70
  let angle = -Math.PI / 2

  const slices = DOMAIN_KEYS.map(key => {
    const pct = (domainThemes[key] || 0) / total
    const start = angle
    angle += pct * 2 * Math.PI
    return { key, pct, start, end: angle }
  })

  function arc(start, end) {
    const x1 = CX + R * Math.cos(start), y1 = CY + R * Math.sin(start)
    const x2 = CX + R * Math.cos(end), y2 = CY + R * Math.sin(end)
    const large = (end - start) > Math.PI ? 1 : 0
    return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`
  }

  return (
    <svg viewBox="0 0 140 140" className="w-full max-w-[140px]">
      {slices.map(({ key, pct, start, end }) => {
        if (pct === 0) return null
        const d = DOMAINS[key]
        const mid = (start + end) / 2
        const lr = R * 0.65
        return (
          <g key={key}>
            <path d={arc(start, end)} fill={d.headerBg} />
            {pct > 0.06 && (
              <text x={CX + lr * Math.cos(mid)} y={CY + lr * Math.sin(mid)}
                textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize="9" fontWeight="bold" fontFamily="Arial, sans-serif">
                {Math.round(pct * 100)}%
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Horizontal bar chart ──────────────────────────────────────────────────────

function BarChart({ counts }) {
  const entries = Object.entries(counts)
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a)

  if (!entries.length) return null

  const maxCount = entries[0][1]
  const LABEL_W = 105
  const BAR_MAX = 72
  const COUNT_W = 14
  const ROW_H = 10
  const W = LABEL_W + BAR_MAX + COUNT_W + 6
  const H = entries.length * ROW_H + 4

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {entries.map(([name, count], i) => {
        const domain = STRENGTH_DOMAIN_MAP[name] || 'strategic'
        const d = DOMAINS[domain]
        const barW = (count / maxCount) * BAR_MAX
        const y = i * ROW_H
        return (
          <g key={name}>
            <text x={LABEL_W - 3} y={y + ROW_H / 2 + 3} fontSize="8"
              textAnchor="end" fill="#374151" fontFamily="Arial, sans-serif">
              {name}
            </text>
            <rect x={LABEL_W} y={y + 2} width={Math.max(barW, 2)} height={ROW_H - 5}
              rx={1.5} fill={d.headerBg} opacity={0.85} />
            <text x={LABEL_W + barW + 3} y={y + ROW_H / 2 + 3} fontSize="8"
              fill={d.text} fontFamily="Arial, sans-serif" fontWeight="bold">
              {count}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeamSummaryPage() {
  const [searchParams] = useSearchParams()
  const teamId = searchParams.get('teamId')
  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [coachName, setCoachName] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!teamId) { setNotFound(true); setLoading(false); return }
    supabase.rpc('get_team_portal', { p_team_id: teamId }).then(async ({ data, error }) => {
      if (error || data?.error === 'not_found') { setNotFound(true) }
      else {
        setTeam(data.team)
        setMembers((data.members ?? []).filter(m => (m.top5 ?? []).some(Boolean)))
        if (data.team?.created_by) {
          const { data: profile } = await supabase
            .from('profiles').select('display_name')
            .eq('id', data.team.created_by).maybeSingle()
          setCoachName(profile?.display_name ?? null)
        }
      }
      setLoading(false)
    })
  }, [teamId])

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading…</p>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-gray-500 text-sm">Team not found.</p>
    </div>
  )

  // ── Compute stats ────────────────────────────────────────────────────────────

  const counts = {}
  SPARK_ORDER.forEach(s => { counts[s.name] = 0 })
  members.forEach(m => {
    ;(m.top5 ?? []).forEach(s => { if (s && counts[s] !== undefined) counts[s]++ })
  })

  const domainPeople = { strategic: new Set(), influencing: new Set(), relationship: new Set(), executing: new Set() }
  const domainThemes = { strategic: 0, influencing: 0, relationship: 0, executing: 0 }
  members.forEach(m => {
    ;(m.top5 ?? []).forEach(s => {
      if (!s) return
      const dom = STRENGTH_DOMAIN_MAP[s]
      if (!dom) return
      domainPeople[dom].add(m.id)
      domainThemes[dom]++
    })
  })

  const teamTop5 = Object.entries(counts)
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <style>{`
        @media print {
          @page { size: letter landscape; margin: 0.5cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <header className="bg-white border-b border-gray-200 no-print">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-3">

        {/* Page title */}
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <p className="text-xs font-semibold text-brand-500 uppercase tracking-widest">Team Summary</p>
            <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
          </div>
          <p className="text-sm text-gray-400">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>

        {members.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">No team members with strengths entered yet.</p>
          </div>
        ) : (
          <>
            {/* Charts row — 4 columns matching example layout */}
            <div className="flex gap-5 mb-3 items-start">

              {/* Col 1: Bar chart */}
              <div className="shrink-0 w-[200px]">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Strength Distribution</p>
                <BarChart counts={counts} />
              </div>

              {/* Col 2: Member list + Pie chart */}
              <div className="shrink-0 w-[155px]">
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Team Members</p>
                  <ul className="space-y-0.5">
                    {members.map(m => (
                      <li key={m.id} className="text-xs text-gray-700">{m.name}</li>
                    ))}
                  </ul>
                </div>
                <PieChart domainThemes={domainThemes} />
              </div>

              {/* Col 3: Spark chart — large */}
              <div className="shrink-0 w-[370px]">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Theme Spark</p>
                <SparkMini counts={counts} />
              </div>

              {/* Col 4: Domain breakdown table */}
              <div className="flex-1 min-w-0 pt-5">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left pb-1.5 text-gray-400 font-semibold text-xs uppercase tracking-wide">Domain</th>
                      <th className="text-center pb-1.5 text-gray-400 font-semibold text-xs uppercase tracking-wide px-2">People</th>
                      <th className="text-center pb-1.5 text-gray-400 font-semibold text-xs uppercase tracking-wide">Themes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {DOMAIN_KEYS.map(key => {
                      const d = DOMAINS[key]
                      return (
                        <tr key={key}>
                          <td className="py-1.5 pr-2">
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold"
                              style={{ backgroundColor: d.headerBg, color: d.headerText }}>
                              {DOMAIN_LABELS[key]}
                            </span>
                          </td>
                          <td className="text-center py-1.5 px-2 font-semibold text-gray-700">{domainPeople[key].size}</td>
                          <td className="text-center py-1.5 font-semibold text-gray-700">{domainThemes[key]}</td>
                        </tr>
                      )
                    })}
                    <tr className="border-t-2 border-gray-200">
                      <td className="pt-1.5 text-xs text-gray-400 font-semibold uppercase tracking-wide">Total</td>
                      <td className="text-center pt-1.5 font-bold text-gray-900 px-2">{members.length}</td>
                      <td className="text-center pt-1.5 font-bold text-gray-900">
                        {Object.values(domainThemes).reduce((a, b) => a + b, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>

            {/* Team Top 5 table */}
            {teamTop5.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Team Top 5</p>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 w-36">Strength</th>
                        <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500">As a team we bring</th>
                        <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500">As a team we need</th>
                        <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500">As a team we are motivated by</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {teamTop5.map(([name, count]) => {
                        const domain = STRENGTH_DOMAIN_MAP[name] || 'strategic'
                        const d = DOMAINS[domain]
                        const pct = Math.round((count / members.length) * 100)
                        const phrases = TEAM_SUMMARY_PHRASES[name] || {}
                        return (
                          <tr key={name} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-400 w-7 shrink-0">{pct}%</span>
                                <span className="font-bold text-xs px-2 py-0.5 rounded"
                                  style={{ backgroundColor: d.bg, color: d.text }}>
                                  {name}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-xs text-gray-600">{phrases.bring || ''}</td>
                            <td className="px-3 py-1.5 text-xs text-gray-600">{phrases.need || ''}</td>
                            <td className="px-3 py-1.5 text-xs text-gray-600">{phrases.motivated_by || ''}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} className="px-3 pt-1 pb-1">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">Representing the Top 5 Themes</span>
                            {coachName && <span className="text-xs text-gray-400">Prepared by {coachName}</span>}
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

    </div>
  )
}
