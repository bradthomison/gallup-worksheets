export const MIN_PROMPT_BOXES = 4
export const MAX_PROMPT_BOXES = 6

// Always show at least MIN_PROMPT_BOXES boxes; longer lists keep every existing prompt.
export function padPrompts(prompts, min = MIN_PROMPT_BOXES) {
  const list = [...(prompts ?? [])]
  while (list.length < min) list.push('')
  return list
}

// One text box per prompt. Pass allowAdd to let the coach add boxes up to MAX_PROMPT_BOXES.
export default function PromptInputs({ prompts, onChange, allowAdd = false, placeholders = [] }) {
  function update(i, value) {
    onChange(prompts.map((p, idx) => (idx === i ? value : p)))
  }

  return (
    <div className="space-y-3">
      {prompts.map((p, i) => (
        <div key={i}>
          <label className="block text-xs font-medium text-gray-600 mb-1">Prompt {i + 1}</label>
          <textarea
            value={p}
            onChange={e => update(i, e.target.value)}
            rows={2}
            placeholder={placeholders[i] ?? ''}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
          />
        </div>
      ))}
      {allowAdd && prompts.length < MAX_PROMPT_BOXES && (
        <button
          type="button"
          onClick={() => onChange([...prompts, ''])}
          className="text-xs text-brand-500 font-medium hover:text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          + Add prompt ({prompts.length} of {MAX_PROMPT_BOXES})
        </button>
      )}
    </div>
  )
}
