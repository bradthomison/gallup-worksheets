/**
 * Parse a YYYY-MM-DD string as local midnight.
 *
 * new Date("2025-05-20") is treated as UTC midnight, which rolls back to
 * May 19 in any timezone west of UTC.  Splitting the parts and passing them
 * to the Date constructor uses local time instead.
 */
export function parseLocalDate(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDateLong(str) {
  const d = parseLocalDate(str)
  return d ? d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null
}

export function formatDateShort(str) {
  const d = parseLocalDate(str)
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
}

/** Returns today as a YYYY-MM-DD string (local time). */
export function todayStr() {
  const t = new Date()
  return [
    t.getFullYear(),
    String(t.getMonth() + 1).padStart(2, '0'),
    String(t.getDate()).padStart(2, '0'),
  ].join('-')
}
