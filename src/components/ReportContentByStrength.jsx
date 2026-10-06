import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import StrengthBadge from './StrengthBadge'
import { PERSONAL_INSIGHTS } from '../data/personalInsights'
import { BRING_NEED } from '../data/bringNeed'
import { P2_VARIANTS, P2_VARIANT_ORDER, P2_DEFAULTS } from '../data/powerOf2'

const ALL_STRENGTHS = Object.keys(PERSONAL_INSIGHTS).sort()

// Built-in reports whose text is edited here. Each section is stored in report_content under its
// reportType, exactly like the per-report editors above it on the Reports page.
const BUILT_IN_SECTIONS = [
  {
    id: 'personal_insights',
    title: 'Personal Insights',
    reportType: 'personal_insights',
    defaults: PERSONAL_INSIGHTS,
    fields: {
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
    },
  },
  {
    id: 'bring_need',
    title: 'Bring - Need',
    reportType: 'bring_need',
    defaults: BRING_NEED,
    fields: { bring: 'I Bring (The value I add)', need: 'I Need (My Energizers)' },
  },
  ...P2_VARIANT_ORDER.map(v => ({
    id: P2_VARIANTS[v].reportType,
    title: `The Power of 2 · ${P2_VARIANTS[v].label}`,
    reportType: P2_VARIANTS[v].reportType,
    defaults: P2_DEFAULTS[v],
    fields: P2_VARIANTS[v].fieldLabels,
  })),
]

// Custom reports are sections too: one box per row the coach defined, keyed by row id.
function customSection(report) {
  return {
    id: report.id,
    title: report.name,
    reportType: report.id,
    defaults: {},
    custom: true,
    fields: Object.fromEntries((report.rows ?? []).map(r => [r.id, r.label])),
  }
}

// Defaults overlaid with any saved edits: { sectionId: { field: text } } for one strength.
function mergedFor(strength, sections, rows) {
  const out = {}
  sections.forEach(sec => {
    out[sec.id] = { ...(sec.defaults[strength] ?? {}), ...(rows[`${sec.reportType}|${strength}`] ?? {}) }
  })
  return out
}

