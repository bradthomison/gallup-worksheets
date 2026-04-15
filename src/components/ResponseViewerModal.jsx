import StrengthBadge from './StrengthBadge'
import { getStrengthColors } from '../lib/strengthColors'

export default function ResponseViewerModal({ participant, session, responses, onClose }) {
  const prompts = session.prompts ?? []
  const strengths = participant.top5 ?? []

  // Build a lookup map
  const cellMap = {}
  responses.forEach(r => {
    cellMap[`${r.prompt_index}_${r.strength_index}`] = r.response_text
  })

  const submittedAt = responses.find(r => r.submitted_at)?.submitted_at
  const formattedDate = submittedAt
    ? new Date(submittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl my-8">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{participant.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{participant.email}</p>
            {formattedDate && (
              <p className="text-xs text-gray-400 mt-1">Submitted {formattedDate}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none mt-0.5"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Grid */}
        <div className="p-6 overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="w-48 min-w-[160px] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-r border-gray-200">
                  Prompt
                </th>
                {strengths.map((s, si) => {
                  const colors = getStrengthColors(s)
                  return (
                    <th key={si} style={{ background: colors.bg, borderColor: '#e5e7eb' }} className="px-4 py-3 text-center border-b border-r last:border-r-0">
                      <StrengthBadge name={s} />
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {prompts.map((prompt, pi) => (
                <tr key={pi} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-4 py-3 align-top text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 leading-relaxed">
                    {pi + 1}. {prompt}
                  </td>
                  {strengths.map((_, si) => {
                    const text = cellMap[`${pi}_${si}`] ?? ''
                    return (
                      <td key={si} className="px-3 py-3 align-top border-r border-gray-100 last:border-r-0 text-sm text-gray-700 leading-relaxed">
                        {text || <span className="text-gray-300 italic text-xs">—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
