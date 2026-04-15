import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

function ThemeRow({ theme, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(theme.name)
  const [promptsText, setPromptsText] = useState((theme.prompts ?? []).join('\n'))
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState(null)

  function startEdit() {
    setName(theme.name)
    setPromptsText((theme.prompts ?? []).join('\n'))
    setEditing(true)
    setExpanded(true)
    setError(null)
  }

  function cancelEdit() {
    setEditing(false)
    setError(null)
  }

  async function handleSave() {
    const prompts = promptsText.split('\n').map(s => s.trim()).filter(Boolean)
    if (!name.trim()) { setError('Theme name is required.'); return }
    if (prompts.length === 0) { setError('Add at least one prompt.'); return }
    setSaving(true)
    setError(null)
    await onSave(theme.id, { name: name.trim(), prompts })
    setSaving(false)
    setEditing(false)
  }

  const prompts = theme.prompts ?? []

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-4">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-3 text-left flex-1 min-w-0"
        >
          <svg
            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div>
            <p className="font-semibold text-gray-900">{theme.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{prompts.length} prompt{prompts.length !== 1 ? 's' : ''}</p>
          </div>
        </button>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Delete theme?</span>
              <button onClick={() => onDelete(theme.id)} className="text-xs font-medium text-red-600 hover:underline">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 hover:underline">No</button>
            </div>
          ) : (
            <>
              <button onClick={startEdit} className="text-xs text-brand-500 font-medium hover:underline">Edit</button>
              <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-400 font-medium hover:underline">Delete</button>
            </>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Theme name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Prompts — one per line</label>
                <textarea
                  value={promptsText}
                  onChange={e => setPromptsText(e.target.value)}
                  rows={Math.max(4, promptsText.split('\n').length + 1)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-sm font-semibold bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <ol className="space-y-1.5 list-decimal list-inside">
              {prompts.map((p, i) => (
                <li key={i} className="text-sm text-gray-700">{p}</li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}

export default function ThemesPage() {
  const [themes, setThemes] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPromptsText, setNewPromptsText] = useState('')
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('prompt_themes').select('*').order('name')
    setThemes(data ?? [])
    setLoading(false)
  }

  async function handleSaveEdit(id, updates) {
    const { error } = await supabase.from('prompt_themes').update(updates).eq('id', id)
    if (error) { setSaveError(error.message); return }
    load()
  }

  async function handleDelete(id) {
    await supabase.from('prompt_themes').delete().eq('id', id)
    load()
  }

  async function handleCreate() {
    const prompts = newPromptsText.split('\n').map(s => s.trim()).filter(Boolean)
    if (!newName.trim()) { setSaveError('Theme name is required.'); return }
    if (prompts.length === 0) { setSaveError('Add at least one prompt.'); return }
    setSaving(true)
    setSaveError(null)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('prompt_themes').insert({
      name: newName.trim(),
      prompts,
      created_by: user.id,
    })
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setAddingNew(false)
    setNewName('')
    setNewPromptsText('')
    load()
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Themes</h1>
          <p className="text-sm text-gray-500 mt-1">Reusable prompt sets you can load when creating a session.</p>
        </div>
        <button
          onClick={() => { setAddingNew(true); setSaveError(null) }}
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Theme
        </button>
      </div>

      {/* New theme form */}
      {addingNew && (
        <div className="bg-white rounded-2xl border border-brand-200 p-6 mb-4 space-y-4">
          <h2 className="font-semibold text-gray-900">New Theme</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Theme name</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Leadership Reflection, Team Dynamics, Career Growth"
              className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prompts — one per line</label>
            <textarea
              value={newPromptsText}
              onChange={e => setNewPromptsText(e.target.value)}
              rows={6}
              placeholder={"How does this strength show up for you at work?\nWhat's one way you could lean into this strength more?\nWhere do you see this strength creating value for your team?"}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            />
            {newPromptsText.trim() && (
              <p className="text-xs text-gray-400 mt-1">
                {newPromptsText.split('\n').filter(s => s.trim()).length} prompts
              </p>
            )}
          </div>
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Saving…' : 'Save Theme'}
            </button>
            <button
              onClick={() => { setAddingNew(false); setSaveError(null) }}
              className="text-gray-500 hover:text-gray-800 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : themes.length === 0 && !addingNew ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500 mb-1">No themes yet.</p>
          <p className="text-sm text-gray-400">Create your first theme to reuse prompts across sessions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {themes.map(t => (
            <ThemeRow
              key={t.id}
              theme={t}
              onSave={handleSaveEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </Layout>
  )
}