function StrengthRow({ strength, sections, open, onToggle, saved, rows, onSaved }) {
  const [edits, setEdits] = useState(saved)
  const [openSections, setOpenSections] = useState(() => new Set())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  // Pick up saved content when it really changes (initial load, a save, an edit made elsewhere on the page)
  const savedKey = JSON.stringify(saved)
  useEffect(() => { setEdits(saved) }, [savedKey])

  const fieldKeys = sec => Object.keys(sec.fields)
  const isDirty = sec => fieldKeys(sec).some(k => (edits[sec.id]?.[k] ?? '') !== (saved[sec.id]?.[k] ?? ''))
  const dirtySections = sections.filter(isDirty)
  const customized = sections.some(sec => rows[`${sec.reportType}|${strength}`])

  function toggleSection(id) {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function setField(secId, key, value) {
    setEdits(prev => ({ ...prev, [secId]: { ...prev[secId], [key]: value } }))
    setMessage(null)
  }

  function resetSection(sec) {
    setEdits(prev => ({ ...prev, [sec.id]: { ...(sec.defaults[strength] ?? {}) } }))
    setMessage(null)
  }

  async function save() {
    setSaving(true)
    setMessage(null)
    const { error } = await supabase.from('report_content').upsert(
      dirtySections.map(sec => ({
        report_type: sec.reportType,
        strength_name: strength,
        content: edits[sec.id],
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'report_type,strength_name' }
    )
    setSaving(false)
    if (error) { setMessage({ ok: false, text: error.message }); return }
    onSaved(strength, dirtySections.map(sec => ({ reportType: sec.reportType, content: edits[sec.id] })))
    setMessage({ ok: true, text: '✓ Saved' })
    setTimeout(() => setMessage(null), 2500)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-3.5 text-left">
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <StrengthBadge name={strength} size="md" />
        {customized && (
          <span className="text-xs text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full font-medium">Edited</span>
        )}
        {dirtySections.length > 0 && (
          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">Unsaved changes</span>
        )}
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-2">
          {sections.map(sec => {
            const sectionOpen = openSections.has(sec.id)
            const dirty = isDirty(sec)
            const edited = !!rows[`${sec.reportType}|${strength}`]
            return (
              <div key={sec.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection(sec.id)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${sectionOpen ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-800">{sec.title}</span>
                  {sec.custom && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Custom</span>}
                  {edited && !dirty && <span className="text-xs text-brand-600">Edited</span>}
                  {dirty && <span className="text-xs text-amber-700">Unsaved</span>}
                </button>

                {sectionOpen && (
                  <div className="border-t border-gray-100 p-4 space-y-3">
                    {fieldKeys(sec).length === 0 ? (
                      <p className="text-sm text-gray-400">No rows defined for this report yet. Add rows on the report above.</p>
                    ) : (
                      <>
                        {Object.entries(sec.fields).map(([key, label]) => {
                          const value = edits[sec.id]?.[key] ?? ''
                          return (
                            <div key={key}>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                              <textarea
                                value={value}
                                onChange={e => setField(sec.id, key, e.target.value)}
                                rows={Math.min(8, Math.max(2, value.split('\n').length, Math.ceil(value.length / 110)))}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
                              />
                            </div>
                          )
                        })}
                        {!sec.custom && (
                          <button
                            onClick={() => resetSection(sec)}
                            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                            title="Put the built-in text back in these boxes (save to keep it)"
                          >
                            Reset to default
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex items-center gap-3 sticky bottom-0 bg-gray-50 pt-2 pb-1">
            <button
              onClick={save}
              disabled={saving || dirtySections.length === 0}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : `Save ${strength}`}
            </button>
            {dirtySections.length > 0 && (
              <button
                onClick={() => { setEdits(saved); setMessage(null) }}
                className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg transition-colors"
              >
                Discard changes
              </button>
            )}
            {message && (
              <span className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.text}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// customReports: the coach's custom reports (kept current by the Reports page, so a new report or
// changed rows show up here straight away). refreshKey changes whenever content is saved elsewhere
// on the page; onSaved tells the page that this list saved something.
export default function ReportContentByStrength({ customReports, refreshKey, onSaved }) {
  const [rows, setRows] = useState({}) // "reportType|strength" -> saved content
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [openSet, setOpenSet] = useState(() => new Set())
  const [search, setSearch] = useState('')

  const sections = useMemo(
    () => [...BUILT_IN_SECTIONS, ...customReports.map(customSection)],
    [customReports]
  )
  const reportTypes = useMemo(() => sections.map(s => s.reportType), [sections])
  const reportTypesKey = reportTypes.join(',')

  useEffect(() => {
    let cancelled = false
    supabase
      .from('report_content')
      .select('report_type, strength_name, content')
      .in('report_type', reportTypes)
      .then(({ data, error }) => {
        if (cancelled) return
        setLoadError(error ? error.message : null)
        const map = {}
        ;(data ?? []).forEach(r => { if (r.content) map[`${r.report_type}|${r.strength_name}`] = r.content })
        setRows(map)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [reportTypesKey, refreshKey])

  const merged = useMemo(() => {
    const out = {}
    ALL_STRENGTHS.forEach(s => { out[s] = mergedFor(s, sections, rows) })
    return out
  }, [sections, rows])

  function handleSaved(strength, saved) {
    setRows(prev => {
      const next = { ...prev }
      saved.forEach(({ reportType, content }) => { next[`${reportType}|${strength}`] = content })
      return next
    })
    onSaved?.()
  }

  function toggle(s) {
    setOpenSet(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  const visible = ALL_STRENGTHS.filter(s => s.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search strengths…"
          className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={() => setOpenSet(new Set(visible))}
          className="text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
        >
          Expand all
        </button>
        <button
          onClick={() => setOpenSet(new Set())}
          className="text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
        >
          Collapse all
        </button>
      </div>

      {loadError && (
        <p className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          Couldn't load saved edits ({loadError}). Showing the built-in text.
        </p>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-gray-500 text-sm">No strengths match “{search}”.</p>
      ) : (
        <div className="space-y-2">
          {visible.map(s => (
            <StrengthRow
              key={s}
              strength={s}
              sections={sections}
              open={openSet.has(s)}
              onToggle={() => toggle(s)}
              saved={merged[s]}
              rows={rows}
              onSaved={handleSaved}
            />
          ))}
        </div>
      )}
    </div>
  )
}
