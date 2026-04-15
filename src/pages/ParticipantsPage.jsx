import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StrengthBadge from '../components/StrengthBadge'
import { STRENGTH_DOMAIN } from '../lib/strengthColors'
import { parseParticipants } from '../lib/parseParticipants'
import { useAuth } from '../hooks/useAuth'

const ALL_STRENGTHS = Object.keys(STRENGTH_DOMAIN).sort()

const BLANK = { name: '', email: '', top5: ['', '', '', '', ''] }

function EditRow({ person, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: person.name,
    email: person.email,
    top5: [...(person.top5 ?? ['', '', '', '', ''])],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

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
    await onSave({ ...form, top5: form.top5.map(s => s.trim()) })
    setSaving(false)
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
      <td className="px-4 py-2 whitespace-nowrap">
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-medium bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onCancel}
            className="text-xs font-medium text-gray-500 hover:text-gray-800 px-2 py-1.5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function ParticipantsPage() {
  const { user } = useAuth()
  const [people, setPeople] = useState([])
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

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data }, { data: profData }] = await Promise.all([
      supabase.from('people').select('*').order('name'),
      supabase.from('profiles').select('id, display_name'),
    ])
    setPeople(data ?? [])
    const map = {}
    ;(profData ?? []).forEach(p => { map[p.id] = p.display_name })
    setProfiles(map)
    setLoading(false)
  }

  const [saveError, setSaveError] = useState(null)

  async function handleSaveEdit(id, updates) {
    setSaveError(null)
    const { error } = await supabase.from('people').update(updates).eq('id', id)
    if (error) { setSaveError(error.message); return }
    setEditingId(null)
    load()
  }

  async function handleSaveNew(data) {
    setSaveError(null)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('people').insert({ ...data, created_by: user.id })
    if (error) { setSaveError(error.message); return }
    setAddingNew(false)
    load()
  }

  async function handleDelete(id) {
    await supabase.from('people').delete().eq('id', id)
    setDeleteConfirm(null)
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
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('people').upsert(
      parsed.map(p => ({ name: p.name, email: p.email, top5: p.top5, created_by: user.id })),
      { onConflict: 'email,created_by' }
    )
    setPasteSaving(false)
    if (error) { setSaveError(error.message); return }
    setPasteText('')
    setPasteErrors([])
    setAddingNew(false)
    load()
  }

  const filtered = people.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.top5 ?? []).some(s => s.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Participants</h1>
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
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or strength…"
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
                <th className="px-4 py-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {addingNew && addMode === 'single' && (
                <EditRow
                  person={BLANK}
                  onSave={handleSaveNew}
                  onCancel={() => setAddingNew(false)}
                />
              )}
              {filtered.length === 0 && !addingNew && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">
                    {search ? 'No results.' : 'No participants yet. Add your first person above.'}
                  </td>
                </tr>
              )}
              {filtered.map(p => {
                const isOwner = p.created_by === user?.id
                const sharedByName = !isOwner
                  ? (profiles[p.created_by] ?? 'Another coach')
                  : null
                return editingId === p.id ? (
                  <EditRow
                    key={p.id}
                    person={p}
                    onSave={data => handleSaveEdit(p.id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
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
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isOwner ? (
                        deleteConfirm === p.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Delete?</span>
                            <button onClick={() => handleDelete(p.id)} className="text-xs text-red-600 font-medium hover:underline">Yes</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:underline">No</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleShare(p)}
                              className={`text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
                                p.shared
                                  ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                                  : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                              }`}
                              title={p.shared ? 'Click to make private' : 'Click to share with other coaches'}
                            >
                              {p.shared ? 'Shared' : 'Private'}
                            </button>
                            <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditingId(p.id); setAddingNew(false) }}
                                className="text-xs text-brand-500 font-medium hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(p.id)}
                                className="text-xs text-red-400 font-medium hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
