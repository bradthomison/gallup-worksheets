import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StrengthBadge from '../components/StrengthBadge'
import { getStrengthColors } from '../lib/strengthColors'
import { getWorksheetPDFBlob } from '../lib/downloadWorksheetPDF'
import SiteFooter from '../components/SiteFooter'

export default function LMSWorksheetPage() {
  const { slug } = useParams()
  const [participant, setParticipant] = useState(null)
  const [session, setSession] = useState(null)
  const [worksheetId, setWorksheetId] = useState(null)
  const [cells, setCells] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmReopen, setConfirmReopen] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: ws, error: wsErr } = await supabase
        .from('lms_worksheets')
        .select('*, people:people_id(*), theme:theme_id(*)')
        .eq('worksheet_url_slug', slug)
        .single()

      if (wsErr || !ws) { setError('Worksheet not found.'); setLoading(false); return }

      const part = ws.people
      const sess = {
        ...ws.theme,
        title: ws.theme.name,
      }
      setParticipant(part)
      setSession(sess)
      setWorksheetId(ws.id)

      // Load existing responses
      const { data: responses } = await supabase
        .from('lms_responses')
        .select('*')
        .eq('lms_worksheet_id', ws.id)

      if (responses?.length) {
        const cellMap = {}
        responses.forEach(r => {
          cellMap[`${r.prompt_index}_${r.strength_index}`] = r.response_text
        })
        setCells(cellMap)
        if (responses.some(r => r.submitted_at)) setSubmitted(true)
      }

      setLoading(false)
    }
    load()
  }, [slug])

  function handleCellChange(promptIdx, strengthIdx, value) {
    setCells(prev => ({ ...prev, [`${promptIdx}_${strengthIdx}`]: value }))
  }

  function buildRows(submittedAt = null) {
    const prompts = session.prompts ?? []
    const strengths = participant.top5 ?? []
    const rows = []
    prompts.forEach((_, pi) => {
      strengths.forEach((_, si) => {
        rows.push({
          lms_worksheet_id: worksheetId,
          prompt_index: pi,
          strength_index: si,
          response_text: cells[`${pi}_${si}`] ?? '',
          submitted_at: submittedAt,
        })
      })
    })
    return rows
  }

  async function handleSaveDraft() {
    setSaving(true)
    setError(null)
    const { error: upsertErr } = await supabase
      .from('lms_responses')
      .upsert(buildRows(null), { onConflict: 'lms_worksheet_id,prompt_index,strength_index' })
    setSaving(false)
    if (upsertErr) { setError(upsertErr.message); return }
    setSavedAt(new Date())
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error: upsertErr } = await supabase
      .from('lms_responses')
      .upsert(buildRows(new Date().toISOString()), { onConflict: 'lms_worksheet_id,prompt_index,strength_index' })

    if (upsertErr) { setError(upsertErr.message); setSubmitting(false); return }

    setSubmitted(true)
    setSubmitting(false)
  }

  async function handleReopen() {
    setReopening(true)
    await supabase
      .from('lms_responses')
      .update({ submitted_at: null })
      .eq('lms_worksheet_id', worksheetId)
    setConfirmReopen(false)
    setReopening(false)
    setSubmitted(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">Loading worksheet…</div>
  )
  if (error) return (
    <div className="flex items-center justify-center min-h-screen text-red-500 text-sm">{error}</div>
  )
  if (!participant || !session) return null

  const prompts = session.prompts ?? []
  const strengths = participant.top5 ?? []

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Gallup Strengths" className="h-[60px] w-auto" />
            <p className="text-sm text-gray-400">{session.title}</p>
          </div>
          <p className="text-sm font-medium text-gray-700">{participant.name}</p>
        </div>
      </header>

      {submitted ? (
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Worksheet submitted!</h2>
          <p className="text-gray-500 text-sm max-w-xs">
            Thank you, {participant.name.split(' ')[0]}. Your responses have been recorded.
          </p>
          <div className="mt-6">
            {confirmReopen ? (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
                <span className="text-sm text-amber-800 font-medium">Reopen for editing?</span>
                <button
                  onClick={handleReopen}
                  disabled={reopening}
                  className="text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1 rounded-lg disabled:opacity-60 transition-colors"
                >{reopening ? '…' : 'Yes'}</button>
                <button
                  onClick={() => setConfirmReopen(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReopen(true)}
                className="text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2 rounded-lg transition-colors"
              >
                Reopen for Editing
              </button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900">
              Your Strengths Worksheet: {session.title}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Fill in each cell with your reflections. Take your time — your progress is not saved until you submit.
            </p>
          </div>

          {/* Grid */}
          <div className="rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm border-collapse table-fixed">
              <thead>
                <tr className="bg-gray-50">
                  <th
                    style={{ width: `${100 / (strengths.length + 1)}%` }}
                    className="px-4 py-4 border-b border-r border-gray-200 bg-gray-50"
                  ></th>
                  {strengths.map((s, si) => {
                    const colors = getStrengthColors(s)
                    return (
                      <th
                        key={si}
                        style={{ background: colors.headerBg, borderColor: 'rgba(255,255,255,0.2)', width: `${100 / (strengths.length + 1)}%` }}
                        className="px-4 py-4 text-center border-b border-r last:border-r-0"
                      >
                        <span style={{ color: colors.headerText, fontSize: '13px', fontWeight: 700, letterSpacing: '0.02em' }}>
                          {s}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {prompts.map((prompt, pi) => (
                  <tr key={pi} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-4 align-top font-medium text-gray-700 border-r border-gray-200 bg-gray-50 text-sm leading-relaxed">
                      {pi + 1}. {prompt}
                    </td>
                    {strengths.map((_, si) => (
                      <td key={si} className="border-r border-gray-100 last:border-r-0 p-0">
                        <textarea
                          value={cells[`${pi}_${si}`] ?? ''}
                          onChange={e => handleCellChange(pi, si, e.target.value)}
                          placeholder="Your thoughts…"
                          style={{ display: 'block', width: '100%', minHeight: '120px', height: '100%', resize: 'none', border: 'none', outline: 'none', padding: '10px 12px', fontSize: '13px', color: '#374151', lineHeight: '1.5', backgroundColor: 'transparent', overflow: 'auto' }}
                          onFocus={e => e.target.style.backgroundColor = '#eff6ff'}
                          onBlur={e => e.target.style.backgroundColor = 'transparent'}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting || saving}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-8 py-3 rounded-xl text-sm transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Worksheet'}
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || submitting}
              className="bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-700 font-semibold px-6 py-3 rounded-xl text-sm border border-gray-300 transition-colors"
            >
              {saving ? 'Saving…' : 'Save & Finish Later'}
            </button>
            <div className="text-xs text-gray-400">
              {savedAt
                ? <span className="text-green-600">✓ Progress saved at {savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                : 'Progress is not saved until you click Save or Submit.'}
            </div>
          </div>
        </form>
      )}
      <SiteFooter />
    </div>
  )
}
