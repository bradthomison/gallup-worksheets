import { P2_VARIANTS, P2_VARIANT_ORDER } from '../data/powerOf2'

// Sessions can be set up with a built-in report instead of prompts. The choice is stored as
// a sentinel string in sessions.prompts[0].
export const PI_SENTINEL = '__personal_insights__'
export const TEAM_SENTINEL = '__team_overview__'
export const POM_SENTINEL = '__power_of_me__'
export const P2_PREFIX = '__power_of_2__:'

// Info for a sentinel prompt, or null when the prompt is an ordinary prompt / custom report id.
export function sessionReportInfo(prompt) {
  if (prompt === PI_SENTINEL) return { kind: 'pi', name: 'Personal Insights' }
  if (prompt === TEAM_SENTINEL) return { kind: 'team', name: 'Team Strengths Overview' }
  if (prompt === POM_SENTINEL) return { kind: 'pom', name: 'The Power of Me' }
  if (prompt?.startsWith(P2_PREFIX)) {
    const variant = prompt.slice(P2_PREFIX.length)
    if (P2_VARIANTS[variant]) return { kind: 'p2', variant, name: `The Power of 2 (${P2_VARIANTS[variant].label})` }
  }
  return null
}

// Options for the "Load from session topic or report" picker.
export const SESSION_REPORT_OPTIONS = [
  { value: PI_SENTINEL, label: 'Personal Insights' },
  ...P2_VARIANT_ORDER.map(v => ({ value: `${P2_PREFIX}${v}`, label: `The Power of 2 (${P2_VARIANTS[v].label})` })),
  { value: POM_SENTINEL, label: 'The Power of Me' },
]
