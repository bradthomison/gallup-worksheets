/**
 * Gallup CliftonStrengths — 34 themes mapped to their domain.
 * Domain colors match Gallup's official palette.
 */

const DOMAINS = {
  executing: {
    label: 'Executing',
    bg: '#f5f3ff',
    text: '#6d28d9',
    border: '#ddd6fe',
  },
  influencing: {
    label: 'Influencing',
    bg: '#fff7ed',
    text: '#c2410c',
    border: '#fed7aa',
  },
  relationship: {
    label: 'Relationship Building',
    bg: '#eff6ff',
    text: '#1d4ed8',
    border: '#bfdbfe',
  },
  strategic: {
    label: 'Strategic Thinking',
    bg: '#f0fdf4',
    text: '#15803d',
    border: '#bbf7d0',
  },
}

export const STRENGTH_DOMAIN = {
  // Executing — purple
  Achiever:     'executing',
  Arranger:     'executing',
  Belief:       'executing',
  Consistency:  'executing',
  Deliberative: 'executing',
  Discipline:   'executing',
  Focus:        'executing',
  Responsibility: 'executing',
  Restorative:  'executing',

  // Influencing — orange
  Activator:      'influencing',
  Command:        'influencing',
  Communication:  'influencing',
  Competition:    'influencing',
  Maximizer:      'influencing',
  'Self-Assurance': 'influencing',
  Significance:   'influencing',
  Woo:            'influencing',

  // Relationship Building — blue
  Adaptability:     'relationship',
  Connectedness:    'relationship',
  Developer:        'relationship',
  Empathy:          'relationship',
  Harmony:          'relationship',
  Includer:         'relationship',
  Individualization: 'relationship',
  Positivity:       'relationship',
  Relator:          'relationship',

  // Strategic Thinking — green
  Analytical: 'strategic',
  Context:    'strategic',
  Futuristic: 'strategic',
  Ideation:   'strategic',
  Input:      'strategic',
  Intellection: 'strategic',
  Learner:    'strategic',
  Strategic:  'strategic',
}

export function getStrengthColors(name) {
  const domain = STRENGTH_DOMAIN[name] ?? null
  return domain ? DOMAINS[domain] : { bg: '#f9fafb', text: '#374151', border: '#e5e7eb' }
}

export function getStrengthDomain(name) {
  return STRENGTH_DOMAIN[name] ?? null
}

export { DOMAINS }
