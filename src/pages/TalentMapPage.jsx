import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getStrengthColors } from '../lib/strengthColors'
import { useEvergreenCells } from '../lib/useEvergreenCells'
import SiteFooter from '../components/SiteFooter'

const PAGE_1_ROWS = [
  { id: 'build-relationships',  label: 'Build Relationships',  description: 'Establish connections with others to build trust, share ideas and get work done.' },
  { id: 'communicate-clearly',  label: 'Communicate Clearly',  description: 'Listen, share information and be receptive to others\' opinions.' },
  { id: 'create-accountability', label: 'Create Accountability', description: 'Identify the consequences of actions and hold everyone responsible for performance.' },
]

const PAGE_2_ROWS = [
  { id: 'develop-people',  label: 'Develop People',  description: 'Help others become more effective using strengths, expectations, encouragement and coaching.' },
  { id: 'inspire-others',  label: 'Inspire Others',  description: 'Encourage others by using positivity, foresight, confidence, questioning and recognition.' },
  { id: 'lead-change',     label: 'Lead Change',     description: 'Accept that change happens and set goals that align with a plan for how to adapt to it.' },
  { id: 'think-critically', label: 'Think Critically', description: 'Seek and evaluate information, apply knowledge, and solve problems.' },
]

const INSTRUCTIONS = [
  'Think about your primary responsibilities. Use the space to consider how each of your dominant themes influences your ability to achieve those responsibilities.',
  'For each cell, ask yourself: "How does this strength show up when I\'m working toward this goal — even if the connection isn\'t obvious?"',
  'For example: Ideation can build relationships by making you a go-to resource when others need creative problem-solving.',
  'The more connections you see, the more intentionally you can put your strengths to work.',
]

function StrengthColHeader({ strength }) {
  const c = getStrengthColors(strength)
  return (
    <th
      className="border border-gray-200 p-3 text-left align-top font-normal"
      style={{ background: c.headerBg, color: c.headerText, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
    >
      <p className="font-bold text-sm">{strength}</p>
    </th>
  )
}

function GoalRow({ row, strengths, cells, updateCell }) {
  return (
    <tr>
      <td className="tm-label-cell border border-gray-200 bg-gray-50 p-3 align-top" style={{ width: '200px' }}>
        <p className="font-bold text-xs text-gray-800 mb-1.5">{row.label}</p>
        <p className="text-[10px] leading-snug text-gray-500 border-l-2 border-brand-400 pl-2">{row.description}</p>
      </td>
      {strengths.map(s => (
        <td
          key={s}
          className="tm-cell border border-gray-200 bg-white p-0"
          style={{ height: '110px' }}
        >
          <textarea
            value={cells[`${row.id}||${s}`] ?? ''}
            onChange={e => updateCell(`${row.id}||${s}`, e.target.value)}
            className="tm-textarea w-full h-full resize-none p-2 text-xs text-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-400"
            style={{ minHeight: '110px' }}
          />
        </td>
      ))}
    </tr>
  )
}

function TalentTable({ rows, strengths, cells, updateCell }) {
  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white"
      style={{ overflowX: 'auto', overflowY: 'hidden', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
    >
      <table
        className="tm-table w-full border-collapse text-xs"
        style={{ minWidth: `${200 + strengths.length * 180}px` }}
      >
        <colgroup>
          <col style={{ width: '200px' }} />
          {strengths.map(s => <col key={s} style={{ minWidth: '180px' }} />)}
        </colgroup>
        <thead>
          <tr>
            <th className="border border-gray-200 bg-gray-100 p-3 align-bottom text-left">
              <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide">How This Theme</p>
              <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide">Influences Your</p>
              <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide">Ability To:</p>
            </th>
            {strengths.map(s => <StrengthColHeader key={s} strength={s} />)}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <GoalRow key={row.id} row={row} strengths={strengths} cells={cells} updateCell={updateCell} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function TalentMapPage() {
  const [searchParams] = useSearchParams()
  const emailParam = searchParams.get('email')

  const [email, setEmail] = useState(emailParam ?? '')
  const [loading, setLoading] = useState(false)
  const [person, setPerson] = useState(null)
  const [error, setError] = useState(null)
  const { cells, setCells, updateCell, saveStatus } = useEvergreenCells(
    person ? email : '', 'talent-map'
  )

  async function loadData(emailVal) {
    setLoading(true)
    setError(null)
    const { data, error: rpcErr } = await supabase.rpc('get_personal_insights_by_email', { p_email: emailVal.trim().toLowerCase() })
    setLoading(false)
    if (rpcErr || data?.error === 'not_found') {
      setError("We couldn't find an account with that email address. Please check your email and try again, or contact your coach.")
      return
    }
    setPerson(data)
  }

  async function handleLookup(e) {
    e.preventDefault()
    if (!email.trim()) return
    await loadData(email)
  }

  useEffect(() => {
    if (emailParam) loadData(emailParam)
  }, [])

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        @page { size: landscape; margin: 1cm; }
        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .tm-table { min-width: 0 !important; width: 100% !important; }
        .tm-table col { min-width: 0 !important; width: auto !important; }
        .tm-label-cell { width: auto !important; }
        .tm-cell { height: auto !important; }
        .tm-textarea { height: 80pt !important; min-height: 80pt !important; }
        .tm-page-1 { page-break-after: always; }
      }
    `
    document.head.appendChild(style)
    return () => { if (document.head.contains(style)) document.head.removeChild(style) }
  }, [])

  const strengths = person?.top5 ?? []

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 print:hidden">
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
                <h1 className="text-2xl font-bold text-gray-900">Talent Map</h1>
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

        ) : (
          <div>
            {/* Screen header */}
            <div className="flex items-start justify-between mb-6 flex-wrap gap-4 print:hidden">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Talent Map</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  Hi {person.name.split(' ')[0]}! Explore how your Top 5 strengths help you achieve key goals.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {saveStatus === 'saving' && <span className="text-xs text-gray-400">Saving…</span>}
                {saveStatus === 'saved'  && <span className="text-xs text-green-600">✓ Saved</span>}
                {saveStatus === 'error'  && <span className="text-xs text-red-500">Save failed</span>}
                <button
                  onClick={() => window.print()}
                  disabled={strengths.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print / Save PDF
                </button>
              </div>
            </div>

            {strengths.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
                <p className="text-gray-500 text-sm font-medium">No strengths are on file for you yet. Contact your coach.</p>
              </div>
            ) : (
              <>
                {/* Print-only page header */}
                <div className="hidden print:block mb-3">
                  <h1 className="text-xl font-bold text-gray-900">Talent Map — {person.name}</h1>
                </div>

                {/* Page 1 */}
                <div className="tm-page-1 mb-6">
                  <TalentTable rows={PAGE_1_ROWS} strengths={strengths} cells={cells} updateCell={updateCell} />
                </div>

                {/* Screen-only page divider */}
                <div className="print:hidden flex items-center gap-3 my-6">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Continues on page 2 when printing</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                {/* Page 2 */}
                <div className="mb-6">
                  <TalentTable rows={PAGE_2_ROWS} strengths={strengths} cells={cells} updateCell={updateCell} />
                </div>

                {/* Instructions (screen only) */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 print:hidden">
                  <h2 className="text-lg font-bold text-gray-900 mb-3">How to Use This Worksheet</h2>
                  <ul className="space-y-1.5">
                    {INSTRUCTIONS.map((line, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-600">
                        <span className="text-gray-300 mt-0.5 shrink-0">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
