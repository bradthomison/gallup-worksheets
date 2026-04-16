import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StrengthBadge from '../components/StrengthBadge'
import { useAuth } from '../hooks/useAuth'

// ── Edit / Add panel ──────────────────────────────────────────────────────────
function EditTeamPanel({ team, people, onSave, onCancel, onMemberAdd, onMemberRemove }) {
  const [form, setForm] = useState({
    name: team?.name ?? '',
    location: team?.location ?? '',
    primary_coach: team?.primary_coach ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [addMemberId, setAddMemberId] = useState('')

  const currentMembers = people.filter(p => p.team_id === team?.id)
  const available = people.filter(p => !p.team_id || p.team_id !== team?.id)

  async function handleSave() {
    if (!form.name.trim()) { setError('Team name is required'); return }
    setSaving(true)
    await onSave(form, team?.id ?? null)
    setSaving(false)
  }

  async function handleAddMember() {
    if (!addMemberId || !team) return
    await onMemberAdd(addMemberId, team.id)
    setAddMemberId('')
  }

  return (
    <div className="bg-blue-50 border-t border-blue-100 px-6 py-5 space-y-5">
      {/* Team fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Team Name *</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. Alpha Team"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
          <input
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. Chicago"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Primary Coach</label>
          <input
            value={form.primary_coach}
            onChange={e => setForm(f => ({ ...f, primary_coach: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Coach name"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
        >
          {saving ? 'Saving…' : team ? 'Save Changes' : 'Create Team'}
        </button>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-800 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Members — only shown for existing (saved) teams */}
      {team && (
        <div className="pt-4 border-t border-blue-200 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Members
            <span className="ml-2 text-xs font-normal text-gray-400">
              {currentMembers.length} {currentMembers.length === 1 ? 'person' : 'people'}
            </span>
          </h3>

          {currentMembers.length === 0 ? (
            <p className="text-xs text-gray-400">No members yet — use the dropdown below to add participants.</p>
          ) : (
            <div className="space-y-1.5">
              {currentMembers.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-gray-200">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900">{p.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{p.email}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {(p.top5 ?? []).map((s, i) => <StrengthBadge key={i} name={s} />)}
                  </div>
                  <button
                    onClick={() => onMemberRemove(p.id)}
                    className="text-xs text-red-400 hover:text-red-600 font-medium ml-2 shrink-0 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add member */}
          <div className="flex gap-2 items-center">
            <select
              value={addMemberId}
              onChange={e => setAddMemberId(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">Add a participant to this team…</option>
              {available.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.email}){p.team_id ? ' — move from another team' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddMember}
              disabled={!addMemberId}
              className="bg-white hover:bg-gray-50 disabled:opacity-40 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TeamsPage() {
  const { user } = useAuth()
  const [teams, setTeams] = useState([])
  const [people, setPeople] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null) // team id | 'new' | null
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: teamsData }, { data: peopleData }, { data: profData }] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('people').select('id, name, email, top5, team_id').order('name'),
      supabase.from('profiles').select('id, display_name'),
    ])
    setTeams(teamsData ?? [])
    setPeople(peopleData ?? [])
    const map = {}
    ;(profData ?? []).forEach(p => { map[p.id] = p.display_name })
    setProfiles(map)
    setLoading(false)
  }

  async function handleSaveTeam(form, id) {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (id) {
      await supabase.from('teams').update(form).eq('id', id)
      await load()
      setEditingId(null)
    } else {
      const { data: newTeam } = await supabase
        .from('teams')
        .insert({ ...form, created_by: u.id })
        .select()
        .single()
      await load()
      // Auto-open the new team for member management
      setEditingId(newTeam?.id ?? null)
    }
  }

  async function handleDeleteTeam(id) {
    await supabase.from('teams').delete().eq('id', id)
    setDeleteConfirm(null)
    if (editingId === id) setEditingId(null)
    load()
  }

  async function handleToggleShare(team) {
    await supabase.from('teams').update({ shared: !team.shared }).eq('id', team.id)
    setTeams(prev => prev.map(t => t.id === team.id ? { ...t, shared: !t.shared } : t))
  }

  async function handleMemberAdd(personId, teamId) {
    await supabase.from('people').update({ team_id: teamId }).eq('id', personId)
    load()
  }

  async function handleMemberRemove(personId) {
    await supabase.from('people').update({ team_id: null }).eq('id', personId)
    load()
  }

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.location ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (t.primary_coach ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
        <button
          onClick={() => setEditingId('new')}
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Team
        </button>
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, location, or coach…"
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-gray-500 text-sm px-5 py-6">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Team Name</th>
                <th className="px-4 py-3 text-left font-medium">Location</th>
                <th className="px-4 py-3 text-left font-medium">Primary Coach</th>
                <th className="px-4 py-3 text-left font-medium">Members</th>
                <th className="px-4 py-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* "Add Team" inline panel as first row */}
              {editingId === 'new' && (
                <tr>
                  <td colSpan={5} className="p-0">
                    <EditTeamPanel
                      team={null}
                      people={people}
                      onSave={handleSaveTeam}
                      onCancel={() => setEditingId(null)}
                      onMemberAdd={handleMemberAdd}
                      onMemberRemove={handleMemberRemove}
                    />
                  </td>
                </tr>
              )}

              {filtered.length === 0 && editingId !== 'new' && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">
                    {search ? 'No results.' : 'No teams yet. Click "+ Add Team" to create your first one.'}
                  </td>
                </tr>
              )}

              {filtered.map(team => {
                const memberCount = people.filter(p => p.team_id === team.id).length
                const isOwner = team.created_by === user?.id
                const canEdit = isOwner || team.shared
                const sharedByName = !isOwner
                  ? (profiles[team.created_by] ?? 'Another coach')
                  : null
                return (
                  <>
                    <tr key={team.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{team.name}</p>
                        {!isOwner && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">
                            Shared by {sharedByName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{team.location || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-500">{team.primary_coach || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          {memberCount} {memberCount === 1 ? 'member' : 'members'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {canEdit ? (
                          deleteConfirm === team.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Delete team?</span>
                              <button onClick={() => handleDeleteTeam(team.id)} className="text-xs text-red-600 font-medium hover:underline">Yes</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:underline">No</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              {isOwner && (
                                <button
                                  onClick={() => handleToggleShare(team)}
                                  className={`text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
                                    team.shared
                                      ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                                      : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                                  }`}
                                  title={team.shared ? 'Click to make private' : 'Click to share with other coaches'}
                                >
                                  {team.shared ? 'Shared' : 'Private'}
                                </button>
                              )}
                              <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setEditingId(editingId === team.id ? null : team.id)}
                                  className="text-xs text-brand-500 font-medium hover:underline"
                                >
                                  {editingId === team.id ? 'Close' : 'Edit'}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(team.id)}
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
                    {/* Inline edit panel */}
                    {editingId === team.id && (
                      <tr key={`${team.id}-edit`}>
                        <td colSpan={5} className="p-0">
                          <EditTeamPanel
                            team={team}
                            people={people}
                            onSave={handleSaveTeam}
                            onCancel={() => setEditingId(null)}
                            onMemberAdd={handleMemberAdd}
                            onMemberRemove={handleMemberRemove}
                          />
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
