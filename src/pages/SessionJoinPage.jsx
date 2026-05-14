import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getWorksheetPDFBlob, downloadAllSessionPDFs } from '../lib/downloadWorksheetPDF'

export default function SessionJoinPage() {
  const { sessionId } = useParams()

  const [session, setSession] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [selectedId, setSelectedId] = useState('')
  const [checking, setChecking] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState(null)
  const [worksheetStatus, setWorksheetStatus] = useState(null) // null | 'not_started' | 'in_progress' | 'completed'
  const [responses, setResponses] = useState([])

  const [downloading, setDownloading] = useState(false)
  const [confirmReopen, setConfirmReopen] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [bulkDownloading, setBulkDownloading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(null)

  useEffect(() => { load() }, [sessionId])

  async function load() {
    const [{ data: sess }, { data: parts }] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', sessionId).single(),
      supabase
        .from('participants')
        .select('id, name, email, top5, worksheet_url_slug, is_manager')
        .eq('session_id', sessionId)
        .order('name'),
    ])
    if (!sess) { setNotFound(true); setLoading(false); return }
    setSession(sess)
    setParticipants(parts ?? [])
    setLoading(false)
  }

  async function handleSelect(participantId) {
    setSelectedId(participantId)
    setWorksheetStatus(null)
    setResponses([])
    if (!participantId) { setSelectedParticipant(null); return }

    const participant = participants.find(p => p.id === participantId)
    setSelectedParticipant(participant)
    setChecking(true)

    const { data: resps } = await supabase
      .from('responses')
      .select('*')
      .eq('participant_id', participantId)

    const list = resps ?? []
    setResponses(list)

    if (list.length === 0) {
      setWorksheetStatus('not_started')
    } else if (list.some(r => r.submitted_at)) {
      setWorksheetStatus('completed')
    } else {
      setWorksheetStatus('in_progress')
    }
    setChecking(false)
  }

  async function downloadPDF() {
    if (!selectedParticipant || !session) return
    setDownloading(true)
    try {
      const blob = await getWorksheetPDFBlob(selectedParticipant, session, responses)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedParticipant.name} - ${session.title}.pdf`
        .replace(/[/\\?%*:|"<>]/g, '-')
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  async function handleReopen() {
    setReopening(true)
    await supabase
      .from('responses')
      .update({ submitted_at: null })
      .eq('participant_id', selectedParticipant.id)
    setReopening(false)
    setConfirmReopen(false)
    setWorksheetStatus('in_progress')
  }

  async function downloadAllPDFs() {
    setBulkDownloading(true)
    setBulkProgress(null)
    await downloadAllSessionPDFs(
      session,
      participants,
      async (participantId) => {
        const { data } = await supabase.from('responses').select('*').eq('participant_id', participantId)
        return data ?? []
      },
      (progress) => setBulkProgress(progress)
    )
    setBulkDownloading(false)
    setBulkProgress(null)
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-900 font-semibold">Session not found.</p>
          <p className="text-sm text-gray-500 mt-1">Check the link and try again.</p>
        </div>
      </div>
    )
  }

  const completedCount = participants.filter(p => p._submitted).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
          {session.date && (
            <p className="text-sm text-gray-500 mt-1">{formatDate(session.date)}</p>
          )}
          <p className="text-sm text-gray-500 mt-3">
            Select your name below to access your worksheet.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">

          {/* Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
            <select
              value={selectedId}
              onChange={e => handleSelect(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">Select your name…</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Checking spinner */}
          {checking && (
            <p className="text-sm text-gray-400">Checking worksheet status…</p>
          )}

          {/* Not started */}
          {!checking && worksheetStatus === 'not_started' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Your worksheet is ready to be filled out.</p>
              <a
                href={`/worksheet/${selectedParticipant.worksheet_url_slug}`}
                className="block w-full text-center bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                Start Worksheet
              </a>
            </div>
          )}

          {/* In progress */}
          {!checking && worksheetStatus === 'in_progress' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <span className="text-amber-500">●</span>
                <p className="text-sm font-medium text-amber-800">Your worksheet is in progress.</p>
              </div>
              <a
                href={`/worksheet/${selectedParticipant.worksheet_url_slug}`}
                className="block w-full text-center bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                Continue Worksheet
              </a>
            </div>
          )}

          {/* Completed */}
          {!checking && worksheetStatus === 'completed' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <span className="text-green-600">✓</span>
                <p className="text-sm font-medium text-green-800">Your worksheet has been submitted.</p>
              </div>
              <button
                onClick={downloadPDF}
                disabled={downloading}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                {downloading ? 'Generating PDF…' : '↓ Download Your Completed Worksheet'}
              </button>
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
                  className="w-full text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 py-2.5 rounded-lg transition-colors"
                >
                  Reopen for Editing
                </button>
              )}
            </div>
          )}

          {/* Manager bulk download — shown whenever a manager is selected */}
          {!checking && worksheetStatus !== null && selectedParticipant?.is_manager && (
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Manager</p>
              <p className="text-sm text-gray-600">
                Download worksheets for all team members in this session.
              </p>
              <button
                onClick={downloadAllPDFs}
                disabled={bulkDownloading}
                className="w-full bg-gray-800 hover:bg-gray-900 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                {bulkDownloading
                  ? `Generating… ${bulkProgress ? `${bulkProgress.current}/${bulkProgress.total}` : ''}`
                  : '↓ Download All Team Worksheets'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
