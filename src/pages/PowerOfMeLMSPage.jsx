import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getStrengthColors } from '../lib/strengthColors'
import { downloadPowerOfMePDF } from '../lib/downloadReportPDF'
import { loadPowerOfMeContent } from '../lib/powerOf2Content'
import { P2_DEFAULTS } from '../data/powerOf2'
import SiteFooter from '../components/SiteFooter'

const INSTRUCTIONS = [
  'Your Top 5 strengths run across the top (with The Role I Play) and down the left side (with Descriptive Words).',
  'Each intersecting box is the interplay between two of your own strengths: the role one strength plays and the words that describe the other.',
  'In each box, note how the two strengths work together: where they reinforce each other and where they pull against each other.',
  'Keep responses short, practical, and based on real work experience. Look for patterns rather than perfecting every box.',
]

export default function PowerOfMeLMSPage() {
  const [searchParams] = useSearchParams()
  const emailParam = searchParams.get('email')

  const [email, setEmail] = useState(emailParam ?? '')
  const [loading, setLoading] = useState(false)
  const [person, setPerson] = useState(null)
  const [error, setError] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [cells, setCells] = useState({})
  const [content, setContent] = useState({ role: P2_DEFAULTS.role, words: P2_DEFAULTS['descriptive-words'] })

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
    loadPowerOfMeContent().then(setContent)
  }, [])

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        @page { size: landscape; margin: 1cm; }
        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .pom-table { min-width: 0 !important; width: 100% !important; }
        .pom-table col { min-width: 0 !important; width: auto !important; }
        .pom-cell { height: auto !important; }
        .pom-textarea { height: 70pt !important; min-height: 70pt !important; }
      }
    `
    document.head.appendChild(style)
    return () => { if (document.head.contains(style)) document.head.removeChild(style) }
  }, [])

  const strengths = (person?.top5 ?? []).filter(s => content.role[s] && content.words[s])

  function cellKey(row, col) { return `${row}||${col}` }

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
                <h1 className="text-2xl font-bold text-gray-900">The Power of Me</h1>
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
            <div className="flex items-start justify-between mb-6 flex-wrap gap-4 print:hidden">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">The Power of Me</h1>
                <p className="text-gray-500 text-sm mt-0.5">Hi {person.name.split(' ')[0]}! Explore how your own Top 5 strengths interact.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setPdfLoading(true)
                    await downloadPowerOfMePDF({ ...person, top5: strengths }, content)
                    setPdfLoading(false)
                  }}
                  disabled={pdfLoading || strengths.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 text-gray-700 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {pdfLoading ? 'Generating…' : 'Download PDF'}
                </button>
                <button
                  onClick={() => window.print()}
                  disabled={strengths.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
              </div>
            </div>

            {strengths.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
                <p className="text-gray-500 text-sm font-medium">No strengths are on file for you yet. Contact your coach.</p>
              </div>
            ) : (
              <>
                <div className="hidden print:block mb-4">
                  <h1 className="text-2xl font-bold text-gray-900">The Power of Me</h1>
                  <p className="text-gray-600 text-sm mt-0.5">{person.name}</p>
                </div>

                <div
                  className="rounded-2xl border border-gray-200 bg-white mb-3"
                  style={{ overflowX: 'auto', overflowY: 'hidden', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                >
                  <table className="pom-table w-full border-collapse text-xs" style={{ minWidth: `${180 + strengths.length * 200}px` }}>
                    <colgroup>
                      <col style={{ width: '180px' }} />
                      {strengths.map(s => <col key={s} style={{ minWidth: '200px' }} />)}
                    </colgroup>

                    <thead>
                      <tr>
                        <th className="border border-gray-200 bg-gray-50 p-3 align-bottom text-left">
                          <p className="font-semibold text-gray-700 text-xs">The Role I Play</p>
                          <p className="text-gray-400 text-[10px] mt-0.5">→ columns</p>
                          <p className="font-semibold text-gray-700 text-xs mt-2">Descriptive Words</p>
                          <p className="text-gray-400 text-[10px] mt-0.5">↓ rows</p>
                        </th>
                        {strengths.map(s => {
                          const c = getStrengthColors(s)
                          return (
                            <th
                              key={s}
                              className="border border-gray-200 p-3 text-left align-top font-normal"
                              style={{ background: c.headerBg, color: c.headerText, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                            >
                              <p className="font-bold text-sm mb-1.5">{s}</p>
                              <p className="text-[11px] leading-snug opacity-90">{content.role[s]?.roleIPlay ?? ''}</p>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>

                    <tbody>
                      {strengths.map(s => {
                        const c = getStrengthColors(s)
                        return (
                          <tr key={s}>
                            <th
                              className="border border-gray-200 p-3 text-left align-top font-normal"
                              style={{ background: c.headerBg, color: c.headerText, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                            >
                              <p className="font-bold text-sm mb-1.5">{s}</p>
                              <p className="text-[11px] leading-snug opacity-90">{content.words[s]?.descriptiveWords ?? ''}</p>
                            </th>
                            {strengths.map(cs => (
                              <td
                                key={cs}
                                className="pom-cell border border-gray-200 bg-white p-0"
                                style={{ height: '140px' }}
                              >
                                <textarea
                                  value={cells[cellKey(s, cs)] ?? ''}
                                  onChange={e => setCells(prev => ({ ...prev, [cellKey(s, cs)]: e.target.value }))}
                                  className="pom-textarea w-full h-full resize-none p-2 text-xs text-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-400"
                                  style={{ minHeight: '140px' }}
                                />
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-gray-400 mb-8 print:hidden">
                  Cascade© 2021 Releasing Strengths Ltd. All rights reserved. Gallup®, CliftonStrengths® and the 34 theme names of CliftonStrengths® are trademarks of Gallup, Inc.
                </p>
                <p className="hidden print:block text-[9px] text-gray-400 mb-4">
                  Cascade© 2021 Releasing Strengths Ltd. All rights reserved. Gallup®, CliftonStrengths® and the 34 theme names of CliftonStrengths® are trademarks of Gallup, Inc.
                </p>

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
