import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StrengthBadge from '../components/StrengthBadge'
import { STRENGTH_DOMAIN, getStrengthColors } from '../lib/strengthColors'
import { parseParticipants } from '../lib/parseParticipants'
import { getWorksheetPDFBlob, getBlankWorksheetPDFBlob } from '../lib/downloadWorksheetPDF'
import { formatDateShort } from '../lib/dateUtils'
import ResponseViewerModal from '../components/ResponseViewerModal'
import PersonalInsightsModal from '../components/PersonalInsightsModal'
import PersonalInsightsBulkModal from '../components/PersonalInsightsBulkModal'

const ALL_STRENGTHS = Object.keys(STRENGTH_DOMAIN).sort()

const BLANK = { name: '', email: '', top5: ['', '', '', '', ''], team_id: '' }

function safeName(str) {
  return str.replace(/[/\\?%*:|"<>]/g, '-')
}

// ── Add-Team modal ────────────────────────────────────────────────────────────
function AddTeamModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', location: '', primary_coach: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    if (!form.name.trim()) { setError('Team name is required'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: team, error: err } = await supabase
      .from('teams')
      .insert({ ...form, created_by: user.id })
      .select()
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave(team)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Add Team</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Team Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose() }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Alpha Team"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
            <input
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Chicago"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Primary Coach</label>
            <input
              value={form.primary_coach}
              onChange={e => setForm(f => ({ ...f, primary_coach: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Coach name"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Creating…' : 'Create Team'}
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit / Add row ────────────────────────────────────────────────────────────
function EditRow({ person, teams, onSave, onCancel, onOpenAddTeam, onDeletePerson }) {
  const [form, setForm] = useState({
    name: person.name,
    email: person.email,
    top5: [...(person.top5 ?? ['', '', '', '', ''])],
    team_id: person.team_id ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function applyNewTeam(team) {
    setForm(f => ({ ...f, team_id: team.id }))
  }

  function setStrength(i, val) {
    const t = [...form.top5]
    t[i] = val
    setForm(f => ({ ...f, top5: t }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.email.includes('@')) { setError('Valid email required'); return }
    if (form.top5.some(s => !s.trim())) { setError('All 5 strengths required'); return }
    setSaving(true)
    setError(null)
    await onSave({
      ...form,
      top5: form.top5.map(s => s.trim()),
      team_id: form.team_id || null,
    })
    setSaving(false)
  }

  function handleTeamChange(e) {
    if (e.target.value === '__new__') {
      onOpenAddTeam(applyNewTeam)
    } else {
      setForm(f => ({ ...f, team_id: e.target.value }))
    }
  }

  return (
    <tr className="bg-blue-50">
      <td className="px-4 py-2">
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Full name"
        />
      </td>
      <td className="px-4 py-2">
        <input
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="email@example.com"
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-1 flex-wrap">
          {form.top5.map((s, i) => (
            <select
              key={i}
              value={s}
              onChange={e => setStrength(i, e.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">Strength {i + 1}…</option>
              {ALL_STRENGTHS.filter(opt => opt === s || !form.top5.includes(opt)).map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </td>
      <td className="px-4 py-2">
        <select
          value={form.team_id}
          onChange={handleTeamChange}
          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">No team</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
          <option value="__new__">+ Create new team…</option>
        </select>
      </td>
      <td className="px-4 py-2">
        <div className="flex flex-col gap-1.5">
          {/* Row 1: Save + Cancel */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs font-semibold bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-3 py-1 rounded-full border border-brand-500 transition-colors whitespace-nowrap"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={onCancel}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 bg-white hover:bg-gray-50 px-3 py-1 rounded-full border border-gray-300 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
          </div>
          {/* Row 2: Delete */}
          {onDeletePerson && (
            <div className="flex gap-2">
              <button
                onClick={onDeletePerson}
                className="text-xs font-medium px-3 py-1 rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors whitespace-nowrap"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── CustomReportModal ─────────────────────────────────────────────────────────
function buildCustomReportPrintHTML(reportName, personName, strengths, rows, insights) {
  const colWidth = Math.floor((100 - 16) / strengths.length)
  const headerCells = strengths.map(s => {
    const c = getStrengthColors(s)
    return `<th style="width:${colWidth}%;border:1px solid #d1d5db;background:${c.headerBg};color:${c.headerText};padding:4px 5px;font-size:9px;font-weight:700;text-align:center;">${s}</th>`
  }).join('')
  const bodyRows = rows.map(row => {
    const cells = strengths.map(s => `<td style="border:1px solid #d1d5db;padding:3px 5px;font-size:8px;color:#374151;vertical-align:top;word-wrap:break-word;">${insights?.[s]?.[row.id] ?? ''}</td>`).join('')
    return `<tr><th style="width:145px;border:1px solid #d1d5db;background:#f9fafb;padding:3px 5px;font-size:8px;font-weight:600;color:#374151;text-align:left;vertical-align:top;word-wrap:break-word;">${row.label}</th>${cells}</tr>`
  }).join('')
  return `<!DOCTYPE html><html><head><title>${reportName} — ${personName}</title><style>*{box-sizing:border-box;}html,body{height:100%;margin:0;padding:0;}body{font-family:Arial,sans-serif;display:flex;flex-direction:column;}h2{font-size:13px;margin:0 0 4px 0;color:#111;flex-shrink:0;}table{border-collapse:collapse;width:100%;table-layout:fixed;flex:1;}tfoot td{border-top:1px solid #d1d5db;padding:2px 5px;font-size:8px;color:#9ca3af;}@page{size:landscape;margin:0.35in;}-webkit-print-color-adjust:exact;print-color-adjust:exact;</style></head><body><h2>${reportName} — ${personName}</h2><table><colgroup><col style="width:145px;"/>${strengths.map(() => `<col style="width:${colWidth}%;"/>`).join('')}</colgroup><thead><tr><th style="border:1px solid #d1d5db;background:#f9fafb;"></th>${headerCells}</tr></thead><tbody>${bodyRows}</tbody><tfoot><tr><td colspan="${strengths.length + 1}">Cascade© 2021 Releasing Strengths Ltd. All rights reserved. Gallup®, CliftonStrengths® and the 34 theme names of CliftonStrengths® are trademarks of Gallup, Inc.</td></tr></tfoot></table></body></html>`
}

function CustomReportModal({ report, participant, onClose }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const strengths = (participant.top5 ?? []).filter(Boolean)
  const rows = report.rows ?? []

  useEffect(() => {
    async function load() {
      const map = {}
      strengths.forEach(s => { map[s] = {} })
      if (strengths.length > 0) {
        const { data } = await supabase
          .from('report_content')
          .select('strength_name, content')
          .eq('report_type', report.id)
          .in('strength_name', strengths)
        ;(data ?? []).forEach(r => { if (r.content) map[r.strength_name] = r.content })
      }
      setInsights(map)
      setLoading(false)
    }
    load()
  }, [report.id])

  function handlePrint() {
    const html = buildCustomReportPrintHTML(report.name, participant.name, strengths, rows, insights)
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 250)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{report.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{participant.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-medium transition-colors"
            >
              Print / PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">This report has no rows defined yet.</p>
              <p className="text-sm text-gray-400 mt-1">Go to Themes and Reports to add rows.</p>
            </div>
          ) : strengths.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No strengths entered for this participant.</p>
            </div>
          ) : (
            <div className="overflow-auto">
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
                        <th key={s} className="border border-gray-200 p-3 text-center font-bold text-sm"
                          style={{ background: c.headerBg, color: c.headerText }}>
                          {s}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="even:bg-gray-50/50">
                      <th className="border border-gray-200 bg-gray-50 p-3 text-left text-xs font-semibold text-gray-700 align-top">
                        {row.label}
                      </th>
                      {strengths.map(s => (
                        <td key={s} className="border border-gray-200 p-3 text-xs text-gray-700 align-top leading-relaxed">
                          {insights?.[s]?.[row.id] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── PersonReportsPanel ────────────────────────────────────────────────────────
function PersonReportsPanel({ person, reports, onClose, onOpenPersonalInsights, onOpenCustomReport }) {
  const strengths = (person.top5 ?? []).filter(Boolean)
  return (
    <div className="bg-purple-50 border-t border-purple-100 px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{person.name}'s Reports</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>
      {strengths.length === 0 ? (
        <p className="text-sm text-gray-400">No strengths entered — reports require CliftonStrengths data.</p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Built-in</span>
              <span className="text-sm text-gray-700">Personal Insights</span>
            </div>
            <button
              onClick={onOpenPersonalInsights}
              className="text-xs font-medium text-brand-500 hover:text-brand-700 transition-colors"
            >Open</button>
          </div>
          {reports.length === 0 && (
            <p className="text-xs text-gray-400 pt-1">No custom reports yet. Create one on the Themes and Reports page.</p>
          )}
          {reports.map(report => (
            <div key={report.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-gray-700">{report.name}</span>
                {(report.rows ?? []).length === 0 && (
                  <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">No rows</span>
                )}
              </div>
              <button
                onClick={() => onOpenCustomReport(report)}
                className="text-xs font-medium text-brand-500 hover:text-brand-700 transition-colors"
              >Open</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── PersonWorksheetPanel ──────────────────────────────────────────────────────
function statusInfo(responses) {
  if (!responses || responses.length === 0) return { label: 'Pending', color: 'bg-gray-100 text-gray-600' }
  if (responses.some(r => r.submitted_at)) return { label: 'Submitted', color: 'bg-green-100 text-green-700' }
  return { label: 'In Progress', color: 'bg-amber-100 text-amber-700' }
}

function PersonWorksheetPanel({ person, onClose }) {
  const [sessionWs, setSessionWs] = useState(null)
  const [lmsWs, setLmsWs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lmsDeleteConfirm, setLmsDeleteConfirm] = useState(null)
  const [lmsDeleting, setLmsDeleting] = useState(null)
  const [actionState, setActionState] = useState({}) // { [wsId]: null | 'downloading' | 'copying' | 'sending' | 'sent' | 'copied' }
  const [viewModal, setViewModal] = useState(null) // { participant, session, responses }

  useEffect(() => {
    async function load() {
      const [{ data: sWs }, { data: lWs }] = await Promise.all([
        supabase
          .from('participants')
          .select('id, worksheet_url_slug, session_id, responses(submitted_at), sessions:session_id(title, date, prompts)')
          .eq('email', person.email)
          .order('created_at', { ascending: false }),
        supabase
          .from('lms_worksheets')
          .select('id, worksheet_url_slug, lms_responses(submitted_at), theme:theme_id(name, prompts)')
          .eq('people_id', person.id)
          .order('created_at', { ascending: false }),
      ])
      setSessionWs(sWs ?? [])
      setLmsWs(lWs ?? [])
      setLoading(false)
    }
    load()
  }, [person.id, person.email])

  function wsAction(wsId) { return actionState[wsId] ?? null }
  function setWsAction(wsId, state) {
    setActionState(prev => ({ ...prev, [wsId]: state }))
  }

  async function downloadPDF(ws, type) {
    setWsAction(ws.id, 'downloading')
    try {
      const participantLike = { name: person.name, email: person.email, top5: person.top5 }
      let blob, filename

      if (type === 'session') {
        const sessionLike = { title: ws.sessions?.title ?? 'Session', prompts: ws.sessions?.prompts ?? [] }
        const status = statusInfo(ws.responses)
        if (status.label === 'Pending') {
          blob = await getBlankWorksheetPDFBlob(participantLike, sessionLike)
          filename = safeName(`${person.name} - ${ws.sessions?.title ?? 'Session'} (Blank).pdf`)
        } else {
          const { data: fullResponses } = await supabase.from('responses').select('*').eq('participant_id', ws.id)
          blob = await getWorksheetPDFBlob(participantLike, sessionLike, fullResponses ?? [])
          const label = status.label === 'In Progress' ? ' (In Progress)' : ''
          filename = safeName(`${person.name} - ${ws.sessions?.title ?? 'Session'}${label}.pdf`)
        }
      } else {
        const themeLike = { title: ws.theme?.name ?? 'LMS', prompts: ws.theme?.prompts ?? [] }
        const status = statusInfo(ws.lms_responses)
        if (status.label === 'Pending') {
          blob = await getBlankWorksheetPDFBlob(participantLike, themeLike)
          filename = safeName(`${person.name} - ${ws.theme?.name ?? 'LMS'} (Blank).pdf`)
        } else {
          const { data: fullResponses } = await supabase.from('lms_responses').select('*').eq('lms_worksheet_id', ws.id)
          blob = await getWorksheetPDFBlob(participantLike, themeLike, fullResponses ?? [])
          const label = status.label === 'In Progress' ? ' (In Progress)' : ''
          filename = safeName(`${person.name} - ${ws.theme?.name ?? 'LMS'}${label}.pdf`)
        }
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF error:', err)
    }
    setWsAction(ws.id, null)
  }

  async function copyLink(wsId, slug, type) {
    const url = type === 'session'
      ? `${window.location.origin}/worksheet/${slug}`
      : `${window.location.origin}/lms-worksheet/${slug}`
    await navigator.clipboard.writeText(url)
    setWsAction(wsId, 'copied')
    setTimeout(() => setWsAction(wsId, null), 2000)
  }

  async function sendLink(ws) {
    setWsAction(ws.id, 'sending')
    await supabase.functions.invoke('send-worksheet-links', {
      body: { session_id: ws.session_id, participant_ids: [ws.id], app_origin: window.location.origin },
    })
    setWsAction(ws.id, 'sent')
    setTimeout(() => setWsAction(ws.id, null), 3000)
  }

  async function handleOpenModal(ws, type) {
    const participantLike = { name: person.name, email: person.email, top5: person.top5 }
    let sessionLike, fullResponses

    if (type === 'session') {
      sessionLike = { title: ws.sessions?.title ?? 'Session', prompts: ws.sessions?.prompts ?? [] }
      const { data } = await supabase.from('responses').select('*').eq('participant_id', ws.id)
      fullResponses = data ?? []
    } else {
      sessionLike = { title: ws.theme?.name ?? 'LMS', prompts: ws.theme?.prompts ?? [] }
      const { data } = await supabase.from('lms_responses').select('*').eq('lms_worksheet_id', ws.id)
      fullResponses = data ?? []
    }

    setViewModal({ participant: participantLike, session: sessionLike, responses: fullResponses, ws, type })
  }

  async function handleUnsubmit() {
    const { ws, type } = viewModal
    if (type === 'session') {
      await supabase.from('responses').update({ submitted_at: null }).eq('participant_id', ws.id)
      setSessionWs(prev => prev.map(w => w.id === ws.id
        ? { ...w, responses: (w.responses ?? []).map(r => ({ ...r, submitted_at: null })) }
        : w
      ))
    } else {
      await supabase.from('lms_responses').update({ submitted_at: null }).eq('lms_worksheet_id', ws.id)
      setLmsWs(prev => prev.map(w => w.id === ws.id
        ? { ...w, lms_responses: (w.lms_responses ?? []).map(r => ({ ...r, submitted_at: null })) }
        : w
      ))
    }
    setViewModal(null)
  }

  async function handleDeleteLmsWs(ws) {
    setLmsDeleting(ws.id)
    await supabase.from('lms_worksheets').delete().eq('id', ws.id)
    setLmsWs(prev => prev.filter(w => w.id !== ws.id))
    setLmsDeleteConfirm(null)
    setLmsDeleting(null)
  }

  // Compact action button style
  const actionBtn = 'text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors'
  const actionBtnBrand = 'text-xs font-medium text-brand-500 hover:text-brand-700 transition-colors'

  return (
    <>
    {viewModal && (
      <ResponseViewerModal
        participant={viewModal.participant}
        session={viewModal.session}
        responses={viewModal.responses}
        onClose={() => setViewModal(null)}
        onUnsubmit={handleUnsubmit}
        onDownloadPDF={() =>
          getWorksheetPDFBlob(viewModal.participant, viewModal.session, viewModal.responses)
            .then(blob => {
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = safeName(`${viewModal.participant.name} - ${viewModal.session.title}.pdf`)
              a.click()
              URL.revokeObjectURL(url)
            })
            .catch(console.error)
        }
      />
    )}
    <div className="bg-blue-50 border-t border-blue-100 px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{person.name}'s Worksheets</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-5">
          {/* Session Worksheets */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Session Worksheets ({sessionWs.length})
            </p>
            {sessionWs.length === 0 ? (
              <p className="text-xs text-gray-400">None yet.</p>
            ) : (
              <div className="space-y-1.5">
                {sessionWs.map(ws => {
                  const sess = ws.sessions
                  const label = sess
                    ? `${sess.title}${sess.date ? ` · ${formatDateShort(sess.date)}` : ''}`
                    : 'Unknown session'
                  const status = statusInfo(ws.responses)
                  const act = wsAction(ws.id)
                  return (
                    <div key={ws.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                        <span className="text-sm text-gray-700 truncate">{label}</span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 ml-3 divide-x divide-gray-200">
                        {status.label === 'Submitted' ? (
                          <button
                            onClick={() => handleOpenModal(ws, 'session')}
                            className={actionBtnBrand}
                          >
                            Open
                          </button>
                        ) : (
                          <a
                            href={`/worksheet/${ws.worksheet_url_slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className={actionBtnBrand}
                          >
                            Open
                          </a>
                        )}
                        <button
                          onClick={() => downloadPDF(ws, 'session')}
                          disabled={act === 'downloading'}
                          className={`pl-2.5 ${actionBtn} disabled:opacity-50`}
                        >
                          {act === 'downloading' ? '…' : '↓ PDF'}
                        </button>
                        <button
                          onClick={() => copyLink(ws.id, ws.worksheet_url_slug, 'session')}
                          className={`pl-2.5 ${actionBtn}`}
                        >
                          {act === 'copied' ? '✓ Copied' : 'Copy Link'}
                        </button>
                        <button
                          onClick={() => sendLink(ws)}
                          disabled={act === 'sending' || act === 'sent'}
                          className={`pl-2.5 ${actionBtn} disabled:opacity-50`}
                        >
                          {act === 'sending' ? '…' : act === 'sent' ? '✓ Sent' : 'Send Link'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* LMS Worksheets */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              LMS Worksheets ({lmsWs.length})
            </p>
            {lmsWs.length === 0 ? (
              <p className="text-xs text-gray-400">None yet.</p>
            ) : (
              <div className="space-y-1.5">
                {lmsWs.map(ws => {
                  const status = statusInfo(ws.lms_responses)
                  const act = wsAction(ws.id)
                  return (
                    <div key={ws.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                        <span className="text-sm text-gray-700 truncate">{ws.theme?.name ?? 'Unknown theme'}</span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 ml-3 divide-x divide-gray-200">
                        {status.label === 'Submitted' ? (
                          <button
                            onClick={() => handleOpenModal(ws, 'lms')}
                            className={actionBtnBrand}
                          >
                            Open
                          </button>
                        ) : (
                          <a
                            href={`/lms-worksheet/${ws.worksheet_url_slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className={actionBtnBrand}
                          >
                            Open
                          </a>
                        )}
                        <button
                          onClick={() => downloadPDF(ws, 'lms')}
                          disabled={act === 'downloading'}
                          className={`pl-2.5 ${actionBtn} disabled:opacity-50`}
                        >
                          {act === 'downloading' ? '…' : '↓ PDF'}
                        </button>
                        <button
                          onClick={() => copyLink(ws.id, ws.worksheet_url_slug, 'lms')}
                          className={`pl-2.5 ${actionBtn}`}
                        >
                          {act === 'copied' ? '✓ Copied' : 'Copy Link'}
                        </button>
                        {lmsDeleteConfirm === ws.id ? (
                          <span className="pl-2.5 flex items-center gap-1">
                            <span className="text-xs text-gray-500">Delete?</span>
                            <button
                              onClick={() => handleDeleteLmsWs(ws)}
                              disabled={lmsDeleting === ws.id}
                              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
                            >Yes</button>
                            <button
                              onClick={() => setLmsDeleteConfirm(null)}
                              className="text-xs text-gray-400 hover:underline"
                            >No</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setLmsDeleteConfirm(ws.id)}
                            className="pl-2.5 text-xs font-medium text-red-400 hover:text-red-600 transition-colors"
                          >Delete</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ParticipantsPage() {
  const navigate = useNavigate()
  const [people, setPeople] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [addingNew, setAddingNew] = useState(false)
  const [addMode, setAddMode] = useState('single') // 'single' | 'paste'
  const [pasteText, setPasteText] = useState('')
  const [pasteErrors, setPasteErrors] = useState([])
  const [pasteSaving, setPasteSaving] = useState(false)
  const [pasteTeamId, setPasteTeamId] = useState('')
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [expandedPersonId, setExpandedPersonId] = useState(null)
  const [insightsModal, setInsightsModal] = useState(null)
  const [bulkInsightsModal, setBulkInsightsModal] = useState(false)
  const [reportsPersonId, setReportsPersonId] = useState(null)
  const [customReportModal, setCustomReportModal] = useState(null)
  const [reports, setReports] = useState([])

  // Add Team modal
  const [addTeamModal, setAddTeamModal] = useState(false)
  const [addTeamCallback, setAddTeamCallback] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data }, { data: teamsData }, { data: reportsData }] = await Promise.all([
      supabase.from('people').select('*').order('name'),
      supabase.from('teams').select('*').order('name'),
      supabase.from('reports').select('*').order('name'),
    ])
    setPeople(data ?? [])
    setTeams(teamsData ?? [])
    setReports(reportsData ?? [])
    setLoading(false)
  }

  async function handleSaveEdit(id, updates) {
    setSaveError(null)
    const { error } = await supabase.from('people').update(updates).eq('id', id)
    if (error) { setSaveError(error.message); return }
    setEditingId(null)
    load()
  }

  async function handleSaveNew(data) {
    setSaveError(null)
    const { data: { user: u } } = await supabase.auth.getUser()
    const { error } = await supabase.from('people').insert({ ...data, created_by: u.id })
    if (error) { setSaveError(error.message); return }
    setAddingNew(false)
    load()
  }

  async function handleDelete(id) {
    await supabase.from('people').delete().eq('id', id)
    setDeleteConfirm(null)
    setEditingId(null)
    setExpandedPersonId(null)
    load()
  }

  async function handlePasteSave() {
    const { parsed, errors } = parseParticipants(pasteText)
    if (errors.length > 0) return
    if (parsed.length === 0) return
    setPasteSaving(true)
    setSaveError(null)
    const { data: { user: u } } = await supabase.auth.getUser()
    const { error } = await supabase.from('people').upsert(
      parsed.map(p => ({ name: p.name, email: p.email, top5: p.top5, created_by: u.id, team_id: pasteTeamId || null })),
      { onConflict: 'email' }
    )
    setPasteSaving(false)
    if (error) { setSaveError(error.message); return }
    setPasteText('')
    setPasteErrors([])
    setAddingNew(false)
    load()
  }

  function openAddTeamModal(callback = null) {
    setAddTeamCallback(() => callback)
    setAddTeamModal(true)
  }

  async function handleTeamCreated(team) {
    setAddTeamModal(false)
    await load()
    if (addTeamCallback) {
      addTeamCallback(team)
      setAddTeamCallback(null)
    }
  }

  const teamMap = {}
  teams.forEach(t => { teamMap[t.id] = t })

  const filtered = people.filter(p => {
    const teamName = p.team_id ? (teamMap[p.team_id]?.name ?? '') : ''
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.top5 ?? []).some(s => s.toLowerCase().includes(q)) ||
      teamName.toLowerCase().includes(q)
    )
  })

  return (
    <Layout>
      {insightsModal && (
        <PersonalInsightsModal
          participant={insightsModal}
          onClose={() => setInsightsModal(null)}
        />
      )}
      {customReportModal && (
        <CustomReportModal
          report={customReportModal.report}
          participant={customReportModal.person}
          onClose={() => setCustomReportModal(null)}
        />
      )}
      {bulkInsightsModal && (
        <PersonalInsightsBulkModal
          people={people}
          teams={teams}
          onClose={() => setBulkInsightsModal(false)}
        />
      )}
      {addTeamModal && (
        <AddTeamModal
          onSave={handleTeamCreated}
          onClose={() => { setAddTeamModal(false); setAddTeamCallback(null) }}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Participants</h1>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => { setAddingNew(true); setAddMode('paste'); setEditingId(null) }}
              className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Paste Multiple
            </button>
            <button
              onClick={() => { setAddingNew(true); setAddMode('single'); setEditingId(null) }}
              className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Add Person
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/teams')}
              className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Edit Teams
            </button>
            <button
              onClick={() => openAddTeamModal(null)}
              className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Add Team
            </button>
            <button
              onClick={() => setBulkInsightsModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Personal Insights Reports
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, strength, or team…"
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Paste multiple panel */}
      {addingNew && addMode === 'paste' && (
        <div className="bg-white rounded-2xl border border-brand-200 p-6 mb-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Paste Multiple Participants</h2>
          <p className="text-sm text-gray-500">
            One per line:{' '}
            <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 text-gray-700">
              Name, Email, S1, S2, S3, S4, S5
            </code>
          </p>
          <textarea
            value={pasteText}
            onChange={e => { setPasteText(e.target.value); setPasteErrors(parseParticipants(e.target.value).errors) }}
            rows={8}
            placeholder={"Jane Smith, jane@example.com, Achiever, Learner, Relator, Futuristic, Strategic\nJohn Doe, john@example.com, Empathy, Communication, Developer, Harmony, Includer"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to team <span className="font-normal text-gray-400">(optional)</span></label>
            <select
              value={pasteTeamId}
              onChange={e => {
                if (e.target.value === '__new__') {
                  openAddTeamModal(team => setPasteTeamId(team.id))
                } else {
                  setPasteTeamId(e.target.value)
                }
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">No team</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
              <option value="__new__">+ Create new team…</option>
            </select>
          </div>

          {pasteErrors.length > 0 && (
            <ul className="text-xs text-red-600 space-y-0.5">
              {pasteErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          )}
          {pasteText.trim() && pasteErrors.length === 0 && (
            <p className="text-xs text-green-600">
              {parseParticipants(pasteText).parsed.length} participant{parseParticipants(pasteText).parsed.length !== 1 ? 's' : ''} ready to add
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handlePasteSave}
              disabled={pasteSaving || pasteErrors.length > 0 || !pasteText.trim()}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {pasteSaving ? 'Saving…' : 'Add Participants'}
            </button>
            <button
              onClick={() => { setAddingNew(false); setPasteText(''); setPasteErrors([]); setPasteTeamId('') }}
              className="text-gray-500 hover:text-gray-800 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {saveError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <strong>Error:</strong> {saveError}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-gray-500 text-sm px-5 py-6">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Top 5 Strengths</th>
                <th className="px-4 py-3 text-left font-medium">Team</th>
                <th className="px-4 py-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {addingNew && addMode === 'single' && (
                <EditRow
                  person={BLANK}
                  teams={teams}
                  onSave={handleSaveNew}
                  onCancel={() => setAddingNew(false)}
                  onOpenAddTeam={openAddTeamModal}
                />
              )}
              {filtered.length === 0 && !addingNew && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">
                    {search ? 'No results.' : 'No participants yet. Add your first person above.'}
                  </td>
                </tr>
              )}
              {filtered.map(p => {
                const team = p.team_id ? teamMap[p.team_id] : null
                return editingId === p.id ? (
                  <EditRow
                    key={p.id}
                    person={p}
                    teams={teams}
                    onSave={data => handleSaveEdit(p.id, data)}
                    onCancel={() => setEditingId(null)}
                    onOpenAddTeam={openAddTeamModal}
                    onDeletePerson={() => { setDeleteConfirm(p.id); setEditingId(null) }}
                  />
                ) : (
                  <>
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.name}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(p.top5 ?? []).map((s, i) => <StrengthBadge key={i} name={s} />)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {team ? (
                          <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">
                            {team.name}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'auto auto' }}>
                          {(p.top5 ?? []).some(Boolean) ? (
                            <button
                              onClick={() => { setInsightsModal(p); setExpandedPersonId(null); setReportsPersonId(null) }}
                              className="w-full text-xs font-medium text-emerald-600 hover:text-emerald-800 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg transition-colors"
                            >
                              Personal Insights
                            </button>
                          ) : <div />}
                          <button
                            onClick={() => { setEditingId(p.id); setAddingNew(false); setExpandedPersonId(null); setReportsPersonId(null) }}
                            className="w-full text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1 rounded-lg transition-colors"
                          >
                            Edit Person
                          </button>
                          <button
                            onClick={() => { setExpandedPersonId(id => id === p.id ? null : p.id); setReportsPersonId(null); setEditingId(null) }}
                            className="w-full whitespace-nowrap text-xs font-medium text-brand-500 hover:text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-3 py-1 rounded-lg transition-colors"
                          >
                            Worksheets {expandedPersonId === p.id ? '↑' : '›'}
                          </button>
                          <button
                            onClick={() => { setReportsPersonId(id => id === p.id ? null : p.id); setExpandedPersonId(null); setEditingId(null) }}
                            className="w-full whitespace-nowrap text-xs font-medium text-purple-600 hover:text-purple-800 border border-purple-200 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-lg transition-colors"
                          >
                            Reports {reportsPersonId === p.id ? '↑' : '›'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedPersonId === p.id && deleteConfirm !== p.id && (
                      <tr key={`${p.id}-panel`}>
                        <td colSpan={5} className="p-0">
                          <PersonWorksheetPanel
                            person={p}
                            onClose={() => setExpandedPersonId(null)}
                          />
                        </td>
                      </tr>
                    )}
                    {reportsPersonId === p.id && deleteConfirm !== p.id && (
                      <tr key={`${p.id}-reports-panel`}>
                        <td colSpan={5} className="p-0">
                          <PersonReportsPanel
                            person={p}
                            reports={reports}
                            onClose={() => setReportsPersonId(null)}
                            onOpenPersonalInsights={() => { setInsightsModal(p); setReportsPersonId(null) }}
                            onOpenCustomReport={report => setCustomReportModal({ report, person: p })}
                          />
                        </td>
                      </tr>
                    )}
                    {deleteConfirm === p.id && (
                      <tr key={`${p.id}-del`}>
                        <td colSpan={5} className="px-4 py-2 bg-red-50 border-t border-red-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">Delete {p.name}? This will also remove all their worksheets and responses.</span>
                            <button onClick={() => handleDelete(p.id)} className="text-xs text-red-600 font-medium hover:underline">Yes, Delete</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
