import { PERSONAL_INSIGHTS, ROWS } from '../data/personalInsights'
import { getStrengthColors } from '../lib/strengthColors'

// Builds a standalone print-ready HTML page for one participant
export function buildPersonalInsightsPrintHTML(name, strengths) {
  const cols = strengths.filter(s => PERSONAL_INSIGHTS[s])
  const colCount = cols.length + 1

  const headerCells = cols.map(s => {
    const c = getStrengthColors(s)
    return `<th style="background:${c.headerBg};-webkit-print-color-adjust:exact;print-color-adjust:exact;color:${c.headerText};padding:6px 5px;font-size:12px;font-weight:700;text-align:center;border:1px solid #d1d5db;">${s}</th>`
  }).join('')

  const bodyRows = ROWS.map(row => {
    const labelCell = row.key === 'description'
      ? `<th style="padding:6px 5px;font-size:11px;font-weight:700;text-align:left;vertical-align:top;border:1px solid #d1d5db;min-width:120px;background:#f9fafb;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${name}</th>`
      : `<th style="padding:6px 5px;font-size:11px;font-weight:600;text-align:left;vertical-align:top;border:1px solid #d1d5db;background:#f9fafb;-webkit-print-color-adjust:exact;print-color-adjust:exact;word-wrap:break-word;overflow-wrap:break-word;">${row.label}</th>`

    const cells = cols.map(s => {
      const text = PERSONAL_INSIGHTS[s]?.[row.key] ?? ''
      return `<td style="padding:6px 5px;font-size:10.5px;vertical-align:top;border:1px solid #d1d5db;">${text}</td>`
    }).join('')

    return `<tr>${labelCell}${cells}</tr>`
  }).join('')

  return `<!DOCTYPE html><html><head><title>Personal Insights — ${name}</title>
<style>
*{box-sizing:border-box;}
html,body{height:100%;margin:0;padding:0;}
body{font-family:Arial,sans-serif;display:flex;flex-direction:column;}
h2{font-size:13px;margin:0 0 4px 0;color:#111;flex-shrink:0;}
table{border-collapse:collapse;width:100%;table-layout:fixed;flex:1;}
th,td{word-wrap:break-word;overflow-wrap:break-word;}
tfoot td{border-top:1px solid #d1d5db;padding:2px 5px;font-size:8px;color:#9ca3af;}
@page{size:landscape;margin:0.35in;}
-webkit-print-color-adjust:exact;
print-color-adjust:exact;
</style>
</head><body>
<h2>Personal Insights — ${name}</h2>
<table>
<colgroup><col style="width:145px;">${cols.map(() => '<col>').join('')}</colgroup>
<thead><tr>
<th style="padding:6px 5px;border:1px solid #d1d5db;background:#f3f4f6;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></th>
${headerCells}
</tr></thead>
<tbody>${bodyRows}</tbody>
<tfoot><tr><td colspan="${colCount}">Cascade© 2021 Releasing Strengths Ltd. All rights reserved. Gallup®, CliftonStrengths® and the 34 theme names of CliftonStrengths® are trademarks of Gallup, Inc.</td></tr></tfoot>
</table>
</body></html>`
}

export default function PersonalInsightsModal({ participant, onClose }) {
  const strengths = (participant.top5 || []).filter(Boolean)
  const validStrengths = strengths.filter(s => PERSONAL_INSIGHTS[s])

  function handlePrint() {
    const html = buildPersonalInsightsPrintHTML(participant.name, strengths)
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 250)
  }

  if (strengths.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Personal Insights — {participant.name}</h2>
          <p className="text-sm text-gray-500">No strengths recorded for this participant. Add their top 5 strengths first.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-7xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Personal Insights</h2>
            <p className="text-sm text-gray-500">{participant.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto p-4">
          <table className="w-full border-collapse text-sm" style={{ minWidth: `${140 + validStrengths.length * 180}px` }}>
            <colgroup>
              <col style={{ width: '150px' }} />
              {validStrengths.map(s => <col key={s} />)}
            </colgroup>
            <thead>
              <tr>
                <th className="border border-gray-200 bg-gray-50 p-2" />
                {validStrengths.map(s => {
                  const c = getStrengthColors(s)
                  return (
                    <th
                      key={s}
                      className="border border-gray-200 p-2 text-center font-bold"
                      style={{ background: c.headerBg, color: c.headerText }}
                    >
                      {s}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(row => (
                <tr key={row.key} className="even:bg-gray-50/50">
                  <th className="border border-gray-200 bg-gray-50 p-2 text-left text-xs font-semibold text-gray-700 align-top whitespace-nowrap">
                    {row.key === 'description' ? participant.name : row.label}
                  </th>
                  {validStrengths.map(s => (
                    <td key={s} className="border border-gray-200 p-2 text-xs text-gray-700 align-top leading-relaxed">
                      {PERSONAL_INSIGHTS[s]?.[row.key] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
          Cascade© 2021 Releasing Strengths Ltd. All rights reserved. Gallup®, CliftonStrengths® and the 34 theme names of CliftonStrengths® are trademarks of Gallup, Inc.
        </div>
      </div>
    </div>
  )
}
