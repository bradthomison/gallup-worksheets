import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StrengthBadge from '../components/StrengthBadge'
import { STRENGTH_DOMAIN } from '../lib/strengthColors'
import { parseParticipants } from '../lib/parseParticipants'
import { useAuth } from '../hooks/useAuth'
import { getWorksheetPDFBlob, getBlankWorksheetPDFBlob } from '../lib/downloadWorksheetPDF'
import { formatDateShort } from '../lib/dateUtils'

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
function EditRow({ person, teams, onSave, onCancel, onOpenAddTeam, isOwner, shared, onToggleShare, onDeletePerson }) {
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
          {/* Row 2: Shared toggle + Delete */}
          {(isOwner && (onToggleShare || onDeletePerson)) && (
            <div className="flex gap-2">
              {isOwner && onToggleShare && (
                <button
                  onClick={onToggleShare}
                  className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors whitespace-nowrap ${
                    shared
                      ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                      : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                  }`}
                  title={shared ? 'Click to make private' : 'Click to share with other coaches'}
                >
                  {shared ? 'Shared' : 'Private'}
                </button>
              )}
              {isOwner && onDeletePerson && (
                <button
                  onClick={onDeletePerson}
                  className="text-xs font-medium px-3 py-1 rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors whitespace-nowrap"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
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
                        <a
                          href={`/worksheet/${ws.worksheet_url_slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className={actionBtnBrand}
                        >
                          Open
                        </a>
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
                        <a
                          href={`/lms-worksheet/${ws.worksheet_url_slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className={actionBtnBrand}
                        >
                          Open
                        </a>
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
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ParticipantsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [people, setPeople] = useState([])
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [addingNew, setAddingNew] = useState(false)
  const [addMode, setAddMode] = useState('single') // 'single' | 'paste'
  const [pasteText, setPasteText] = useState('')
  const [pasteErrors, setPasteErrors] = useState([])
  const [pasteSaving, setPasteSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [expandedPersonId, setExpandedPersonId] = useState(null)

  // Add Team modal
  const [addTeamModal, setAddTeamModal] = useState(false)
  const [addTeamCallback, setAddTeamCallback] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data }, { data: profData }, { data: teamsData }] = await Promise.all([
      supabase.from('people').select('*').order('name'),
      supabase.from('profiles').select('id, display_name'),
      supabase.from('teams').select('*').order('name'),
    ])
    setPeople(data ?? [])
    const map = {}
    ;(profData ?? []).forEach(p => { map[p.id] = p.display_name })
    setProfiles(map)
    setTeams(teamsData ?? [])
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

  async function handleToggleShare(person) {
    await supabase.from('people').update({ shared: !person.shared }).eq('id', person.id)
    setPeople(prev => prev.map(p => p.id === person.id ? { ...p, shared: !p.shared } : p))
  }

  async function handlePasteSave() {
    const { parsed, errors } = parseParticipants(pasteText)
    if (errors.length > 0) return
    if (parsed.length === 0) return
    setPasteSaving(true)
    setSaveError(null)
    const { data: { user: u } } = await supabase.auth.getUser()
    const { error } = await supabase.from('people').upsert(
      parsed.map(p => ({ name: p.name, email: p.email, top5: p.top5, created_by: u.id })),
      { onConflict: 'email,created_by' }
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
              onClick={() => { setAddingNew(false); setPasteText(''); setPasteErrors([]) }}
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
                const isOwner = p.created_by === user?.id
                const sharedByName = !isOwner
                  ? (profiles[p.created_by] ?? 'Another coach')
                  : null
                const team = p.team_id ? teamMap[p.team_id] : null
                return editingId === p.id ? (
                  <EditRow
                    key={p.id}
                    person={p}
                    teams={teams}
                    onSave={data => handleSaveEdit(p.id, data)}
                    onCancel={() => setEditingId(null)}
                    onOpenAddTeam={openAddTeamModal}
                    isOwner={isOwner}
                    shared={p.shared}
                    onToggleShare={() => handleToggleShare(p)}
                    onDeletePerson={() => { setDeleteConfirm(p.id); setEditingId(null) }}
                  />
                ) : (
                  <>
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        {!isOwner && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">
                            Shared by {sharedByName}
                          </span>
                        )}
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
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isOwner && (
                            <button
                              onClick={() => { setEditingId(p.id); setAddingNew(false); setExpandedPersonId(null) }}
                              className="text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1 rounded-lg transition-colors"
                            >
                              Edit Person
                            </button>
                          )}
                          {(isOwner || p.shared) && (
                            <button
                              onClick={() => setExpandedPersonId(id => id === p.id ? null : p.id)}
                              className="text-xs font-medium text-brand-500 hover:text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-3 py-1 rounded-lg transition-colors"
                            >
                              Worksheets {expandedPersonId === p.id ? '↑' : '›'}
                            </button>
                          )}
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
