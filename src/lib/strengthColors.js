/**
 * Gallup CliftonStrengths — 34 themes mapped to their domain.
 * Domain colors match Gallup's official palette.
 */

const DOMAINS = {
  executing: {
    label: 'Executing',
    bg: '#ede9fe',
    text: '#5b21b6',
    border: '#c4b5fd',
    headerBg: '#7c3aed',
    headerText: '#ffffff',
  },
  influencing: {
    label: 'Influencing',
    bg: '#ffedd5',
    text: '#c2410c',
    border: '#fdba74',
    headerBg: '#ea580c',
    headerText: '#ffffff',
  },
  relationship: {
    label: 'Relationship Building',
    bg: '#dbeafe',
    text: '#1d4ed8',
    border: '#93c5fd',
    headerBg: '#2563eb',
    headerText: '#ffffff',
  },
  strategic: {
    label: 'Strategic Thinking',
    bg: '#dcfce7',
    text: '#15803d',
    border: '#86efac',
    headerBg: '#16a34a',
    headerText: '#ffffff',
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
