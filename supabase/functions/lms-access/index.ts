import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, theme_id } = await req.json()
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

    // Look up person by email + coach
    const { data: person, error: personErr } = await supabase
      .from('people')
      .select('id, created_by')
      .eq('email', email.trim().toLowerCase())
      .eq('created_by', theme.created_by)
      .single()

    if (personErr || !person) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
