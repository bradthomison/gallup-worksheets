/**
 * Parse a pasted block of participants.
 * Expected format (one per line):
 *   Name, Email, S1, S2, S3, S4, S5
 */
export function parseParticipants(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const parsed = []
  const errors = []

  lines.forEach((line, idx) => {
    const parts = line.split(',').map(s => s.trim())
    if (parts.length !== 7) {
      errors.push(`Line ${idx + 1}: expected 7 fields (Name, Email, S1–S5), got ${parts.length}`)
      return
    }
    const [name, email, ...top5] = parts
    if (!name) { errors.push(`Line ${idx + 1}: name is empty`); return }
    if (!email.includes('@')) { errors.push(`Line ${idx + 1}: "${email}" doesn't look like an email`); return }
    const emptyStrength = top5.findIndex(s => !s)
    if (emptyStrength !== -1) { errors.push(`Line ${idx + 1}: strength ${emptyStrength + 1} is empty`); return }
    parsed.push({ name, email, top5 })
  })

  return { parsed, errors }
}
