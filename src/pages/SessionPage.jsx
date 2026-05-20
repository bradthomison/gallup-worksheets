import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StrengthBadge from '../components/StrengthBadge'
import ResponseViewerModal from '../components/ResponseViewerModal'
import { parseParticipants } from '../lib/parseParticipants'
import { downloadSessionPDFs, downloadBlankSessionPDFs, downloadBlankWorksheetPDF } from '../lib/downloadWorksheetPDF'
import { useAuth } from '../hooks/useAuth'
import { formatDateLong } from '../lib/dateUtils'

export default function SessionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [profiles, setProfiles] = useState({})
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)
  const [copiedJoin, setCopiedJoin] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [batchDownloading, setBatchDownloading] = useState(false)
  const [batchProgress, setBatchProgress] = useState(null)
  const [blankDownloading, setBlankDownloading] = useState(false)
  const [blankProgress, setBlankProgress] = useState(null)
  const [confirmSendLinks, setConfirmSendLinks] = useState(false)
  const [sendingLinks, setSendingLinks] = useState(false)
  const [linksSentCount, setLinksSentCount] = useState(null)
  const [selectRecipientsModal, setSelectRecipientsModal] = useState(false)
  const [selectedRecipients, setSelectedRecipients] = useState(new Set())
  const [sendingLinkId, setSendingLinkId] = useState(null)
  const [sentLinkId, setSentLinkId] = useState(null)

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editPromptsText, setEditPromptsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Participant editing
  const [removedIds, setRemovedIds] = useState(new Set())
  const [people, setPeople] = useState([])
  const [addTab, setAddTab] = useState('existing')
  const [addSearch, setAddSearch] = useState('')
  const [addSelected, setAddSelected] = useState(new Set())
  const [teams, setTeams] = useState([])
  const [addTeamModal, setAddTeamModal] = useState(null) // team object or null
  const [pasteText, setPasteText] = useState('')
  const [pasteErrors, setPasteErrors] = useState([])

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    const [{ data: sess }, { data: parts }, { data: profData }] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', id).single(),
      supabase
        .from('participants')
        .select('id, name, email, top5, worksheet_url_slug, is_manager, responses(id, submitted_at)')
        .eq('session_id', id)
        .order('name'),
      supabase.from('profiles').select('id, display_name'),
    ])
    setSession(sess)
    setParticipants(parts ?? [])
    const map = {}
    ;(profData ?? []).forEach(p => { map[p.id] = p.display_name })
    setProfiles(map)
    setLoading(false)
  }

  function startEditing() {
    setEditTitle(session.title)
    setEditDate(session.date ?? '')
    setEditPromptsText((session.prompts ?? []).join('\n'))
    setRemovedIds(new Set())
    setAddSelected(new Set())
    setPasteText('')
    setPasteErrors([])
    setSaveError(null)
    // Load people and teams for the picker
    supabase.from('people').select('*').order('name').then(({ data }) => setPeople(data ?? []))
    supabase.from('teams').select('*').order('name').then(({ data }) => setTeams(data ?? []))
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setSaveError(null)
  }

  function toggleRemove(pid) {
    setRemovedIds(prev => {
      const next = new Set(prev)
      next.has(pid) ? next.delete(pid) : next.add(pid)
      return next
    })
  }

  function toggleAddSelect(personId) {
    setAddSelected(prev => {
      const next = new Set(prev)
      next.has(personId) ? next.delete(personId) : next.add(personId)
      return next
    })
  }

  function handlePasteChange(e) {
    setPasteText(e.target.value)
    setPasteErrors(parseParticipants(e.target.value).errors)
  }

  // People already in this session (by email) — exclude from picker
  const existingEmails = new Set(participants.map(p => p.email))

  const teamMap = {}
  teams.forEach(t => { teamMap[t.id] = t })

  const filteredPeople = people.filter(p => {
    if (existingEmails.has(p.email)) return false
    const teamName = p.team_id ? (teamMap[p.team_id]?.name ?? '') : ''
    const q = addSearch.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.top5 ?? []).some(s => s.toLowerCase().includes(q)) ||
      teamName.toLowerCase().includes(q)
    )
  })

  function toggleTeamAdd(teamId) {
    const members = people.filter(p => p.team_id === teamId && !existingEmails.has(p.email))
    if (members.length === 0) return
    const allSelected = members.every(p => addSelected.has(p.id))
    setAddSelected(prev => {
      const next = new Set(prev)
      if (allSelected) {
        members.forEach(p => next.delete(p.id))
      } else {
        members.forEach(p => next.add(p.id))
      }
      return next
    })
  }

  async function handleSave() {
    const prompts = editPromptsText.split('\n').map(s => s.trim()).filter(Boolean)
    if (!editTitle.trim()) { setSaveError('Title is required.'); return }
    if (prompts.length === 0) { setSaveError('Add at least one prompt.'); return }
    if (pasteErrors.length > 0) { setSaveError('Fix paste errors before saving.'); return }

    setSaving(true)
    setSaveError(null)

    const { data: { user } } = await supabase.auth.getUser()

    // 1. Save session fields
    const { data: updatedSession, error: sessErr } = await supabase
      .from('sessions')
      .update({ title: editTitle.trim(), date: editDate || null, prompts })
      .eq('id', id)
      .select()
      .single()
    if (sessErr) { setSaveError(sessErr.message); setSaving(false); return }

    // 2. Remove participants marked for removal
    if (removedIds.size > 0) {
      await supabase.from('participants').delete().in('id', [...removedIds])
    }

    // 3. Add selected existing people
    const fromPeople = people.filter(p => addSelected.has(p.id))

    // Check which selected people are team managers (for auto is_manager flag)
    let managerPeopleIds = new Set()
    if (fromPeople.length > 0) {
      const { data: managerTeams } = await supabase
        .from('teams')
        .select('manager_id')
        .not('manager_id', 'is', null)
      managerPeopleIds = new Set((managerTeams ?? []).map(t => t.manager_id).filter(Boolean))
    }

    // 4. Add pasted new people
    const { parsed: fromPaste } = parseParticipants(pasteText)
    if (fromPaste.length > 0) {
      await supabase.from('people').upsert(
        fromPaste.map(p => ({ name: p.name, email: p.email, top5: p.top5, created_by: user.id })),
        { onConflict: 'email,created_by' }
      )
    }

    const newParticipants = [
      ...fromPeople.map(p => ({ name: p.name, email: p.email, top5: p.top5, is_manager: managerPeopleIds.has(p.id) })),
      ...fromPaste,
    ]
    if (newParticipants.length > 0) {
      await supabase.from('participants').insert(
        newParticipants.map(p => ({
          session_id: id,
          name: p.name,
          email: p.email,
          top5: p.top5,
          is_manager: p.is_manager ?? false,
          worksheet_url_slug: crypto.randomUUID(),
        }))
      )
    }

    setSession(updatedSession)
    setEditing(false)
    setSaving(false)
    load()
  }

  function downloadParticipantCSV() {
    const rows = [
      ['Name', 'Email', 'Top 5 Strengths', 'Worksheet URL'],
      ...participants.map(p => [
        p.name,
        p.email,
        (p.top5 ?? []).join(', '),
        worksheetUrl(p.worksheet_url_slug),
      ]),
    ]
    const csv = rows
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${session.title} - Participants.csv`.replace(/[/\\?%*:|"<>]/g, '-')
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSendLinks(participantIds = null) {
    setSendingLinks(true)
    const body = { session_id: id, app_origin: window.location.origin }
    if (participantIds) body.participant_ids = participantIds
    const { data, error } = await supabase.functions.invoke('send-worksheet-links', { body })
    setSendingLinks(false)
    setConfirmSendLinks(false)
    setSelectRecipientsModal(false)
    if (!error && data?.sent != null) {
      setLinksSentCount(data.sent)
      setTimeout(() => setLinksSentCount(null), 4000)
    }
  }

  async function sendLinkTo(participantId) {
    setSendingLinkId(participantId)
    const body = { session_id: id, app_origin: window.location.origin, participant_ids: [participantId] }
    await supabase.functions.invoke('send-worksheet-links', { body })
    setSendingLinkId(null)
    setSentLinkId(participantId)
    setTimeout(() => setSentLinkId(null), 3000)
  }

  function openSelectRecipients() {
    // Pre-select everyone
    setSelectedRecipients(new Set(participants.map(p => p.id)))
    setSelectRecipientsModal(true)
  }

  function toggleRecipient(id) {
    setSelectedRecipients(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleDownloadAllBlank() {
    setBlankDownloading(true)
    setBlankProgress(null)
    await downloadBlankSessionPDFs(
      session,
      participants,
      (progress) => setBlankProgress(progress)
    )
    setBlankDownloading(false)
    setBlankProgress(null)
  }

  async function handleToggleShare() {
    const { data: updated } = await supabase
      .from('sessions')
      .update({ shared: !session.shared })
      .eq('id', id)
      .select()
      .single()
    if (updated) setSession(updated)
  }

  async function handleDownloadAll() {
    setBatchDownloading(true)
    setBatchProgress(null)
    await downloadSessionPDFs(
      session,
      participants,
      async (participantId) => {
        const { data } = await supabase.from('responses').select('*').eq('participant_id', participantId)
        return data ?? []
      },
      (progress) => setBatchProgress(progress)
    )
    setBatchDownloading(false)
    setBatchProgress(null)
  }

  function worksheetUrl(slug) {
    return `${window.location.origin}/worksheet/${slug}`
  }

  function joinUrl() {
    return `${window.location.origin}/session/${id}/join`
  }

  async function copyJoinUrl() {
    await navigator.clipboard.writeText(joinUrl())
    setCopiedJoin(true)
    setTimeout(() => setCopiedJoin(false), 2000)
  }

  async function handleToggleManager(participantId, current) {
    await supabase.from('participants').update({ is_manager: !current }).eq('id', participantId)
    setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, is_manager: !current } : p))
  }

  async function copyUrl(slug, participantId) {
    await navigator.clipboard.writeText(worksheetUrl(slug))
    setCopied(participantId)
    setTimeout(() => setCopied(null), 2000)
  }

  function isSubmitted(participant) {
    return participant.responses?.some(r => r.submitted_at)
  }

  function isInProgress(participant) {
    return participant.responses?.length > 0 && !participant.responses.some(r => r.submitted_at)
  }

  async function openResponses(participant) {
    const { data: responses } = await supabase
      .from('responses')
      .select('*')
      .eq('participant_id', participant.id)
    setViewing({ participant, responses: responses ?? [] })
  }

  async function handleUnsubmit(participantId) {
    await supabase
      .from('responses')
      .update({ submitted_at: null })
      .eq('participant_id', participantId)
    load()
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('sessions').delete().eq('id', id)
    navigate('/')
  }

  async function handleArchive(archive) {
    const { data: updated } = await supabase
      .from('sessions')
      .update({ archived: archive })
      .eq('id', id)
      .select()
      .single()
    if (updated) setSession(updated)
    setConfirmArchive(false)
  }

  if (loading) return <Layout><p className="text-gray-500 text-sm">Loading…</p></Layout>
  if (!session) return <Layout><p className="text-red-500 text-sm">Session not found.</p></Layout>

  const isOwner = session.created_by === user?.id
  const sharedByName = !isOwner
    ? (profiles[session.created_by] ?? 'Another coach')
    : null

  const submittedCount = participants.filter(isSubmitted).length
  const visibleParticipants = participants

  return (
    <Layout>
      {/* Select Recipients modal */}
      {selectRecipientsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Select Recipients</h2>
              <button onClick={() => setSelectRecipientsModal(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            {/* Select all toggle */}
            <div className="px-6 py-2 border-b border-gray-100 bg-gray-50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRecipients.size === participants.length}
                  onChange={() => {
                    if (selectedRecipients.size === participants.length) {
                      setSelectedRecipients(new Set())
                    } else {
                      setSelectedRecipients(new Set(participants.map(p => p.id)))
                    }
                  }}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-xs font-medium text-gray-600">
                  {selectedRecipients.size === participants.length ? 'Deselect all' : 'Select all'}
                </span>
              </label>
            </div>

            {/* Participant list */}
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100 px-2 py-1">
              {participants.map(p => (
                <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={selectedRecipients.has(p.id)}
                    onChange={() => toggleRecipient(p.id)}
                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.email}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3 bg-gray-50 rounded-b-2xl">
              <span className="text-sm text-gray-500">
                Send to <span className="font-semibold text-gray-900">{selectedRecipients.size}</span>{' '}
                {selectedRecipients.size === 1 ? 'recipient' : 'recipients'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectRecipientsModal(false)}
                  className="text-sm text-gray-500 hover:text-gray-800 font-medium px-4 py-2 rounded-lg transition-colors"
                >Cancel</button>
                <button
                  onClick={() => handleSendLinks(Array.from(selectedRecipients))}
                  disabled={selectedRecipients.size === 0 || sendingLinks}
                  className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                >{sendingLinks ? 'Sending…' : 'Send'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team member picker modal (edit mode) */}
      {addTeamModal && (() => {
        const allTeamMembers = people.filter(p => p.team_id === addTeamModal.id)
        const newlySelected = allTeamMembers.filter(p => addSelected.has(p.id)).length
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[75vh]">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{addTeamModal.name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{allTeamMembers.length} member{allTeamMembers.length !== 1 ? 's' : ''}</p>
                </div>
                <button type="button" onClick={() => setAddTeamModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
              </div>
              <div className="overflow-y-auto flex-1 divide-y divide-gray-100 px-2 py-1">
                {allTeamMembers.map(p => {
                  const inSession = existingEmails.has(p.email)
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                        inSession ? 'opacity-50 cursor-not-allowed' : addSelected.has(p.id) ? 'bg-brand-50 cursor-pointer' : 'hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={inSession || addSelected.has(p.id)}
                        disabled={inSession}
                        onChange={() => !inSession && toggleAddSelect(p.id)}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.email}</p>
                        {inSession && <p className="text-xs text-gray-400 italic">Already in session</p>}
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {(p.top5 ?? []).map((s, i) => <StrengthBadge key={i} name={s} />)}
                      </div>
                    </label>
                  )
                })}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {newlySelected} new{newlySelected !== 1 ? ' members' : ' member'} selected
                </span>
                <button
                  type="button"
                  onClick={() => setAddTeamModal(null)}
                  className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {viewing && (
        <ResponseViewerModal
          participant={viewing.participant}
          session={session}
          responses={viewing.responses}
          onClose={() => setViewing(null)}
          onUnsubmit={handleUnsubmit}
        />
      )}

      <div className="mb-1">
        <Link to="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← All sessions</Link>
      </div>

      {/* Shared-by banner for non-owners */}
      {!isOwner && (
        <div className="mt-3 mb-3 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
          <span className="text-xs text-gray-500">
            Shared by <span className="font-medium text-gray-700">{sharedByName}</span> — view only
          </span>
        </div>
      )}

      {/* Row 1 — title + share toggle + counts */}
      <div className="flex items-start justify-between mt-3 mb-3">
        <div>
          {editing ? (
            <div className="space-y-2">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="text-2xl font-bold text-gray-900 border-b-2 border-brand-500 bg-transparent focus:outline-none w-full"
              />
              <input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="text-sm rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
              {session.date && (
                <p className="text-sm text-gray-500 mt-1">
                  {formatDateLong(session.date)}
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isOwner && !editing && (
            <button
              onClick={handleToggleShare}
              className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                session.shared
                  ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                  : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
              }`}
              title={session.shared ? 'Click to make private' : 'Click to share with other coaches'}
            >
              {session.shared ? '🌐 Shared' : '🔒 Private'}
            </button>
          )}
          <div className="text-right text-sm text-gray-500">
            <p>{participants.length} participants</p>
            <p className="text-xs mt-0.5">{submittedCount}/{participants.length} submitted</p>
          </div>
        </div>
      </div>

      {/* Row 2 — action bar (hidden while editing) */}
      {!editing && (
        <div className="flex flex-wrap items-center justify-end gap-2 mb-6">

          {/* Shared group — visible to all (owner + shared viewers) */}
          <div className="flex items-center text-xs divide-x divide-gray-200 border border-gray-200 rounded-lg overflow-hidden bg-white">
            {/* Send Links */}
            {linksSentCount != null ? (
              <span className="px-3 py-1.5 text-green-600 font-medium whitespace-nowrap">✓ Sent to {linksSentCount}</span>
            ) : confirmSendLinks ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50">
                <span className="text-blue-700 font-medium whitespace-nowrap">Send to {participants.length}?</span>
                <button
                  onClick={() => handleSendLinks()}
                  disabled={sendingLinks}
                  className="font-semibold text-white bg-brand-500 hover:bg-brand-600 px-2 py-0.5 rounded disabled:opacity-60 transition-colors"
                >{sendingLinks ? '…' : 'Yes'}</button>
                <button
                  onClick={openSelectRecipients}
                  disabled={sendingLinks}
                  className="font-semibold text-brand-600 bg-white border border-brand-300 hover:bg-brand-50 px-2 py-0.5 rounded disabled:opacity-60 transition-colors whitespace-nowrap"
                >Select Recipients</button>
                <button onClick={() => setConfirmSendLinks(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmSendLinks(true)}
                disabled={participants.length === 0}
                className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Email each participant their unique worksheet link"
              >✉ Send Links</button>
            )}
            {/* CSV */}
            <button
              onClick={downloadParticipantCSV}
              disabled={participants.length === 0}
              className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Download participant list with worksheet links"
            >↓ CSV</button>
            {/* Filled PDFs */}
            {batchDownloading ? (
              <span className="px-3 py-1.5 text-gray-500 whitespace-nowrap">
                PDFs {batchProgress ? `${batchProgress.current}/${batchProgress.total}` : '…'}
              </span>
            ) : (
              <button
                onClick={handleDownloadAll}
                disabled={participants.length === 0}
                className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Download all worksheets as a ZIP"
              >↓ Filled PDFs</button>
            )}
            {/* Blank PDFs */}
            {blankDownloading ? (
              <span className="px-3 py-1.5 text-gray-500 whitespace-nowrap">
                Blank {blankProgress ? `${blankProgress.current}/${blankProgress.total}` : '…'}
              </span>
            ) : (
              <button
                onClick={handleDownloadAllBlank}
                disabled={participants.length === 0}
                className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Download blank print-ready worksheets"
              >↓ Blank PDFs</button>
            )}
          </div>

          {/* Owner-only group — Edit + Delete */}
          {isOwner && (
            <div className="flex items-center text-xs divide-x divide-gray-200 border border-gray-200 rounded-lg overflow-hidden bg-white">
              <button
                onClick={startEditing}
                className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
              >Edit</button>

              {/* Archive / Unarchive */}
              {session.archived ? (
                <button
                  onClick={() => handleArchive(false)}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
                >Unarchive</button>
              ) : confirmArchive ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50">
                  <span className="text-amber-700 font-medium whitespace-nowrap">Archive?</span>
                  <button
                    onClick={() => handleArchive(true)}
                    className="font-semibold text-white bg-amber-500 hover:bg-amber-600 px-2 py-0.5 rounded transition-colors"
                  >Yes</button>
                  <button onClick={() => setConfirmArchive(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmArchive(true)}
                  className="px-3 py-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                >Archive</button>
              )}

              {/* Delete */}
              {confirmDelete ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50">
                  <span className="text-red-700 font-medium whitespace-nowrap">Delete?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded disabled:opacity-60 transition-colors"
                  >{deleting ? '…' : 'Yes'}</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-1.5 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                >Delete</button>
              )}
            </div>
          )}

        </div>
      )}

      {/* Prompts */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">
          Prompts {!editing && `(${session.prompts?.length ?? 0})`}
        </h2>
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editPromptsText}
              onChange={e => setEditPromptsText(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            />
            <p className="text-xs text-gray-400">One prompt per line.</p>
          </div>
        ) : (
          <ol className="space-y-1.5 list-decimal list-inside">
            {(session.prompts ?? []).map((p, i) => (
              <li key={i} className="text-sm text-gray-700">{p}</li>
            ))}
          </ol>
        )}
      </div>

      {/* Group Access Link */}
      {!editing && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900 mb-1">Group Access Link</h2>
              <p className="text-xs text-gray-500 mb-2">
                Share this link so participants can find their own worksheet from a dropdown list.
              </p>
              <a
                href={joinUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-500 hover:underline break-all"
              >
                {joinUrl()}
              </a>
            </div>
            <button
              onClick={copyJoinUrl}
              className="shrink-0 text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              {copiedJoin ? '✓ Copied' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {/* Participants */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Participants</h2>
          {editing && <p className="text-xs text-gray-400 mt-0.5">Click Remove to drop someone from this session.</p>}
        </div>
        {participants.length === 0 ? (
          <p className="text-sm text-gray-500 px-5 py-6">No participants in this session.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Name</th>
                <th className="px-5 py-3 text-left font-medium">Top 5</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">
                  {editing ? '' : 'Worksheet URL'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleParticipants.map(p => {
                const removed = removedIds.has(p.id)
                return (
                  <tr key={p.id} className={`transition-colors ${removed ? 'opacity-40 bg-red-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        {p.is_manager && !editing && (
                          <span className="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            Manager
                          </span>
                        )}
                        {editing && isOwner && (
                          <button
                            onClick={() => handleToggleManager(p.id, p.is_manager)}
                            className={`text-xs font-medium px-1.5 py-0.5 rounded-full border transition-colors ${
                              p.is_manager
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                            }`}
                          >
                            {p.is_manager ? 'Manager ✓' : 'Manager'}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{p.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(p.top5 ?? []).map((s, i) => <StrengthBadge key={i} name={s} />)}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {isSubmitted(p) ? (
                        <button
                          onClick={() => !editing && openResponses(p)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-full transition-colors"
                        >
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          {editing ? 'Submitted' : 'Submitted — View'}
                        </button>
                      ) : isInProgress(p) ? (
                        <button
                          onClick={() => !editing && openResponses(p)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-full transition-colors"
                        >
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                          {editing ? 'In Progress' : 'In Progress — View'}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {editing ? (
                        <button
                          onClick={() => toggleRemove(p.id)}
                          className={`text-xs font-medium transition-colors ${removed ? 'text-brand-500 hover:text-brand-700' : 'text-red-400 hover:text-red-600'}`}
                        >
                          {removed ? 'Undo' : 'Remove'}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={worksheetUrl(p.worksheet_url_slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-brand-500 hover:underline truncate max-w-[160px]"
                          >
                            /worksheet/{p.worksheet_url_slug.slice(0, 8)}…
                          </a>
                          <button
                            onClick={() => copyUrl(p.worksheet_url_slug, p.id)}
                            className="shrink-0 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            {copied === p.id ? '✓ Copied' : 'Copy'}
                          </button>
                          <button
                            onClick={() => downloadBlankWorksheetPDF(p, session)}
                            className="shrink-0 text-xs text-gray-400 hover:text-brand-500 transition-colors"
                            title="Download blank print-ready worksheet"
                          >
                            ↓ Blank
                          </button>
                          <button
                            onClick={() => sendLinkTo(p.id)}
                            disabled={sendingLinkId === p.id}
                            className="shrink-0 text-xs text-gray-400 hover:text-brand-500 disabled:opacity-50 transition-colors"
                            title="Email this participant their worksheet link"
                          >
                            {sentLinkId === p.id ? '✓ Sent' : sendingLinkId === p.id ? '…' : '✉ Send'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add participants panel — only in edit mode (owner only) */}
      {editing && isOwner && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">
              Add participants
              {addSelected.size + parseParticipants(pasteText).parsed.length > 0 && (
                <span className="ml-2 text-xs font-medium bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">
                  {addSelected.size + parseParticipants(pasteText).parsed.length} to add
                </span>
              )}
            </h2>
            <div className="flex text-xs font-medium rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setAddTab('existing')}
                className={`px-3 py-1.5 transition-colors ${addTab === 'existing' ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Pick existing
              </button>
              <button
                type="button"
                onClick={() => setAddTab('team')}
                className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${addTab === 'team' ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Pick a team
              </button>
              <button
                type="button"
                onClick={() => setAddTab('paste')}
                className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${addTab === 'paste' ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Paste new
              </button>
            </div>
          </div>

          {addTab === 'existing' && (
            filteredPeople.length === 0 && !addSearch ? (
              <p className="text-sm text-gray-400 py-2">All participants in your address book are already in this session.</p>
            ) : (
              <>
                <input
                  type="search"
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  placeholder="Search by name, email, strength, or team…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {filteredPeople.map(p => (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${addSelected.has(p.id) ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={addSelected.has(p.id)}
                        onChange={() => toggleAddSelect(p.id)}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.email}</p>
                        {p.team_id && teamMap[p.team_id] && (
                          <p className="text-xs text-indigo-500 mt-0.5">{teamMap[p.team_id].name}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {(p.top5 ?? []).map((s, i) => <StrengthBadge key={i} name={s} />)}
                      </div>
                    </label>
                  ))}
                  {filteredPeople.length === 0 && addSearch && (
                    <p className="text-sm text-gray-400 px-4 py-4 text-center">No results.</p>
                  )}
                </div>
              </>
            )
          )}

          {addTab === 'team' && (
            teams.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No teams yet. Visit the Participants page to create teams.</p>
            ) : (
              <div className="space-y-2">
                {teams.map(team => {
                  const members = people.filter(p => p.team_id === team.id && !existingEmails.has(p.email))
                  const selectedCount = members.filter(p => addSelected.has(p.id)).length
                  const allSelected = members.length > 0 && selectedCount === members.length
                  return (
                    <div
                      key={team.id}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                        allSelected ? 'border-brand-200 bg-brand-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{team.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {members.length === 0
                            ? 'All members already in session'
                            : `${members.length} member${members.length !== 1 ? 's' : ''}${selectedCount > 0 && !allSelected ? ` · ${selectedCount} selected` : ''}`}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setAddTeamModal(team)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Select individuals
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleTeamAdd(team.id)}
                          disabled={members.length === 0}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
                            allSelected
                              ? 'bg-brand-500 text-white border-brand-500 hover:bg-brand-600'
                              : 'bg-white text-brand-600 border-brand-200 hover:bg-brand-50'
                          }`}
                        >
                          {allSelected ? '✓ All selected' : 'Select all'}
                        </button>
                      </div>
                    </div>
                  )
                })}
                {addSelected.size > 0 && (
                  <p className="text-xs text-gray-500 pt-1">
                    {addSelected.size} participant{addSelected.size !== 1 ? 's' : ''} selected. Switch to "Pick existing" to review or adjust individual selections.
                  </p>
                )}
              </div>
            )
          )}

          {addTab === 'paste' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                One per line:{' '}
                <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 text-gray-700">
                  Name, Email, S1, S2, S3, S4, S5
                </code>
              </p>
              <textarea
                value={pasteText}
                onChange={handlePasteChange}
                rows={5}
                placeholder="Jane Smith, jane@example.com, Achiever, Learner, Relator, Futuristic, Strategic"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              />
              {pasteErrors.length > 0 && (
                <ul className="text-xs text-red-600 space-y-0.5">
                  {pasteErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Save / Cancel bar */}
      {editing && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || pasteErrors.length > 0}
            className="text-sm font-semibold bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            onClick={cancelEditing}
            className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        </div>
      )}
    </Layout>
  )
}
