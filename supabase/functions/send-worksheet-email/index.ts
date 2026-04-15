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
    const { participant_id } = await req.json()
    if (!participant_id) throw new Error('participant_id is required')

    // Use service role key so we can read everything regardless of RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch participant + session
    const { data: participant, error: partErr } = await supabase
      .from('participants')
      .select('*, sessions(*)')
      .eq('id', participant_id)
      .single()

    if (partErr || !participant) throw new Error('Participant not found')

    const session = participant.sessions
    const prompts: string[] = session.prompts ?? []
    const strengths: string[] = participant.top5 ?? []

    // Fetch responses
    const { data: responses } = await supabase
      .from('responses')
      .select('*')
      .eq('participant_id', participant_id)

    // Build cell lookup
    const cellMap: Record<string, string> = {}
    ;(responses ?? []).forEach((r: any) => {
      cellMap[`${r.prompt_index}_${r.strength_index}`] = r.response_text
    })

    // ── Build HTML email ──────────────────────────────────────────────────────
    const strengthHeaders = strengths
      .map(s => `<th style="padding:10px 14px;background:#eef2ff;color:#3451c7;font-size:12px;text-transform:uppercase;letter-spacing:.05em;border:1px solid #e5e7eb;min-width:140px;">${s}</th>`)
      .join('')

    const rows = prompts.map((prompt, pi) => {
      const cells = strengths.map((_, si) => {
        const text = cellMap[`${pi}_${si}`] ?? ''
        return `<td style="padding:10px 14px;vertical-align:top;border:1px solid #e5e7eb;font-size:13px;color:#374151;line-height:1.5;">${text || '<span style="color:#d1d5db;">—</span>'}</td>`
      }).join('')
      return `
        <tr>
          <td style="padding:10px 14px;vertical-align:top;background:#f9fafb;border:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#6b7280;min-width:160px;">${pi + 1}. ${prompt}</td>
          ${cells}
        </tr>`
    }).join('')

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,ui-sans-serif,system-ui,sans-serif;">
  <div style="max-width:700px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <!-- Header -->
    <div style="background:#3b5bdb;padding:24px 32px;">
      <p style="margin:0;font-size:12px;color:#bfdbfe;text-transform:uppercase;letter-spacing:.08em;">Gallup Strengths</p>
      <h1 style="margin:6px 0 0;font-size:22px;color:#fff;font-weight:700;">${session.title}</h1>
    </div>
    <!-- Greeting -->
    <div style="padding:28px 32px 20px;">
      <p style="margin:0;font-size:15px;color:#374151;">Hi ${participant.name.split(' ')[0]},</p>
      <p style="margin:10px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
        Here's a copy of your completed Gallup Strengths worksheet. Great work reflecting on how your top strengths show up in your life and work.
      </p>
    </div>
    <!-- Grid -->
    <div style="padding:0 32px 32px;overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr>
            <th style="padding:10px 14px;background:#f9fafb;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:.05em;border:1px solid #e5e7eb;text-align:left;">Prompt</th>
            ${strengthHeaders}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #f3f4f6;background:#f9fafb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Sent by your Gallup Strengths coach · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
    </div>
  </div>
</body>
</html>`

    // ── Send via Resend ───────────────────────────────────────────────────────
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY secret not set')

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('RESEND_FROM_ADDRESS') ?? 'onboarding@resend.dev',
        to: participant.email,
        subject: `Your Strengths Worksheet — ${session.title}`,
        html,
      }),
    })

    if (!emailRes.ok) {
      const body = await emailRes.text()
      throw new Error(`Resend error: ${body}`)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
