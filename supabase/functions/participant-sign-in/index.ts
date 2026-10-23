import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Participant sign-in: only people already on file (the people table) get a sign-in link.
//
// Supabase has "Allow new users to sign up" switched off, so a first-time email can't simply ask for
// a link. This function checks the people list, creates the login if the person doesn't have one yet,
// then asks Supabase to send the sign-in email (which our send-auth-email hook builds and sends).
// Unknown emails get no email and no login.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OWN_DOMAIN = 'mystrengthstraining.com'
const DEFAULT_REDIRECT = `https://kumc.${OWN_DOMAIN}/me`

// Where the sign-in link may send the person afterwards. Supabase also checks its own allow list.
function safeRedirect(requested: unknown): string {
  if (typeof requested !== 'string') return DEFAULT_REDIRECT
  try {
    const u = new URL(requested)
    const ours = u.protocol === 'https:' && (u.hostname === OWN_DOMAIN || u.hostname.endsWith('.' + OWN_DOMAIN))
    const oldSite = u.protocol === 'https:' && u.hostname === 'gallup-worksheets.vercel.app'
    const localDev = u.protocol === 'http:' && u.hostname === 'localhost'
    return ours || oldSite || localDev ? u.toString() : DEFAULT_REDIRECT
  } catch {
    return DEFAULT_REDIRECT
  }
}

function reply(status: string, httpStatus = 200) {
  return new Response(JSON.stringify({ status }), {
    status: httpStatus,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body?.email ?? '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return reply('invalid_email', 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Is this email on file? (exact match, case-insensitive; escape LIKE wildcards so "_" and "%" are literal)
    const pattern = email.replace(/[\\%_]/g, (c) => '\\' + c)
    const { data: people, error: peopleErr } = await admin.from('people').select('id').ilike('email', pattern).limit(1)
    if (peopleErr) throw peopleErr
    if (!people || people.length === 0) return reply('not_found')

    // Make sure they have a login. An existing one is fine.
    const { error: createErr } = await admin.auth.admin.createUser({ email, email_confirm: true })
    if (createErr) {
      const exists = (createErr as any).code === 'email_exists' || /already|registered|exists/i.test(createErr.message ?? '')
      if (!exists) throw createErr
    }

    // Ask Supabase to send the sign-in email (triggers the send-auth-email hook).
    // Forward the visitor's IP so Supabase's per-IP limits apply to them, not to this function.
    const forwardedFor = req.headers.get('x-forwarded-for')
    const anon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: forwardedFor ? { headers: { 'x-forwarded-for': forwardedFor } } : undefined,
    })
    const { error: otpErr } = await anon.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: safeRedirect(body?.redirect_to) },
    })
    if (otpErr) {
      const limited = (otpErr as any).status === 429 || /rate|seconds|too many/i.test(otpErr.message ?? '')
      if (limited) return reply('rate_limited')
      throw otpErr
    }

    return reply('sent')
  } catch (err) {
    console.error('participant-sign-in error:', err)
    return reply('error', 500)
  }
})
