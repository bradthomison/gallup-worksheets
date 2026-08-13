import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StrengthBadge from '../components/StrengthBadge'
// ── Add Members modal ─────────────────────────────────────────────────────────
function AddMembersModal({ available, onConfirm, onClose }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())

  const filtered = available.filter(p => {
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
  })

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-gray-900">Add Members to Team</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-4 pt-3 pb-2 shrink-0">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 px-2 py-1">
          {available.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">All participants are already on this team.</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No matches for "{search}"</p>
          ) : (
            filtered.map(p => (
              <label
                key={p.id}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors rounded-lg ${selected.has(p.id) ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.email}</p>
                  {p.team_id && (
                    <p className="text-xs text-amber-500 mt-0.5">Currently on another team — will be moved</p>
                  )}
                </div>
              </label>
            ))
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex items-center justify-between shrink-0">
          <span className="text-sm text-gray-500">
            {selected.size === 0 ? 'None selected' : `${selected.size} selected`}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => onConfirm([...selected])}
              disabled={selected.size === 0}
              className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              Add {selected.size > 0 ? `${selected.size} ` : ''}Member{selected.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Delete Teams modal ────────────────────────────────────────────────────────
function DeleteTeamsModal({ teams, people, onDeleteTeam, onClose }) {
  const [confirming, setConfirming] = useState(null)
  const [alsoDeleteMembers, setAlsoDeleteMembers] = useState(false)

  const memberCounts = {}
  people.forEach(p => {
    if (p.team_id) memberCounts[p.team_id] = (memberCounts[p.team_id] || 0) + 1
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Delete Teams</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {teams.length === 0 && (
            <p className="px-6 py-4 text-sm text-gray-400">No teams yet.</p>
          )}
          {teams.map(team => {
            const count = memberCounts[team.id] || 0
            const isConfirming = confirming === team.id
            return (
              <div key={team.id} className={`px-6 py-3 ${isConfirming ? 'bg-red-50' : ''}`}>
                {!isConfirming ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{team.name}</p>
                      <p className="text-xs text-gray-400">{count} member{count !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => { setConfirming(team.id); setAlsoDeleteMembers(false) }}
                      className="text-xs font-medium text-red-500 hover:text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700 font-medium">Delete &ldquo;{team.name}&rdquo;?</p>
                    {count > 0 && (
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={alsoDeleteMembers}
                          onChange={e => setAlsoDeleteMembers(e.target.checked)}
                          className="rounded"
                        />
                        Also delete {count} member{count !== 1 ? 's' : ''} from the database
                      </label>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { onDeleteTeam(team.id, alsoDeleteMembers); setConfirming(null) }}
                        className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 bg-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-gray-800">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Edit / Add panel ──────────────────────────────────────────────────────────
function EditTeamPanel({ team, people, onSave, onCancel, onMemberAddBatch, onMemberRemove }) {
  const [form, setForm] = useState({
    name: team?.name ?? '',
    location: team?.location ?? '',
    primary_coach: team?.primary_coach ?? '',
    manager_id: team?.manager_id ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [addMembersOpen, setAddMembersOpen] = useState(false)

  const currentMembers = people.filter(p => p.team_id === team?.id)
  const available = people.filter(p => !p.team_id || p.team_id !== team?.id)

  async function handleSave() {
    if (!form.name.trim()) { setError('Team name is required'); return }
    setSaving(true)
    await onSave({ ...form, manager_id: form.manager_id || null }, team?.id ?? null)
    setSaving(false)
  }

  return (
    <div className="bg-blue-50 border-t border-blue-100 px-6 py-5 space-y-5">
      {/* Team fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Manager</label>
          <select
            value={form.manager_id}
            onChange={e => setForm(f => ({ ...f, manager_id: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">No manager designated</option>
            {currentMembers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
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
            <p className="text-xs text-gray-400">No members yet — click "Add Members" below to get started.</p>
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

          {/* Add members */}
          {addMembersOpen && (
            <AddMembersModal
              available={available}
              onConfirm={async (ids) => {
                await onMemberAddBatch(ids, team.id)
                setAddMembersOpen(false)
              }}
              onClose={() => setAddMembersOpen(false)}
            />
          )}
          <button
            onClick={() => setAddMembersOpen(true)}
            disabled={available.length === 0}
            className="text-sm font-medium text-brand-500 hover:text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add Members to This Team
          </button>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TeamsPage() {
  const [teams, setTeams] = useState([])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null) // team id | 'new' | null
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleteTeamsModal, setDeleteTeamsModal] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: teamsData }, { data: peopleData }] = await Promise.all([
      supabase.from('teams').select('*, manager:manager_id(id, name)').order('name'),
      supabase.from('people').select('id, name, email, top5, team_id').order('name'),
    ])
    setTeams(teamsData ?? [])
    setPeople(peopleData ?? [])
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

  async function handleDeleteTeam(id, alsoDeleteMembers = false) {
    if (alsoDeleteMembers) {
      await supabase.from('people').delete().eq('team_id', id)
    }
    await supabase.from('teams').delete().eq('id', id)
    setDeleteConfirm(null)
    setDeleteTeamsModal(false)
    if (editingId === id) setEditingId(null)
    load()
  }

  async function handleMemberAdd(personId, teamId) {
    await supabase.from('people').update({ team_id: teamId }).eq('id', personId)
    load()
  }

  async function handleMemberAddBatch(personIds, teamId) {
    if (personIds.length === 0) return
    await supabase.from('people').update({ team_id: teamId }).in('id', personIds)
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
      {deleteTeamsModal && (
        <DeleteTeamsModal
          teams={teams}
          people={people}
          onDeleteTeam={handleDeleteTeam}
          onClose={() => setDeleteTeamsModal(false)}
        />
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setDeleteTeamsModal(true)}
            className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Delete Teams
          </button>
          <button
            onClick={() => setEditingId('new')}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add Team
          </button>
        </div>
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
                <th className="px-4 py-3 text-left font-medium">Manager</th>
                <th className="px-4 py-3 text-left font-medium">Members</th>
                <th className="px-4 py-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* "Add Team" inline panel as first row */}
              {editingId === 'new' && (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EditTeamPanel
                      team={null}
                      people={people}
                      onSave={handleSaveTeam}
                      onCancel={() => setEditingId(null)}
                      onMemberAddBatch={handleMemberAddBatch}
                      onMemberRemove={handleMemberRemove}
                    />
                  </td>
                </tr>
              )}

              {filtered.length === 0 && editingId !== 'new' && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">
                    {search ? 'No results.' : 'No teams yet. Click "+ Add Team" to create your first one.'}
                  </td>
                </tr>
              )}

              {filtered.map(team => {
                const memberCount = people.filter(p => p.team_id === team.id).length
                return (
                  <>
                    <tr key={team.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{team.name}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{team.location || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-500">{team.primary_coach || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {team.manager?.name
                          ? <span className="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">{team.manager.name}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/participants?team=${encodeURIComponent(team.name)}`}
                          className="text-xs bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 px-2 py-0.5 rounded-full font-medium transition-colors"
                        >
                          {memberCount} {memberCount === 1 ? 'member' : 'members'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {deleteConfirm === team.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Delete team?</span>
                            <button onClick={() => handleDeleteTeam(team.id)} className="text-xs text-red-600 font-medium hover:underline">Yes</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:underline">No</button>
                          </div>
                        ) : (
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
                        )}
                      </td>
                    </tr>
                    {/* Inline edit panel */}
                    {editingId === team.id && (
                      <tr key={`${team.id}-edit`}>
                        <td colSpan={6} className="p-0">
                          <EditTeamPanel
                            team={team}
                            people={people}
                            onSave={handleSaveTeam}
                            onCancel={() => setEditingId(null)}
                            onMemberAddBatch={handleMemberAddBatch}
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
