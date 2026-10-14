import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DOMAINS } from '../lib/strengthColors'
import SiteFooter from '../components/SiteFooter'

// ── Strength order: clockwise from 12 o'clock ─────────────────────────────────
// Strategic (top-right) → Influencing (bottom-right) → Relationship (bottom-left) → Executing (top-left)

const SPARK_ORDER = [
  { name: 'Analytical',      domain: 'strategic' },
  { name: 'Context',         domain: 'strategic' },
  { name: 'Futuristic',      domain: 'strategic' },
  { name: 'Ideation',        domain: 'strategic' },
  { name: 'Input',           domain: 'strategic' },
  { name: 'Intellection',    domain: 'strategic' },
  { name: 'Learner',         domain: 'strategic' },
  { name: 'Strategic',       domain: 'strategic' },
  { name: 'Activator',       domain: 'influencing' },
  { name: 'Command',         domain: 'influencing' },
  { name: 'Communication',   domain: 'influencing' },
  { name: 'Competition',     domain: 'influencing' },
  { name: 'Maximizer',       domain: 'influencing' },
  { name: 'Self-Assurance',  domain: 'influencing' },
  { name: 'Significance',    domain: 'influencing' },
  { name: 'Woo',             domain: 'influencing' },
  { name: 'Adaptability',    domain: 'relationship' },
  { name: 'Connectedness',   domain: 'relationship' },
  { name: 'Developer',       domain: 'relationship' },
  { name: 'Empathy',         domain: 'relationship' },
  { name: 'Harmony',         domain: 'relationship' },
  { name: 'Includer',        domain: 'relationship' },
  { name: 'Individualization', domain: 'relationship' },
  { name: 'Positivity',      domain: 'relationship' },
  { name: 'Relator',         domain: 'relationship' },
  { name: 'Achiever',        domain: 'executing' },
  { name: 'Arranger',        domain: 'executing' },
  { name: 'Belief',          domain: 'executing' },
  { name: 'Consistency',     domain: 'executing' },
  { name: 'Deliberative',    domain: 'executing' },
  { name: 'Discipline',      domain: 'executing' },
  { name: 'Focus',           domain: 'executing' },
  { name: 'Responsibility',  domain: 'executing' },
  { name: 'Restorative',     domain: 'executing' },
]

const N = SPARK_ORDER.length // 34
const CX = 350, CY = 360
const MAX_R = 160   // radius when count = MAX_SCALE
const LABEL_R = 190 // radius for strength name labels
const MAX_SCALE = 5
const SVG_W = 700, SVG_H = 720

// ── SVG helpers ───────────────────────────────────────────────────────────────

function spokeAngle(i) {
  // Clockwise from 12 o'clock, in radians
  return (i / N) * 2 * Math.PI - Math.PI / 2
}

function xy(angle, r) {
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)]
}

// ── Spark SVG ─────────────────────────────────────────────────────────────────

