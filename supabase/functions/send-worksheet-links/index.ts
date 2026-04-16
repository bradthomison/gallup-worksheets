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
    const { session_id, app_origin, participant_ids } = await req.json()
    if (!session_id || !app_origin) throw new Error('session_id and app_origin are required')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch session
    const { data: session, error: sessErr } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single()
    if (sessErr || !session) throw new Error('Session not found')

    // Fetch coach display name
    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', session.created_by)
      .single()
    const coachName = coachProfile?.display_name ?? null

    // Fetch participants — optionally filtered to a specific subset
    const baseQuery = supabase
      .from('participants')
      .select('id, name, email, worksheet_url_slug')
      .eq('session_id', session_id)
      .order('name')
    const { data: participants, error: partErr } = await (
      Array.isArray(participant_ids) && participant_ids.length > 0
        ? baseQuery.in('id', participant_ids)
        : baseQuery
    )
    console.log('session_id:', session_id)
    console.log('participants fetched:', participants?.length ?? 0, partErr ? `error: ${partErr.message}` : 'ok')

    const resendKey = Deno.env.get('RESEND_API_KEY')
    console.log('resend key present:', !!resendKey)
    if (!resendKey) throw new Error('RESEND_API_KEY secret not set')
    const fromAddress = Deno.env.get('RESEND_FROM_ADDRESS') ?? 'onboarding@resend.dev'

    let sent = 0
    for (const p of participants ?? []) {
      console.log('sending to:', p.email)
      const worksheetUrl = `${app_origin}/worksheet/${p.worksheet_url_slug}`
      const firstName = p.name.split(' ')[0]

      const coachLine = coachName
        ? `Sent by your Gallup Strengths coach <strong>${coachName}</strong>`
        : `Sent by your Gallup Strengths coach`

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,ui-sans-serif,system-ui,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <!-- Header -->
    <div style="background:#3b5bdb;padding:24px 32px;">
      <p style="margin:0;font-size:12px;color:#bfdbfe;text-transform:uppercase;letter-spacing:.08em;">Gallup Strengths</p>
      <h1 style="margin:6px 0 0;font-size:22px;color:#fff;font-weight:700;">${session.title}</h1>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      <p style="margin:0;font-size:15px;color:#111827;">Hi ${firstName},</p>
      <p style="margin:12px 0 24px;font-size:14px;color:#111827;line-height:1.6;">
        Your coach has prepared a Gallup Strengths worksheet for you. Click the button below to open your personal worksheet and share your reflections.
      </p>
      <!-- CTA Button -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${worksheetUrl}"
           style="display:inline-block;background:#3b5bdb;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:.01em;">
          Open My Worksheet →
        </a>
      </div>
      <p style="margin:24px 0 0;font-size:12px;color:#111827;text-align:center;line-height:1.6;">
        This link is personal to you — please don't share it.<br/>
        ${session.date ? `Session date: ${new Date(session.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}
      </p>
    </div>
    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #f3f4f6;background:#f9fafb;">
      <p style="margin:0;font-size:12px;color:#111827;">${coachLine}</p>
    </div>
  </div>
</body>
</html>`

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromAddress,
          to: p.email,
          subject: `Your Strengths Worksheet — ${session.title}`,
          html,
        }),
      })

      console.log('resend status:', res.status, await res.text())
      if (res.ok) sent++
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
