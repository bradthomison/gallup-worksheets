import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { PERSONAL_INSIGHTS } from '../data/personalInsights'

const ALL_STRENGTHS = Object.keys(PERSONAL_INSIGHTS).sort()

const FIELD_LABELS = {
  description:      'Theme Description',
  descriptiveWords: 'Descriptive Words',
  roleIPlay:        'The Role I Play',
  iAmBeing:         'I am (being)',
  iWillDoing:       'I will (doing)',
  valueIBring:      'The Value I Bring',
  needsIHave:       'The Needs I Have (Give me…)',
  metaphorImage:    'Metaphor / Image',
  barrierLabel:     'Barrier Label',
  myMotivators:     'My Motivators (I Love)',
  myDemotivators:   'My Demotivators (I Dislike)',
}

function StrengthContentEditor({ reportType, staticFallback }) {
  const [selectedStrength, setSelectedStrength] = useState('Activator')
  const [dbContent, setDbContent] = useState({})
  const [editFields, setEditFields] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tableExists, setTableExists] = useState(true)

  const loadContent = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('report_content')
        .select('strength_name, content')
        .eq('report_type', reportType)

      if (error) { setTableExists(false); setLoading(false); return }

      const merged = {}
      ALL_STRENGTHS.forEach(s => {
        const row = data?.find(d => d.strength_name === s)
        merged[s] = row ? row.content : (staticFallback ? { ...staticFallback[s] } : {})
      })
      setDbContent(merged)
    } catch { setTableExists(false) }
    setLoading(false)
  }, [reportType, staticFallback])

  useEffect(() => { loadContent() }, [loadContent])

  useEffect(() => {
    setEditFields(dbContent[selectedStrength] ? { ...dbContent[selectedStrength] } : (staticFallback ? { ...staticFallback[selectedStrength] } : {}))
    setSaved(false)
  }, [selectedStrength, dbContent, staticFallback])

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase.from('report_content').upsert({
      report_type: reportType,
      strength_name: selectedStrength,
      content: editFields,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'report_type,strength_name' })
    setSaving(false)
    if (!error) {
      setDbContent(prev => ({ ...prev, [selectedStrength]: { ...editFields } }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  function handleReset() {
    setEditFields(staticFallback ? { ...staticFallback[selectedStrength] } : {})
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">Edit Strength Content</p>
        {!tableExists && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            Run SQL migration to enable editing
          </span>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
      ) : (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Select strength:</label>
            <select
              value={selectedStrength}
              onChange={e => setSelectedStrength(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {ALL_STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <textarea
                  value={editFields[key] ?? ''}
                  onChange={e => setEditFields(f => ({ ...f, [key]: e.target.value }))}
                  rows={key === 'description' ? 3 : 2}
                  disabled={!tableExists}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
            ))}
          </div>
          {tableExists && (
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : `Save ${selectedStrength}`}
              </button>
              {staticFallback && (
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg transition-colors"
                >
                  Reset to default
                </button>
              )}
              {saved && <span className="text-sm text-green-600">✓ Saved</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CustomStrengthContentEditor({ reportType, rows }) {
  const [selectedStrength, setSelectedStrength] = useState('Activator')
  const [dbContent, setDbContent] = useState({})
  const [editFields, setEditFields] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadContent = useCallback(async () => {
    if (rows.length === 0) return
    setLoading(true)
    const { data } = await supabase
      .from('report_content')
      .select('strength_name, content')
      .eq('report_type', reportType)
    const merged = {}
    ALL_STRENGTHS.forEach(s => {
      const row = data?.find(d => d.strength_name === s)
      merged[s] = row?.content ?? {}
    })
    setDbContent(merged)
    setLoading(false)
  }, [reportType, rows])

  useEffect(() => { loadContent() }, [loadContent])

  useEffect(() => {
    setEditFields(dbContent[selectedStrength] ? { ...dbContent[selectedStrength] } : {})
    setSaved(false)
  }, [selectedStrength, dbContent])

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase.from('report_content').upsert({
      report_type: reportType,
      strength_name: selectedStrength,
      content: editFields,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'report_type,strength_name' })
    setSaving(false)
    if (!error) {
      setDbContent(prev => ({ ...prev, [selectedStrength]: { ...editFields } }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-6 text-center">
        <p className="text-sm text-gray-400">Define rows above to start editing strength content.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">Edit Strength Content</p>
      </div>
      {loading ? (
        <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
      ) : (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Select strength:</label>
            <select
              value={selectedStrength}
              onChange={e => setSelectedStrength(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {ALL_STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            {rows.map(row => (
              <div key={row.id}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{row.label}</label>
                <textarea
                  value={editFields[row.id] ?? ''}
                  onChange={e => setEditFields(f => ({ ...f, [row.id]: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : `Save ${selectedStrength}`}
            </button>
            {saved && <span className="text-sm text-green-600">✓ Saved</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function PersonalInsightsReport() {
  const [expanded, setExpanded] = useState(false)
  const [lmsCopied, setLmsCopied] = useState(false)

  const lmsUrl = `${window.location.origin}/personal-insights`

  function copyLmsLink() {
    navigator.clipboard.writeText(lmsUrl).then(() => {
      setLmsCopied(true)
      setTimeout(() => setLmsCopied(false), 2000)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
            <p className="font-semibold text-gray-900">Personal Insights</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                34 strengths · 11 fields each
              </span>
              <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                Built-in
              </span>
            </div>
          </div>
        </button>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-4">
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 mb-0.5">Acorn Course Link</p>
              <p className="text-xs text-brand-500 truncate">{lmsUrl}</p>
            </div>
            <button
              onClick={copyLmsLink}
              className="shrink-0 ml-4 text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              {lmsCopied ? '✓ Copied' : 'Copy Link'}
            </button>
          </div>
          <StrengthContentEditor reportType="personal_insights" staticFallback={PERSONAL_INSIGHTS} />
        </div>
      )}
    </div>
  )
}

function CustomReportCard({ report: initialReport, onDelete }) {
  const [report, setReport] = useState(initialReport)
  const [expanded, setExpanded] = useState(false)
  const [lmsCopied, setLmsCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(initialReport.name)
  const [nameSaving, setNameSaving] = useState(false)
  const [editingRows, setEditingRows] = useState(false)
  const [draftRows, setDraftRows] = useState([])
  const [rowsSaving, setRowsSaving] = useState(false)

  const rows = report.rows ?? []
  const lmsUrl = `${window.location.origin}/report/${report.id}`

  function copyLmsLink() {
    navigator.clipboard.writeText(lmsUrl).then(() => {
      setLmsCopied(true)
      setTimeout(() => setLmsCopied(false), 2000)
    })
  }

  function startEditRows() {
    setDraftRows(rows.map(r => ({ ...r })))
    setEditingRows(true)
  }

  function addRow() {
    setDraftRows(prev => [...prev, { id: `row_${Date.now()}`, label: '' }])
  }

  function updateRowLabel(id, label) {
    setDraftRows(prev => prev.map(r => r.id === id ? { ...r, label } : r))
  }

  function removeRow(id) {
    setDraftRows(prev => prev.filter(r => r.id !== id))
  }

  async function saveRows() {
    const validRows = draftRows.filter(r => r.label.trim()).map(r => ({ ...r, label: r.label.trim() }))
    setRowsSaving(true)
    const { data } = await supabase
      .from('reports')
      .update({ rows: validRows })
      .eq('id', report.id)
      .select()
      .single()
    setRowsSaving(false)
    if (data) setReport(data)
    setEditingRows(false)
  }

  async function handleSaveName() {
    if (!nameInput.trim()) return
    setNameSaving(true)
    const { data } = await supabase
      .from('reports')
      .update({ name: nameInput.trim() })
      .eq('id', report.id)
      .select()
      .single()
    setNameSaving(false)
    if (data) setReport(data)
    setEditingName(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
            <p className="font-semibold text-gray-900">{report.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {rows.length} row{rows.length !== 1 ? 's' : ''} · 34 strengths
              </span>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Delete report?</span>
              <button onClick={() => onDelete(report.id)} className="text-xs font-medium text-red-600 hover:underline">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 hover:underline">No</button>
            </div>
          ) : (
            <>
              <button
                onClick={() => { setNameInput(report.name); setEditingName(true); setExpanded(true) }}
                className="text-xs text-brand-500 font-medium hover:underline"
              >Rename</button>
              <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-400 font-medium hover:underline">Delete</button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-4">
          {editingName && (
            <div className="flex items-center gap-2 bg-white border border-brand-200 rounded-lg px-4 py-3">
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                className="flex-1 text-sm border-none outline-none bg-transparent"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                disabled={nameSaving || !nameInput.trim()}
                className="text-xs font-medium text-brand-500 hover:text-brand-700 disabled:opacity-60"
              >{nameSaving ? '…' : 'Save'}</button>
              <button onClick={() => setEditingName(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          )}

          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 mb-0.5">Acorn Course Link</p>
              <p className="text-xs text-brand-500 truncate">{lmsUrl}</p>
            </div>
            <button
              onClick={copyLmsLink}
              className="shrink-0 ml-4 text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              {lmsCopied ? '✓ Copied' : 'Copy Link'}
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Report Rows</p>
              {!editingRows && (
                <button onClick={startEditRows} className="text-xs text-brand-500 font-medium hover:underline">
                  {rows.length === 0 ? 'Add Rows' : 'Edit Rows'}
                </button>
              )}
            </div>
            {editingRows ? (
              <div className="p-4 space-y-3">
                {draftRows.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">No rows yet. Add your first row below.</p>
                )}
                {draftRows.map((row, i) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}.</span>
                    <input
                      value={row.label}
                      onChange={e => updateRowLabel(row.id, e.target.value)}
                      placeholder="Row label e.g. Theme Description"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      autoFocus={i === draftRows.length - 1 && row.label === ''}
                    />
                    <button onClick={() => removeRow(row.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                  </div>
                ))}
                <button
                  onClick={addRow}
                  className="text-xs text-brand-500 font-medium hover:text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Add Row
                </button>
                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  <button
                    onClick={saveRows}
                    disabled={rowsSaving}
                    className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                  >
                    {rowsSaving ? 'Saving…' : 'Save Rows'}
                  </button>
                  <button onClick={() => setEditingRows(false)} className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-gray-400">No rows defined yet. Click "Add Rows" to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {rows.map((row, i) => (
                  <div key={row.id} className="px-4 py-2 flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}.</span>
                    <span className="text-sm text-gray-700">{row.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <CustomStrengthContentEditor reportType={report.id} rows={rows} />
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('reports').select('*').order('name')
    setReports(data ?? [])
    setLoading(false)
  }

  async function handleCreate() {
    if (!newName.trim()) { setSaveError('Report name is required.'); return }
    setSaving(true)
    setSaveError(null)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('reports').insert({
      name: newName.trim(),
      created_by: user.id,
      rows: [],
    })
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setAddingNew(false)
    setNewName('')
    load()
  }

  async function handleDelete(id) {
    await supabase.from('reports').delete().eq('id', id)
    load()
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Manage strength-based reports shared with participants.</p>
        </div>
        <button
          onClick={() => { setAddingNew(true); setSaveError(null) }}
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Report
        </button>
      </div>

      {addingNew && (
        <div className="bg-white rounded-2xl border border-brand-200 p-5 mb-4 space-y-3">
          <h2 className="font-semibold text-gray-900">New Report</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report name</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setAddingNew(false) }}
              placeholder="e.g. Strengths Reflection, Team Assessment"
              className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
          </div>
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Saving…' : 'Create Report'}
            </button>
            <button
              onClick={() => { setAddingNew(false); setSaveError(null) }}
              className="text-gray-500 hover:text-gray-800 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : (
        <div className="space-y-3">
          <PersonalInsightsReport />
          {reports.map(r => (
            <CustomReportCard key={r.id} report={r} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </Layout>
  )
}
