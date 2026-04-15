import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StrengthBadge from '../components/StrengthBadge'
import { parseParticipants } from '../lib/parseParticipants'

export default function NewSessionPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [promptsText, setPromptsText] = useState('')

  // Theme picker
  const [themes, setThemes] = useState([])
  const [selectedTheme, setSelectedTheme] = useState('')

  // Participant picker
  const [tab, setTab] = useState('existing') // 'existing' | 'paste'
  const [people, setPeople] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set()) // Set of person ids

  // Paste tab
  const [participantsText, setParticipantsText] = useState('')
  const [parseErrors, setParseErrors] = useState([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('people').select('*').order('name').then(({ data }) => setPeople(data ?? []))
    supabase.from('prompt_themes').select('*').order('name').then(({ data }) => setThemes(data ?? []))
  }, [])

  function handleThemeChange(e) {
    const id = e.target.value
    setSelectedTheme(id)
    if (!id) return
    const theme = themes.find(t => t.id === id)
    if (theme) setPromptsText((theme.prompts ?? []).join('\n'))
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleParticipantChange(e) {
    setParticipantsText(e.target.value)
    setParseErrors(parseParticipants(e.target.value).errors)
  }

  const filteredPeople = people.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.top5 ?? []).some(s => s.toLowerCase().includes(search.toLowerCase()))
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const prompts = promptsText.split('\n').map(s => s.trim()).filter(Boolean)
    if (prompts.length === 0) { setError('Add at least one prompt.'); return }

    // Combine selected existing + pasted new
    const fromExisting = people.filter(p => selected.has(p.id))
    const { parsed: fromPaste, errors } = parseParticipants(participantsText)
    if (errors.length > 0) { setError('Fix participant format errors before saving.'); return }
    if (fromExisting.length + fromPaste.length === 0) { setError('Add at least one participant.'); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Insert session
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .insert({ title, date: date || null, prompts, created_by: user.id })
      .select()
      .single()

    if (sessionErr) { setError(sessionErr.message); setSaving(false); return }

    // Upsert any pasted people into the people table
    if (fromPaste.length > 0) {
      await supabase.from('people').upsert(
        fromPaste.map(p => ({ name: p.name, email: p.email, top5: p.top5, created_by: user.id })),
        { onConflict: 'email,created_by' }
      )
    }

    // Build participant rows
    const allParticipants = [
      ...fromExisting.map(p => ({ name: p.name, email: p.email, top5: p.top5 })),
      ...fromPaste,
    ]
    const participantRows = allParticipants.map(p => ({
      session_id: session.id,
      name: p.name,
      email: p.email,
      top5: p.top5,
      worksheet_url_slug: crypto.randomUUID(),
    }))

    const { error: partErr } = await supabase.from('participants').insert(participantRows)
    if (partErr) { setError(partErr.message); setSaving(false); return }

    navigate(`/sessions/${session.id}`)
  }

  const promptList = promptsText.split('\n').map(s => s.trim()).filter(Boolean)
  const totalSelected = selected.size + (tab === 'paste' ? parseParticipants(participantsText).parsed.length : 0)

  return (
    <Layout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New Session</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title + Date */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Session details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Leadership Team — Spring 2025"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Prompts */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-900">Prompts</h2>
                <p className="text-sm text-gray-500 mt-0.5">One prompt per line — these become the row headers in the worksheet grid.</p>
              </div>
              {themes.length > 0 && (
                <div className="shrink-0">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Load from theme</label>
                  <select
                    value={selectedTheme}
                    onChange={handleThemeChange}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="">Choose a theme…</option>
                    {themes.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.prompts?.length ?? 0})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <textarea
              value={promptsText}
              onChange={e => { setPromptsText(e.target.value); setSelectedTheme('') }}
              rows={6}
              placeholder={"How does this strength show up for you at work?\nWhat's one way you could lean into this strength more?\nWhere do you see this strength creating value for your team?"}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            />
            {promptList.length > 0 && (
              <p className="text-xs text-gray-400">{promptList.length} prompt{promptList.length !== 1 ? 's' : ''}</p>
            )}
          </div>

          {/* Participants */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                Participants
                {totalSelected > 0 && (
                  <span className="ml-2 text-xs font-medium bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">
                    {totalSelected} selected
                  </span>
                )}
              </h2>
              {/* Tabs */}
              <div className="flex text-xs font-medium rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setTab('existing')}
                  className={`px-3 py-1.5 transition-colors ${tab === 'existing' ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Pick existing
                </button>
                <button
                  type="button"
                  onClick={() => setTab('paste')}
                  className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${tab === 'paste' ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Paste new
                </button>
              </div>
            </div>

            {tab === 'existing' && (
              <>
                {people.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">
                    No participants saved yet. Use "Paste new" to add people, or visit the{' '}
                    <a href="/participants" className="text-brand-500 hover:underline">Participants page</a>.
                  </p>
                ) : (
                  <>
                    <input
                      type="search"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search by name, email, or strength…"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                      {filteredPeople.map(p => (
                        <label
                          key={p.id}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selected.has(p.id) ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {(p.top5 ?? []).map((s, i) => <StrengthBadge key={i} name={s} />)}
                          </div>
                        </label>
                      ))}
                      {filteredPeople.length === 0 && (
                        <p className="text-sm text-gray-400 px-4 py-4 text-center">No results.</p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {tab === 'paste' && (
              <>
                <p className="text-sm text-gray-500">
                  One per line:{' '}
                  <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 text-gray-700">
                    Name, Email, S1, S2, S3, S4, S5
                  </code>
                  <br />
                  <span className="text-xs text-gray-400">New people will also be saved to your Participants list.</span>
                </p>
                <textarea
                  value={participantsText}
                  onChange={handleParticipantChange}
                  rows={8}
                  placeholder={"Jane Smith, jane@example.com, Achiever, Learner, Relator, Futuristic, Strategic\nJohn Doe, john@example.com, Empathy, Communication, Developer, Harmony, Includer"}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
                />
                {parseErrors.length > 0 && (
                  <ul className="text-xs text-red-600 space-y-0.5">
                    {parseErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                )}
                {participantsText.trim() && parseErrors.length === 0 && (
                  <p className="text-xs text-green-600">
                    {parseParticipants(participantsText).parsed.length} participant{parseParticipants(participantsText).parsed.length !== 1 ? 's' : ''} ready
                  </p>
                )}
              </>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || parseErrors.length > 0}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Creating…' : 'Create Session'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
