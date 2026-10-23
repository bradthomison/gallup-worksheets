import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// The 34 CliftonStrengths themes, used to validate a self-entered Top 5.
const STRENGTHS = ["Achiever","Activator","Adaptability","Analytical","Arranger","Belief","Command","Communication","Competition","Connectedness","Consistency","Context","Deliberative","Developer","Discipline","Empathy","Focus","Futuristic","Harmony","Ideation","Includer","Individualization","Input","Intellection","Learner","Maximizer","Positivity","Relator","Responsibility","Restorative","Self-Assurance","Significance","Strategic","Woo"]

// Self-registrations allowed per coach per hour (guards against someone filling the pending list).
const MAX_SELF_REGISTRATIONS_PER_HOUR = 25

function validateRegistration(reg: any): { name: string; top5: string[] } | null {
  const name = typeof reg?.name === 'string' ? reg.name.trim() : ''
  const top5 = Array.isArray(reg?.top5) ? reg.top5 : []
  if (name.length < 1 || name.length > 100) return null
  if (top5.length !== 5) return null
  if (!top5.every((s: unknown) => typeof s === 'string' && STRENGTHS.includes(s))) return null
  if (new Set(top5).size !== 5) return null
  return { name, top5 }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, theme_id, register } = await req.json()
    if (!email || !theme_id) throw new Error('email and theme_id are required')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Find the theme and its coach
    const { data: theme, error: themeErr } = await supabase
      .from('prompt_themes')
      .select('id, created_by')
      .eq('id', theme_id)
      .single()

    if (themeErr || !theme) {
      return new Response(JSON.stringify({ error: 'theme_not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const respond = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Look up person by email + coach
    const normalizedEmail = email.trim().toLowerCase()
    const findPerson = () =>
      supabase.from('people').select('id, created_by').eq('email', normalizedEmail).eq('created_by', theme.created_by).maybeSingle()

    let { data: person } = await findPerson()

    if (!person) {
      // Unknown email. Without registration details, tell the page to ask for them.
      if (!register) return respond({ error: 'not_found' })

      // First visit through the link: the person enters their Top 5, gets their worksheet right away,
      // and is added as a pending person for a coach to review (same list as other access requests).
      const details = validateRegistration(register)
      if (!details) return respond({ error: 'invalid_registration' }, 400)

      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('people')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', theme.created_by)
        .eq('approved', false)
        .gte('created_at', since)
      if ((count ?? 0) >= MAX_SELF_REGISTRATIONS_PER_HOUR) return respond({ error: 'busy' }, 429)

      const { error: insertPersonErr } = await supabase.from('people').insert({
        name: details.name,
        email: normalizedEmail,
        top5: details.top5,
        created_by: theme.created_by,
        approved: false,
      })
      if (insertPersonErr && insertPersonErr.code !== '23505') throw new Error(insertPersonErr.message)

      // (23505 = someone with this email was created a moment ago; just look them up again)
      ;({ data: person } = await findPerson())
      if (!person) throw new Error('Could not create your record')
    }

    // Check for existing lms_worksheet
    const { data: existing } = await supabase
      .from('lms_worksheets')
      .select('worksheet_url_slug')
      .eq('people_id', person.id)
      .eq('theme_id', theme_id)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ slug: existing.worksheet_url_slug, is_new: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create new record
    const slug = crypto.randomUUID()
    const { error: insertErr } = await supabase
      .from('lms_worksheets')
      .insert({
        people_id: person.id,
        theme_id,
        worksheet_url_slug: slug,
        created_by: person.created_by,
      })

    if (insertErr) throw new Error(insertErr.message)

    return new Response(JSON.stringify({ slug, is_new: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
