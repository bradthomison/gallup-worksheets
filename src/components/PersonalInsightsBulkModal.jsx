import { useState, useMemo } from 'react'
import { PERSONAL_INSIGHTS } from '../data/personalInsights'
import { buildPersonalInsightsPrintHTML } from './PersonalInsightsModal'

export default function PersonalInsightsBulkModal({ people, teams, onClose }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())

  const teamMap = useMemo(() => {
    const m = {}
    teams.forEach(t => { m[t.id] = t })
    return m
  }, [teams])

  // Only show people who have at least one strength entered
  const eligible = useMemo(() => people.filter(p => (p.top5 ?? []).some(Boolean)), [people])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return eligible
    return eligible.filter(p => {
      const teamName = p.team_id ? (teamMap[p.team_id]?.name ?? '') : ''
      return (
        p.name.toLowerCase().includes(q) ||
        (p.top5 ?? []).some(s => s.toLowerCase().includes(q)) ||
        teamName.toLowerCase().includes(q)
      )
    })
  }, [eligible, search, teamMap])

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    const filteredIds = filtered.map(p => p.id)
    const allSelected = filteredIds.every(id => selected.has(id))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) {
        filteredIds.forEach(id => next.delete(id))
      } else {
        filteredIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  function handlePrint() {
    const toPrint = eligible.filter(p => selected.has(p.id))
    if (toPrint.length === 0) return

    const pages = toPrint.map(p => buildPersonalInsightsPrintHTML(p.name, (p.top5 ?? []).filter(Boolean)))

    // Combine pages with page breaks
    const combined = `<!DOCTYPE html><html><head><title>Personal Insights Reports</title>
<style>
*{box-sizing:border-box;}
body{font-family:Arial,sans-serif;margin:0;padding:0;}
.page{padding:8px;page-break-after:always;}
.page:last-child{page-break-after:auto;}
h2{font-size:14px;margin:0 0 6px 0;color:#111;}
table{border-collapse:collapse;width:100%;table-layout:fixed;}
th,td{word-wrap:break-word;}
tfoot td{border-top:1px solid #d1d5db;padding:3px 5px;font-size:8.5px;color:#9ca3af;}
@media print{
  @page{size:landscape;margin:0.35in;}
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
</style>
</head><body>
${pages.map(html => {
  // Extract just the body content from each page
  const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/)
  return `<div class="page">${bodyMatch ? bodyMatch[1] : html}</div>`
}).join('\n')}
</body></html>`

    const win = window.open('', '_blank')
    win.document.write(combined)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 250)
  }

  const filteredAllSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id))
  const selectedCount = selected.size

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Print Personal Insights Reports</h2>
            <p className="text-sm text-gray-500 mt-0.5">Select participants to print together</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, strength, or team…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            autoFocus
          />
        </div>

        {/* Select all row */}
        <div className="px-4 py-1.5 border-b border-gray-100 shrink-0">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={filteredAllSelected}
              onChange={toggleAll}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {filteredAllSelected ? 'Deselect all' : `Select all ${filtered.length} shown`}
            </span>
          </label>
        </div>

        {/* Participant list */}
        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
          {eligible.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No participants with strengths entered yet.</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No matches for "{search}"</p>
          ) : (
            filtered.map(p => {
              const team = p.team_id ? teamMap[p.team_id] : null
              const validStrengths = (p.top5 ?? []).filter(s => PERSONAL_INSIGHTS[s])
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${selected.has(p.id) ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      {team && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                          {team.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {validStrengths.join(' · ')}
                    </p>
                  </div>
                </label>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex items-center justify-between shrink-0">
          <span className="text-sm text-gray-500">
            {selectedCount === 0 ? 'None selected' : `${selectedCount} report${selectedCount !== 1 ? 's' : ''} selected`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              disabled={selectedCount === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print {selectedCount > 0 ? `${selectedCount} ` : ''}Report{selectedCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
