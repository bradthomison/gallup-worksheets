import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StrengthBadge from '../components/StrengthBadge'
import { getStrengthColors } from '../lib/strengthColors'

export default function WorksheetPage() {
  const { slug } = useParams()
  const [participant, setParticipant] = useState(null)
  const [session, setSession] = useState(null)
  const [cells, setCells] = useState({}) // { "promptIdx_strengthIdx": text }
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      // Use secure RPC — no public table policies needed
      const { data, error: rpcErr } = await supabase
        .rpc('get_worksheet_data', { p_slug: slug })

      if (rpcErr || !data) { setError('Worksheet not found.'); setLoading(false); return }

      const part = data.participant
      const sess = data.session
      setParticipant(part)
      setSession(sess)

      // Load any existing responses via RPC
      const { data: responses } = await supabase
        .rpc('get_worksheet_responses', { p_participant_id: part.id })

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

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const now = new Date().toISOString()
    const prompts = session.prompts ?? []
    const strengths = participant.top5 ?? []

    const rows = []
    prompts.forEach((_, pi) => {
      strengths.forEach((_, si) => {
        rows.push({
          participant_id: participant.id,
          prompt_index: pi,
          strength_index: si,
          response_text: cells[`${pi}_${si}`] ?? '',
          submitted_at: now,
        })
      })
    })

    // Upsert responses
    const { error: upsertErr } = await supabase
      .from('responses')
      .upsert(rows, { onConflict: 'participant_id,prompt_index,strength_index' })

    if (upsertErr) { setError(upsertErr.message); setSubmitting(false); return }

    // Send confirmation email via Edge Function
    await supabase.functions.invoke('send-worksheet-email', {
      body: { participant_id: participant.id },
    })

    setSubmitted(true)
    setSubmitting(false)
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white text-sm font-bold">G</div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-none">Gallup Strengths</p>
              <p className="text-xs text-gray-400 mt-0.5">{session.title}</p>
            </div>
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
            Thank you, {participant.name.split(' ')[0]}. A copy of your responses has been sent to {participant.email}.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900">Your Strengths Worksheet</h1>
            <p className="text-sm text-gray-500 mt-1">
              Fill in each cell with your reflections. Take your time — your progress is not saved until you submit.
            </p>
          </div>

          {/* Grid */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="w-48 min-w-[180px] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-r border-gray-200">
                    Prompt
                  </th>
                  {strengths.map((s, si) => {
                    const colors = getStrengthColors(s)
                    return (
                      <th key={si} style={{ background: colors.bg, borderColor: '#e5e7eb' }} className="px-4 py-3 text-center border-b border-r last:border-r-0">
                        <StrengthBadge name={s} size="sm" />
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {prompts.map((prompt, pi) => (
                  <tr key={pi} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-3 align-top font-medium text-gray-700 border-r border-gray-200 bg-gray-50 text-xs leading-relaxed">
                      {pi + 1}. {prompt}
                    </td>
                    {strengths.map((_, si) => (
                      <td key={si} className="border-r border-gray-100 last:border-r-0 p-0 align-top">
                        <textarea
                          value={cells[`${pi}_${si}`] ?? ''}
                          onChange={e => handleCellChange(pi, si, e.target.value)}
                          rows={3}
                          placeholder="Your thoughts…"
                          className="w-full h-full min-h-[80px] px-3 py-2 text-sm text-gray-700 resize-none border-0 focus:outline-none focus:bg-brand-50 transition-colors placeholder-gray-300"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-8 py-3 rounded-xl text-sm transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Worksheet'}
            </button>
            <p className="text-xs text-gray-400">
              Once submitted, your responses will be emailed to {participant.email}.
            </p>
          </div>
        </form>
      )}
    </div>
  )
}
