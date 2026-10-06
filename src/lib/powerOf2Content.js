import { supabase } from './supabase'
import { P2_VARIANTS, P2_DEFAULTS } from '../data/powerOf2'

// Defaults merged with any coach edits saved in report_content for a Power of 2 variant.
export async function loadP2Content(variant) {
  const merged = {}
  Object.entries(P2_DEFAULTS[variant]).forEach(([s, c]) => { merged[s] = { ...c } })
  const { data } = await supabase
    .from('report_content')
    .select('strength_name, content')
    .eq('report_type', P2_VARIANTS[variant].reportType)
  ;(data ?? []).forEach(r => {
    if (r.content) merged[r.strength_name] = { ...merged[r.strength_name], ...r.content }
  })
  return merged
}

// The Power of Me reuses the Role and Descriptive Words text set up for the Power of 2.
export async function loadPowerOfMeContent() {
  const [role, words] = await Promise.all([loadP2Content('role'), loadP2Content('descriptive-words')])
  return { role, words }
}
