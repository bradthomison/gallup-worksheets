import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StrengthBadge from '../components/StrengthBadge'
import { STRENGTH_DOMAIN } from '../lib/strengthColors'

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
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [addingNew, setAddingNew] = useState(false)
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('people')
      .select('*')
      .order('name')
    setPeople(data ?? [])
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

  const filtered = people.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.top5 ?? []).some(s => s.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Participants</h1>
        <button
          onClick={() => { setAddingNew(true); setEditingId(null) }}
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Person
        </button>
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
              {addingNew && (
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
              {filtered.map(p => (
                editingId === p.id ? (
                  <EditRow
                    key={p.id}
                    person={p}
                    onSave={data => handleSaveEdit(p.id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(p.top5 ?? []).map((s, i) => <StrengthBadge key={i} name={s} />)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {deleteConfirm === p.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Delete?</span>
                          <button onClick={() => handleDelete(p.id)} className="text-xs text-red-600 font-medium hover:underline">Yes</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:underline">No</button>
                        </div>
                      ) : (
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
                      )}
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