function SparkChart({ counts, memberCount, teamName }) {
  const scaleRings = [1, 2, 3, 4, 5]
  const ringR = (v) => (v / MAX_SCALE) * MAX_R

  // Quadrant divider lines (45° between domain boundaries)
  // Domain boundaries fall at i = 0, 8, 16, 25 (between last executing and first strategic)
  const boundaryAngles = [0, 8, 16, 25].map(i => spokeAngle(i) - (Math.PI / N))

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full max-w-2xl mx-auto">

      {/* ── Grid rings ── */}
      {scaleRings.map(v => (
        <circle
          key={v}
          cx={CX} cy={CY}
          r={ringR(v)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={v === MAX_SCALE ? 1.5 : 1}
        />
      ))}

      {/* Scale labels on the right axis */}
      {scaleRings.map(v => {
        const r = ringR(v)
        return (
          <text key={v} x={CX + 4} y={CY - r + 4} fontSize="9" fill="#9ca3af" textAnchor="start">
            {v}
          </text>
        )
      })}

      {/* ── Quadrant boundary lines ── */}
      {boundaryAngles.map((angle, qi) => {
        const [x2, y2] = xy(angle, MAX_R + 10)
        return (
          <line key={qi} x1={CX} y1={CY} x2={x2} y2={y2} stroke="#d1d5db" strokeWidth={1} strokeDasharray="4 3" />
        )
      })}

      {/* ── Bars (spokes) ── */}
      {SPARK_ORDER.map((s, i) => {
        const count = counts[s.name] ?? 0
        if (count === 0) return null
        const angle = spokeAngle(i)
        const r = (count / MAX_SCALE) * MAX_R
        const [x2, y2] = xy(angle, r)
        const color = DOMAINS[s.domain].headerBg
        return (
          <line
            key={s.name}
            x1={CX} y1={CY}
            x2={x2} y2={y2}
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            opacity={0.85}
          />
        )
      })}

      {/* Center dot */}
      <circle cx={CX} cy={CY} r={4} fill="#6b7280" />

      {/* ── Strength name labels ── */}
      {SPARK_ORDER.map((s, i) => {
        const angle = spokeAngle(i)
        const [lx, ly] = xy(angle, LABEL_R)
        const cosA = Math.cos(angle)
        const isRight = cosA >= 0
        const rotateDeg = (angle * 180 / Math.PI) + (isRight ? 0 : 180)
        const anchor = isRight ? 'start' : 'end'
        const color = DOMAINS[s.domain].text
        return (
          <text
            key={s.name}
            x={lx}
            y={ly}
            fontSize="9.5"
            fontFamily="Arial, sans-serif"
            fill={color}
            textAnchor={anchor}
            dominantBaseline="middle"
            transform={`rotate(${rotateDeg}, ${lx}, ${ly})`}
          >
            {s.name}
          </text>
        )
      })}

      {/* ── Domain corner labels ── */}
      {[
        { key: 'strategic',    label: 'Strategic\nThinking',    x: SVG_W - 10, y: 10,        ax: 'end',   ay: 'hanging' },
        { key: 'influencing',  label: 'Influencing',            x: SVG_W - 10, y: SVG_H - 10, ax: 'end',   ay: 'auto' },
        { key: 'relationship', label: 'Relationship\nBuilding', x: 10,         y: SVG_H - 10, ax: 'start', ay: 'auto' },
        { key: 'executing',    label: 'Executing',              x: 10,         y: 10,         ax: 'start', ay: 'hanging' },
      ].map(({ key, label, x, y, ax, ay }) => {
        const d = DOMAINS[key]
        const lines = label.split('\n')
        const boxW = 110, boxH = lines.length > 1 ? 44 : 30
        const bx = ax === 'end' ? x - boxW : x
        const by = ay === 'hanging' ? y : y - boxH
        return (
          <g key={key}>
            <rect x={bx} y={by} width={boxW} height={boxH} rx={8}
              fill={d.bg} stroke={d.headerBg} strokeWidth={2} />
            {lines.map((line, li) => (
              <text
                key={li}
                x={bx + boxW / 2}
                y={by + (lines.length > 1 ? 14 + li * 16 : 19)}
                fontSize="11"
                fontWeight="700"
                fontFamily="Arial, sans-serif"
                fill={d.text}
                textAnchor="middle"
              >
                {line}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeamSparkPage() {
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
        // Load coach name
        if (data.team?.created_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', data.team.created_by)
            .maybeSingle()
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
    <div className="min-h-screen bg-white flex items-center justify-center text-center px-4">
      <p className="text-gray-500 text-sm">Team not found.</p>
    </div>
  )

  // Compute counts
  const counts = {}
  SPARK_ORDER.forEach(s => { counts[s.name] = 0 })
  members.forEach(m => {
    ;(m.top5 ?? []).forEach(s => { if (s && counts[s] !== undefined) counts[s]++ })
  })

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <style>{`
        @media print {
          @page { size: portrait; margin: 1cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <header className="bg-white border-b border-gray-200 no-print">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <div className="text-center mb-2">
          <h1 className="text-xl font-bold text-gray-900">Theme Spark — Distribution of Talent</h1>
          <p className="text-sm text-gray-500 mt-0.5">{team.name} · {members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>

        {members.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-12 text-center mt-8">
            <p className="text-gray-400 text-sm">No team members with strengths entered yet.</p>
          </div>
        ) : (
          <SparkChart counts={counts} memberCount={members.length} teamName={team.name} />
        )}

        <div className="flex justify-between items-center mt-2 px-1">
          <p className="text-xs text-gray-400">Representing the Top 5 Themes</p>
          {coachName && <p className="text-xs text-gray-400">Prepared by {coachName}</p>}
        </div>
      </main>

      <SiteFooter className="no-print" />
    </div>
  )
}
