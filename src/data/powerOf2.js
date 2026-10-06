import { PERSONAL_INSIGHTS } from './personalInsights'

// Short "I Bring / I Need" statements used in the Power of 2 grid headers.
// Source: Cascade© 2021 Releasing Strengths Ltd. Power of 2 worksheets.
// All 34 strengths sourced directly from the official Power of 2 PDFs.

export const POWER_OF_2 = {
  Achiever:          { bring: 'intensity and stamina of effort.',                                           need: 'freedom to work at my own pace.' },
  Activator:         { bring: 'a catalytic sense of urgency.',                                              need: 'less discussion, more action.' },
  Adaptability:      { bring: 'a willingness to follow the lead of change.',                                need: 'present pressures that demand an immediate response.' },
  Analytical:        { bring: 'dispassionate thinking to emotional issues.',                                need: 'time to think.' },
  Arranger:          { bring: 'flexibility and interactivity.',                                             need: 'a dynamic environment.' },
  Belief:            { bring: 'stability, clarity and conviction.',                                         need: 'a cause or purpose for which to live.' },
  Command:           { bring: 'emotional clarity.',                                                         need: 'challenges and conflicts.' },
  Communication:     { bring: 'attention to messages that must be heard.',                                  need: 'a sounding board, an audience.' },
  Competition:       { bring: 'an aspiration to be the best.',                                              need: 'peers for comparison and motivation.' },
  Connectedness:     { bring: 'an appreciation of the mystery and wonder of life and all creation.',        need: 'to be part of something bigger than myself: a family, team, global community.' },
  Consistency:       { bring: 'rules and policies that promote cultural predictability.',                   need: 'standard operating procedures.' },
  Context:           { bring: 'accurate memories and valuable memorabilia.',                                need: 'relevant background for discussions and decisions.' },
  Deliberative:      { bring: 'a thorough and conscientious approach.',                                     need: 'time to listen and think before being expected to speak.' },
  Developer:         { bring: 'a commitment (time and energy) to human growth.',                            need: 'someone to invest in.' },
  Discipline:        { bring: 'precision and detail orientation.',                                          need: 'a structured and organized environment.' },
  Empathy:           { bring: 'emotional intelligence.',                                                    need: 'freedom to laugh, cry and vent.' },
  Focus:             { bring: 'clarity through concentration and direction.',                               need: 'a goal to establish priorities.' },
  Futuristic:        { bring: 'previews, predictions and forecasts.',                                       need: 'opportunities to talk about the foreseen future.' },
  Harmony:           { bring: 'a peace-loving, conflict-resistant approach.',                               need: 'areas of agreement, common ground.' },
  Ideation:          { bring: 'new and fresh perspectives.',                                                need: 'freedom to explore possibilities without restraints or limits.' },
  Includer:          { bring: 'a high level of tolerance with acceptance of diversity.',                    need: 'room for everyone.' },
  Individualization: { bring: 'an understanding of people that is valuable for placement.',                 need: 'individualized expectations that are created to fit a person.' },
  Input:             { bring: 'tangible tools that can facilitate growth and performance.',                 need: 'space to store the resources I naturally acquire.' },
  Intellection:      { bring: 'depth of understanding and wisdom.',                                        need: 'time for reflection and meditation.' },
  Learner:           { bring: 'a learning perspective and excitement for the learning process.',            need: 'exposure to new information and experiences.' },
  Maximizer:         { bring: 'a quality orientation.',                                                     need: 'quality to be valued as much as quantity.' },
  Positivity:        { bring: 'contagious energy and enthusiasm.',                                          need: 'freedom to experience the joy and drama of life.' },
  Relator:           { bring: 'social depth and transparency.',                                             need: 'time and opportunities for one-on-one interactions.' },
  Responsibility:    { bring: 'dependability and loyalty.',                                                 need: 'freedom to take ownership.' },
  Restorative:       { bring: 'courage and creativity to problematic situations.',                          need: 'problems that must be solved.' },
  'Self-Assurance':  { bring: 'a willingness to take necessary risks.',                                    need: 'freedom to act unilaterally and independently.' },
  Significance:      { bring: 'a desire for wanting and producing more.',                                   need: 'an appreciative audience that will bring out my best.' },
  Strategic:         { bring: 'creative anticipation, imagination and persistence.',                        need: 'freedom to make midcourse corrections.' },
  Woo:               { bring: 'energy to social situations.',                                               need: 'social variability.' },
}

// ── Variants ──────────────────────────────────────────────────────────────────
// The Power of 2 grid comes in four flavours; they differ only in the text shown in
// each strength's header. Every variant stores its editable text in report_content
// under its own report_type.

export const P2_VARIANT_ORDER = ['bring-need', 'descriptive-words', 'short-description', 'role']

export const P2_VARIANTS = {
  'bring-need': {
    label: 'Bring / Need',
    reportType: 'power_of_2',
    fieldLabels: { bring: 'I Bring…', need: 'I Need…' },
  },
  'descriptive-words': {
    label: 'Descriptive Words',
    reportType: 'power_of_2_descriptive_words',
    fieldLabels: { descriptiveWords: 'Descriptive Words' },
  },
  'short-description': {
    label: 'Short Description',
    reportType: 'power_of_2_short_description',
    fieldLabels: { description: 'Short Description' },
  },
  role: {
    label: 'The Role I Play',
    reportType: 'power_of_2_role',
    fieldLabels: { roleIPlay: 'The Role I Play' },
  },
}

export function p2Variant(variant) {
  return P2_VARIANTS[variant] ? variant : 'bring-need'
}

export function p2Path(variant) {
  return variant === 'bring-need' ? '/power-of-2' : `/power-of-2/${variant}`
}

// The printed worksheets show descriptive words / roles in lower case.
const lowerFirst = t => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t)

function buildDefaults(variant) {
  if (variant === 'bring-need') return POWER_OF_2
  const keys = Object.keys(P2_VARIANTS[variant].fieldLabels)
  const out = {}
  Object.keys(PERSONAL_INSIGHTS).forEach(s => {
    out[s] = {}
    keys.forEach(k => {
      const t = PERSONAL_INSIGHTS[s]?.[k] ?? ''
      out[s][k] = k === 'description' ? t : lowerFirst(t)
    })
  })
  return out
}

// Built once so editors/pages get a stable reference.
export const P2_DEFAULTS = Object.fromEntries(P2_VARIANT_ORDER.map(v => [v, buildDefaults(v)]))

// Header lines for a strength in a Power of 2 grid: [{ label, text }]
export function p2HeaderLines(variant, content) {
  if (variant === 'bring-need') {
    return [
      { label: 'I Bring', text: content?.bring ?? '' },
      { label: 'I Need', text: content?.need ?? '' },
    ]
  }
  const key = Object.keys(P2_VARIANTS[variant].fieldLabels)[0]
  return [{ label: null, text: content?.[key] ?? '' }]
}
